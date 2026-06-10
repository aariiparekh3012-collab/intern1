"""Reference-data domain entities (pure Python, no ORM).

These are lightweight value-holder entities for master/static data. They don't
have complex lifecycle rules like the onboarding aggregate, so they're kept
simple. The ORM models map directly to these.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class Security:
    """A tradable instrument in the securities master."""

    isin: str
    symbol: str
    exchange: str
    instrument_type: str  # equity, debt, etf, etc.
    sector: str | None = None
    is_active: bool = True
    id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass
class Benchmark:
    name: str
    code: str  # e.g. NIFTY50, SENSEX
    id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass
class BenchmarkValue:
    benchmark_id: uuid.UUID
    as_of: str  # date string
    index_level: Decimal
    id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass
class Strategy:
    """A discretionary model portfolio."""

    name: str
    code: str
    approach: str  # value, growth, multi-cap, etc.
    benchmark_id: uuid.UUID | None = None
    is_active: bool = True
    id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass
class StrategyConstituent:
    strategy_id: uuid.UUID
    security_id: uuid.UUID
    target_weight: Decimal
    id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass
class Broker:
    name: str
    sebi_reg_no: str
    is_active: bool = True
    id: uuid.UUID = field(default_factory=uuid.uuid4)
