from __future__ import annotations

import json
import re
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .config import (
  ADMIN_ROLES,
  FRONTEND_ORIGINS,
  HOST,
  PORT,
  PUBLIC_SIGNUP_ROLES,
  ROOT_DIR,
  SEEDED_ADMIN_EMAIL,
  SEEDED_ADMIN_FULL_NAME,
  SEEDED_ADMIN_PASSWORD,
  SEEDED_ADMIN_ROLE,
  SEEDED_ADMIN_USERNAME,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
)
from .db import (
  count_active_admin_users,
  create_marketplace_listing,
  create_session,
  create_user,
  delete_user_account,
  delete_session,
  ensure_database,
  get_account_store_status,
  get_marketplace_listing,
  get_session_user,
  get_record_value,
  get_user_by_email,
  get_user_by_identifier,
  get_user_by_id,
  list_users,
  purge_expired_sessions,
  seed_admin_account,
  update_user_status,
)
from .security import issue_session_token, verify_password


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def parse_json_body(handler: "YapplyRequestHandler") -> dict:
  content_length = int(handler.headers.get("Content-Length", "0") or "0")
  if content_length <= 0:
    return {}
  raw_body = handler.rfile.read(content_length)
  if not raw_body:
    return {}
  try:
    return json.loads(raw_body.decode("utf-8"))
  except json.JSONDecodeError as exc:
    raise ValueError("Invalid JSON payload.") from exc


def json_response(handler: "YapplyRequestHandler", status: int, payload: dict) -> None:
  body = json.dumps(payload).encode("utf-8")
  handler.send_response(status)
  apply_cors_headers(handler)
  handler.send_header("Content-Type", "application/json; charset=utf-8")
  handler.send_header("Cache-Control", "no-store")
  handler.send_header("Content-Length", str(len(body)))
  handler.end_headers()
  handler.wfile.write(body)


def get_allowed_origin(handler: "YapplyRequestHandler") -> str | None:
  origin = handler.headers.get("Origin", "").strip()
  return origin if origin in FRONTEND_ORIGINS else None


def apply_cors_headers(handler: "YapplyRequestHandler") -> None:
  origin = get_allowed_origin(handler)

  if not origin:
    return

  handler.send_header("Access-Control-Allow-Origin", origin)
  handler.send_header("Access-Control-Allow-Credentials", "true")
  handler.send_header("Vary", "Origin")


def build_cookie(token: str, max_age: int = SESSION_TTL_SECONDS) -> str:
  cookie = SimpleCookie()
  cookie[SESSION_COOKIE_NAME] = token
  cookie[SESSION_COOKIE_NAME]["path"] = "/"
  cookie[SESSION_COOKIE_NAME]["httponly"] = True
  cookie[SESSION_COOKIE_NAME]["samesite"] = "Lax"
  cookie[SESSION_COOKIE_NAME]["max-age"] = max_age
  return cookie.output(header="").strip()


def clear_cookie() -> str:
  return build_cookie("", 0)


def get_session_token(handler: "YapplyRequestHandler") -> str | None:
  raw_cookie = handler.headers.get("Cookie", "")
  if not raw_cookie:
    return None
  cookie = SimpleCookie()
  cookie.load(raw_cookie)
  morsel = cookie.get(SESSION_COOKIE_NAME)
  return morsel.value if morsel else None


def get_authenticated_user(handler: "YapplyRequestHandler") -> dict | None:
  import hashlib

  token = get_session_token(handler)

  if not token:
    return None

  token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
  return get_session_user(token_hash)


