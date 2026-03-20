from __future__ import annotations

import json
from http import HTTPStatus

from backend.supabase import (
  authenticate_public_user,
  authenticate_admin,
  complete_signup_verification,
  register_public_user,
  resend_signup_otp,
  SupabaseError,
  count_active_admin_profiles,
  delete_user_account,
  get_runtime_status,
  get_public_auth_config,
  list_account_directory,
  list_profiles,
  require_public_access,
  require_admin_access,
  resolve_admin_email,
  update_own_account_settings,
  update_profile_status,
)
from backend.db import create_marketplace_bid, delete_marketplace_listing, get_marketplace_listing, list_marketplace_bids_for_bidder, list_marketplace_listings


def json_response(handler, status: int, payload: dict) -> None:
  body = json.dumps(payload).encode("utf-8")
  handler.send_response(status)
  if hasattr(handler, "send_header"):
    origin = handler.headers.get("Origin", "").strip() if getattr(handler, "headers", None) else ""
    if origin:
      handler.send_header("Access-Control-Allow-Origin", origin)
      handler.send_header("Access-Control-Allow-Credentials", "true")
      handler.send_header("Vary", "Origin")
  handler.send_header("Content-Type", "application/json; charset=utf-8")
  handler.send_header("Cache-Control", "no-store")
  handler.send_header("Content-Length", str(len(body)))
  handler.end_headers()
  handler.wfile.write(body)


def parse_json_body(handler) -> dict:
  content_length = int(handler.headers.get("Content-Length", "0") or "0")
  if content_length <= 0:
    return {}
  raw = handler.rfile.read(content_length)
  if not raw:
    return {}
  try:
    return json.loads(raw.decode("utf-8"))
  except json.JSONDecodeError as error:
    raise SupabaseError("INVALID_JSON", "Invalid JSON payload.", 400) from error


def normalize_text(value) -> str:
  if value is None:
    return ""
  return str(value).strip()


def extract_bearer_token(handler) -> str:
  authorization = handler.headers.get("Authorization", "").strip()
  if authorization.lower().startswith("bearer "):
    return authorization[7:].strip()
  return ""


def handle_supabase_error(handler, error: Exception) -> None:
  if isinstance(error, SupabaseError):
    json_response(
      handler,
      error.status,
      {
        "ok": False,
        "code": error.code,
        "message": error.message,
      },
    )
    return

  json_response(
    handler,
    HTTPStatus.INTERNAL_SERVER_ERROR,
    {
      "ok": False,
      "code": "SERVER_ERROR",
      "message": "The Supabase auth service encountered an internal error.",
    },
  )


def run_supabase_action(handler, action) -> None:
  try:
    action(handler)
  except Exception as error:
    handle_supabase_error(handler, error)


def handle_public_auth_config(handler) -> None:
  try:
    config = get_public_auth_config()
    json_response(handler, HTTPStatus.OK, {"ok": True, **config})
  except SupabaseError as error:
    status = get_runtime_status()
    json_response(
      handler,
      error.status,
      {
        "ok": False,
        "code": error.code,
        "message": error.message,
        "debug": status.get("detectedEnv", {}),
        "reason": status.get("reason"),
      },
    )


def handle_admin_identifier_resolve(handler) -> None:
  payload = parse_json_body(handler)
  identifier = str(payload.get("identifier") or "").strip()

  if not identifier:
    raise SupabaseError("IDENTIFIER_REQUIRED", "A username or email is required.", 400)

  resolved = resolve_admin_email(identifier)
  json_response(handler, HTTPStatus.OK, {"ok": True, **resolved})


def handle_admin_login(handler) -> None:
  payload = parse_json_body(handler)
  identifier = str(payload.get("identifier") or "").strip()
  password = str(payload.get("password") or "")

  if not identifier:
    raise SupabaseError("IDENTIFIER_REQUIRED", "A username or email is required.", 400)
  if not password:
    raise SupabaseError("PASSWORD_REQUIRED", "A password is required.", 400)

  result = authenticate_admin(identifier, password)
  json_response(handler, HTTPStatus.OK, {"ok": True, **result})


def handle_public_signup(handler) -> None:
  payload = parse_json_body(handler)
  result = register_public_user(payload)
  json_response(handler, HTTPStatus.CREATED, {"ok": True, **result})


