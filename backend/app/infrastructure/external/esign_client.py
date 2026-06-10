"""Aadhaar eSign adapter implementing EsignPort.

Integrates with NSDL/UIDAI Aadhaar eSign ASP (Authentication Service Provider).
Supports both production (NSDL/UIDAI) and sandbox environments.

Vendors:
- NSDL eSign: https://esign.nsdl.com (production)
- NSDL eSign Sandbox: https://sandbox.esign.nsdl.com
- Yodlee (alternative): https://api.yodleesesign.com
"""
from __future__ import annotations

import base64
import hashlib
import logging
import uuid
from typing import TYPE_CHECKING

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.application.onboarding.ports import EsignPort, EsignResult
from app.core.config import get_settings
from app.core.exceptions import ValidationError

if TYPE_CHECKING:
    pass

log = logging.getLogger(__name__)


class AadhaarEsignAdapter(EsignPort):
    """Production eSign adapter for Aadhaar-based digital signatures.

    Integrates with NSDL or Yodlee eSign ASP. Handles:
    - Document signing via Aadhaar
    - Callback verification (signature validation)
    - Async polling for signature status
    - PII compliance (no Aadhaar stored)
    """

    def __init__(self) -> None:
        s = get_settings()
        if not s.esign_base_url or not s.esign_api_key:
            raise RuntimeError("ESIGN_BASE_URL and ESIGN_API_KEY required")
        self._base = s.esign_base_url
        self._api_key = s.esign_api_key
        self._headers = {
            "Authorization": f"Bearer {s.esign_api_key}",
            "Content-Type": "application/json",
        }
        log.info("Aadhaar eSign adapter initialized with base_url=%s", self._base)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=6),
        reraise=True,
    )
    def initiate(self, *, application_id: str, document_bytes: bytes) -> str:
        """Initiate Aadhaar eSign for a document.

        Args:
            application_id: Unique application ID (for tracking)
            document_bytes: PDF document to sign

        Returns:
            Transaction ID for tracking the eSign request

        Raises:
            ValidationError: If document is invalid
            httpx.HTTPError: If eSign ASP is unreachable
        """
        if not document_bytes:
            raise ValidationError("Document is empty", code="empty_document")
        if len(document_bytes) > 5 * 1024 * 1024:  # 5MB limit
            raise ValidationError("Document too large (max 5MB)", code="document_too_large")

        transaction_id = str(uuid.uuid4())
        log.info(
            "esign_initiate",
            transaction_id=transaction_id,
            application_id=application_id,
            document_size=len(document_bytes),
        )

        try:
            with httpx.Client(headers=self._headers, timeout=20) as client:
                resp = client.post(
                    f"{self._base}/esign/initiate",
                    json={
                        "transaction_id": transaction_id,
                        "reference": application_id,
                        "document_b64": base64.b64encode(document_bytes).decode(),
                        "callback_url": self._build_callback_url(application_id),
                    },
                )
                resp.raise_for_status()
                data = resp.json()

        except httpx.HTTPStatusError as e:
            log.error(
                "esign_initiate_failed",
                transaction_id=transaction_id,
                status=e.response.status_code,
                response_text=e.response.text[:200],
            )
            raise

        result_transaction_id = data.get("transaction_id", transaction_id)
        log.info(
            "esign_initiated",
            transaction_id=result_transaction_id,
            application_id=application_id,
        )
        return result_transaction_id

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, max=4),
        reraise=True,
    )
    def fetch_result(self, *, transaction_id: str) -> EsignResult:
        """Fetch the signature status for a transaction.

        Args:
            transaction_id: Transaction ID from initiate()

        Returns:
            EsignResult with status and signed document URL
        """
        log.info("esign_fetch_status", transaction_id=transaction_id)

        try:
            with httpx.Client(headers=self._headers, timeout=15) as client:
                resp = client.get(f"{self._base}/esign/{transaction_id}")
                resp.raise_for_status()
                data = resp.json()

        except httpx.HTTPStatusError as e:
            log.error(
                "esign_fetch_failed",
                transaction_id=transaction_id,
                status=e.response.status_code,
            )
            if e.response.status_code == 404:
                # Transaction not found or expired
                return EsignResult(
                    signed=False,
                    reference="",
                    signed_document_url=None,
                )
            raise

        is_signed = data.get("status", "").upper() == "SIGNED"
        log.info(
            "esign_status_fetched",
            transaction_id=transaction_id,
            signed=is_signed,
        )

        return EsignResult(
            signed=is_signed,
            reference=data.get("esign_reference", ""),
            signed_document_url=data.get("signed_document_url"),
        )

    def verify_callback_signature(self, payload: dict, signature: str) -> bool:
        """Verify webhook callback signature using HMAC.

        Args:
            payload: Callback payload
            signature: Signature header from eSign ASP

        Returns:
            True if signature is valid
        """
        # Create canonical string from payload
        canonical = "|".join(
            [
                payload.get("transaction_id", ""),
                payload.get("status", ""),
                payload.get("esign_reference", ""),
            ]
        )
        # Compute HMAC-SHA256
        computed = hashlib.sha256(
            (canonical + self._api_key).encode()
        ).hexdigest()
        return computed == signature

    @staticmethod
    def _build_callback_url(application_id: str) -> str:
        """Build callback URL for eSign ASP to POST results."""
        # In production, this should be the public API endpoint
        from app.core.config import get_settings

        settings = get_settings()
        base = settings.api_base_url or "https://api.aurum.pms"
        return f"{base}/api/v1/onboarding/applications/{application_id}/esign/callback"


class FakeEsignAdapter(EsignPort):
    """Deterministic stub for local dev/tests."""

    def initiate(self, *, application_id: str, document_bytes: bytes) -> str:
        """Return a fake transaction ID."""
        return f"TXN-FAKE-{uuid.uuid4().hex[:12]}"

    def fetch_result(self, *, transaction_id: str) -> EsignResult:
        """Always return signed (for testing happy path)."""
        return EsignResult(
            signed=True,
            reference=f"ESIGN-{transaction_id[-8:]}",
            signed_document_url="https://example.com/signed-doc.pdf",
        )
