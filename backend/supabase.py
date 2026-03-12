from __future__ import annotations

import json
from dataclasses import dataclass
from json import JSONDecodeError
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import (
  SUPABASE_ANON_KEY,
  SUPABASE_PUBLIC_KEY_SOURCE,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_KEY_SOURCE,
  SUPABASE_URL,
  SUPABASE_URL_SOURCE,
)


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
      "Supabase public auth is not configured in this runtime. Check SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      503,
    )


def _ensure_service_config() -> None:
  _ensure_public_config()
  if not SUPABASE_SERVICE_ROLE_KEY:
    raise SupabaseError(
      "SUPABASE_SERVICE_ROLE_MISSING",
      "The Supabase server key is not configured in this runtime. Check SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.",
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


def sign_in_with_password(email: str, password: str) -> dict[str, Any]:
  _ensure_public_config()

  headers = {
    "Accept": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json; charset=utf-8",
  }
  payload = json.dumps(
    {
      "email": email.strip().lower(),
      "password": password,
    }
  ).encode("utf-8")
  request = Request(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    method="POST",
    data=payload,
    headers=headers,
  )

  try:
    with urlopen(request, timeout=12) as response:
      data = _decode_json(response.read())
  except HTTPError as error:
    raise _extract_error_payload(
      error.read(),
      error.code,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    ) from error
  except URLError as error:
    raise SupabaseError(
      "AUTH_UNAVAILABLE",
      "Authentication is not available right now. Please try again in a moment.",
      503,
    ) from error

  if not isinstance(data, dict) or not data.get("access_token") or not data.get("refresh_token"):
    raise SupabaseError(
      "SESSION_INVALID",
      "Supabase did not return a usable authenticated session.",
      502,
    )

  return data


def sign_up_with_password(email: str, password: str, metadata: dict[str, Any]) -> dict[str, Any]:
  _ensure_public_config()

  headers = {
    "Accept": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json; charset=utf-8",
  }
  payload = json.dumps(
    {
      "email": email.strip().lower(),
      "password": password,
      "data": metadata,
    }
  ).encode("utf-8")
  request = Request(
    f"{SUPABASE_URL}/auth/v1/signup",
    method="POST",
    data=payload,
    headers=headers,
  )

  try:
    with urlopen(request, timeout=12) as response:
      data = _decode_json(response.read())
  except HTTPError as error:
    raise _extract_error_payload(
      error.read(),
      error.code,
      "AUTH_SIGNUP_FAILED",
      "Account creation failed.",
    ) from error
  except URLError as error:
    raise SupabaseError(
      "AUTH_UNAVAILABLE",
      "Authentication is not available right now. Please try again in a moment.",
      503,
    ) from error

  if not isinstance(data, dict):
    raise SupabaseError(
      "SUPABASE_INVALID_RESPONSE",
      "Supabase returned an invalid signup response.",
      502,
    )

  return data


def create_user_with_service_role(email: str, password: str, metadata: dict[str, Any]) -> dict[str, Any]:
  _ensure_service_config()

  response = _supabase_request(
    "/auth/v1/admin/users",
    method="POST",
    use_service_role=True,
    payload={
      "email": email.strip().lower(),
      "password": password,
      "email_confirm": True,
      "user_metadata": metadata,
      "app_metadata": {
        "role": metadata.get("role"),
      },
    },
  )

  if not isinstance(response, dict):
    raise SupabaseError(
      "SUPABASE_INVALID_RESPONSE",
      "Supabase returned an invalid admin user creation response.",
      502,
    )

  user = response.get("user") if isinstance(response.get("user"), dict) else response
  if not isinstance(user, dict) or not user.get("id"):
    raise SupabaseError(
      "ACCOUNT_CREATION_FAILED",
      "The account could not be created in the authentication service.",
      502,
    )

  return user


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
    "debug": {
      "urlDetected": bool(SUPABASE_URL),
      "publicKeyDetected": bool(SUPABASE_ANON_KEY),
      "serviceKeyDetected": bool(SUPABASE_SERVICE_ROLE_KEY),
      "urlSource": SUPABASE_URL_SOURCE or None,
      "publicKeySource": SUPABASE_PUBLIC_KEY_SOURCE or None,
      "serviceKeySource": SUPABASE_SERVICE_KEY_SOURCE or None,
      "publicKeyMode": "publishable" if "PUBLISHABLE" in (SUPABASE_PUBLIC_KEY_SOURCE or "") else "anon",
      "serviceKeyMode": "secret" if "SECRET" in (SUPABASE_SERVICE_KEY_SOURCE or "") else "service_role",
      "reason": None,
    },
  }


