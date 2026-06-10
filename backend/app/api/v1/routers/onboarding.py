"""Onboarding REST endpoints (thin controllers).

Routers only: (1) translate schema -> command DTO, (2) invoke a use case,
(3) translate the view -> response schema. No business logic lives here.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.api import dependencies as deps
from app.api.v1.schemas import (
    ApplicationResponse,
    ApproveRequest,
    CreateApplicationRequest,
    EsignConfirmRequest,
    RiskProfileRequest,
    SubmitKycRequest,
)
from app.application.onboarding.dto import (
    ApproveCommand,
    CompleteRiskProfileCommand,
    CreateApplicationCommand,
    RiskAnswerInput,
    SubmitKycCommand,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post(
    "/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    body: CreateApplicationRequest,
    uc: deps.CreateApplicationUseCase = Depends(deps.create_application_uc),
    _user: dict = Depends(deps.get_current_user),
):
    view = uc.execute(
        CreateApplicationCommand(
            investor_type=body.investor_type,
            full_name=body.full_name,
            email=str(body.email),
            mobile=body.mobile,
            pan=body.pan,
            proposed_investment_inr=body.proposed_investment_inr,
        )
    )
    return ApplicationResponse(**view.__dict__)


@router.post("/applications/{application_id}/kyc", response_model=ApplicationResponse)
def submit_kyc(
    application_id: uuid.UUID,
    body: SubmitKycRequest,
    uc: deps.SubmitKycUseCase = Depends(deps.submit_kyc_uc),
    _user: dict = Depends(deps.get_current_user),
):
    view = uc.execute(
        SubmitKycCommand(
            application_id=application_id,
            aadhaar_full=body.aadhaar_full,
            bank_account_number=body.bank_account_number,
            bank_ifsc=body.bank_ifsc,
            bank_holder_name=body.bank_holder_name,
            demat_bo_id=body.demat_bo_id,
            demat_depository=body.demat_depository,
        )
    )
    return ApplicationResponse(**view.__dict__)


@router.post("/applications/{application_id}/risk-profile", response_model=ApplicationResponse)
def complete_risk_profile(
    application_id: uuid.UUID,
    body: RiskProfileRequest,
    uc: deps.CompleteRiskProfileUseCase = Depends(deps.risk_profile_uc),
    _user: dict = Depends(deps.get_current_user),
):
    view = uc.execute(
        CompleteRiskProfileCommand(
            application_id=application_id,
            answers=[RiskAnswerInput(a.question_id, a.weight) for a in body.answers],
        )
    )
    return ApplicationResponse(**view.__dict__)


@router.post("/applications/{application_id}/esign/initiate", status_code=status.HTTP_200_OK)
def initiate_esign(
    application_id: uuid.UUID,
    uc: deps.EsignAgreementUseCase = Depends(deps.esign_uc),
    _user: dict = Depends(deps.get_current_user),
):
    """Initiate Aadhaar eSign for the PMS agreement.

    Returns: { transaction_id, redirect_url }
    The client redirects the user to redirect_url to sign.
    After signing, eSign ASP calls our webhook callback endpoint.
    """
    transaction_id = uc.initiate(application_id, document_bytes=None)
    return {
        "transaction_id": transaction_id,
        "redirect_url": f"https://esign-sandbox.nsdl.com/transaction/{transaction_id}",  # Update for production
        "message": "Redirect user to redirect_url to complete Aadhaar eSign",
    }


@router.post("/applications/{application_id}/esign/confirm", response_model=ApplicationResponse)
def confirm_esign(
    application_id: uuid.UUID,
    body: EsignConfirmRequest,
    uc: deps.EsignAgreementUseCase = Depends(deps.esign_uc),
    _user: dict = Depends(deps.get_current_user),
):
    view = uc.confirm(application_id, body.transaction_id)
    return ApplicationResponse(**view.__dict__)


@router.post("/applications/{application_id}/esign/callback")
async def esign_callback(
    application_id: uuid.UUID,
    payload: dict,
    signature: str = None,
    uc: deps.EsignAgreementUseCase = Depends(deps.esign_uc),
):
    """Webhook endpoint for eSign ASP to POST results.

    Called by NSDL/eSign after user signs or cancels.
    Returns: { status: "OK" }
    """
    # Verify signature if provided
    if signature:
        from app.infrastructure.external.esign_client import AadhaarEsignAdapter

        adapter = AadhaarEsignAdapter()
        if not adapter.verify_callback_signature(payload, signature):
            return {"status": "INVALID_SIGNATURE"}, status.HTTP_401_UNAUTHORIZED

    # Process the callback
    uc.handle_esign_callback(application_id, payload)
    return {"status": "OK"}


@router.post("/applications/{application_id}/decision", response_model=ApplicationResponse)
def compliance_decision(
    application_id: uuid.UUID,
    body: ApproveRequest,
    uc: deps.ApproveOnboardingUseCase = Depends(deps.approve_uc),
    user: dict = Depends(deps.require_compliance),
):
    view = uc.execute(
        ApproveCommand(
            application_id=application_id,
            approved_by=user["sub"],
            approve=body.approve,
            reason=body.reason,
        )
    )
    return ApplicationResponse(**view.__dict__)
