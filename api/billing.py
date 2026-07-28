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
STRIPE_PUBLISHABLE_KEY = (os.environ.get("STRIPE_PUBLISHABLE_KEY") or "").strip()
SITE_ORIGIN = (os.environ.get("SITE_ORIGIN") or "https://yapplytr.com").strip()

STRIPE_API = "https://api.stripe.com/v1"
# Pinned so embedded Checkout (ui_mode=embedded) keeps working regardless of the
# account's default API version. Overridable via env if ever needed.
STRIPE_API_VERSION = (os.environ.get("STRIPE_API_VERSION") or "2024-06-20").strip()


def handle_billing_config(handler) -> None:
  """Return the publishable key so the client can mount Stripe Elements /
  embedded Checkout. The publishable key is not secret."""
  _json_response(handler, HTTPStatus.OK, {
    "ok": True,
    "publishableKey": STRIPE_PUBLISHABLE_KEY,
    "configured": bool(STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY),
  })


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
      # Pin to an API version where embedded Checkout uses ui_mode=embedded
      # (matches Stripe.js initEmbeddedCheckout). Newer default versions renamed
      # it and reject "embedded", which broke checkout.
      "Stripe-Version": STRIPE_API_VERSION,
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


def _apply_ui_mode(session_form: dict, embedded: bool) -> None:
  """Configure a session form for either embedded (in-app) or hosted checkout."""
  if embedded:
    # Payment happens inside Yapply — no redirect to Stripe's hosted portal.
    session_form["ui_mode"] = "embedded"
    session_form["return_url"] = (
      f"{SITE_ORIGIN}/developer-membership.html?checkout=return&session_id={{CHECKOUT_SESSION_ID}}"
    )
  else:
    session_form["success_url"] = f"{SITE_ORIGIN}/developer-membership.html?checkout=success"
    session_form["cancel_url"] = f"{SITE_ORIGIN}/developer-membership.html?checkout=cancel"