def get_runtime_status() -> dict[str, Any]:
  status = {
    "mode": "supabase-auth",
    "remoteConfigured": bool(SUPABASE_URL and SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY),
    "remoteReachable": False,
    "sourceOfTruth": "supabase-auth+profiles",
    "detectedEnv": {
      "urlSource": SUPABASE_URL_SOURCE or None,
      "publicKeySource": SUPABASE_PUBLIC_KEY_SOURCE or None,
      "serviceKeySource": SUPABASE_SERVICE_KEY_SOURCE or None,
      "urlDetected": bool(SUPABASE_URL),
      "publicKeyDetected": bool(SUPABASE_ANON_KEY),
      "serviceKeyDetected": bool(SUPABASE_SERVICE_ROLE_KEY),
      "publicKeyMode": "publishable" if "PUBLISHABLE" in (SUPABASE_PUBLIC_KEY_SOURCE or "") else "anon",
      "serviceKeyMode": "secret" if "SECRET" in (SUPABASE_SERVICE_KEY_SOURCE or "") else "service_role",
    },
  }

  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    status["reason"] = "Supabase URL or public key was not detected. Supported names: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    return status

  if not SUPABASE_SERVICE_ROLE_KEY:
    status["reason"] = "Supabase server key was not detected. Supported names: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY."
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


def upsert_profile(
  *,
  user_id: str,
  email: str,
  role: str,
  full_name: str,
  phone_number: str | None = None,
  company_name: str | None = None,
  profession_type: str | None = None,
  service_area: str | None = None,
  years_experience: int | None = None,
  specialties: str | None = None,
  preferred_region: str | None = None,
  website: str | None = None,
  username: str | None = None,
  status: str = "active",
) -> dict[str, Any]:
  _ensure_service_config()

  payload = {
    "id": user_id,
    "email": email.strip().lower(),
    "username": (username or "").strip().lower() or None,
    "role": role,
    "status": status,
    "full_name": full_name,
    "phone_number": phone_number,
    "company_name": company_name,
    "profession_type": profession_type,
    "service_area": service_area,
    "years_experience": years_experience,
    "specialties": specialties,
    "preferred_region": preferred_region,
    "website": website,
  }

  response = _supabase_request(
    f"/rest/v1/profiles?{urlencode({'select': PROFILE_COLUMNS})}",
    method="POST",
    payload=payload,
    use_service_role=True,
    extra_headers={"Prefer": "resolution=merge-duplicates,return=representation"},
  )

  rows = response if isinstance(response, list) else []
  profile = normalize_profile_row(rows[0]) if rows else None
  if not profile:
    raise SupabaseError("ACCOUNT_PROFILE_MISSING", "The account profile could not be created.", 502)
  return profile


def list_profiles() -> list[dict[str, Any]]:
  _ensure_service_config()
  response = _supabase_request(
    f"/rest/v1/profiles?{urlencode({'select': PROFILE_COLUMNS, 'order': 'created_at.desc'})}",
    use_service_role=True,
  )
  if not isinstance(response, list):
    return []
  return [profile for row in response if (profile := normalize_profile_row(row))]


def _read_auth_user_field(user: dict[str, Any], *keys: str) -> Any:
  for key in keys:
    if key in user and user.get(key) not in {None, ""}:
      return user.get(key)

  metadata_sources = [
    user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {},
    user.get("raw_user_meta_data") if isinstance(user.get("raw_user_meta_data"), dict) else {},
    user.get("app_metadata") if isinstance(user.get("app_metadata"), dict) else {},
  ]

  for metadata in metadata_sources:
    for key in keys:
      if key in metadata and metadata.get(key) not in {None, ""}:
        return metadata.get(key)

  return None


def _normalize_auth_user_account(user: dict[str, Any]) -> dict[str, Any] | None:
  if not isinstance(user, dict) or not user.get("id"):
    return None

  email = str(_read_auth_user_field(user, "email") or "").strip().lower()
  role = _normalize_role(
    _read_auth_user_field(user, "role")
    or _read_auth_user_field(user, "account_role")
  )
  status = str(_read_auth_user_field(user, "status") or "active").strip().lower()

  if status not in {"active", "inactive"}:
    status = "active"

  return {
    "id": str(user.get("id")),
    "username": _read_auth_user_field(user, "username"),
    "email": email or None,
    "role": role,
    "status": status,
    "fullName": _read_auth_user_field(user, "full_name", "fullName", "name") or "",
    "phoneNumber": _read_auth_user_field(user, "phone_number", "phoneNumber", "phone"),
    "companyName": _read_auth_user_field(user, "company_name", "companyName"),
    "professionType": _read_auth_user_field(user, "profession_type", "professionType"),
    "serviceArea": _read_auth_user_field(user, "service_area", "serviceArea"),
    "yearsExperience": _read_auth_user_field(user, "years_experience", "yearsExperience"),
    "specialties": _read_auth_user_field(user, "specialties"),
    "preferredRegion": _read_auth_user_field(user, "preferred_region", "preferredRegion"),
    "website": _read_auth_user_field(user, "website"),
    "createdAt": user.get("created_at"),
    "updatedAt": user.get("updated_at") or user.get("last_sign_in_at"),
  }


