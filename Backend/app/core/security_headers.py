from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


def _build_connect_src() -> str:
    origins = set()
    for origin in settings.CORS_ORIGINS:
        parsed = urlparse(origin)
        host = parsed.hostname or "localhost"
        port = parsed.port
        origins.add(f"http://{host}" + (f":{port}" if port else ""))
        origins.add(f"ws://{host}" + (f":{port}" if port else ""))
    origins.add("'self'")
    return " ".join(sorted(origins))


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), fullscreen=(self)"
        )
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            f"connect-src {_build_connect_src()}; "
            "frame-ancestors 'none'"
        )
        return response