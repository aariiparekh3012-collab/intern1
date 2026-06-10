"""FastAPI dependency wiring (the Composition Root).

This is the ONLY place where concrete adapters are bound to ports. Swapping a KYC
vendor or using fakes in tests is a one-line change here. Auth/role guards live
here too.
"""
from __future__ import annotations

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.onboarding.use_cases.approve_onboarding import ApproveOnboardingUseCase
from app.application.onboarding.use_cases.complete_risk_profile import (
    CompleteRiskProfileUseCase,
)
from app.application.onboarding.use_cases.create_application import CreateApplicationUseCase
from app.application.onboarding.use_cases.esign_agreement import EsignAgreementUseCase
from app.application.onboarding.use_cases.submit_kyc import SubmitKycUseCase
from app.application.client.use_cases.provision_client import ProvisionClientUseCase
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.exceptions import DomainError
from app.core.security import decode_access_token
from app.domain.onboarding.services import RiskProfilingService
from app.infrastructure.audit.event_publisher import OutboxEventPublisher
from app.infrastructure.db.repositories import SqlAlchemyOnboardingRepository
from app.infrastructure.db.client_repository import SqlAlchemyClientRepository
from app.infrastructure.events.outbox_dispatcher import OutboxDispatcher
from app.infrastructure.external.bank_verification_client import FakeBankVerificationAdapter
from app.infrastructure.external.esign_client import FakeEsignAdapter
from app.infrastructure.external.kra_client import FakeKycAdapter


# ---- auth ----
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if creds is None or creds.scheme.lower() != "bearer":
        raise DomainError("Missing bearer token", code="unauthorized")
    try:
        return decode_access_token(creds.credentials)
    except Exception as exc:
        raise DomainError("Invalid token", code="unauthorized") from exc


def require_compliance(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "compliance":
        raise DomainError("Compliance role required", code="forbidden")
    return user


# ---- repositories & adapters ----
def get_repo(db: Session = Depends(get_db)) -> SqlAlchemyOnboardingRepository:
    return SqlAlchemyOnboardingRepository(db)


def get_publisher(db: Session = Depends(get_db)) -> OutboxEventPublisher:
    return OutboxEventPublisher(db)


def get_kyc_adapter(settings: Settings = Depends(get_settings)) -> FakeKycAdapter:
    return FakeKycAdapter()


def get_bank_adapter(settings: Settings = Depends(get_settings)) -> FakeBankVerificationAdapter:
    return FakeBankVerificationAdapter()


def get_esign_adapter(settings: Settings = Depends(get_settings)) -> FakeEsignAdapter:
    return FakeEsignAdapter()


# ---- use cases ----
def create_application_uc(
    repo=Depends(get_repo), pub=Depends(get_publisher)
) -> CreateApplicationUseCase:
    return CreateApplicationUseCase(repo, pub)


def submit_kyc_uc(
    repo=Depends(get_repo),
    kyc=Depends(get_kyc_adapter),
    bank=Depends(get_bank_adapter),
    pub=Depends(get_publisher),
) -> SubmitKycUseCase:
    return SubmitKycUseCase(repo, kyc, bank, pub)


def risk_profile_uc(
    repo=Depends(get_repo), pub=Depends(get_publisher)
) -> CompleteRiskProfileUseCase:
    return CompleteRiskProfileUseCase(repo, RiskProfilingService(), pub)


def esign_uc(
    repo=Depends(get_repo),
    esign=Depends(get_esign_adapter),
    pub=Depends(get_publisher),
) -> EsignAgreementUseCase:
    return EsignAgreementUseCase(repo, esign, pub)


def approve_uc(
    repo=Depends(get_repo), pub=Depends(get_publisher)
) -> ApproveOnboardingUseCase:
    return ApproveOnboardingUseCase(repo, pub)


# ---- Client Master ----
def get_client_repo(db: Session = Depends(get_db)) -> SqlAlchemyClientRepository:
    return SqlAlchemyClientRepository(db)


def provision_client_uc(
    onboarding_repo=Depends(get_repo),
    client_repo=Depends(get_client_repo),
) -> ProvisionClientUseCase:
    return ProvisionClientUseCase(onboarding_repo, client_repo)


def get_outbox_dispatcher(
    db: Session = Depends(get_db),
    provision=Depends(provision_client_uc),
) -> OutboxDispatcher:
    return OutboxDispatcher(db, provision)