def handle_billing_checkout(handler) -> None:
  """Create a Stripe Checkout Session for a membership plan or token pack.
  If {embedded:true}, returns a clientSecret for in-app Embedded Checkout;
  otherwise returns a hosted-checkout url (legacy)."""
  try:
    payload = json.loads(_read_body(handler) or b"{}")
    plan_id = str(payload.get("planId") or "").strip()
    pack_id = str(payload.get("packId") or "").strip()
    user_id = str(payload.get("userId") or "").strip()
    user_email = str(payload.get("userEmail") or "").strip()
    # Default to embedded (in-app) unless the caller explicitly opts out.
    embedded = payload.get("embedded", True) is not False

    if (not plan_id and not pack_id) or not user_id:
      raise BillingError("INVALID_REQUEST", "planId or packId, and userId are required.")

    # ── One-time token pack purchase ──
    if pack_id:
      pack = _get_pack(pack_id)
      pack_form = {
        "mode": "payment",
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
      _apply_ui_mode(pack_form, embedded)
      if user_email:
        pack_form["customer_email"] = user_email
      session = _stripe_request("/checkout/sessions", pack_form)
      if embedded:
        _json_response(handler, HTTPStatus.OK, {"ok": True, "clientSecret": session.get("client_secret")})
      else:
        _json_response(handler, HTTPStatus.OK, {"ok": True, "url": session.get("url")})
      return

    plan = _get_plan(plan_id)

    session_form = {
      "mode": "subscription",
      "client_reference_id": user_id,
      "metadata[user_id]": user_id,
      "metadata[plan_id]": plan_id,
      "subscription_data[metadata][user_id]": user_id,
      "subscription_data[metadata][plan_id]": plan_id,
    }
    _apply_ui_mode(session_form, embedded)
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
    if embedded:
      _json_response(handler, HTTPStatus.OK, {"ok": True, "clientSecret": session.get("client_secret")})
    else:
      _json_response(handler, HTTPStatus.OK, {"ok": True, "url": session.get("url")})
  except BillingError as err:
    _json_response(handler, err.status, {"ok": False, "code": err.code, "message": err.message})
  except Exception as err:  # noqa: BLE001
    _json_response(handler, 500, {"ok": False, "code": "SERVER_ERROR", "message": str(err)[:300]})


def _ensure_stripe_price(plan: dict) -> str:
  """Return a recurring Stripe Price id for a plan, creating (and caching) a
  Product + Price the first time. Needed because subscriptions with the Payment
  Element require a real Price id, not inline price_data."""
  existing = (plan.get("stripe_price_id") or "").strip()
  if existing:
    return existing
  product = _stripe_request("/products", {"name": f"Yapply {plan['name']} Membership"})
  price = _stripe_request("/prices", {
    "currency": "try",
    "unit_amount": str(int(float(plan["price_try"]) * 100)),
    "recurring[interval]": "month",
    "product": product["id"],
  })
  price_id = price.get("id") or ""
  # Cache back onto the plan so we only create it once.
  try:
    _supabase_request(
      f"/rest/v1/membership_plans?id=eq.{plan['id']}",
      method="PATCH",
      payload={"stripe_price_id": price_id},
      prefer="return=minimal",
    )
  except Exception:  # noqa: BLE001
    pass
  return price_id


def handle_billing_intent(handler) -> None:
  """Create a PaymentIntent (token pack) or an incomplete Subscription (plan)
  and return its client_secret, so the card form renders IN-PAGE with the Stripe
  Payment Element — no hosted Checkout page. Card data goes straight to Stripe."""
  try:
    payload = json.loads(_read_body(handler) or b"{}")
    plan_id = str(payload.get("planId") or "").strip()
    pack_id = str(payload.get("packId") or "").strip()
    user_id = str(payload.get("userId") or "").strip()
    user_email = str(payload.get("userEmail") or "").strip()

    if (not plan_id and not pack_id) or not user_id:
      raise BillingError("INVALID_REQUEST", "planId or packId, and userId are required.")
    if not STRIPE_SECRET_KEY:
      raise BillingError("STRIPE_NOT_CONFIGURED", "Stripe is not configured (missing STRIPE_SECRET_KEY).", 503)

    # ── One-time token pack → PaymentIntent ──
    if pack_id:
      pack = _get_pack(pack_id)
      cents = int(round(float(pack["price_try"]) * 100))
      intent = _stripe_request("/payment_intents", {
        "amount": str(cents),
        "currency": "try",
        "automatic_payment_methods[enabled]": "true",
        "description": f"Yapply {pack['name']} — {pack['tokens']} tokens",
        "receipt_email": user_email or "",
        "metadata[user_id]": user_id,
        "metadata[pack_id]": pack_id,
        "metadata[kind]": "pack",
      })
      _json_response(handler, HTTPStatus.OK, {
        "ok": True, "mode": "payment",
        "clientSecret": intent.get("client_secret"),
        "publishableKey": STRIPE_PUBLISHABLE_KEY,
      })
      return

    # ── Membership plan → incomplete Subscription ──
    plan = _get_plan(plan_id)
    price_id = _ensure_stripe_price(plan)
    customer = _stripe_request("/customers", {"email": user_email} if user_email else {"metadata[user_id]": user_id})
    sub = _stripe_request("/subscriptions", {
      "customer": customer["id"],
      "items[0][price]": price_id,
      "payment_behavior": "default_incomplete",
      "payment_settings[save_default_payment_method]": "on_subscription",
      "expand[0]": "latest_invoice.payment_intent",
      "metadata[user_id]": user_id,
      "metadata[plan_id]": plan_id,
    })
    pi = ((sub.get("latest_invoice") or {}).get("payment_intent")) or {}
    client_secret = pi.get("client_secret")
    if not client_secret:
      raise BillingError("NO_CLIENT_SECRET", "Could not initialize subscription payment.", 502)
    _json_response(handler, HTTPStatus.OK, {
      "ok": True, "mode": "subscription",
      "clientSecret": client_secret,
      "publishableKey": STRIPE_PUBLISHABLE_KEY,
    })
  except BillingError as err:
    _json_response(handler, err.status, {"ok": False, "code": err.code, "message": err.message})
  except Exception as err:  # noqa: BLE001
    _json_response(handler, 500, {"ok": False, "code": "SERVER_ERROR", "message": str(err)[:300]})


def handle_billing_status(handler) -> None:
  """Return the caller's membership status by checkout session_id — lets the
  client confirm success immediately after embedded checkout, without waiting
  on the webhook. Reads the Stripe session and reports paid/plan."""
  try:
    payload = json.loads(_read_body(handler) or b"{}")
    session_id = str(payload.get("sessionId") or "").strip()
    if not session_id:
      raise BillingError("INVALID_REQUEST", "sessionId is required.")
    if not STRIPE_SECRET_KEY:
      raise BillingError("STRIPE_NOT_CONFIGURED", "Stripe is not configured.", 503)
    req = Request(
      f"{STRIPE_API}/checkout/sessions/{session_id}",
      method="GET",
      headers={"Authorization": f"Bearer {STRIPE_SECRET_KEY}", "Stripe-Version": STRIPE_API_VERSION},
    )
    try:
      with urlopen(req, timeout=20) as resp:
        session = json.loads(resp.read().decode("utf-8"))
    except HTTPError as err:
      detail = err.read().decode("utf-8", "replace")
      raise BillingError("STRIPE_ERROR", f"Stripe error: {detail[:300]}", 502)
    paid = session.get("payment_status") in ("paid", "no_payment_required")
    meta = session.get("metadata") or {}
    _json_response(handler, HTTPStatus.OK, {
      "ok": True,
      "paid": paid,
      "status": session.get("status"),
      "planId": meta.get("plan_id") or "",
      "packId": meta.get("pack_id") or "",
    })
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


def _upsert_membership(
  user_id: str,
  plan_id: str,
  provider_ref: str | None,
  period_end: str | None,
  provider: str = "stripe",
  status: str = "active",
) -> None:
  _supabase_request(
    "/rest/v1/memberships?on_conflict=user_id",
    method="POST",
    payload={
      "user_id": user_id,
      "plan_id": plan_id,
      "status": status,
      "provider": provider,
      "provider_ref": provider_ref,
      "current_period_end": period_end,
      "updated_at": "now()",
    },
    prefer="resolution=merge-duplicates",
  )


def _set_profile_plan(user_id: str, plan_id: str) -> None:
  """Mirror the active plan onto the profile so the verified badge and the
  professional-listing gate can read it directly from profiles.current_plan."""
  try:
    _supabase_request(
      f"/rest/v1/profiles?id=eq.{user_id}",
      method="PATCH",
      payload={"current_plan": plan_id or "free", "updated_at": "now()"},
      prefer="return=minimal",
    )
  except Exception:  # noqa: BLE001
    pass


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
    elif event_type == "payment_intent.succeeded":
      # In-page token-pack purchase via the Payment Element.
      meta = obj.get("metadata") or {}
      if meta.get("kind") == "pack" and meta.get("pack_id") and meta.get("user_id"):
        pack = _get_pack(str(meta.get("pack_id")))
        tokens = int(pack.get("tokens") or 0)
        if tokens > 0:
          _grant_tokens(str(meta.get("user_id")), tokens, "purchase", event_id or obj.get("id"))
        _json_response(handler, HTTPStatus.OK, {"ok": True, "granted": tokens, "pack": meta.get("pack_id")})
        return
      _json_response(handler, HTTPStatus.OK, {"ok": True, "ignored": "payment_intent (no pack meta)"})
      return
    elif event_type == "customer.subscription.deleted":
      # Membership canceled/expired — revoke the badge and listing access.
      meta = obj.get("metadata") or {}
      user_id = str(meta.get("user_id") or "")
      if user_id:
        try:
          _supabase_request(
            f"/rest/v1/memberships?user_id=eq.{user_id}",
            method="PATCH",
            payload={"status": "canceled", "updated_at": "now()"},
            prefer="return=minimal",
          )
        except Exception:  # noqa: BLE001
          pass
        _set_profile_plan(user_id, "free")
      _json_response(handler, HTTPStatus.OK, {"ok": True, "canceled": user_id})
      return
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
    # Mirror onto the profile → drives verified badge + professional-listing gate.
    _set_profile_plan(user_id, plan_id)

    _json_response(handler, HTTPStatus.OK, {"ok": True, "granted": tokens})
  except BillingError as err:
    _json_response(handler, err.status, {"ok": False, "code": err.code, "message": err.message})
  except Exception as err:  # noqa: BLE001
    _json_response(handler, 500, {"ok": False, "code": "SERVER_ERROR", "message": str(err)[:300]})


# ─────────────────────────────────────────────────────────────────────────────
# RevenueCat webhook — Apple in-app purchases (iOS app memberships + token packs)
#
# RevenueCat posts an event whenever a purchase, renewal, or cancellation
# happens through Apple. We verify a shared secret, map the Apple product id
# back to a Yapply plan / token pack, and grant access in Supabase — the same
# helpers the Stripe path uses, so the app and website stay in sync.
#
# Product id convention (must match App Store Connect + iap.js):
#   com.yapply.app.membership.<planId>   -> auto-renewable subscription
#   com.yapply.app.tokens.<size>         -> consumable token pack (small/medium/large)
#
# Env: REVENUECAT_WEBHOOK_AUTH  (the Authorization header value you set in the
#      RevenueCat dashboard webhook config).
# ─────────────────────────────────────────────────────────────────────────────

_MEMBERSHIP_PREFIX = "com.yapply.app.membership."
_TOKENS_PREFIX = "com.yapply.app.tokens."
_PACK_BY_SIZE = {"small": "pack-small", "medium": "pack-medium", "large": "pack-large"}


def _ms_to_iso(ms) -> str | None:
  try:
    if not ms:
      return None
    secs = int(ms) / 1000.0
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(secs))
  except Exception:  # noqa: BLE001
    return None