def handle_verify_signup(handler) -> None:
  payload = parse_json_body(handler)
  email = str(payload.get("email") or "").strip()
  token = str(payload.get("token") or "").strip()
  password = str(payload.get("password") or "")

  if not email:
    raise SupabaseError("EMAIL_INVALID", "Email is required for verification.", 400)
  if not token:
    raise SupabaseError("OTP_REQUIRED", "Please enter the verification code.", 400)
  if not password:
    raise SupabaseError("PASSWORD_REQUIRED", "Password is required to complete verification.", 400)

  result = complete_signup_verification(email, token, password)
  json_response(handler, HTTPStatus.OK, {"ok": True, **result})


def handle_resend_signup_otp(handler) -> None:
  payload = parse_json_body(handler)
  email = str(payload.get("email") or "").strip()

  if not email:
    raise SupabaseError("EMAIL_INVALID", "Email is required to resend code.", 400)

  resend_signup_otp(email)
  json_response(handler, HTTPStatus.OK, {"ok": True, "message": "Verification code resent."})


def handle_public_login(handler) -> None:
  payload = parse_json_body(handler)
  identifier = str(payload.get("identifier") or payload.get("email") or "").strip()
  password = str(payload.get("password") or "")
  role = str(payload.get("role") or "").strip().lower()

  if not identifier:
    raise SupabaseError("EMAIL_INVALID", "Please enter a valid email address.", 400)
  if not password:
    raise SupabaseError("PASSWORD_REQUIRED", "Please enter your password.", 400)

  result = authenticate_public_user(identifier, password, role)
  json_response(handler, HTTPStatus.OK, {"ok": True, **result})


def handle_account_settings_update(handler) -> None:
  access_token = extract_bearer_token(handler)
  payload = parse_json_body(handler)
  result = update_own_account_settings(access_token, payload)
  json_response(handler, HTTPStatus.OK, {"ok": True, **result})


def handle_client_dashboard(handler) -> None:
  _, profile = require_public_access(extract_bearer_token(handler), "client")
  owner_user_id = str(profile.get("id") or "").strip()
  owner_email = str(profile.get("email") or "").strip().lower()

  listings = [
    listing
    for listing in list_marketplace_listings(listing_type="client", status="", limit=200)
    if (
      str(listing.get("ownerUserId") or "") == owner_user_id
      or (owner_email and str(listing.get("ownerEmail") or "").strip().lower() == owner_email)
    )
  ]

  json_response(handler, HTTPStatus.OK, {"ok": True, "listings": listings})


def handle_developer_dashboard(handler) -> None:
  _, profile = require_public_access(extract_bearer_token(handler), "developer")
  owner_user_id = str(profile.get("id") or "").strip()

  listings = [
    listing
    for listing in list_marketplace_listings(listing_type="professional", status="", limit=200)
    if str(listing.get("ownerUserId") or "") == owner_user_id
  ]
  bids = list_marketplace_bids_for_bidder(owner_user_id, limit=200)

  json_response(handler, HTTPStatus.OK, {"ok": True, "listings": listings, "bids": bids})


def handle_supabase_bid_create(handler) -> None:
  try:
    _, profile = require_public_access(extract_bearer_token(handler), "developer")
  except SupabaseError as error:
    json_response(handler, error.status, {"ok": False, "code": error.code, "message": error.message})
    return

  payload = parse_json_body(handler)
  bid = payload.get("bid") if isinstance(payload.get("bid"), dict) else None
  if not bid:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_BID", "message": "A valid bid payload is required."})
    return

  developer_id = str(profile.get("id") or "").strip()
  if not developer_id:
    json_response(handler, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": "AUTH_REQUIRED", "message": "Developer identity could not be resolved."})
    return

  listing_id = normalize_text(bid.get("listingId") or "")
  if not listing_id:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_BID", "message": "A listing id is required."})
    return

  listing = get_marketplace_listing(listing_id)
  if not listing:
    json_response(handler, HTTPStatus.NOT_FOUND, {"ok": False, "code": "LISTING_NOT_FOUND", "message": "The target listing could not be found."})
    return

  listing_status = (listing.get("marketplaceMeta") or {}).get("listingStatus") or listing.get("status")
  if listing.get("type") != "client":
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_BID_TARGET", "message": "Bids can only be submitted on client project listings."})
    return
  if listing_status != "open-for-bids":
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "BIDDING_CLOSED", "message": "This listing is not currently open for bids."})
    return

  try:
    stored_bid = create_marketplace_bid({
      **bid,
      "bidderRole": "developer",
      "developerProfileReference": {
        "userId": developer_id,
        "companyName": profile.get("companyName") or profile.get("fullName") or "",
        "specialties": profile.get("specialties") or "",
      },
    })
  except ValueError as error:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_BID", "message": str(error)})
    return

  refreshed_listing = get_marketplace_listing(listing_id)

  # Send email before response (Vercel kills threads after response).
  try:
    from backend.email import send_bid_received
    send_bid_received(listing, stored_bid)
  except Exception:
    pass

  json_response(handler, HTTPStatus.CREATED, {"ok": True, "bid": stored_bid, "listing": refreshed_listing})


