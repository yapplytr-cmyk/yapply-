"""
Yapply billing — Stripe Checkout + webhook token grants.

Environment variables required (set in Vercel → Project → Settings → Env):
  STRIPE_SECRET_KEY       sk_live_... or sk_test_...
  STRIPE_WEBHOOK_SECRET   whsec_...  (from the Stripe webhook endpoint config)
  SITE_ORIGIN             https://yapplytr.com  (fallback default below)

Flow:
  POST /api/billing/checkout   {planId, userId, userEmail}
      → creates a Stripe Checkout Session (subscription) and returns {url}
      → plan/token config is read from Supabase membership_plans
  POST /api/billing/webhook    (Stripe → server)
      → verifies signature, on checkout.session.completed / invoice.paid
        grants tokens via the service-role grant_tokens RPC and upserts membership

Uses only the Python stdlib (urllib, hmac) — no external dependencies.
"""

from __future__ import annotations

import hmac
import hashlib
import json
import os
import time
from http import HTTPStatus
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from backend.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

STRIPE_SECRET_KEY = (os.environ.get("STRIPE_SECRET_KEY") or "").strip()
STRIPE_WEBHOOK_SECRET = (os.environ.get("STRIPE_WEBHOOK_SECRET") or "").strip()
SITE_ORIGIN = (os.environ.get("SITE_ORIGIN") or "https://yapplytr.com").strip()

STRIPE_API = "https://api.stripe.com/v1"


class BillingError(Exception):
  def __init__(self, code: str, message: str, status: int = 400):
    super().__init__(message)
    self.code = code
    self.message = message
    self.status = status


def _json_response(handler, status, payload):
  body = json.dumps(payload).encode("utf-8")
  handler.send_response(status)
  handler.send_header("Content-Type", "application/json")
  handler.send_header("Access-Control-Allow-Origin", "*")
  handler.end_headers()
  handler.wfile.write(body)


def _read_body(handler) -> bytes:
  length = int(handler.headers.get("Content-Length") or 0)
  return handler.rfile.read(length) if length > 0 else b""


def _stripe_request(path: str, form: dict) -> dict:
  if not STRIPE_SECRET_KEY:
    raise BillingError("STRIPE_NOT_CONFIGURED", "Stripe is not configured yet (missing STRIPE_SECRET_KEY).", 503)
  data = urlencode(form, doseq=True).encode("utf-8")
  req = Request(
    f"{STRIPE_API}{path}",
    data=data,
    method="POST",
    headers={
      "Authorization": f"Bearer {STRIPE_SECRET_KEY}",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  )
  try:
    with urlopen(req, timeout=20) as resp:
      return json.loads(resp.read().decode("utf-8"))
  except HTTPError as err:
    detail = err.read().decode("utf-8", "replace")
    raise BillingError("STRIPE_ERROR", f"Stripe error: {detail[:400]}", 502)


def _supabase_request(path: str, method: str = "GET", payload: dict | None = None, prefer: str | None = None):
  headers = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
  }
  if prefer:
    headers["Prefer"] = prefer
  data = json.dumps(payload).encode("utf-8") if payload is not None else None
  req = Request(f"{SUPABASE_URL}{path}", data=data, method=method, headers=headers)
  with urlopen(req, timeout=20) as resp:
    raw = resp.read().decode("utf-8")
    return json.loads(raw) if raw else None


def _get_plan(plan_id: str) -> dict:
  rows = _supabase_request(f"/rest/v1/membership_plans?id=eq.{plan_id}&active=eq.true&select=*")
  if not rows:
    raise BillingError("PLAN_NOT_FOUND", "Unknown membership plan.", 404)
  return rows[0]


def _get_pack(pack_id: str) -> dict:
  rows = _supabase_request(f"/rest/v1/token_packs?id=eq.{pack_id}&active=eq.true&select=*")
  if not rows:
    raise BillingError("PACK_NOT_FOUND", "Unknown token pack.", 404)
  return rows[0]


