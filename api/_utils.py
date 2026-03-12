from __future__ import annotations

import hmac
import hashlib
import json
from http import HTTPStatus
from http.cookies import SimpleCookie
from urllib.parse import parse_qs, urlparse

from backend.config import (
  ADMIN_BOOTSTRAP_TOKEN,
  ADMIN_ROLES,
  IS_VERCEL,
  SEEDED_ADMIN_EMAIL,
  SEEDED_ADMIN_FULL_NAME,
  SEEDED_ADMIN_PASSWORD,
  SEEDED_ADMIN_ROLE,
  SEEDED_ADMIN_USERNAME,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  USE_REMOTE_USER_STORE,
)
from backend.db import (
  count_active_admin_users,
  create_marketplace_listing,
  create_session,
  create_user,
  delete_session,
  delete_user_account,
  ensure_database,
  get_account_store_status,
  get_marketplace_listing,
  get_session_user,
  get_record_value,
  get_user_by_identifier,
  get_user_by_id,
  list_users,
  seed_admin_account,
  serialize_user,
  update_user_status,
)
from backend.security import issue_session_token, issue_signed_session_token, verify_password, verify_signed_session_token
from backend.server import ensure_seeded_admin_account, normalize_text, parse_json_body, validate_login, validate_signup


def bootstrap_backend() -> None:
  ensure_database()
  ensure_seeded_admin_account()


def handle_api_failure(handler, error: Exception | None = None) -> None:
  if isinstance(error, RuntimeError):
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE",
        "message": str(error) or "The live account store is currently unavailable.",
      },
    )
    return

  json_response(
    handler,
    HTTPStatus.INTERNAL_SERVER_ERROR,
    {
      "ok": False,
      "code": "SERVER_ERROR",
      "message": "The requested API action failed due to a server error.",
    },
  )


def run_api_action(handler, action) -> None:
  try:
    bootstrap_backend()
    action(handler)
  except Exception as error:
    handle_api_failure(handler, error)


def json_response(handler, status: int, payload: dict, cookie: str | None = None) -> None:
  body = json.dumps(payload).encode("utf-8")
  handler.send_response(status)
  if cookie:
    handler.send_header("Set-Cookie", cookie)
  handler.send_header("Content-Type", "application/json; charset=utf-8")
  handler.send_header("Cache-Control", "no-store")
  handler.send_header("Content-Length", str(len(body)))
  handler.end_headers()
  handler.wfile.write(body)


def build_cookie(token: str, max_age: int = SESSION_TTL_SECONDS) -> str:
  cookie = SimpleCookie()
  cookie[SESSION_COOKIE_NAME] = token
  cookie[SESSION_COOKIE_NAME]["path"] = "/"
  cookie[SESSION_COOKIE_NAME]["httponly"] = True
  cookie[SESSION_COOKIE_NAME]["samesite"] = "Lax"
  cookie[SESSION_COOKIE_NAME]["max-age"] = max_age
  if IS_VERCEL:
    cookie[SESSION_COOKIE_NAME]["secure"] = True
  return cookie.output(header="").strip()


def clear_cookie() -> str:
  return build_cookie("", 0)


def get_session_token(handler) -> str | None:
  raw_cookie = handler.headers.get("Cookie", "")
  if not raw_cookie:
    return None
  cookie = SimpleCookie()
  cookie.load(raw_cookie)
  morsel = cookie.get(SESSION_COOKIE_NAME)
  return morsel.value if morsel else None


def get_authenticated_user(handler) -> dict | None:
  token = get_session_token(handler)
  if not token:
    return None

  if IS_VERCEL:
    signed_payload = verify_signed_session_token(token)
    if signed_payload:
      role = signed_payload.get("role")
      status = signed_payload.get("status", "active")

      if status != "active":
        return None

      return {
        "id": signed_payload.get("id"),
        "username": signed_payload.get("username"),
        "email": signed_payload.get("email"),
        "role": role,
        "fullName": signed_payload.get("fullName"),
        "phoneNumber": signed_payload.get("phoneNumber"),
        "companyName": signed_payload.get("companyName"),
        "professionType": signed_payload.get("professionType"),
        "serviceArea": signed_payload.get("serviceArea"),
        "yearsExperience": signed_payload.get("yearsExperience"),
        "specialties": signed_payload.get("specialties"),
        "preferredRegion": signed_payload.get("preferredRegion"),
        "website": signed_payload.get("website"),
        "createdAt": signed_payload.get("createdAt"),
        "status": status,
      }

  token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
  return get_session_user(token_hash)


