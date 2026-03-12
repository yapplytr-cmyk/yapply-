from __future__ import annotations

import json
from dataclasses import dataclass
from json import JSONDecodeError
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


PROFILE_COLUMNS = ",".join(
  [
    "id",
    "email",
    "username",
    "role",
    "status",
    "full_name",
    "phone_number",
    "company_name",
    "profession_type",
    "service_area",
    "years_experience",
    "specialties",
    "preferred_region",
    "website",
    "created_at",
    "updated_at",
  ]
)
ADMIN_ROLES = {"admin", "moderator"}


@dataclass
class SupabaseError(RuntimeError):
  code: str
  message: str
  status: int = 500
  payload: dict[str, Any] | None = None

  def __str__(self) -> str:
    return self.message


def _ensure_public_config() -> None:
  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise SupabaseError(
      "SUPABASE_NOT_CONFIGURED",
      "Supabase public auth is not configured in this runtime.",
      503,
    )


def _ensure_service_config() -> None:
  _ensure_public_config()
  if not SUPABASE_SERVICE_ROLE_KEY:
    raise SupabaseError(
      "SUPABASE_SERVICE_ROLE_MISSING",
      "The Supabase service role key is not configured in this runtime.",
      503,
    )


def _decode_json(raw: bytes) -> dict[str, Any] | list[Any]:
  if not raw:
    return {}

  try:
    return json.loads(raw.decode("utf-8"))
  except (UnicodeDecodeError, JSONDecodeError) as error:
    raise SupabaseError(
      "SUPABASE_INVALID_RESPONSE",
      "Supabase returned an invalid JSON response.",
      502,
    ) from error


def _extract_error_payload(raw: bytes, status: int, fallback_code: str, fallback_message: str) -> SupabaseError:
  try:
    payload = _decode_json(raw)
  except SupabaseError:
    payload = {}

  if isinstance(payload, dict):
    message = (
      payload.get("message")
      or payload.get("msg")
      or payload.get("error_description")
      or payload.get("error")
      or fallback_message
    )
    code = payload.get("code") or payload.get("error_code") or payload.get("error") or fallback_code
    return SupabaseError(str(code), str(message), status, payload)

  return SupabaseError(fallback_code, fallback_message, status, {})


def _supabase_request(
  path: str,
  *,
  method: str = "GET",
  payload: dict[str, Any] | list[Any] | None = None,
  use_service_role: bool = False,
  access_token: str | None = None,
  extra_headers: dict[str, str] | None = None,
) -> Any:
  if use_service_role:
    _ensure_service_config()
    api_key = SUPABASE_SERVICE_ROLE_KEY
  else:
    _ensure_public_config()
    api_key = SUPABASE_ANON_KEY

  headers = {
    "Accept": "application/json",
    "apikey": api_key,
    "Authorization": f"Bearer {api_key}",
  }

  if access_token:
    headers["Authorization"] = f"Bearer {access_token}"

  data = None
  if payload is not None:
    data = json.dumps(payload).encode("utf-8")
    headers["Content-Type"] = "application/json; charset=utf-8"

  if extra_headers:
    headers.update(extra_headers)

  request = Request(f"{SUPABASE_URL}{path}", method=method, data=data, headers=headers)

  try:
    with urlopen(request, timeout=12) as response:
      return _decode_json(response.read())
  except HTTPError as error:
    raise _extract_error_payload(
      error.read(),
      error.code,
      "SUPABASE_REQUEST_FAILED",
      "Supabase rejected the request.",
    ) from error
  except URLError as error:
    raise SupabaseError(
      "SUPABASE_UNAVAILABLE",
      "Supabase could not be reached from this runtime.",
      503,
    ) from error


def _normalize_role(role: str | None) -> str:
  normalized = (role or "").strip().lower()
  return normalized if normalized in {"client", "developer", "admin", "moderator"} else ""


def normalize_profile_row(row: dict[str, Any] | None) -> dict[str, Any] | None:
  if not isinstance(row, dict) or not row.get("id"):
    return None

  role = _normalize_role(row.get("role"))
  status = (str(row.get("status") or "active")).strip().lower()
  if status not in {"active", "inactive"}:
    status = "active"

  return {
    "id": str(row.get("id")),
    "username": row.get("username"),
    "email": (str(row.get("email") or "")).strip().lower() or None,
    "role": role,
    "status": status,
    "fullName": row.get("full_name") or "",
    "phoneNumber": row.get("phone_number"),
    "companyName": row.get("company_name"),
    "professionType": row.get("profession_type"),
    "serviceArea": row.get("service_area"),
    "yearsExperience": row.get("years_experience"),
    "specialties": row.get("specialties"),
    "preferredRegion": row.get("preferred_region"),
    "website": row.get("website"),
    "createdAt": row.get("created_at"),
    "updatedAt": row.get("updated_at"),
  }


def get_public_auth_config() -> dict[str, Any]:
  _ensure_public_config()
  return {
    "provider": "supabase",
    "supabaseUrl": SUPABASE_URL,
    "supabaseAnonKey": SUPABASE_ANON_KEY,
  }


