"""Domain & application exception hierarchy + FastAPI handlers.

Keeping a typed hierarchy lets the API layer map business failures to stable HTTP
status codes and machine-readable error codes (consumed by the React client).
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Base class for all expected business-rule violations."""

    code = "domain_error"
    http_status = 400

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class NotFoundError(DomainError):
    code = "not_found"
    http_status = 404


class ValidationError(DomainError):
    code = "validation_error"
    http_status = 422


class InvalidStateTransition(DomainError):
    code = "invalid_state_transition"
    http_status = 409


class ExternalServiceError(DomainError):
    """Raised when a regulated integration (KRA/CKYC/eSign/penny-drop) fails."""

    code = "external_service_error"
    http_status = 502


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.http_status,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(Exception)
    async def _handle_unhandled(_: Request, exc: Exception) -> JSONResponse:
        import traceback
        tb = traceback.format_exc()
        print(f"UNHANDLED ERROR: {exc}\n{tb}", flush=True)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": str(exc)}},
        )