def handle_billing_checkout(handler) -> None:
  """Create a Stripe Checkout Session for a membership plan."""
  try:
    payload = json.loads(_read_body(handler) or b"{}")
    plan_id = str(payload.get("planId") or "").strip()
    pack_id = str(payload.get("packId") or "").strip()
    user_id = str(payload.get("userId") or "").strip()
    user_email = str(payload.get("userEmail") or "").strip()

    if (not plan_id and not pack_id) or not user_id:
      raise BillingError("INVALID_REQUEST", "planId or packId, and userId are required.")

    # ── One-time token pack purchase ──
    if pack_id:
      pack = _get_pack(pack_id)
      pack_form = {
        "mode": "payment",
        "success_url": f"{SITE_ORIGIN}/developer-membership.html?checkout=success",
        "cancel_url": f"{SITE_ORIGIN}/developer-membership.html?checkout=cancel",
        "client_reference_id": user_id,
        "metadata[user_id]": user_id,
        "metadata[pack_id]": pack_id,
        "payment_intent_data[metadata][user_id]": user_id,
        "payment_intent_data[metadata][pack_id]": pack_id,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "try",
        "line_items[0][price_data][unit_amount]": str(int(float(pack["price_try"]) * 100)),
        "line_items[0][price_data][product_data][name]": f"Yapply {pack['name']} — {pack['tokens']} tokens",
      }
      if user_email:
        pack_form["customer_email"] = user_email
      session = _stripe_request("/checkout/sessions", pack_form)
      _json_response(handler, HTTPStatus.OK, {"ok": True, "url": session.get("url")})
      return

    plan = _get_plan(plan_id)

    session_form = {
      "mode": "subscription",
      "success_url": f"{SITE_ORIGIN}/developer-membership.html?checkout=success",
      "cancel_url": f"{SITE_ORIGIN}/developer-membership.html?checkout=cancel",
      "client_reference_id": user_id,
      "metadata[user_id]": user_id,
      "metadata[plan_id]": plan_id,
      "subscription_data[metadata][user_id]": user_id,
      "subscription_data[metadata][plan_id]": plan_id,
    }
    if user_email:
      session_form["customer_email"] = user_email

    stripe_price = (plan.get("stripe_price_id") or "").strip()
    if stripe_price:
      session_form["line_items[0][price]"] = stripe_price
      session_form["line_items[0][quantity]"] = "1"
    else:
      # No pre-created Stripe price — use inline price_data (TRY, monthly).
      session_form["line_items[0][quantity]"] = "1"
      session_form["line_items[0][price_data][currency]"] = "try"
      session_form["line_items[0][price_data][unit_amount]"] = str(int(float(plan["price_try"]) * 100))
      session_form["line_items[0][price_data][recurring][interval]"] = "month"
      session_form["line_items[0][price_data][product_data][name]"] = f"Yapply {plan['name']} Membership"

    session = _stripe_request("/checkout/sessions", session_form)
    _json_response(handler, HTTPStatus.OK, {"ok": True, "url": session.get("url")})
  except BillingError as err:
    _json_response(handler, err.status, {"ok": False, "code": err.code, "message": err.message})
  except Exception as err:  # noqa: BLE001
    _json_response(handler, 500, {"ok": False, "code": "SERVER_ERROR", "message": str(err)[:300]})