def handle_admin_accounts(handler) -> None:
  require_admin_access(extract_bearer_token(handler))
  accounts = list_account_directory()
  json_response(handler, HTTPStatus.OK, {"ok": True, "accounts": accounts})


def handle_admin_account_store_status(handler) -> None:
  require_admin_access(extract_bearer_token(handler))
  json_response(handler, HTTPStatus.OK, {"ok": True, "status": get_runtime_status()})


def handle_admin_account_status(handler) -> None:
  _, current_profile = require_admin_access(extract_bearer_token(handler))
  payload = parse_json_body(handler)
  user_id = str(payload.get("userId") or "").strip()
  action = str(payload.get("action") or "").strip().lower()

  if not user_id or action not in {"disable", "enable"}:
    raise SupabaseError("INVALID_ACCOUNT_ACTION", "A valid account action is required.", 400)

  if current_profile.get("id") == user_id and action == "disable":
    raise SupabaseError("ACCOUNT_SELF_PROTECTED", "You cannot disable your own admin account.", 400)

  target_user = next((account for account in list_profiles() if account.get("id") == user_id), None)
  if not target_user:
    raise SupabaseError("ACCOUNT_NOT_FOUND", "The requested account could not be found.", 404)

  if action == "disable" and target_user.get("role") == "admin" and count_active_admin_profiles(exclude_user_id=user_id) == 0:
    raise SupabaseError("LAST_ADMIN_PROTECTED", "The last remaining admin account cannot be disabled.", 400)

  user = update_profile_status(user_id, action == "enable")
  json_response(handler, HTTPStatus.OK, {"ok": True, "user": user})


def handle_admin_account_delete(handler) -> None:
  _, current_profile = require_admin_access(extract_bearer_token(handler))
  payload = parse_json_body(handler)
  user_id = str(payload.get("userId") or "").strip()

  if not user_id:
    raise SupabaseError("INVALID_ACCOUNT_ACTION", "A valid account id is required.", 400)

  if current_profile.get("id") == user_id:
    raise SupabaseError("ACCOUNT_SELF_PROTECTED", "You cannot delete your own admin account.", 400)

  target_user = next((account for account in list_profiles() if account.get("id") == user_id), None)
  if not target_user:
    raise SupabaseError("ACCOUNT_NOT_FOUND", "The requested account could not be found.", 404)

  if target_user.get("role") == "admin" and count_active_admin_profiles(exclude_user_id=user_id) == 0:
    raise SupabaseError("LAST_ADMIN_PROTECTED", "The last remaining admin account cannot be deleted.", 400)

  delete_user_account(user_id)
  json_response(handler, HTTPStatus.OK, {"ok": True, "deletedUserId": user_id})


def handle_admin_marketplace_listing_delete(handler) -> None:
  require_admin_access(extract_bearer_token(handler))
  payload = parse_json_body(handler)
  listing_id = str(payload.get("listingId") or "").strip()

  if not listing_id:
    raise SupabaseError("INVALID_LISTING", "A listing id is required.", 400)

  listing = get_marketplace_listing(listing_id)
  if not listing:
    raise SupabaseError("LISTING_NOT_FOUND", "The requested listing could not be found.", 404)

  deleted = delete_marketplace_listing(listing_id)
  if not deleted:
    raise SupabaseError("DELETE_FAILED", "The listing could not be deleted.", 500)

  json_response(handler, HTTPStatus.OK, {"ok": True, "deletedListingId": listing_id})
