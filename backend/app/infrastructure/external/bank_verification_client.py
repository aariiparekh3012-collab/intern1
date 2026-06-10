"""Penny-drop bank verification adapter implementing BankVerificationPort."""
from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.application.onboarding.ports import BankVerificationPort, BankVerificationResult
from app.core.config import get_settings


class PennyDropAdapter(BankVerificationPort):
    def __init__(self) -> None:
        s = get_settings()
        self._base = s.bank_verify_base_url
        self._headers = {"Authorization": f"Bearer {s.bank_verify_api_key}"}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.5, max=4))
    def verify(self, *, account_number: str, ifsc: str, name: str) -> BankVerificationResult:
        with httpx.Client(base_url=self._base, headers=self._headers, timeout=10) as c:
            resp = c.post(
                "/penny-drop",
                json={"account_number": account_number, "ifsc": ifsc, "name": name},
            )
            resp.raise_for_status()
            data = resp.json()
        return BankVerificationResult(
            verified=data.get("account_exists", False),
            name_match_score=float(data.get("name_match_score", 0.0)),
            reason=data.get("reason"),
        )


class FakeBankVerificationAdapter(BankVerificationPort):
    def verify(self, *, account_number: str, ifsc: str, name: str) -> BankVerificationResult:
        return BankVerificationResult(verified=True, name_match_score=0.97)