def require_admin_user(handler) -> dict | None:
  user = get_authenticated_user(handler)

  if not user:
    json_response(handler, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": "AUTH_REQUIRED", "message": "Admin authentication is required."})
    return None

  if user["role"] not in ADMIN_ROLES:
    json_response(handler, HTTPStatus.FORBIDDEN, {"ok": False, "code": "ADMIN_ONLY", "message": "This endpoint is available only to admin users."})
    return None

  return user


def _extract_bootstrap_token(handler) -> str:
  authorization = handler.headers.get("Authorization", "").strip()
  if authorization.lower().startswith("bearer "):
    return authorization[7:].strip()

  return handler.headers.get("X-Yapply-Bootstrap-Token", "").strip()


def require_bootstrap_token(handler) -> bool:
  if not ADMIN_BOOTSTRAP_TOKEN:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "BOOTSTRAP_DISABLED",
        "message": "The production admin bootstrap token is not configured.",
      },
    )
    return False

  provided_token = _extract_bootstrap_token(handler)
  if not provided_token or not hmac.compare_digest(provided_token, ADMIN_BOOTSTRAP_TOKEN):
    json_response(
      handler,
      HTTPStatus.FORBIDDEN,
      {
        "ok": False,
        "code": "BOOTSTRAP_TOKEN_INVALID",
        "message": "A valid bootstrap token is required for this endpoint.",
      },
    )
    return False

  return True


def build_session_user(user_id: str) -> dict | None:
  user_row = get_user_by_id(user_id)
  return serialize_user(user_row) if user_row else None


def handle_signup(handler) -> None:
  try:
    payload = parse_json_body(handler)
  except ValueError:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
    return

  try:
    clean_payload, error = validate_signup(payload)
  except RuntimeError:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE",
        "message": "The live account store is currently unavailable. Please try again shortly.",
      },
    )
    return
  if error:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": error[0], "message": error[1]})
    return

  if IS_VERCEL and not USE_REMOTE_USER_STORE:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE",
        "message": "The live account store is not configured for shared cross-device login yet.",
      },
    )
    return

  try:
    user = create_user(clean_payload)
  except RuntimeError:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE",
        "message": "The live account store is currently unavailable. Please try again shortly.",
      },
    )
    return
  if IS_VERCEL:
    token = issue_signed_session_token(user, SESSION_TTL_SECONDS)
    json_response(handler, HTTPStatus.CREATED, {"ok": True, "user": user}, cookie=build_cookie(token))
    return

  token, token_hash = issue_session_token()
  create_session(user["id"], token_hash, handler.headers.get("User-Agent", ""), handler.client_address[0] if handler.client_address else "")
  json_response(handler, HTTPStatus.CREATED, {"ok": True, "user": user}, cookie=build_cookie(token))