def require_admin_user(handler: "YapplyRequestHandler") -> dict | None:
  user = get_authenticated_user(handler)

  if not user:
    json_response(handler, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": "AUTH_REQUIRED", "message": "Admin authentication is required."})
    return None

  if user["role"] not in ADMIN_ROLES:
    json_response(handler, HTTPStatus.FORBIDDEN, {"ok": False, "code": "ADMIN_ONLY", "message": "This endpoint is available only to admin users."})
    return None

  return user


def normalize_text(value: str | None) -> str | None:
  if value is None:
    return None
  stripped = str(value).strip()
  return stripped or None


def validate_signup(payload: dict) -> tuple[dict | None, tuple[str, str] | None]:
  role = normalize_text(payload.get("role"))
  full_name = normalize_text(payload.get("fullName"))
  email = normalize_text(payload.get("email"))
  password = str(payload.get("password") or "")
  confirm_password = str(payload.get("confirmPassword") or "")

  if role not in PUBLIC_SIGNUP_ROLES:
    return None, ("INVALID_ROLE", "Only developer and client accounts can be created publicly.")
  if not full_name:
    return None, ("FULL_NAME_REQUIRED", "Full name is required.")
  if not email or not EMAIL_RE.match(email):
    return None, ("EMAIL_INVALID", "A valid email address is required.")
  if len(password) < 8:
    return None, ("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.")
  if password != confirm_password:
    return None, ("PASSWORD_MISMATCH", "Password confirmation does not match.")
  if get_user_by_email(email):
    return None, ("EMAIL_IN_USE", "An account with this email already exists.")

  base_payload = {
    "role": role,
    "fullName": full_name,
    "email": email.lower(),
    "password": password,
    "phoneNumber": normalize_text(payload.get("phoneNumber")),
    "companyName": normalize_text(payload.get("companyName")),
    "professionType": normalize_text(payload.get("professionType")),
    "serviceArea": normalize_text(payload.get("serviceArea")),
    "specialties": normalize_text(payload.get("specialties")),
    "preferredRegion": normalize_text(payload.get("preferredRegion")),
    "website": normalize_text(payload.get("website")),
  }

  years_experience = normalize_text(payload.get("yearsExperience"))
  if years_experience is not None:
    try:
      parsed_experience = int(years_experience)
    except ValueError:
      return None, ("EXPERIENCE_INVALID", "Years of experience must be a whole number.")
    if parsed_experience < 0:
      return None, ("EXPERIENCE_INVALID", "Years of experience cannot be negative.")
    base_payload["yearsExperience"] = parsed_experience
  else:
    base_payload["yearsExperience"] = None

  if role == "developer":
    required_fields = {
      "phoneNumber": "PHONE_REQUIRED",
      "companyName": "COMPANY_REQUIRED",
      "professionType": "PROFESSION_REQUIRED",
      "serviceArea": "SERVICE_AREA_REQUIRED",
      "specialties": "SPECIALTIES_REQUIRED",
    }
    for key, code in required_fields.items():
      if not base_payload.get(key):
        return None, (code, f"{key} is required for developer accounts.")
    if base_payload["yearsExperience"] is None:
      return None, ("EXPERIENCE_REQUIRED", "Years of experience is required for developer accounts.")
  else:
    if not base_payload.get("phoneNumber"):
      return None, ("PHONE_REQUIRED", "Phone number is required.")
    if not base_payload.get("preferredRegion"):
      return None, ("REGION_REQUIRED", "Preferred city or region is required.")
    base_payload["professionType"] = None
    base_payload["serviceArea"] = None
    base_payload["specialties"] = None
    base_payload["website"] = None
    base_payload["yearsExperience"] = None

  return base_payload, None


def validate_login(payload: dict, audience: str = "public") -> tuple[dict | None, tuple[str, str] | None]:
  identifier = normalize_text(payload.get("identifier") or payload.get("email") or payload.get("username"))
  password = str(payload.get("password") or "")
  requested_role = normalize_text(payload.get("role"))

  if not identifier:
    return None, ("IDENTIFIER_REQUIRED", "Username or email is required.")
  if audience != "admin" and not EMAIL_RE.match(identifier):
    return None, ("EMAIL_INVALID", "A valid email address is required.")
  if not password:
    return None, ("PASSWORD_REQUIRED", "Password is required.")

  user = get_user_by_identifier(identifier)
  if not user:
    return None, ("LOGIN_ACCOUNT_NOT_FOUND", "No account was found for this email address.")

  stored_password_hash = get_record_value(user, "password_hash", "passwordHash")
  if not stored_password_hash:
    return None, ("ACCOUNT_NOT_FOUND", "The requested account record is incomplete.")

  if not verify_password(password, stored_password_hash):
    return None, ("INVALID_CREDENTIALS", "Email or password is incorrect.")

  if int(get_record_value(user, "is_active", "isActive") or 0) != 1:
    return None, ("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.")

  user_role = get_record_value(user, "role")

  if audience != "admin" and user_role in ADMIN_ROLES:
    return None, ("ADMIN_USE_INTERNAL", "Admin accounts must use the internal moderator login.")

  if audience == "admin" and user_role not in ADMIN_ROLES:
    return None, ("ADMIN_ONLY", "This login area is reserved for admin or moderator accounts.")

  if requested_role in PUBLIC_SIGNUP_ROLES and user_role != requested_role:
    return None, ("ROLE_MISMATCH", "This account does not match the selected login role.")

  return {"user": user}, None


def ensure_seeded_admin_account() -> None:
  seed_admin_account(
    email=SEEDED_ADMIN_EMAIL,
    password=SEEDED_ADMIN_PASSWORD,
    full_name=SEEDED_ADMIN_FULL_NAME,
    role=SEEDED_ADMIN_ROLE,
    username=SEEDED_ADMIN_USERNAME,
  )


class YapplyRequestHandler(SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

  def do_OPTIONS(self):
    self.send_response(HTTPStatus.NO_CONTENT)
    apply_cors_headers(self)
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.end_headers()

  def do_GET(self):
    parsed = urlparse(self.path)

    if parsed.path == "/api/auth/session":
      self.handle_auth_session()
      return

    if parsed.path == "/api/marketplace/listings/detail":
      self.handle_marketplace_listing_detail(parsed)
      return

    if parsed.path == "/api/admin/accounts":
      self.handle_admin_accounts()
      return

    if parsed.path == "/api/admin/account-store-status":
      self.handle_admin_account_store_status()
      return

    purge_expired_sessions()
    super().do_GET()

  def do_POST(self):
    parsed = urlparse(self.path)

    if parsed.path == "/api/auth/signup":
      self.handle_auth_signup()
      return

    if parsed.path == "/api/auth/login":
      self.handle_auth_login()
      return

    if parsed.path == "/api/auth/logout":
      self.handle_auth_logout()
      return

    if parsed.path == "/api/marketplace/listings/create":
      self.handle_marketplace_listing_create()
      return

    if parsed.path == "/api/admin/accounts/status":
      self.handle_admin_account_status()
      return

    if parsed.path == "/api/admin/accounts/delete":
      self.handle_admin_account_delete()
      return

    self.send_error(HTTPStatus.NOT_FOUND, "Not found")

  def handle_auth_session(self) -> None:
    user = get_authenticated_user(self)
    if not user:
      json_response(self, HTTPStatus.OK, {"authenticated": False, "user": None})
      return

    json_response(self, HTTPStatus.OK, {"authenticated": True, "user": user})

  def handle_admin_accounts(self) -> None:
    if not require_admin_user(self):
      return

    json_response(self, HTTPStatus.OK, {"ok": True, "accounts": list_users()})

  def handle_admin_account_store_status(self) -> None:
    if not require_admin_user(self):
      return

    json_response(self, HTTPStatus.OK, {"ok": True, "status": get_account_store_status()})

  def resolve_listing_owner(self, payload: dict) -> dict | None:
    session_user = get_authenticated_user(self)

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

  def handle_marketplace_listing_create(self) -> None:
    try:
      payload = parse_json_body(self)
    except ValueError:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
      return

    listing = payload.get("listing") if isinstance(payload.get("listing"), dict) else None
    if not listing:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_LISTING", "message": "A valid listing payload is required."})
      return

    listing_type = normalize_text(listing.get("type"))
    if listing_type not in {"client", "professional"}:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_LISTING", "message": "A valid marketplace listing type is required."})
      return

    owner = self.resolve_listing_owner(payload)
    if not owner:
      json_response(self, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": "AUTH_REQUIRED", "message": "A signed-in account is required to create a listing."})
      return

    if listing_type == "client" and owner["role"] != "client":
      json_response(self, HTTPStatus.FORBIDDEN, {"ok": False, "code": "OWNER_ROLE_INVALID", "message": "Only client accounts can create project request listings."})
      return

    if listing_type == "professional" and owner["role"] != "developer":
      json_response(self, HTTPStatus.FORBIDDEN, {"ok": False, "code": "OWNER_ROLE_INVALID", "message": "Only developer accounts can create professional listings."})
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
    json_response(self, HTTPStatus.CREATED, {"ok": True, "listing": stored_listing})

  def handle_marketplace_listing_detail(self, parsed) -> None:
    listing_id = parse_qs(parsed.query).get("id", [""])[0]

    if not listing_id:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_LISTING", "message": "A listing id is required."})
      return

    listing = get_marketplace_listing(listing_id)
    if not listing:
      json_response(self, HTTPStatus.NOT_FOUND, {"ok": False, "code": "LISTING_NOT_FOUND", "message": "The requested listing could not be found."})
      return

    json_response(self, HTTPStatus.OK, {"ok": True, "listing": listing})

  def handle_admin_account_status(self) -> None:
    current_user = require_admin_user(self)
    if not current_user:
      return

    try:
      payload = parse_json_body(self)
    except ValueError:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
      return

    user_id = normalize_text(payload.get("userId"))
    action = normalize_text(payload.get("action"))

    if not user_id or action not in {"disable", "enable"}:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_ACCOUNT_ACTION", "message": "A valid account action is required."})
      return

    target_user = get_user_by_id(user_id)
    if not target_user:
      json_response(self, HTTPStatus.NOT_FOUND, {"ok": False, "code": "ACCOUNT_NOT_FOUND", "message": "The requested account could not be found."})
      return

    if action == "disable":
      if target_user["id"] == current_user["id"]:
        json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "ACCOUNT_SELF_PROTECTED", "message": "You cannot disable your own admin account."})
        return

      if target_user["role"] in ADMIN_ROLES and count_active_admin_users(exclude_user_id=target_user["id"]) == 0:
        json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "LAST_ADMIN_PROTECTED", "message": "The last active admin account cannot be disabled."})
        return

      updated_user = update_user_status(user_id, False)
      json_response(self, HTTPStatus.OK, {"ok": True, "user": updated_user})
      return

    updated_user = update_user_status(user_id, True)
    json_response(self, HTTPStatus.OK, {"ok": True, "user": updated_user})

  def handle_admin_account_delete(self) -> None:
    current_user = require_admin_user(self)
    if not current_user:
      return

    try:
      payload = parse_json_body(self)
    except ValueError:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
      return

    user_id = normalize_text(payload.get("userId"))

    if not user_id:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_ACCOUNT_ACTION", "message": "A valid account id is required."})
      return

    target_user = get_user_by_id(user_id)
    if not target_user:
      json_response(self, HTTPStatus.NOT_FOUND, {"ok": False, "code": "ACCOUNT_NOT_FOUND", "message": "The requested account could not be found."})
      return

    if target_user["id"] == current_user["id"]:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "ACCOUNT_SELF_PROTECTED", "message": "You cannot delete your own admin account."})
      return

    if target_user["role"] in ADMIN_ROLES and count_active_admin_users(exclude_user_id=target_user["id"]) == 0:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "LAST_ADMIN_PROTECTED", "message": "The last active admin account cannot be deleted."})
      return

    delete_user_account(user_id)
    json_response(self, HTTPStatus.OK, {"ok": True, "deletedUserId": user_id})

  def handle_auth_signup(self) -> None:
    try:
      payload = parse_json_body(self)
    except ValueError:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
      return

    clean_payload, error = validate_signup(payload)
    if error:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": error[0], "message": error[1]})
      return

    user = create_user(clean_payload)
    token, token_hash = issue_session_token()
    create_session(user["id"], token_hash, self.headers.get("User-Agent", ""), self.client_address[0] if self.client_address else "")

    body = json.dumps({"ok": True, "user": user}).encode("utf-8")
    self.send_response(HTTPStatus.CREATED)
    apply_cors_headers(self)
    self.send_header("Set-Cookie", build_cookie(token))
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Cache-Control", "no-store")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def handle_auth_login(self) -> None:
    try:
      payload = parse_json_body(self)
    except ValueError:
      json_response(self, HTTPStatus.BAD_REQUEST, {"ok": False, "code": "INVALID_JSON", "message": "Invalid JSON payload."})
      return

    audience = normalize_text(payload.get("audience")) or "public"
    login_payload, error = validate_login(payload, audience)
    if error:
      json_response(self, HTTPStatus.UNAUTHORIZED, {"ok": False, "code": error[0], "message": error[1]})
      return

    user = login_payload["user"]
    token, token_hash = issue_session_token()
    create_session(user["id"], token_hash, self.headers.get("User-Agent", ""), self.client_address[0] if self.client_address else "")

    body = json.dumps({"ok": True, "user": get_session_user(token_hash)}).encode("utf-8")
    self.send_response(HTTPStatus.OK)
    apply_cors_headers(self)
    self.send_header("Set-Cookie", build_cookie(token))
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Cache-Control", "no-store")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)

  def handle_auth_logout(self) -> None:
    import hashlib

    token = get_session_token(self)
    if token:
      token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
      delete_session(token_hash)

    body = json.dumps({"ok": True}).encode("utf-8")
    self.send_response(HTTPStatus.OK)
    apply_cors_headers(self)
    self.send_header("Set-Cookie", clear_cookie())
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Cache-Control", "no-store")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)


def run() -> None:
  ensure_database()
  ensure_seeded_admin_account()
  server = ThreadingHTTPServer((HOST, PORT), YapplyRequestHandler)
  print(f"Yapply backend running on http://{HOST}:{PORT}")
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    server.server_close()


if __name__ == "__main__":
  run()
