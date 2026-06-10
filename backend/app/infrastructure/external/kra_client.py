"""KRA / CKYC adapter implementing KycPort."""
from __future__ import annotations

import json
import logging
import uuid

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.application.onboarding.ports import KycPort, KycResult
from app.core.config import get_settings
from app.core.exceptions import ValidationError

log = logging.getLogger(__name__)


class KraKycAdapter(KycPort):
    """KRA adapter for live PAN + Aadhaar verification."""

    def __init__(self) -> None:
        s = get_settings()
        if not s.kra_base_url or not s.kra_api_key:
            raise RuntimeError("KRA_BASE_URL and KRA_API_KEY required")
        self._base = s.kra_base_url
        self._api_key = s.kra_api_key
        self._headers = {
            "Authorization": f"Bearer {s.kra_api_key}",
            "Content-Type": "application/json",
            "X-Request-ID": str(uuid.uuid4()),
        }
        self._timeout = 15

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, max=6),
        reraise=True,
    )
    def verify(self, *, pan: str, aadhaar_last4: str, name: str) -> KycResult:
        if not self._is_valid_pan(pan):
            raise ValidationError("Invalid PAN format", code="invalid_pan")
        if not aadhaar_last4.isdigit() or len(aadhaar_last4) != 4:
            raise ValidationError("Aadhaar last4 must be 4 digits", code="invalid_aadhaar")

        request_id = str(uuid.uuid4())
        try:
            with httpx.Client(
                base_url=self._base, headers=self._headers, timeout=self._timeout
            ) as client:
                resp = client.post(
                    "/verify",
                    json={
                        "pan": pan,
                        "aadhaar_last4": aadhaar_last4,
                        "name": name.strip(),
                        "request_id": request_id,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

        except httpx.HTTPStatusError as e:
            if 400 <= e.response.status_code < 500:
                try:
                    error_body = e.response.json()
                    reason = error_body.get("reason", str(e))
                except json.JSONDecodeError:
                    reason = e.response.text
                return KycResult(verified=False, source="kra", reference="", reason=reason)
            raise

        except httpx.RequestError:
            raise

        status = data.get("status", "").upper()
        verified = status == "VERIFIED"
        reference = data.get("kra_reference", data.get("id", ""))
        return KycResult(
            verified=verified,
            source="kra",
            reference=reference,
            reason=data.get("reason"),
        )

    @staticmethod
    def _is_valid_pan(pan: str) -> bool:
        return len(pan) == 10 and pan[0:5].isalpha() and pan[5:9].isdigit() and pan[9].isalpha()


class FakeKycAdapter(KycPort):
    """Deterministic stub for local dev / tests: PAN ending in 'Z' fails."""

    def verify(self, *, pan: str, aadhaar_last4: str, name: str) -> KycResult:
        if pan.endswith("Z"):
            return KycResult(False, "kra", "", reason="Name/PAN mismatch (stub)")
        return KycResult(True, "kra", f"KRA-{pan[-4:]}-{aadhaar_last4}")