def list_account_directory() -> list[dict[str, Any]]:
  profiles = list_profiles()
  profiles_by_id = {profile["id"]: profile for profile in profiles if profile.get("id")}

  response = _supabase_request(
    "/auth/v1/admin/users?page=1&per_page=1000",
    use_service_role=True,
  )
  users = response.get("users") if isinstance(response, dict) else []

  merged_accounts: list[dict[str, Any]] = []
  seen_ids: set[str] = set()

  for user in users if isinstance(users, list) else []:
    auth_account = _normalize_auth_user_account(user)
    if not auth_account or not auth_account.get("id"):
      continue

    account_id = auth_account["id"]
    profile = profiles_by_id.get(account_id)

    if profile:
      merged_accounts.append(
        {
          **auth_account,
          **profile,
          "email": profile.get("email") or auth_account.get("email"),
          "createdAt": profile.get("createdAt") or auth_account.get("createdAt"),
          "updatedAt": profile.get("updatedAt") or auth_account.get("updatedAt"),
        }
      )
    else:
      merged_accounts.append(auth_account)

    seen_ids.add(account_id)

  for profile in profiles:
    account_id = profile.get("id")
    if account_id and account_id not in seen_ids:
      merged_accounts.append(profile)

  return sorted(
    merged_accounts,
    key=lambda account: str(account.get("createdAt") or ""),
    reverse=True,
  )


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


def authenticate_admin(identifier: str, password: str) -> dict[str, Any]:
  resolved = resolve_admin_email(identifier)
  session = sign_in_with_password(str(resolved.get("email") or ""), password)
  user_payload = session.get("user") if isinstance(session, dict) else None
  user_id = str(user_payload.get("id") or "").strip() if isinstance(user_payload, dict) else ""

  if not user_id:
    raise SupabaseError(
      "ADMIN_SESSION_INVALID",
      "Admin authentication succeeded but the returned session did not include a valid user id.",
      502,
    )

  profile = get_profile_by_id(user_id)
  if not profile:
    raise SupabaseError("ACCOUNT_PROFILE_MISSING", "The admin profile could not be found.", 404)
  if profile.get("role") not in ADMIN_ROLES:
    raise SupabaseError("ADMIN_ONLY", "This login area is reserved for admin accounts.", 403)
  if profile.get("status") != "active":
    raise SupabaseError("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.", 403)

  return {
    "session": {
      "access_token": session.get("access_token"),
      "refresh_token": session.get("refresh_token"),
      "expires_in": session.get("expires_in"),
      "expires_at": session.get("expires_at"),
      "token_type": session.get("token_type"),
    },
    "user": {
      "id": profile.get("id"),
      "email": profile.get("email"),
      "username": profile.get("username"),
      "role": profile.get("role"),
      "status": profile.get("status"),
    },
  }


def authenticate_public_user(email: str, password: str, expected_role: str = "") -> dict[str, Any]:
  session = sign_in_with_password(email, password)
  user_payload = session.get("user") if isinstance(session, dict) else None
  user_id = str(user_payload.get("id") or "").strip() if isinstance(user_payload, dict) else ""

  if not user_id:
    raise SupabaseError(
      "SESSION_INVALID",
      "Authentication succeeded but the returned session did not include a valid user id.",
      502,
    )

  profile = get_profile_by_id(user_id)
  if not profile:
    raise SupabaseError("ACCOUNT_PROFILE_MISSING", "The account profile could not be found.", 404)
  if profile.get("role") in ADMIN_ROLES:
    raise SupabaseError("ADMIN_USE_INTERNAL", "Admin accounts must use the internal moderator login.", 403)
  if expected_role and profile.get("role") != expected_role:
    raise SupabaseError("ROLE_MISMATCH", "This account does not match the selected login role.", 403)
  if profile.get("status") != "active":
    raise SupabaseError("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.", 403)

  return {
    "session": {
      "access_token": session.get("access_token"),
      "refresh_token": session.get("refresh_token"),
      "expires_in": session.get("expires_in"),
      "expires_at": session.get("expires_at"),
      "token_type": session.get("token_type"),
    },
    "user": {
      "id": profile.get("id"),
      "email": profile.get("email"),
      "username": profile.get("username"),
      "role": profile.get("role"),
      "status": profile.get("status"),
      "fullName": profile.get("fullName"),
      "phoneNumber": profile.get("phoneNumber"),
      "companyName": profile.get("companyName"),
      "professionType": profile.get("professionType"),
      "serviceArea": profile.get("serviceArea"),
      "yearsExperience": profile.get("yearsExperience"),
      "specialties": profile.get("specialties"),
      "preferredRegion": profile.get("preferredRegion"),
      "website": profile.get("website"),
    },
  }