def get_runtime_status() -> dict[str, Any]:
  status = {
    "mode": "supabase-auth",
    "remoteConfigured": bool(SUPABASE_URL and SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY),
    "remoteReachable": False,
    "sourceOfTruth": "supabase-auth+profiles",
  }

  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    status["reason"] = "SUPABASE_URL or SUPABASE_ANON_KEY is missing."
    return status

  if not SUPABASE_SERVICE_ROLE_KEY:
    status["reason"] = "SUPABASE_SERVICE_ROLE_KEY is missing."
    return status

  try:
    _supabase_request("/rest/v1/profiles?select=id&limit=1", use_service_role=True)
    status["remoteReachable"] = True
    return status
  except SupabaseError as error:
    status["reason"] = error.message
    return status


def _query_profiles(filters: dict[str, str], limit: int = 1) -> list[dict[str, Any]]:
  _ensure_service_config()
  params = {"select": PROFILE_COLUMNS, "limit": str(limit)}
  params.update(filters)
  response = _supabase_request(f"/rest/v1/profiles?{urlencode(params)}", use_service_role=True)
  return response if isinstance(response, list) else []


def get_profile_by_id(user_id: str) -> dict[str, Any] | None:
  rows = _query_profiles({"id": f"eq.{user_id}"})
  return normalize_profile_row(rows[0]) if rows else None


def get_profile_by_email(email: str) -> dict[str, Any] | None:
  rows = _query_profiles({"email": f"eq.{email.strip().lower()}"})
  return normalize_profile_row(rows[0]) if rows else None


def get_profile_by_username(username: str) -> dict[str, Any] | None:
  rows = _query_profiles({"username": f"eq.{username.strip().lower()}"})
  return normalize_profile_row(rows[0]) if rows else None


def get_profile_by_identifier(identifier: str) -> dict[str, Any] | None:
  value = identifier.strip()
  if not value:
    return None
  if "@" in value:
    return get_profile_by_email(value)
  return get_profile_by_username(value)


def list_profiles() -> list[dict[str, Any]]:
  _ensure_service_config()
  response = _supabase_request(
    f"/rest/v1/profiles?{urlencode({'select': PROFILE_COLUMNS, 'order': 'created_at.desc'})}",
    use_service_role=True,
  )
  if not isinstance(response, list):
    return []
  return [profile for row in response if (profile := normalize_profile_row(row))]


def count_active_admin_profiles(exclude_user_id: str | None = None) -> int:
  count = 0
  for profile in list_profiles():
    if exclude_user_id and profile.get("id") == exclude_user_id:
      continue
    if profile.get("role") in ADMIN_ROLES and profile.get("status") == "active":
      count += 1
  return count


def verify_access_token(access_token: str) -> tuple[dict[str, Any], dict[str, Any]]:
  if not access_token:
    raise SupabaseError("AUTH_REQUIRED", "A valid authenticated session is required.", 401)

  auth_user = _supabase_request("/auth/v1/user", access_token=access_token)
  if not isinstance(auth_user, dict) or not auth_user.get("id"):
    raise SupabaseError("AUTH_REQUIRED", "A valid authenticated session is required.", 401)

  profile = get_profile_by_id(str(auth_user["id"]))
  if not profile:
    raise SupabaseError("ACCOUNT_PROFILE_MISSING", "The authenticated profile could not be found.", 404)

  return auth_user, profile


def require_admin_access(access_token: str) -> tuple[dict[str, Any], dict[str, Any]]:
  auth_user, profile = verify_access_token(access_token)
  if profile.get("role") not in ADMIN_ROLES:
    raise SupabaseError("ADMIN_ONLY", "This endpoint is available only to admin users.", 403)
  if profile.get("status") != "active":
    raise SupabaseError("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.", 403)
  return auth_user, profile


def resolve_admin_email(identifier: str) -> dict[str, Any]:
  profile = get_profile_by_identifier(identifier)
  if not profile:
    raise SupabaseError("LOGIN_ACCOUNT_NOT_FOUND", "The admin account could not be found.", 404)
  if profile.get("role") not in ADMIN_ROLES:
    raise SupabaseError("ADMIN_ONLY", "This login area is reserved for admin accounts.", 403)
  return {
    "email": profile.get("email"),
    "role": profile.get("role"),
    "status": profile.get("status"),
  }


def update_profile_status(user_id: str, enabled: bool) -> dict[str, Any]:
  _ensure_service_config()
  payload = {"status": "active" if enabled else "inactive"}
  response = _supabase_request(
    f"/rest/v1/profiles?{urlencode({'id': f'eq.{user_id}', 'select': PROFILE_COLUMNS})}",
    method="PATCH",
    payload=payload,
    use_service_role=True,
    extra_headers={"Prefer": "return=representation"},
  )
  rows = response if isinstance(response, list) else []
  profile = normalize_profile_row(rows[0]) if rows else None
  if not profile:
    raise SupabaseError("ACCOUNT_NOT_FOUND", "The requested account could not be found.", 404)
  return profile


def delete_user_account(user_id: str) -> None:
  _ensure_service_config()

  try:
    _supabase_request(f"/auth/v1/admin/users/{user_id}", method="DELETE", use_service_role=True)
  except SupabaseError as error:
    if error.status != 404:
      raise

  _supabase_request(
    f"/rest/v1/profiles?{urlencode({'id': f'eq.{user_id}'})}",
    method="DELETE",
    use_service_role=True,
  )