def _verify_stripe_signature(payload: bytes, sig_header: str) -> bool:
  """Verify Stripe-Signature header (v1 scheme) with STRIPE_WEBHOOK_SECRET."""
  if not STRIPE_WEBHOOK_SECRET or not sig_header:
    return False
  try:
    parts = dict(item.split("=", 1) for item in sig_header.split(",") if "=" in item)
    timestamp = parts.get("t", "")
    signature = parts.get("v1", "")
    if not timestamp or not signature:
      return False
    # Reject events older than 5 minutes (replay protection)
    if abs(time.time() - int(timestamp)) > 300:
      return False
    signed = f"{timestamp}.".encode("utf-8") + payload
    expected = hmac.new(STRIPE_WEBHOOK_SECRET.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
  except Exception:  # noqa: BLE001
    return False


def _grant_tokens(user_id: str, amount: int, reason: str, ref: str | None) -> None:
  _supabase_request(
    "/rest/v1/rpc/grant_tokens",
    method="POST",
    payload={"p_user_id": user_id, "p_amount": amount, "p_reason": reason, "p_ref": ref},
  )


def _upsert_membership(user_id: str, plan_id: str, provider_ref: str | None, period_end: str | None) -> None:
  _supabase_request(
    "/rest/v1/memberships?on_conflict=user_id",
    method="POST",
    payload={
      "user_id": user_id,
      "plan_id": plan_id,
      "status": "active",
      "provider": "stripe",
      "provider_ref": provider_ref,
      "current_period_end": period_end,
      "updated_at": "now()",
    },
    prefer="resolution=merge-duplicates",
  )


def _already_processed(event_id: str) -> bool:
  """Idempotency: skip events whose id already appears in the token ledger."""
  try:
    rows = _supabase_request(f"/rest/v1/token_transactions?ref_id=eq.{event_id}&select=id&limit=1")
    return bool(rows)
  except Exception:  # noqa: BLE001
    return False


def handle_billing_webhook(handler) -> None:
  """Stripe webhook: grant tokens when a subscription payment succeeds."""
  payload = _read_body(handler)
  sig = handler.headers.get("Stripe-Signature", "")

  if not _verify_stripe_signature(payload, sig):
    _json_response(handler, 400, {"ok": False, "code": "BAD_SIGNATURE"})
    return

  try:
    event = json.loads(payload.decode("utf-8"))
    event_id = str(event.get("id") or "")
    event_type = str(event.get("type") or "")
    obj = (event.get("data") or {}).get("object") or {}

    if event_id and _already_processed(event_id):
      _json_response(handler, HTTPStatus.OK, {"ok": True, "skipped": "duplicate"})
      return

    user_id = ""
    plan_id = ""
    provider_ref = None
    period_end = None

    if event_type == "checkout.session.completed":
      meta = obj.get("metadata") or {}
      user_id = str(meta.get("user_id") or obj.get("client_reference_id") or "")
      pack_id = str(meta.get("pack_id") or "")
      if pack_id and user_id:
        # One-time token pack — grant and stop (no membership involved).
        pack = _get_pack(pack_id)
        tokens = int(pack.get("tokens") or 0)
        if tokens > 0:
          _grant_tokens(user_id, tokens, "purchase", event_id or obj.get("id"))
        _json_response(handler, HTTPStatus.OK, {"ok": True, "granted": tokens, "pack": pack_id})
        return
      plan_id = str(meta.get("plan_id") or "")
      provider_ref = obj.get("subscription") or obj.get("id")
    elif event_type in ("invoice.paid", "invoice.payment_succeeded"):
      # Recurring renewals — metadata lives on the subscription.
      lines = ((obj.get("lines") or {}).get("data")) or []
      meta = {}
      for line in lines:
        meta = line.get("metadata") or {}
        if meta.get("user_id"):
          break
      if not meta.get("user_id"):
        meta = obj.get("subscription_details", {}).get("metadata", {}) or {}
      user_id = str(meta.get("user_id") or "")
      plan_id = str(meta.get("plan_id") or "")
      provider_ref = obj.get("subscription")
      try:
        period_ts = int(((lines[0] or {}).get("period") or {}).get("end") or 0) if lines else 0
        if period_ts:
          period_end = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(period_ts))
      except Exception:  # noqa: BLE001
        period_end = None
    else:
      _json_response(handler, HTTPStatus.OK, {"ok": True, "ignored": event_type})
      return

    if not user_id or not plan_id:
      _json_response(handler, HTTPStatus.OK, {"ok": True, "skipped": "missing metadata"})
      return

    plan = _get_plan(plan_id)
    tokens = int(plan.get("tokens_per_month") or 0)
    if tokens > 0:
      _grant_tokens(user_id, tokens, "membership_grant", event_id or provider_ref)
    _upsert_membership(user_id, plan_id, provider_ref, period_end)

    _json_response(handler, HTTPStatus.OK, {"ok": True, "granted": tokens})
  except BillingError as err:
    _json_response(handler, err.status, {"ok": False, "code": err.code, "message": err.message})
  except Exception as err:  # noqa: BLE001
    _json_response(handler, 500, {"ok": False, "code": "SERVER_ERROR", "message": str(err)[:300]})