def register_public_user(payload: dict[str, Any]) -> dict[str, Any]:
  role = _normalize_role(payload.get("role"))
  if role not in {"client", "developer"}:
    raise SupabaseError("INVALID_ROLE", "Only client and developer accounts can be created here.", 400)

  email = str(payload.get("email") or "").strip().lower()
  password = str(payload.get("password") or "")
  full_name = str(payload.get("fullName") or "").strip()
  phone_number = str(payload.get("phoneNumber") or "").strip()

  if not email:
    raise SupabaseError("EMAIL_INVALID", "Please enter a valid email address.", 400)
  if len(password) < 8:
    raise SupabaseError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.", 400)
  if not full_name:
    raise SupabaseError("FULL_NAME_REQUIRED", "Please enter your full name.", 400)
  if not phone_number:
    raise SupabaseError("PHONE_REQUIRED", "Phone number is required for this account type.", 400)

  if role == "client" and not str(payload.get("preferredRegion") or "").strip():
    raise SupabaseError("REGION_REQUIRED", "Preferred city or region is required for client accounts.", 400)

  if role == "developer":
    if not str(payload.get("companyName") or "").strip():
      raise SupabaseError("COMPANY_REQUIRED", "Company or professional name is required for developer accounts.", 400)
    if not str(payload.get("professionType") or "").strip():
      raise SupabaseError("PROFESSION_REQUIRED", "Profession type is required for developer accounts.", 400)
    if not str(payload.get("serviceArea") or "").strip():
      raise SupabaseError("SERVICE_AREA_REQUIRED", "City or service area is required for developer accounts.", 400)
    if not str(payload.get("specialties") or "").strip():
      raise SupabaseError("SPECIALTIES_REQUIRED", "Please enter at least one specialty for the developer account.", 400)

  metadata = {
    "role": role,
    "full_name": full_name,
    "phone_number": phone_number,
    "company_name": str(payload.get("companyName") or "").strip() or None,
    "profession_type": str(payload.get("professionType") or "").strip() or None,
    "service_area": str(payload.get("serviceArea") or "").strip() or None,
    "years_experience": payload.get("yearsExperience"),
    "specialties": str(payload.get("specialties") or "").strip() or None,
    "preferred_region": str(payload.get("preferredRegion") or "").strip() or None,
    "website": str(payload.get("website") or "").strip() or None,
  }

  created_user = create_user_with_service_role(email, password, metadata)
  user_id = str(created_user.get("id") or "").strip()

  if not user_id:
    raise SupabaseError("ACCOUNT_CREATION_FAILED", "The account could not be created.", 502)

  profile = upsert_profile(
    user_id=user_id,
    email=email,
    role=role,
    full_name=full_name,
    phone_number=phone_number or None,
    company_name=metadata["company_name"],
    profession_type=metadata["profession_type"],
    service_area=metadata["service_area"],
    years_experience=metadata["years_experience"],
    specialties=metadata["specialties"],
    preferred_region=metadata["preferred_region"],
    website=metadata["website"],
  )

  if profile.get("status") != "active":
    raise SupabaseError("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.", 403)

  session = sign_in_with_password(email, password)

  return {
    "session": {
      "access_token": session.get("access_token"),
      "refresh_token": session.get("refresh_token"),
      "expires_in": session.get("expires_in"),
      "expires_at": session.get("expires_at"),
      "token_type": session.get("token_type"),
    },
    "user": {
      "id": profile.get("id"),
      "email": profile.get("email"),
      "username": profile.get("username"),
      "role": profile.get("role"),
      "status": profile.get("status"),
      "fullName": profile.get("fullName"),
      "phoneNumber": profile.get("phoneNumber"),
      "companyName": profile.get("companyName"),
      "professionType": profile.get("professionType"),
      "serviceArea": profile.get("serviceArea"),
      "yearsExperience": profile.get("yearsExperience"),
      "specialties": profile.get("specialties"),
      "preferredRegion": profile.get("preferredRegion"),
      "website": profile.get("website"),
    },
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
