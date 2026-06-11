"""Seed demo data via the public API (no DB internals required).

Drives the real onboarding endpoints to create a handful of clients end-to-end, so
the Applications and Clients dashboards are populated. Also registers one investor
login whose email matches a seeded application, so the Investor Portal links up.

Prereq: backend running (uvicorn) + DB migrated (alembic upgrade head).

    python scripts/seed_demo.py
    # or point at another host:
    BASE_URL=http://localhost:8000/api/v1 python scripts/seed_demo.py

Uses the local-only /auth/dev-token for the compliance actor (approve + provision),
which exists when ENVIRONMENT != production. Safe to re-run: duplicate PANs are
skipped and the run continues.
"""
from __future__ import annotations

import os
import sys

import httpx

BASE = os.getenv("BASE_URL", "http://localhost:8000/api/v1")

# (name, email, pan, mobile, investment ₹, demat, risk weights)
APPLICANTS = [
    ("Asha Rao",      "asha@example.com",   "ABCDE1234F", "9876543210", 5_000_000, "NSDL", [2, 2, 1, 2, 2]),
    ("Vikram Mehta",  "vikram@example.com", "PQRST5678K", "9811111111", 12_000_000, "CDSL", [3, 3, 4, 3, 3]),
    ("Neha Kapoor",   "neha@example.com",   "LMNOP4321J", "9822222222", 25_000_000, "NSDL", [5, 4, 5, 4, 5]),
    ("Rohan Iyer",    "rohan@example.com",  "FGHIJ8765D", "9833333333", 8_000_000, "CDSL", [3, 2, 3, 4, 3]),
]


def _dev_token(c: httpx.Client, role: str) -> str:
    r = c.post("/auth/dev-token", json={"subject": f"seed.{role}", "role": role})
    r.raise_for_status()
    return r.json()["access_token"]


def seed_one(c: httpx.Client, applicant) -> str | None:
    name, email, pan, mobile, inv, depo, weights = applicant
    # 1) create application
    r = c.post("/onboarding/applications", json={
        "investor_type": "individual", "full_name": name, "email": email,
        "mobile": mobile, "pan": pan, "proposed_investment_inr": inv,
    })
    if r.status_code >= 400:
        print(f"  skip {name}: {r.json().get('error', {}).get('message', r.text)}")
        return None
    app_id = r.json()["id"]

    # 2) KYC (fake adapters verify any PAN not ending in 'Z')
    c.post(f"/onboarding/applications/{app_id}/kyc", json={
        "aadhaar_full": "234567890123", "bank_account_number": "12345678901",
        "bank_ifsc": "HDFC0001234", "bank_holder_name": name,
        "demat_bo_id": "1234567812345678", "demat_depository": depo,
    }).raise_for_status()

    # 3) risk profile
    c.post(f"/onboarding/applications/{app_id}/risk-profile", json={
        "answers": [{"question_id": f"q{i}", "weight": w} for i, w in enumerate(weights)],
    }).raise_for_status()

    # 4) e-sign + 5) approve
    c.post(f"/onboarding/applications/{app_id}/esign/confirm",
           json={"transaction_id": "TXN-SEED"}).raise_for_status()
    c.post(f"/onboarding/applications/{app_id}/decision",
           json={"approve": True}).raise_for_status()
    print(f"  ✓ {name} ({pan}) -> approved")
    return app_id


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=20) as c:
        try:
            token = _dev_token(c, "compliance")
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR: could not get dev token ({exc}). Is the backend running?")
            return 1
        c.headers["Authorization"] = f"Bearer {token}"

        print("Seeding onboarding applications...")
        created = [seed_one(c, a) for a in APPLICANTS]

        print("Provisioning approved clients...")
        r = c.post("/clients/process-outbox")
        if r.status_code < 400:
            print(f"  ✓ provisioned {r.json().get('processed', 0)} client(s)")
        else:
            print(f"  provision failed: {r.text}")

        # Register one investor login matching a seeded application's email.
        try:
            reg = c.post("/auth/register", json={
                "email": "asha@example.com", "password": "investor123",
                "full_name": "Asha Rao", "role": "investor",
            })
            if reg.status_code < 400:
                print("  ✓ investor login ready: asha@example.com / investor123")
            elif "already" in reg.text.lower():
                print("  investor asha@example.com already registered")
        except Exception as exc:  # noqa: BLE001
            print(f"  investor registration skipped: {exc}")

    ok = sum(1 for x in created if x)
    print(f"\nDone. {ok}/{len(APPLICANTS)} applications seeded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
