import logging
import os
from urllib.parse import parse_qs

import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from src.api_response import create_api_response
from src.shared.common_fn import get_value_from_env

load_dotenv()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "").strip()
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "").strip()
AUTH_EXEMPT_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}
# EventSource cannot send custom headers, so these endpoints may pass the token as a query param
SSE_TOKEN_PATHS = ("/update_extract_status/", "/document_status/")
jwks_client = PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json", cache_keys=True) if AUTH0_DOMAIN else None


def extract_email_claim(claims: dict) -> str | None:
    """Get the user email from token claims, supporting Auth0 namespaced custom claims (e.g. "https://myapp/email")."""
    email = claims.get("email")
    if not email:
        email = next((value for key, value in claims.items() if key.endswith("/email") and isinstance(value, str)), None)
    return email


def verify_bearer_token(token: str) -> dict:
    """Verify an Auth0-issued JWT against the tenant JWKS and return its claims."""
    if jwks_client is None:
        raise ValueError("AUTH0_DOMAIN is not configured on the backend")
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=AUTH0_AUDIENCE or None,
        issuer=f"https://{AUTH0_DOMAIN}/",
        options={"verify_aud": bool(AUTH0_AUDIENCE)},
    )


class BearerAuthMiddleware:
    """Reject any request that does not carry a valid Auth0 bearer token."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        if not get_value_from_env("AUTHENTICATION_REQUIRED", False, bool):
            return await self.app(scope, receive, send)
        path = scope["path"]
        if path in AUTH_EXEMPT_PATHS or scope["method"] == "OPTIONS":
            return await self.app(scope, receive, send)
        token = None
        auth_header = next((value for name, value in scope["headers"] if name == b"authorization"), None)
        if auth_header is not None:
            parts = auth_header.decode("utf-8", errors="ignore").split(" ", 1)
            if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
                token = parts[1].strip()
        elif path.startswith(SSE_TOKEN_PATHS):
            query = parse_qs(scope.get("query_string", b"").decode("utf-8"))
            token = next(iter(query.get("access_token", [])), None)
        if not token:
            response = JSONResponse(
                status_code=401,
                content=create_api_response("Unauthorized", message="Missing bearer token in Authorization header")
            )
            return await response(scope, receive, send)
        try:
            claims = verify_bearer_token(token)
            # Expose the verified identity to endpoints via request.state
            scope.setdefault("state", {})["token_email"] = extract_email_claim(claims)
        except Exception as e:
            logging.warning(f"Bearer token verification failed: {e}")
            response = JSONResponse(
                status_code=401,
                content=create_api_response("Unauthorized", message="Invalid or expired bearer token")
            )
            return await response(scope, receive, send)
        await self.app(scope, receive, send)
