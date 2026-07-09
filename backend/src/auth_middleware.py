import logging
import os
from urllib.parse import parse_qs

from dotenv import load_dotenv
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
import requests

from src.api_response import create_api_response
from src.shared.common_fn import get_value_from_env

load_dotenv()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "").strip()
AUTH_EXEMPT_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/backend_connection_configuration"}
# EventSource cannot send custom headers, so these endpoints may pass the token as a query param
SSE_TOKEN_PATHS = ("/update_extract_status/", "/document_status/")


def validate_token_and_get_email(token: str) -> str | None:
    """
    Validate an Auth0 token by calling the /userinfo endpoint and extract the user's email.
    
    This approach validates the token directly with Auth0, ensuring:
    - Token is not expired or revoked
    - Token is valid for the current Auth0 tenant
    - User information is current
    
    Works with all Auth0 token types (JWT, JWE, opaque).
    
    Args:
        token: The bearer token to validate
        
    Returns:
        User's email if token is valid, None if email not found
        
    Raises:
        ValueError: If token is invalid, expired, or validation fails
    """
    if not AUTH0_DOMAIN:
        raise ValueError("AUTH0_DOMAIN is not configured")
    
    try:
        # Validate token with Auth0 by calling /userinfo endpoint
        response = requests.get(
            f"https://{AUTH0_DOMAIN}/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        
        if response.status_code == 200:
            userinfo = response.json()
            
            # Extract email from userinfo response
            email = userinfo.get("email")
            if not email:
                # Check for namespaced email claim (e.g., "https://myapp/email")
                email = next((value for key, value in userinfo.items() 
                            if key.endswith("/email") and isinstance(value, str)), None)
            
            if email:
                logging.info(f"Token validated successfully, email: {email}")
                return email
            else:
                logging.warning("Token is valid but email not found in userinfo response")
                return None
                
        elif response.status_code == 401:
            logging.warning("Token rejected by Auth0 (invalid or expired)")
            raise ValueError("Invalid or expired token")
        else:
            logging.error(f"Unexpected Auth0 /userinfo response: {response.status_code}")
            raise ValueError(f"Token validation failed with status {response.status_code}")
            
    except requests.exceptions.Timeout:
        logging.error("Timeout calling Auth0 /userinfo endpoint")
        raise ValueError("Token validation timeout")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error calling Auth0 /userinfo endpoint: {e}")
        raise ValueError(f"Token validation failed: {e}")


class BearerAuthMiddleware:
    """
    ASGI middleware to enforce Auth0 bearer token authentication.
    
    For each request:
    1. Checks if authentication is required
    2. Extracts bearer token from Authorization header or query params (for SSE)
    3. Validates the token against Auth0
    4. Extracts user email and stores it in request.state for downstream use
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Only process HTTP requests
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        
        # Check if authentication is required
        if not get_value_from_env("AUTHENTICATION_REQUIRED", False, bool):
            return await self.app(scope, receive, send)
        
        path = scope["path"]
        
        # Skip authentication for exempt paths and OPTIONS requests
        if path in AUTH_EXEMPT_PATHS or scope["method"] == "OPTIONS":
            return await self.app(scope, receive, send)
        
        # Extract token from Authorization header
        token = None
        auth_header = next((value for name, value in scope["headers"] if name == b"authorization"), None)
        if auth_header is not None:
            parts = auth_header.decode("utf-8", errors="ignore").split(" ", 1)
            if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
                token = parts[1].strip()
        # For SSE endpoints, token can be in query string (since EventSource can't set headers)
        elif path.startswith(SSE_TOKEN_PATHS):
            query = parse_qs(scope.get("query_string", b"").decode("utf-8"))
            token = next(iter(query.get("access_token", [])), None)
        
        # Reject request if no token provided
        if not token:
            logging.warning(f"Request to {path} missing bearer token")
            response = JSONResponse(
                status_code=401,
                content=create_api_response("Unauthorized", message="Missing bearer token in Authorization header")
            )
            return await response(scope, receive, send)
        
        # Validate token and extract email
        try:
            email = validate_token_and_get_email(token)
            
            # Store email in request state for use by endpoint handlers
            if "state" not in scope:
                scope["state"] = {}
            scope["state"]["token_email"] = email
            
            logging.info(f"User authenticated: {email or 'unknown'} for {path}")
            
        except ValueError as e:
            # Token validation failed
            logging.warning(f"Token validation failed for {path}: {e}")
            response = JSONResponse(
                status_code=401,
                content=create_api_response("Unauthorized", message=str(e))
            )
            return await response(scope, receive, send)
        except Exception as e:
            # Unexpected error during validation
            logging.error(f"Unexpected error validating token for {path}: {e}")
            response = JSONResponse(
                status_code=401,
                content=create_api_response("Unauthorized", message="Token validation failed")
            )
            return await response(scope, receive, send)
        
        # Continue to the application
        await self.app(scope, receive, send)
