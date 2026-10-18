"""Consistent JSON error responses."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.domain.errors import (
    ConflictError,
    DomainError,
    InvalidRequestError,
    LLMConfigurationError,
    LLMError,
    NotFoundError,
)

logger = logging.getLogger(__name__)


def _payload(code: str, message: str, details: object | None = None) -> dict:
    error: dict[str, object] = {"code": code, "message": message}
    if details is not None:
        error["details"] = jsonable_encoder(details)
    return {"error": error}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_payload(
                "validation_error",
                "Some fields need attention.",
                exc.errors(),
            ),
        )

    @app.exception_handler(DomainError)
    async def domain_error(_: Request, exc: DomainError) -> JSONResponse:
        if isinstance(exc, LLMConfigurationError):
            status_code = 503
        elif isinstance(exc, LLMError):
            status_code = 502
        elif isinstance(exc, NotFoundError):
            status_code = 404
        elif isinstance(exc, ConflictError):
            status_code = 409
        elif isinstance(exc, InvalidRequestError):
            status_code = 400
        else:
            status_code = 400

        if isinstance(exc, LLMError):
            logger.warning("LLM error (%s): %s", exc.code, exc.message)
        else:
            logger.info("Request rejected (%s): %s", exc.code, exc.message)

        return JSONResponse(
            status_code=status_code,
            content=_payload(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(Exception)
    async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=_payload("internal_error", "Something went wrong on our side."),
        )
