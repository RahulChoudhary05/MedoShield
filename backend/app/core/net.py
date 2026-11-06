"""Client identity behind the Cloudflare -> Render proxy chain.

Behind a proxy every request appears to come from the proxy's IP, which would
make per-IP rate limits and login lockouts shared by *all* users. The Cloudflare
Pages Function therefore forwards the visitor's address in `X-Client-IP` and
signs the request with `X-Proxy-Secret`. We only trust `X-Client-IP` when the
secret matches (constant-time), so a caller hitting Render directly cannot spoof
an IP to dodge rate limits.
"""
from __future__ import annotations

import hmac
import ipaddress

from starlette.requests import Request

from app.core.config import settings

PROXY_HEADER = "x-proxy-secret"
CLIENT_IP_HEADER = "x-client-ip"


def from_trusted_proxy(request: Request) -> bool:
    secret = settings.PROXY_SHARED_SECRET
    supplied = request.headers.get(PROXY_HEADER, "")
    return bool(secret) and bool(supplied) and hmac.compare_digest(secret.encode(), supplied.encode())


def client_ip(request: Request) -> str:
    if from_trusted_proxy(request):
        raw = request.headers.get(CLIENT_IP_HEADER, "").strip()
        try:
            return str(ipaddress.ip_address(raw))
        except ValueError:
            pass
    return request.client.host if request.client else "unknown"