def handle_login(handler) -> None:
  try:
    payload = parse_json_body(handler)
  except ValueError:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
    return

  audience = normalize_text(payload.get("audience")) or "public"

  if audience == "public" and IS_VERCEL and not USE_REMOTE_USER_STORE:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE",
        "message": "The live account store is not configured for shared cross-device login yet.",
      },
    )
    return

  try:
    login_payload, error = validate_login(payload, audience)
  except RuntimeError:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE",
        "message": "The live account store is currently unavailable. Please try again shortly.",
      },
    )
    return
  if error:
    json_response(handler, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": error[0], "message": error[1]})
    return

  user = login_payload["user"]
  if IS_VERCEL:
    session_user = build_session_user(user["id"])
    if not session_user:
      json_response(handler, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": "ACCOUNT_NOT_FOUND", "message": "The requested account could not be found."})
      return
    token = issue_signed_session_token(session_user, SESSION_TTL_SECONDS)
    json_response(handler, HTTPStatus.OK, {"ok": True, "user": session_user}, cookie=build_cookie(token))
    return

  token, token_hash = issue_session_token()
  create_session(user["id"], token_hash, handler.headers.get("User-Agent", ""), handler.client_address[0] if handler.client_address else "")
  json_response(handler, HTTPStatus.OK, {"ok": True, "user": get_session_user(token_hash)}, cookie=build_cookie(token))


def handle_logout(handler) -> None:
  token = get_session_token(handler)
  if token:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    delete_session(token_hash)

  json_response(handler, HTTPStatus.OK, {"ok": True}, cookie=clear_cookie())


def handle_session(handler) -> None:
  user = get_authenticated_user(handler)
  if not user:
    json_response(handler, HTTPStatus.OK, {"authenticated": False, "user": None}, cookie=clear_cookie())
    return

  json_response(handler, HTTPStatus.OK, {"authenticated": True, "user": user})


def handle_admin_accounts(handler) -> None:
  if not require_admin_user(handler):
    return

  try:
    accounts = list_users()
  except RuntimeError:
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {"ok": False, "code": "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE", "message": "The live account store is currently unavailable."},
    )
    return

  json_response(handler, HTTPStatus.OK, {"ok": True, "accounts": accounts})


def handle_admin_account_store_status(handler) -> None:
  if not require_admin_user(handler):
    return

  json_response(handler, HTTPStatus.OK, {"ok": True, "status": get_account_store_status()})


def handle_admin_bootstrap_seed(handler) -> None:
  if not require_bootstrap_token(handler):
    return

  status = get_account_store_status()
  if status.get("mode") != "remote-kv" or not status.get("remoteConfigured") or not status.get("remoteReachable"):
    json_response(
      handler,
      HTTPStatus.SERVICE_UNAVAILABLE,
      {
        "ok": False,
        "code": "REMOTE_STORE_REQUIRED",
        "message": "The active account store is not the live remote KV store.",
        "status": status,
      },
    )
    return

  existing_user = get_user_by_identifier(SEEDED_ADMIN_EMAIL) or get_user_by_identifier(SEEDED_ADMIN_USERNAME)
  existed_already = bool(existing_user)

  seeded_user = seed_admin_account(
    email=SEEDED_ADMIN_EMAIL,
    password=SEEDED_ADMIN_PASSWORD,
    full_name=SEEDED_ADMIN_FULL_NAME,
    role=SEEDED_ADMIN_ROLE,
    username=SEEDED_ADMIN_USERNAME,
  )

  verified_user = get_user_by_identifier(SEEDED_ADMIN_USERNAME) or get_user_by_identifier(SEEDED_ADMIN_EMAIL)
  stored_role = get_record_value(verified_user, "role")
  stored_hash = get_record_value(verified_user, "password_hash", "passwordHash")
  password_verified = bool(stored_hash and verify_password(SEEDED_ADMIN_PASSWORD, stored_hash))
  role_verified = stored_role == SEEDED_ADMIN_ROLE
  readable = verified_user is not None
  username_matches = get_record_value(verified_user, "username") == SEEDED_ADMIN_USERNAME
  email_matches = (get_record_value(verified_user, "email") or "").strip().lower() == SEEDED_ADMIN_EMAIL
  login_ready = readable and role_verified and password_verified and username_matches and email_matches

  payload = {
    "ok": login_ready,
    "status": status,
    "account": {
      "identifier": SEEDED_ADMIN_USERNAME,
      "email": SEEDED_ADMIN_EMAIL,
      "role": SEEDED_ADMIN_ROLE,
      "existedAlready": existed_already,
      "action": "updated" if existed_already else "created",
      "seededUserId": seeded_user.get("id"),
      "readBackUserId": get_record_value(verified_user, "id"),
      "readable": readable,
      "usernameMatches": username_matches,
      "emailMatches": email_matches,
      "roleVerified": role_verified,
      "passwordVerified": password_verified,
      "loginShouldNowWork": login_ready,
    },
  }

  if not login_ready:
    json_response(
      handler,
      HTTPStatus.INTERNAL_SERVER_ERROR,
      {
        **payload,
        "code": "BOOTSTRAP_VERIFY_FAILED",
        "message": "The admin account was written, but verification against the live KV store failed.",
      },
    )
    return

  json_response(
    handler,
    HTTPStatus.OK,
    {
      **payload,
      "message": "The admin account is now seeded and verified in the live KV-backed account store.",
    },
  )


def handle_admin_account_status(handler) -> None:
  current_user = require_admin_user(handler)
  if not current_user:
    return

  try:
    payload = parse_json_body(handler)
  except ValueError:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
    return

  user_id = normalize_text(payload.get("userId"))
  action = normalize_text(payload.get("action"))

  if not user_id or action not in {"disable", "enable"}:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_ACCOUNT_ACTION", "message": "A valid account action is required."})
    return

  target_user = get_user_by_id(user_id)
  if not target_user:
    json_response(handler, HTTPStatus.NOT_FOUND, {"ok": False, "code": "ACCOUNT_NOT_FOUND", "message": "The requested account could not be found."})
    return

  if action == "disable":
    if target_user["id"] == current_user["id"]:
      json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "ACCOUNT_SELF_PROTECTED", "message": "You cannot disable your own admin account."})
      return

    if target_user["role"] in ADMIN_ROLES and count_active_admin_users(exclude_user_id=target_user["id"]) == 0:
      json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "LAST_ADMIN_PROTECTED", "message": "The last active admin account cannot be disabled."})
      return

    updated_user = update_user_status(user_id, False)
    json_response(handler, HTTPStatus.OK, {"ok": True, "user": updated_user})
    return

  updated_user = update_user_status(user_id, True)
  json_response(handler, HTTPStatus.OK, {"ok": True, "user": updated_user})


