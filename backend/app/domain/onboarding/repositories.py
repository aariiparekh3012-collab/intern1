"""Repository PORT (abstract interface).

The domain declares what persistence it needs; the infrastructure layer provides
the adapter. This dependency inversion keeps the domain free of SQLAlchemy.
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from app.domain.onboarding.entities import OnboardingApplication
from app.domain.onboarding.enums import OnboardingStatus


class OnboardingRepository(ABC):
    @abstractmethod
    def add(self, application: OnboardingApplication) -> None: ...

    @abstractmethod
    def get(self, application_id: uuid.UUID) -> OnboardingApplication | None: ...

    @abstractmethod
    def get_by_pan(self, pan: str) -> OnboardingApplication | None: ...

    @abstractmethod
    def update(self, application: OnboardingApplication) -> None: ...

    @abstractmethod
    def list(self, *, limit: int = 50, offset: int = 0) -> list[OnboardingApplication]: ...

    @abstractmethod
    def list_by_status(
        self, status: OnboardingStatus, *, limit: int = 50, offset: int = 0
    ) -> list[OnboardingApplication]: ...
