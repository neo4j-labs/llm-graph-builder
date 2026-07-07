import logging
import os
import time
from functools import lru_cache
from typing import Any, Optional

import httpx
from fastapi import Header, HTTPException
from jose import jwt


class AuthConfigError(RuntimeError):
    pass


def _get_env_str(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name, default)
    if value is None:
        return None
    return str(value).strip()


def _get_env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


@lru_cache(maxsize=1)
def _auth_settings() -> dict[str, Any]:
    domain = _get_env_str("AUTH0_DOMAIN")
    audience = _get_env_str("AUTH0_AUDIENCE")
    if not domain or not audience:
        raise AuthConfigError("AUTH0_DOMAIN and AUTH0_AUDIENCE must be configured when authentication is required.")
    issuer = f"https://{domain}/"
    jwks_url = f"https://{domain}/.well-known/jwks.json"
    return {"domain": domain, "audience": audience, "issuer": issuer, "jwks_url": jwks_url}


_jwks_cache: dict[str, Any] = {"expires_at": 0, "keys": []}


def _get_jwks() -> list[dict[str, Any]]:
    now = time.time()
    if _jwks_cache["keys"] and _jwks_cache["expires_at"] > now:
        return _jwks_cache["keys"]

    settings = _auth_settings()
    with httpx.Client(timeout=5.0) as client:
        response = client.get(settings["jwks_url"])
        response.raise_for_status()
        data = response.json()

    keys = data.get("keys", [])
    if not keys:
        raise HTTPException(status_code=401, detail="Unable to load signing keys")

    _jwks_cache["keys"] = keys
    _jwks_cache["expires_at"] = now + 3600
    return keys


def _is_auth_required() -> bool:
    return _get_env_bool("AUTHENTICATION_REQUIRED", False)


def verify_bearer_token(authorization: Optional[str]) -> Optional[dict[str, Any]]:
    if not authorization:
        if _is_auth_required():
            raise HTTPException(status_code=401, detail="Login required")
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        keys = _get_jwks()
        matching_key = next((key for key in keys if key.get("kid") == kid), None)
        if not matching_key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        settings = _auth_settings()
        claims = jwt.decode(
            token,
            matching_key,
            algorithms=["RS256"],
            audience=settings["audience"],
            issuer=settings["issuer"],
            options={"verify_at_hash": False},
        )
        return claims
    except HTTPException:
        raise
    except AuthConfigError as exc:
        logging.error("Authentication configuration error: %s", exc)
        raise HTTPException(status_code=500, detail="Authentication is misconfigured") from exc
    except Exception as exc:
        logging.warning("Token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def get_verified_user(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    claims = verify_bearer_token(authorization)
    if claims is None:
        if _is_auth_required():
            raise HTTPException(status_code=401, detail="Login required")
        return {}
    return claims


async def get_optional_verified_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict[str, Any]]:
    return verify_bearer_token(authorization)


def resolve_trusted_email(claims: Optional[dict[str, Any]], fallback_email: Optional[str]) -> Optional[str]:
    if claims:
        token_email = claims.get("email")
        if not token_email:
            raise HTTPException(status_code=401, detail="Token is missing email claim")
        if claims.get("email_verified") is False:
            raise HTTPException(status_code=401, detail="Token email is not verified")
        return str(token_email).strip().lower()
    return (fallback_email or "").strip().lower() or None
