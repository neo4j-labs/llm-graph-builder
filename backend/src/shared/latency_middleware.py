from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from time import time 
from src.logger import CustomLogger

logger = CustomLogger()

class LatencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time()
        response = await call_next(request)
        process_time = time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        logger.log_struct(f"Endpoint: {request.url.path}, Latency: {process_time:.4f} seconds", "INFO")
        return response