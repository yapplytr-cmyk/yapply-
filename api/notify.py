"""Lightweight notification-only API endpoint.

Receives a notification type + payload and dispatches the appropriate
email via Resend.  Does NOT perform any database writes — this is purely
for sending transactional emails when the frontend has already written
to Supabase PostgreSQL directly.

Also handles push notification dispatch to registered device tokens.
"""

from __future__ import annotations

import json
import logging
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

log = logging.getLogger("yapply.notify")

# ── CORS helper ──────────────────────────────────────────

def _cors_headers(origin: str = "*"):
    return {
        "Access-Control-Allow-Origin": origin or "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }


def _json_response(handler, status: int, payload: dict) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    origin = handler.headers.get("Origin", "*") if handler.headers else "*"
    for k, v in _cors_headers(origin).items():
        handler.send_header(k, v)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


# ── Notification dispatcher ──────────────────────────────

def _dispatch_notification(notify_type: str, payload: dict) -> dict:
    """Dispatch to the appropriate email function based on type."""

    if notify_type == "listing_created":
        from backend.email import send_client_listing_created, send_developer_listing_created
        listing_type = payload.get("listingType") or payload.get("type") or "client"
        if listing_type == "developer":
            send_developer_listing_created(payload)
        else:
            send_client_listing_created(payload)
        return {"sent": True, "type": notify_type}

    if notify_type == "bid_received":
        from backend.email import send_bid_received
        listing = payload.get("listing") or {}
        bid = payload.get("bid") or {}
        send_bid_received(listing, bid)
        return {"sent": True, "type": notify_type}

    if notify_type == "bid_accepted":
        from backend.email import send_bid_accepted
        listing = payload.get("listing") or {}
        bid = payload.get("bid") or {}
        send_bid_accepted(listing, bid)

        # Also send push notification if device tokens are available
        _send_push_for_bid_accepted(listing, bid)

        return {"sent": True, "type": notify_type}

    if notify_type == "inquiry_received":
        from backend.email import send_inquiry_received
        listing = payload.get("listing") or {}
        inquiry = payload.get("inquiry") or {}
        send_inquiry_received(listing, inquiry)
        return {"sent": True, "type": notify_type}

    return {"sent": False, "type": notify_type, "reason": "unknown_type"}


def _send_push_for_bid_accepted(listing: dict, bid: dict) -> None:
    """Send APNs push notification to the developer whose bid was accepted."""
    try:
        dev_user_id = (
            bid.get("developerUserId")
            or bid.get("developerId")
            or (bid.get("developerProfileReference") or {}).get("userId")
            or ""
        )
        if not dev_user_id:
            return

        # Look up device tokens from Supabase
        import os
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError, URLError

        supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        if not supabase_url or not service_key:
            log.info("Push: no Supabase config for device token lookup")
            return

        # Query device_tokens table
        url = f"{supabase_url}/rest/v1/device_tokens?user_id=eq.{dev_user_id}&platform=eq.ios&select=token"
        req = Request(url, headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        })

        with urlopen(req, timeout=5) as resp:
            tokens_data = json.loads(resp.read())

        if not tokens_data:
            log.info("Push: no device tokens for user %s", dev_user_id)
            return

        listing_title = listing.get("title") or "a project"
        # Send APNs push via Supabase Edge Function or direct APNs
        # For now, we'll use a Supabase Edge Function if available
        push_fn_url = f"{supabase_url}/functions/v1/send-push"
        for token_row in tokens_data:
            device_token = token_row.get("token")
            if not device_token:
                continue

            push_payload = json.dumps({
                "token": device_token,
                "title": "Teklifiniz Kabul Edildi!",
                "body": f'"{listing_title}" projesindeki teklifiniz kabul edildi.',
                "data": {
                    "type": "bid_accepted",
                    "listingId": listing.get("id") or "",
                },
            }).encode("utf-8")

            push_req = Request(
                push_fn_url,
                method="POST",
                data=push_payload,
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": "application/json",
                },
            )
            try:
                with urlopen(push_req, timeout=10) as push_resp:
                    push_resp.read()
                log.info("Push sent to device %s...", device_token[:12])
            except (HTTPError, URLError, OSError) as exc:
                log.warning("Push send failed for token %s: %s", device_token[:12], exc)

    except Exception as exc:
        log.warning("Push notification dispatch failed: %s", exc)


# ── HTTP handler ─────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        origin = self.headers.get("Origin", "*") if self.headers else "*"
        for k, v in _cors_headers(origin).items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length) if content_length else b"{}"
            body = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            _json_response(self, HTTPStatus.BAD_REQUEST, {
                "ok": False, "code": "INVALID_JSON", "message": "Request body must be valid JSON."
            })
            return

        notify_type = body.get("type", "").strip()
        payload = body.get("payload") or {}

        if not notify_type:
            _json_response(self, HTTPStatus.BAD_REQUEST, {
                "ok": False, "code": "MISSING_TYPE", "message": "Notification type is required."
            })
            return

        try:
            result = _dispatch_notification(notify_type, payload)
            _json_response(self, HTTPStatus.OK, {"ok": True, **result})
        except Exception as exc:
            log.exception("Notification dispatch error for type=%s", notify_type)
            _json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {
                "ok": False, "code": "NOTIFY_FAILED", "message": str(exc)
            })