def handle_billing_revenuecat_webhook(handler) -> None:
  """RevenueCat webhook: grant memberships / token packs bought via Apple IAP."""
  payload = _read_body(handler)

  expected = (os.environ.get("REVENUECAT_WEBHOOK_AUTH") or "").strip()
  got = (handler.headers.get("Authorization") or "").strip()
  if not expected or got != expected:
    _json_response(handler, 401, {"ok": False, "code": "UNAUTHORIZED"})
    return

  try:
    body = json.loads(payload.decode("utf-8") or "{}")
    event = body.get("event") or {}
    etype = str(event.get("type") or "")
    user_id = str(event.get("app_user_id") or "")
    product_id = str(event.get("product_id") or "")
    event_id = str(event.get("id") or "")

    # Ignore RevenueCat's own sandbox/test pings and events we can't act on.
    if not user_id or not product_id or user_id.startswith("$RCAnonymous"):
      _json_response(handler, HTTPStatus.OK, {"ok": True, "skipped": "no_user_or_product"})
      return

    if event_id and _already_processed(event_id):
      _json_response(handler, HTTPStatus.OK, {"ok": True, "skipped": "duplicate"})
      return

    # ── Membership subscription ──
    if product_id.startswith(_MEMBERSHIP_PREFIX):
      plan_id = product_id[len(_MEMBERSHIP_PREFIX):].strip()
      period_end = _ms_to_iso(event.get("expiration_at_ms"))
      provider_ref = str(event.get("transaction_id") or event_id or "")

      if etype in ("INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"):
        plan = _get_plan(plan_id)
        _upsert_membership(user_id, plan_id, provider_ref, period_end, provider="apple", status="active")
        _set_profile_plan(user_id, plan_id)
        # Monthly token allowance — only on the actual purchase/renewal events.
        tokens = int(plan.get("tokens_per_month") or 0)
        if tokens > 0 and etype in ("INITIAL_PURCHASE", "RENEWAL"):
          _grant_tokens(user_id, tokens, "membership", event_id or provider_ref)
        _json_response(handler, HTTPStatus.OK, {"ok": True, "plan": plan_id})
        return

      if etype in ("EXPIRATION", "BILLING_ISSUE"):
        # Access actually lapses only on EXPIRATION — CANCELLATION just means
        # auto-renew was turned off; they keep access until the period ends.
        if etype == "EXPIRATION":
          _upsert_membership(user_id, "free", provider_ref, period_end, provider="apple", status="expired")
          _set_profile_plan(user_id, "free")
        _json_response(handler, HTTPStatus.OK, {"ok": True, "status": etype})
        return

      # CANCELLATION and other lifecycle events: acknowledge, no access change.
      _json_response(handler, HTTPStatus.OK, {"ok": True, "ignored": etype})
      return

    # ── One-time token pack (consumable) ──
    if product_id.startswith(_TOKENS_PREFIX):
      size = product_id[len(_TOKENS_PREFIX):].strip()
      pack_id = _PACK_BY_SIZE.get(size)
      if pack_id and etype in ("NON_RENEWING_PURCHASE", "INITIAL_PURCHASE"):
        pack = _get_pack(pack_id)
        tokens = int(pack.get("tokens") or 0)
        if tokens > 0:
          _grant_tokens(user_id, tokens, "purchase", event_id or product_id)
        _json_response(handler, HTTPStatus.OK, {"ok": True, "granted": tokens, "pack": pack_id})
        return
      _json_response(handler, HTTPStatus.OK, {"ok": True, "ignored": etype})
      return

    _json_response(handler, HTTPStatus.OK, {"ok": True, "skipped": "unknown_product"})
  except BillingError as err:
    _json_response(handler, err.status, {"ok": False, "code": err.code, "message": err.message})
  except Exception as err:  # noqa: BLE001
    _json_response(handler, 500, {"ok": False, "code": "SERVER_ERROR", "message": str(err)[:300]})