def handle_admin_account_delete(handler) -> None:
  current_user = require_admin_user(handler)
  if not current_user:
    return

  try:
    payload = parse_json_body(handler)
  except ValueError:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
    return

  user_id = normalize_text(payload.get("userId"))
  if not user_id:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_ACCOUNT_ACTION", "message": "A valid account id is required."})
    return

  target_user = get_user_by_id(user_id)
  if not target_user:
    json_response(handler, HTTPStatus.NOT_FOUND, {"ok": False, "code": "ACCOUNT_NOT_FOUND", "message": "The requested account could not be found."})
    return

  if target_user["id"] == current_user["id"]:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "ACCOUNT_SELF_PROTECTED", "message": "You cannot delete your own admin account."})
    return

  if target_user["role"] in ADMIN_ROLES and count_active_admin_users(exclude_user_id=target_user["id"]) == 0:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "LAST_ADMIN_PROTECTED", "message": "The last active admin account cannot be deleted."})
    return

  delete_user_account(user_id)
  json_response(handler, HTTPStatus.OK, {"ok": True, "deletedUserId": user_id})


def resolve_listing_owner(handler, payload: dict) -> dict | None:
  session_user = get_authenticated_user(handler)

  if session_user and session_user.get("role") in {"client", "developer", "admin", "moderator"}:
    return {
      "id": session_user.get("id"),
      "role": session_user.get("role"),
      "fullName": session_user.get("fullName"),
      "email": session_user.get("email"),
    }

  owner = payload.get("owner") if isinstance(payload.get("owner"), dict) else None

  if not owner:
    return None

  role = normalize_text(owner.get("role"))
  if role not in {"client", "developer"}:
    return None

  return {
    "id": normalize_text(owner.get("id")),
    "role": role,
    "fullName": normalize_text(owner.get("fullName")),
    "email": normalize_text(owner.get("email")),
  }


def handle_marketplace_listing_create(handler) -> None:
  try:
    payload = parse_json_body(handler)
  except ValueError:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
    return

  listing = payload.get("listing") if isinstance(payload.get("listing"), dict) else None

  if not listing:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_LISTING", "message": "A valid listing payload is required."})
    return

  listing_type = normalize_text(listing.get("type"))
  if listing_type not in {"client", "professional"}:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_LISTING", "message": "A valid marketplace listing type is required."})
    return

  owner = resolve_listing_owner(handler, payload)
  if not owner:
    json_response(handler, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": "AUTH_REQUIRED", "message": "A signed-in account is required to create a listing."})
    return

  if listing_type == "client" and owner["role"] != "client":
    json_response(handler, HTTPStatus.FORBIDDEN, {"ok": False, "code": "OWNER_ROLE_INVALID", "message": "Only client accounts can create project request listings."})
    return

  if listing_type == "professional" and owner["role"] != "developer":
    json_response(handler, HTTPStatus.FORBIDDEN, {"ok": False, "code": "OWNER_ROLE_INVALID", "message": "Only developer accounts can create professional listings."})
    return

  stored_listing = create_marketplace_listing(
    {
      **listing,
      "ownerUserId": owner.get("id"),
      "ownerRole": owner["role"],
      "ownerName": owner.get("fullName"),
      "ownerEmail": owner.get("email"),
    }
  )
  json_response(handler, HTTPStatus.CREATED, {"ok": True, "listing": stored_listing})


def handle_marketplace_listing_detail(handler) -> None:
  parsed = urlparse(handler.path)
  listing_id = parse_qs(parsed.query).get("id", [""])[0]

  if not listing_id:
    json_response(handler, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_LISTING", "message": "A listing id is required."})
    return

  listing = get_marketplace_listing(listing_id)
  if not listing:
    json_response(handler, HTTPStatus.NOT_FOUND, {"ok": False, "code": "LISTING_NOT_FOUND", "message": "The requested listing could not be found."})
    return

  json_response(handler, HTTPStatus.OK, {"ok": True, "listing": listing})
