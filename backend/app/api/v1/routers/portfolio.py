"""Portfolio endpoints — accounts, holdings, cash ledger, fee schedules."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import dependencies as deps
from app.core.database import get_db
from app.infrastructure.db.models_portfolio import (
    CashLedgerModel,
    FeeScheduleModel,
    HoldingModel,
    PortfolioAccountModel,
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# ── Schemas ────────────────────────────────────────────────────────────────

class PortfolioAccountOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    strategy_id: uuid.UUID
    account_code: str
    status: str
    inception_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class PortfolioAccountCreate(BaseModel):
    client_id: uuid.UUID
    strategy_id: uuid.UUID
    account_code: str
    inception_date: date


class HoldingOut(BaseModel):
    id: uuid.UUID
    portfolio_account_id: uuid.UUID
    security_id: uuid.UUID
    quantity: float
    avg_cost_paise: int

    class Config:
        from_attributes = True


class CashLedgerOut(BaseModel):
    id: uuid.UUID
    portfolio_account_id: uuid.UUID
    entry_type: str
    amount_paise: int
    balance_paise: int
    posted_on: date

    class Config:
        from_attributes = True


class FeeScheduleOut(BaseModel):
    id: uuid.UUID
    name: str
    mgmt_fee_pct: float
    perf_fee_pct: float
    high_water_mark: bool
    hurdle_rate_pct: float | None

    class Config:
        from_attributes = True


class FeeScheduleCreate(BaseModel):
    name: str
    mgmt_fee_pct: float
    perf_fee_pct: float = 0
    high_water_mark: bool = False
    hurdle_rate_pct: float | None = None


# ── Fee Schedules ─────────────────────────────────────────────────────────

@router.get("/fee-schedules", response_model=list[FeeScheduleOut])
def list_fee_schedules(
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.get_current_user),
):
    stmt = select(FeeScheduleModel).order_by(FeeScheduleModel.name)
    return db.scalars(stmt).all()


@router.post("/fee-schedules", response_model=FeeScheduleOut, status_code=201)
def create_fee_schedule(
    body: FeeScheduleCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.require_compliance),
):
    sched = FeeScheduleModel(
        name=body.name,
        mgmt_fee_pct=body.mgmt_fee_pct,
        perf_fee_pct=body.perf_fee_pct,
        high_water_mark=body.high_water_mark,
        hurdle_rate_pct=body.hurdle_rate_pct,
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched


# ── Accounts ───────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=list[PortfolioAccountOut])
def list_accounts(
    client_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.get_current_user),
):
    stmt = select(PortfolioAccountModel).order_by(PortfolioAccountModel.account_code)
    if client_id:
        stmt = stmt.where(PortfolioAccountModel.client_id == client_id)
    return db.scalars(stmt).all()


@router.post("/accounts", response_model=PortfolioAccountOut, status_code=201)
def create_account(
    body: PortfolioAccountCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.require_compliance),
):
    acct = PortfolioAccountModel(
        client_id=body.client_id,
        strategy_id=body.strategy_id,
        account_code=body.account_code,
        inception_date=body.inception_date,
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


@router.get("/accounts/{account_id}", response_model=PortfolioAccountOut)
def get_account(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.get_current_user),
):
    acct = db.get(PortfolioAccountModel, account_id)
    if not acct:
        from app.core.exceptions import DomainError
        raise DomainError("Portfolio account not found", code="not_found")
    return acct


# ── Holdings ───────────────────────────────────────────────────────────────

@router.get("/accounts/{account_id}/holdings", response_model=list[HoldingOut])
def list_holdings(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.get_current_user),
):
    stmt = select(HoldingModel).where(HoldingModel.portfolio_account_id == account_id)
    return db.scalars(stmt).all()


# ── Cash ledger ────────────────────────────────────────────────────────────

@router.get("/accounts/{account_id}/cash", response_model=list[CashLedgerOut])
def list_cash_ledger(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: dict = Depends(deps.get_current_user),
):
    stmt = (
        select(CashLedgerModel)
        .where(CashLedgerModel.portfolio_account_id == account_id)
        .order_by(CashLedgerModel.posted_on.desc())
        .limit(200)
    )
    return db.scalars(stmt).all()
