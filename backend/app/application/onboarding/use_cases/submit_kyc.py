"""Use case: capture KYC docs, run bank verification, trigger KYC verification.

Orchestrates two regulated integrations (bank penny-drop + KRA/CKYC) and drives
the aggregate's state machine. All external calls go through ports.
"""
from __future__ import annotations

from app.application.onboarding.dto import ApplicationView, SubmitKycCommand
from app.application.onboarding.mappers import to_view
from app.application.onboarding.ports import (
    BankVerificationPort,
    EventPublisher,
    KycPort,
)
from app.core.exceptions import ExternalServiceError, NotFoundError, ValidationError
from app.domain.onboarding.enums import KycSource
from app.domain.onboarding.repositories import OnboardingRepository
from app.domain.onboarding.value_objects import Aadhaar, BankAccount, DematAccount

_NAME_MATCH_THRESHOLD = 0.80


class SubmitKycUseCase:
    def __init__(
        self,
        repo: OnboardingRepository,
        kyc: KycPort,
        bank: BankVerificationPort,
        publisher: EventPublisher,
    ) -> None:
        self._repo = repo
        self._kyc = kyc
        self._bank = bank
        self._publisher = publisher

    def execute(self, cmd: SubmitKycCommand) -> ApplicationView:
        app = self._repo.get(cmd.application_id)
        if app is None:
            raise NotFoundError("Onboarding application not found")

        aadhaar = Aadhaar.from_full(cmd.aadhaar_full)
        bank_account = BankAccount(
            account_number=cmd.bank_account_number,
            ifsc=cmd.bank_ifsc.upper(),
            holder_name=cmd.bank_holder_name,
        )
        demat = DematAccount(bo_id=cmd.demat_bo_id, depository=cmd.demat_depository.upper())

        app.submit_for_kyc(aadhaar=aadhaar, bank_account=bank_account, demat_account=demat)

        # 1) Bank account ownership via penny-drop
        bank_result = self._bank.verify(
            account_number=bank_account.account_number,
            ifsc=bank_account.ifsc,
            name=app.full_name,
        )
        if not bank_result.verified or bank_result.name_match_score < _NAME_MATCH_THRESHOLD:
            app.mark_kyc_rejected(reason=bank_result.reason or "Bank name mismatch")
            self._repo.update(app)
            self._publisher.publish(app.pull_events())
            return to_view(app)

        # 2) Identity via KRA / CKYC
        try:
            kyc_result = self._kyc.verify(
                pan=app.pan.value, aadhaar_last4=aadhaar.last4, name=app.full_name
            )
        except Exception as exc:  # network / vendor outage
            raise ExternalServiceError(f"KYC provider error: {exc}") from exc

        if kyc_result.verified:
            app.mark_kyc_verified(
                source=KycSource(kyc_result.source), reference=kyc_result.reference
            )
        else:
            app.mark_kyc_rejected(reason=kyc_result.reason or "KYC verification failed")

        self._repo.update(app)
        self._publisher.publish(app.pull_events())
        return to_view(app)
