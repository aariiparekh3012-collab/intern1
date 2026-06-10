# Discretionary PMS Platform — Client Onboarding & KYC

A SEBI-compliant **Discretionary Portfolio Management Service (PMS)** platform (reference
architecture inspired by Zerodha PMS). This repository scaffolds the **Client Onboarding &
KYC** bounded context end to end.

> Stack: **React + TypeScript** (frontend) · **Python / FastAPI** (backend) · **PostgreSQL** (database)
> Architecture: **Clean / Hexagonal (Ports & Adapters)** with a clear domain core.

## Why this feature first

Under the *SEBI (Portfolio Managers) Regulations, 2020*, no client funds may be accepted until:

1. KYC is completed through a **KRA** (KYC Registration Agency) and/or **CKYC** (CERSAI).
2. A documented **risk profile** has been captured and the suitability of the strategy assessed.
3. A signed **PMS Agreement** (per SEBI Schedule IV) is in place — minimum investment **₹50 lakh**.
4. The investor's **bank** and **demat** accounts are verified and linked.

Onboarding is therefore the gate to every other module (portfolio, orders, fees, reporting).

## Layout

```
.
├── backend/         # FastAPI app — clean architecture (domain/application/infrastructure/api)
├── frontend/        # React + TS — feature-sliced onboarding wizard
├── docs/            # ARCHITECTURE.md, DATABASE.md, IMPLEMENTATION_PLAN.md
└── docker-compose.yml
```

## Quick start

```bash
# 1. Infra (Postgres)
docker compose up -d db

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs

# 3. Frontend
cd ../frontend
npm install
npm run dev                      # http://localhost:5173
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/DATABASE.md`](docs/DATABASE.md) and
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for full detail.
