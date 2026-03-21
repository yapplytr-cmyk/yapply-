from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from json import JSONDecodeError
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import ADMIN_ROLES, ALL_ROLES, DATA_DIR, DB_PATH, IS_VERCEL, KV_REST_TOKEN, KV_REST_URL, SEED_DB_PATH, SESSION_TTL_SECONDS, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, USE_REMOTE_USER_STORE
from .marketplace_schema import BID_PREVIEW_LIMIT, validate_marketplace_bid_payload, validate_marketplace_listing_payload
from .security import hash_password


def utc_now() -> datetime:
  return datetime.now(timezone.utc)


def utc_iso(dt: datetime | None = None) -> str:
  return (dt or utc_now()).replace(microsecond=0).isoformat()


def _uses_remote_user_store() -> bool:
  return USE_REMOTE_USER_STORE


def _kv_command_url(command: str, *parts: str) -> str:
  encoded_parts = "/".join(quote(str(part), safe="") for part in parts)
  base = KV_REST_URL.rstrip("/")
  return f"{base}/{command}{f'/{encoded_parts}' if encoded_parts else ''}"


def _kv_request(command: str, *parts: str, method: str = "GET", payload: str | None = None):
  if not _uses_remote_user_store():
    raise RuntimeError("Remote user store is not configured.")

  data = payload.encode("utf-8") if payload is not None else None
  request = Request(
    _kv_command_url(command, *parts),
    method=method,
    data=data,
    headers={
      "Authorization": f"Bearer {KV_REST_TOKEN}",
      "Content-Type": "application/json; charset=utf-8",
    },
  )

  try:
    with urlopen(request, timeout=10) as response:
      raw = response.read().decode("utf-8")
      if not raw:
        return {"result": None}

      try:
        return json.loads(raw)
      except JSONDecodeError as error:
        raise RuntimeError("Remote user store returned an invalid response.") from error
  except URLError as error:
    raise RuntimeError("Remote user store is unavailable.") from error
  except Exception as error:
    raise RuntimeError("Remote user store could not be used.") from error


def _kv_get(key: str):
  return _kv_request("get", key).get("result")


def _kv_set(key: str, value: str):
  _kv_request("set", key, method="POST", payload=value)


def _kv_delete(*keys: str):
  if keys:
    _kv_request("del", *keys)


def _kv_sadd(set_key: str, *values: str):
  if values:
    _kv_request("sadd", set_key, *values)


def _kv_srem(set_key: str, *values: str):
  if values:
    _kv_request("srem", set_key, *values)


def _kv_smembers(set_key: str) -> list[str]:
  result = _kv_request("smembers", set_key).get("result")
  return result if isinstance(result, list) else []


def _supabase_marketplace_request(
  path: str,
  *,
  method: str = "GET",
  payload: dict | list | None = None,
  raw_payload: bytes | None = None,
  extra_headers: dict[str, str] | None = None,
  expect_json: bool = True,
):
  if not _uses_supabase_marketplace_store():
    raise RuntimeError("Remote marketplace store is not configured.")

  headers = {
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Accept": "application/json",
  }

  data = raw_payload
  if payload is not None:
    data = json.dumps(payload).encode("utf-8")
    headers["Content-Type"] = "application/json; charset=utf-8"

  if extra_headers:
    headers.update(extra_headers)

  request = Request(
    f"{SUPABASE_URL}{path}",
    method=method,
    data=data,
    headers=headers,
  )

  try:
    with urlopen(request, timeout=12) as response:
      raw = response.read()
      if not expect_json:
        return raw
      if not raw:
        return {}
      return json.loads(raw.decode("utf-8"))
  except HTTPError as error:
    raw = error.read()
    if expect_json and raw:
      try:
        payload = json.loads(raw.decode("utf-8"))
      except (UnicodeDecodeError, JSONDecodeError):
        payload = {}
    else:
      payload = {}
    message = payload.get("message") if isinstance(payload, dict) else ""
    raise RuntimeError(message or "Remote marketplace store request failed.") from error
  except URLError as error:
    raise RuntimeError("Remote marketplace store is unavailable.") from error


def _ensure_supabase_marketplace_bucket() -> None:
  global _SUPABASE_MARKETPLACE_BUCKET_READY

  if _SUPABASE_MARKETPLACE_BUCKET_READY or not _uses_supabase_marketplace_store():
    return

  try:
    _supabase_marketplace_request(
      "/storage/v1/bucket",
      method="POST",
      payload={
        "id": SUPABASE_MARKETPLACE_BUCKET,
        "name": SUPABASE_MARKETPLACE_BUCKET,
        "public": False,
      },
    )
  except RuntimeError as error:
    if "already exists" not in str(error).lower():
      raise

  _SUPABASE_MARKETPLACE_BUCKET_READY = True


def _list_supabase_storage_objects(prefix: str) -> list[dict]:
  _ensure_supabase_marketplace_bucket()
  response = _supabase_marketplace_request(
    f"/storage/v1/object/list/{SUPABASE_MARKETPLACE_BUCKET}",
    method="POST",
    payload={
      "prefix": prefix,
      "limit": 1000,
      "offset": 0,
      "sortBy": {"column": "name", "order": "desc"},
    },
  )
  return response if isinstance(response, list) else []


def _upload_supabase_storage_json(path: str, record: dict) -> None:
  _ensure_supabase_marketplace_bucket()
  _supabase_marketplace_request(
    f"/storage/v1/object/{SUPABASE_MARKETPLACE_BUCKET}/{path}",
    method="POST",
    raw_payload=json.dumps(record).encode("utf-8"),
    extra_headers={
      "Content-Type": "application/json; charset=utf-8",
      "x-upsert": "true",
    },
  )


def _delete_supabase_storage_object(path: str) -> None:
  _ensure_supabase_marketplace_bucket()

  try:
    _supabase_marketplace_request(
      f"/storage/v1/object/{SUPABASE_MARKETPLACE_BUCKET}/{path}",
      method="DELETE",
      expect_json=False,
    )
  except RuntimeError as error:
    if "not found" not in str(error).lower():
      raise


def _download_supabase_storage_json(path: str) -> dict | None:
  _ensure_supabase_marketplace_bucket()

  try:
    raw = _supabase_marketplace_request(
      f"/storage/v1/object/authenticated/{SUPABASE_MARKETPLACE_BUCKET}/{path}",
      expect_json=False,
    )
  except RuntimeError as error:
    if "not found" in str(error).lower():
      return None
    raise

  if not raw:
    return None

  try:
    parsed = json.loads(raw.decode("utf-8"))
  except (UnicodeDecodeError, JSONDecodeError):
    return None

  return parsed if isinstance(parsed, dict) else None


def _user_record_key(user_id: str) -> str:
  return f"yapply:user:{user_id}"


def _user_email_key(email: str) -> str:
  return f"yapply:user-by-email:{email.strip().lower()}"


def _user_username_key(username: str) -> str:
  return f"yapply:user-by-username:{username.strip().lower()}"


USER_IDS_KEY = "yapply:user-ids"
MARKETPLACE_LISTING_IDS_KEY = "yapply:marketplace:listing-ids"
SUPABASE_MARKETPLACE_BUCKET = "yapply-marketplace"
SUPABASE_MARKETPLACE_LISTINGS_PREFIX = "listings"
SUPABASE_MARKETPLACE_BIDS_PREFIX = "bids"
_SUPABASE_MARKETPLACE_BUCKET_READY = False


def _uses_remote_kv_marketplace_store() -> bool:
  return _uses_remote_user_store() and IS_VERCEL


def _uses_supabase_marketplace_store() -> bool:
  return IS_VERCEL and bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _uses_remote_marketplace_store() -> bool:
  return _uses_remote_kv_marketplace_store() or _uses_supabase_marketplace_store()


def _marketplace_listing_record_key(listing_id: str) -> str:
  return f"yapply:marketplace:listing:{listing_id}"


def _marketplace_bid_record_key(bid_id: str) -> str:
  return f"yapply:marketplace:bid:{bid_id}"


def _marketplace_listing_bid_ids_key(listing_id: str) -> str:
  return f"yapply:marketplace:listing-bids:{listing_id}"


def _supabase_marketplace_listing_path(listing_id: str) -> str:
  return f"{SUPABASE_MARKETPLACE_LISTINGS_PREFIX}/{listing_id}.json"


def _supabase_marketplace_bid_path(listing_id: str, bid_id: str) -> str:
  return f"{SUPABASE_MARKETPLACE_BIDS_PREFIX}/{listing_id}/{bid_id}.json"


def _resolve_supabase_storage_object_path(prefix: str, name: str) -> str:
  normalized_prefix = prefix.strip().strip("/")
  normalized_name = str(name or "").strip().lstrip("/")

  if not normalized_prefix:
    return normalized_name

  if normalized_name.startswith(f"{normalized_prefix}/") or normalized_name == normalized_prefix:
    return normalized_name

  return f"{normalized_prefix}/{normalized_name}"


def _normalize_remote_user_record(record) -> dict | None:
  if not isinstance(record, dict):
    return None

  user_id = get_record_value(record, "id", "userId")
  if not user_id:
    return None

  created_at = get_record_value(record, "created_at", "createdAt") or utc_iso()
  updated_at = get_record_value(record, "updated_at", "updatedAt") or created_at
  status = get_record_value(record, "status")
  is_active = get_record_value(record, "is_active", "isActive")

  if is_active is None and status is not None:
    is_active = 1 if str(status).lower() == "active" else 0

  email = get_record_value(record, "email")
  username = get_record_value(record, "username")

  return {
    "id": str(user_id),
    "username": str(username).strip() if username is not None else None,
    "email": str(email).strip().lower() if email is not None else None,
    "password_hash": get_record_value(record, "password_hash", "passwordHash"),
    "role": get_record_value(record, "role"),
    "full_name": get_record_value(record, "full_name", "fullName") or "",
    "phone_number": get_record_value(record, "phone_number", "phoneNumber"),
    "company_name": get_record_value(record, "company_name", "companyName"),
    "profession_type": get_record_value(record, "profession_type", "professionType"),
    "service_area": get_record_value(record, "service_area", "serviceArea"),
    "years_experience": get_record_value(record, "years_experience", "yearsExperience"),
    "specialties": get_record_value(record, "specialties"),
    "preferred_region": get_record_value(record, "preferred_region", "preferredRegion"),
    "website": get_record_value(record, "website"),
    "created_at": created_at,
    "updated_at": updated_at,
    "is_active": 1 if int(is_active or 0) == 1 else 0,
  }


def _load_remote_user_by_id(user_id: str) -> dict | None:
  raw = _kv_get(_user_record_key(user_id))
  if not raw:
    return None

  try:
    parsed = json.loads(raw) if isinstance(raw, str) else raw
  except json.JSONDecodeError:
    return None

  return _normalize_remote_user_record(parsed)


def _load_remote_user_by_index(key: str) -> dict | None:
  user_id = _kv_get(key)
  if not user_id:
    return None

  if isinstance(user_id, dict):
    normalized = _normalize_remote_user_record(user_id)
    if normalized:
      return normalized
    user_id = get_record_value(user_id, "id", "userId")
    if not user_id:
      return None

  if isinstance(user_id, str):
    trimmed = user_id.strip()
    if trimmed.startswith("{"):
      try:
        normalized = _normalize_remote_user_record(json.loads(trimmed))
      except json.JSONDecodeError:
        normalized = None
      if normalized:
        return normalized

  return _load_remote_user_by_id(str(user_id))


def _list_remote_users() -> list[dict]:
  users = [_load_remote_user_by_id(user_id) for user_id in _kv_smembers(USER_IDS_KEY)]
  filtered = [user for user in users if user]
  filtered.sort(key=lambda user: (get_record_value(user, "created_at", "createdAt") or "", get_record_value(user, "full_name", "fullName") or ""), reverse=True)
  return filtered


def _count_remote_active_admin_users(exclude_user_id: str | None = None) -> int:
  count = 0
  for user in _list_remote_users():
    if exclude_user_id and get_record_value(user, "id") == exclude_user_id:
      continue
    if get_record_value(user, "role") in ADMIN_ROLES and int(get_record_value(user, "is_active", "isActive") or 1) == 1:
      count += 1
  return count


def _load_remote_json_record(key: str) -> dict | None:
  raw = _kv_get(key)
  if not raw:
    return None

  try:
    parsed = json.loads(raw) if isinstance(raw, str) else raw
  except json.JSONDecodeError:
    return None

  return parsed if isinstance(parsed, dict) else None


def _load_remote_marketplace_listing_record(listing_id: str) -> dict | None:
  if _uses_remote_kv_marketplace_store():
    return _load_remote_json_record(_marketplace_listing_record_key(listing_id))

  if _uses_supabase_marketplace_store():
    return _download_supabase_storage_json(_supabase_marketplace_listing_path(listing_id))

  return _load_remote_json_record(_marketplace_listing_record_key(listing_id))


def _load_remote_marketplace_bid_record(bid_id: str) -> dict | None:
  if _uses_remote_kv_marketplace_store():
    return _load_remote_json_record(_marketplace_bid_record_key(bid_id))
  return _load_remote_json_record(_marketplace_bid_record_key(bid_id))


def _list_remote_marketplace_bid_records(listing_id: str) -> list[dict]:
  if _uses_remote_kv_marketplace_store():
    bids = [_load_remote_marketplace_bid_record(bid_id) for bid_id in _kv_smembers(_marketplace_listing_bid_ids_key(listing_id))]
    filtered = [bid for bid in bids if bid]
    filtered.sort(key=lambda bid: (get_record_value(bid, "created_at", "createdAt") or "", get_record_value(bid, "id") or ""), reverse=True)
    return filtered

  if _uses_supabase_marketplace_store():
    objects = _list_supabase_storage_objects(f"{SUPABASE_MARKETPLACE_BIDS_PREFIX}/{listing_id}")
    bids = []
    for item in objects:
      name = item.get("name") if isinstance(item, dict) else None
      if not name:
        continue
      record = _download_supabase_storage_json(_resolve_supabase_storage_object_path(f"{SUPABASE_MARKETPLACE_BIDS_PREFIX}/{listing_id}", name))
      if record:
        bids.append(record)
    bids.sort(key=lambda bid: (get_record_value(bid, "created_at", "createdAt") or "", get_record_value(bid, "id") or ""), reverse=True)
    return bids

  bids = [_load_remote_marketplace_bid_record(bid_id) for bid_id in _kv_smembers(_marketplace_listing_bid_ids_key(listing_id))]
  filtered = [bid for bid in bids if bid]
  filtered.sort(key=lambda bid: (get_record_value(bid, "created_at", "createdAt") or "", get_record_value(bid, "id") or ""), reverse=True)
  return filtered


def _list_remote_marketplace_listing_records() -> list[dict]:
  if _uses_remote_kv_marketplace_store():
    records = [_load_remote_marketplace_listing_record(listing_id) for listing_id in _kv_smembers(MARKETPLACE_LISTING_IDS_KEY)]
    filtered = [record for record in records if record]
    filtered.sort(
      key=lambda record: (get_record_value(record, "created_at", "createdAt") or "", get_record_value(record, "id") or ""),
      reverse=True,
    )
    return filtered

  if _uses_supabase_marketplace_store():
    objects = _list_supabase_storage_objects(SUPABASE_MARKETPLACE_LISTINGS_PREFIX)
    records = []
    for item in objects:
      name = item.get("name") if isinstance(item, dict) else None
      if not name:
        continue
      record = _download_supabase_storage_json(_resolve_supabase_storage_object_path(SUPABASE_MARKETPLACE_LISTINGS_PREFIX, name))
      if record:
        records.append(record)
    records.sort(
      key=lambda record: (get_record_value(record, "created_at", "createdAt") or "", get_record_value(record, "id") or ""),
      reverse=True,
    )
    return records

  records = [_load_remote_marketplace_listing_record(listing_id) for listing_id in _kv_smembers(MARKETPLACE_LISTING_IDS_KEY)]
  filtered = [record for record in records if record]
  filtered.sort(
    key=lambda record: (get_record_value(record, "created_at", "createdAt") or "", get_record_value(record, "id") or ""),
    reverse=True,
  )
  return filtered


def get_account_store_status() -> dict:
  status = {
    "mode": "remote-kv" if _uses_remote_user_store() else "local-sqlite",
    "remoteConfigured": _uses_remote_user_store(),
    "remoteReachable": False,
    "sourceOfTruth": "shared-remote-kv" if _uses_remote_user_store() else "local-serverless-sqlite",
  }

  if not _uses_remote_user_store():
    status["reason"] = "No KV/Upstash REST environment variables were detected at runtime."
    return status

  try:
    _kv_get("yapply:healthcheck")
    status["remoteReachable"] = True
    return status
  except RuntimeError as error:
    status["reason"] = str(error)
    return status


def ensure_database() -> None:
  if _uses_remote_user_store() and IS_VERCEL:
    return

  DATA_DIR.mkdir(parents=True, exist_ok=True)

  if DB_PATH != SEED_DB_PATH and not DB_PATH.exists() and SEED_DB_PATH.exists():
    DB_PATH.write_bytes(SEED_DB_PATH.read_bytes())

  with sqlite3.connect(DB_PATH) as connection:
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(
      """
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone_number TEXT,
        company_name TEXT,
        profession_type TEXT,
        service_area TEXT,
        years_experience INTEGER,
        specialties TEXT,
        preferred_region TEXT,
        website TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT,
        owner_role TEXT,
        listing_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        title TEXT,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS listing_bids (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        bidder_user_id TEXT,
        bidder_role TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        FOREIGN KEY (bidder_user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_marketplace_listings_owner ON marketplace_listings(owner_user_id);
      CREATE INDEX IF NOT EXISTS idx_listing_bids_listing ON listing_bids(listing_id);
      CREATE INDEX IF NOT EXISTS idx_listing_bids_bidder ON listing_bids(bidder_user_id);
      """
    )

    columns = {row[1] for row in connection.execute("PRAGMA table_info(users)").fetchall()}
    if "username" not in columns:
      connection.execute("ALTER TABLE users ADD COLUMN username TEXT")

    connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE)")


def get_connection() -> sqlite3.Connection:
  ensure_database()
  connection = sqlite3.connect(DB_PATH)
  connection.row_factory = sqlite3.Row
  connection.execute("PRAGMA foreign_keys = ON")
  return connection


def get_record_value(record, *keys):
  if record is None:
    return None

  for key in keys:
    try:
      if isinstance(record, sqlite3.Row):
        if key in record.keys():
          return record[key]
      else:
        value = record.get(key) if hasattr(record, "get") else None
        if value is not None:
          return value
        if hasattr(record, "__contains__") and key in record:
          return record[key]
    except Exception:
      continue

  return None


def serialize_user(row: sqlite3.Row) -> dict:
  return {
    "id": get_record_value(row, "id"),
    "username": get_record_value(row, "username"),
    "email": get_record_value(row, "email"),
    "role": get_record_value(row, "role"),
    "fullName": get_record_value(row, "full_name", "fullName") or "",
    "phoneNumber": get_record_value(row, "phone_number", "phoneNumber"),
    "companyName": get_record_value(row, "company_name", "companyName"),
    "professionType": get_record_value(row, "profession_type", "professionType"),
    "serviceArea": get_record_value(row, "service_area", "serviceArea"),
    "yearsExperience": get_record_value(row, "years_experience", "yearsExperience"),
    "specialties": get_record_value(row, "specialties"),
    "preferredRegion": get_record_value(row, "preferred_region", "preferredRegion"),
    "website": get_record_value(row, "website"),
    "createdAt": get_record_value(row, "created_at", "createdAt"),
    "status": "active" if int(get_record_value(row, "is_active", "isActive") or 0) == 1 else "inactive",
  }


def list_users() -> list[dict]:
  if _uses_remote_user_store():
    return [serialize_user(row) for row in _list_remote_users()]

  with get_connection() as connection:
    rows = connection.execute(
      """
      SELECT *
      FROM users
      ORDER BY datetime(created_at) DESC, full_name COLLATE NOCASE ASC
      """
    ).fetchall()

  return [serialize_user(row) for row in rows]


def get_user_by_email(email: str) -> sqlite3.Row | None:
  if _uses_remote_user_store():
    return _load_remote_user_by_index(_user_email_key(email))

  with get_connection() as connection:
    return connection.execute("SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1", (email.strip(),)).fetchone()


def get_user_by_username(username: str) -> sqlite3.Row | None:
  if _uses_remote_user_store():
    return _load_remote_user_by_index(_user_username_key(username))

  with get_connection() as connection:
    return connection.execute("SELECT * FROM users WHERE lower(username) = lower(?) LIMIT 1", (username.strip(),)).fetchone()


def get_user_by_identifier(identifier: str) -> sqlite3.Row | None:
  return get_user_by_email(identifier) or get_user_by_username(identifier)


def get_user_by_id(user_id: str) -> sqlite3.Row | None:
  if _uses_remote_user_store():
    return _load_remote_user_by_id(user_id)

  with get_connection() as connection:
    return connection.execute("SELECT * FROM users WHERE id = ? LIMIT 1", (user_id,)).fetchone()


def count_active_admin_users(exclude_user_id: str | None = None) -> int:
  if _uses_remote_user_store():
    return _count_remote_active_admin_users(exclude_user_id)

  query = "SELECT COUNT(*) FROM users WHERE role IN (?, ?) AND is_active = 1"
  params: list[str] = ["admin", "moderator"]

  if exclude_user_id:
    query += " AND id != ?"
    params.append(exclude_user_id)

  with get_connection() as connection:
    return int(connection.execute(query, tuple(params)).fetchone()[0])


def update_user_status(user_id: str, is_active: bool) -> dict | None:
  if _uses_remote_user_store():
    record = _load_remote_user_by_id(user_id)
    if not record:
      return None

    record["is_active"] = 1 if is_active else 0
    record["updated_at"] = utc_iso()
    _kv_set(_user_record_key(user_id), json.dumps(record))
    return serialize_user(record)

  now = utc_iso()

  with get_connection() as connection:
    connection.execute(
      """
      UPDATE users
      SET is_active = ?, updated_at = ?
      WHERE id = ?
      """,
      (1 if is_active else 0, now, user_id),
    )
    row = connection.execute("SELECT * FROM users WHERE id = ? LIMIT 1", (user_id,)).fetchone()

  return serialize_user(row) if row else None


def delete_user_account(user_id: str) -> bool:
  if _uses_remote_user_store():
    record = _load_remote_user_by_id(user_id)
    if not record:
      return False

    _kv_delete(_user_record_key(user_id))
    _kv_delete(_user_email_key(record["email"]))

    username = record.get("username")
    if username:
      _kv_delete(_user_username_key(username))

    _kv_srem(USER_IDS_KEY, user_id)
    return True

  with get_connection() as connection:
    cursor = connection.execute("DELETE FROM users WHERE id = ?", (user_id,))

  return cursor.rowcount > 0


def create_user(payload: dict) -> dict:
  role = payload["role"]
  if role not in ALL_ROLES:
    raise ValueError("Unsupported role.")

  now = utc_iso()
  user_id = str(uuid.uuid4())

  if _uses_remote_user_store():
    email = payload["email"].strip().lower()
    username = (payload.get("username") or "").strip().lower() or None

    if get_user_by_email(email):
      raise sqlite3.IntegrityError("UNIQUE constraint failed: users.email")

    if username and get_user_by_username(username):
      raise sqlite3.IntegrityError("UNIQUE constraint failed: users.username")

    record = {
      "id": user_id,
      "username": payload.get("username"),
      "email": email,
      "password_hash": hash_password(payload["password"]),
      "role": role,
      "full_name": payload["fullName"].strip(),
      "phone_number": payload.get("phoneNumber"),
      "company_name": payload.get("companyName"),
      "profession_type": payload.get("professionType"),
      "service_area": payload.get("serviceArea"),
      "years_experience": payload.get("yearsExperience"),
      "specialties": payload.get("specialties"),
      "preferred_region": payload.get("preferredRegion"),
      "website": payload.get("website"),
      "created_at": now,
      "updated_at": now,
      "is_active": 1,
    }

    _kv_set(_user_record_key(user_id), json.dumps(record))
    _kv_set(_user_email_key(email), user_id)
    if username:
      _kv_set(_user_username_key(username), user_id)
    _kv_sadd(USER_IDS_KEY, user_id)

    return serialize_user(record)

  with get_connection() as connection:
    connection.execute(
      """
      INSERT INTO users (
        id, username, email, password_hash, role, full_name, phone_number, company_name,
        profession_type, service_area, years_experience, specialties,
        preferred_region, website, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (
        user_id,
        payload.get("username"),
        payload["email"].strip().lower(),
        hash_password(payload["password"]),
        role,
        payload["fullName"].strip(),
        payload.get("phoneNumber"),
        payload.get("companyName"),
        payload.get("professionType"),
        payload.get("serviceArea"),
        payload.get("yearsExperience"),
        payload.get("specialties"),
        payload.get("preferredRegion"),
        payload.get("website"),
        now,
        now,
      ),
    )
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

  return serialize_user(row)


def create_session(user_id: str, token_hash: str, user_agent: str = "", ip_address: str = "") -> dict:
  now = utc_now()
  expires_at = now + timedelta(seconds=SESSION_TTL_SECONDS)
  session_id = str(uuid.uuid4())

  with get_connection() as connection:
    connection.execute(
      """
      INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      """,
      (session_id, user_id, token_hash, utc_iso(now), utc_iso(expires_at), user_agent[:255], ip_address[:128]),
    )

  return {"id": session_id, "userId": user_id, "expiresAt": utc_iso(expires_at)}


def delete_session(token_hash: str) -> None:
  with get_connection() as connection:
    connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


def get_session_user(token_hash: str) -> dict | None:
  with get_connection() as connection:
    row = connection.execute(
      """
      SELECT users.*
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND users.is_active = 1
        AND sessions.expires_at > ?
      LIMIT 1
      """,
      (token_hash, utc_iso()),
    ).fetchone()

  return serialize_user(row) if row else None


def purge_expired_sessions() -> None:
  with get_connection() as connection:
    connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (utc_iso(),))


def seed_admin_account(email: str, password: str, full_name: str, role: str = "admin", username: str | None = None) -> dict:
  if role not in ADMIN_ROLES:
    raise ValueError("Admin seeding only supports admin or moderator roles.")

  existing = get_user_by_email(email) or (get_user_by_username(username) if username else None)

  if existing:
    now = utc_iso()
    normalized_email = email.strip().lower()
    normalized_username = (username or "").strip().lower() or None

    if _uses_remote_user_store():
      existing_id = get_record_value(existing, "id")
      if not existing_id:
        return create_user(
          {
            "email": email,
            "username": username,
            "password": password,
            "role": role,
            "fullName": full_name,
            "phoneNumber": None,
            "companyName": None,
            "professionType": None,
            "serviceArea": None,
            "yearsExperience": None,
            "specialties": None,
            "preferredRegion": None,
            "website": None,
          }
        )

      previous_email = (get_record_value(existing, "email") or "").strip().lower()
      previous_username = (get_record_value(existing, "username") or "").strip().lower() or None
      record = {
        **existing,
        "username": username,
        "email": normalized_email,
        "password_hash": hash_password(password),
        "role": role,
        "full_name": full_name.strip(),
        "updated_at": now,
        "is_active": 1,
      }

      _kv_set(_user_record_key(existing_id), json.dumps(record))
      _kv_set(_user_email_key(normalized_email), existing_id)
      _kv_sadd(USER_IDS_KEY, existing_id)

      if previous_email and previous_email != normalized_email:
        _kv_delete(_user_email_key(previous_email))

      if previous_username and previous_username != normalized_username:
        _kv_delete(_user_username_key(previous_username))

      if normalized_username:
        _kv_set(_user_username_key(normalized_username), existing_id)
      elif previous_username:
        _kv_delete(_user_username_key(previous_username))

      return serialize_user(record)

    with get_connection() as connection:
      connection.execute(
        """
        UPDATE users
        SET username = ?, email = ?, password_hash = ?, role = ?, full_name = ?, updated_at = ?, is_active = 1
        WHERE id = ?
        """,
        (username, normalized_email, hash_password(password), role, full_name.strip(), now, existing["id"]),
      )
      row = connection.execute("SELECT * FROM users WHERE id = ?", (existing["id"],)).fetchone()
    return serialize_user(row)

  return create_user(
    {
      "email": email,
      "username": username,
      "password": password,
      "role": role,
      "fullName": full_name,
      "phoneNumber": None,
      "companyName": None,
      "professionType": None,
      "serviceArea": None,
      "yearsExperience": None,
      "specialties": None,
      "preferredRegion": None,
      "website": None,
    }
  )


def create_listing_shell(owner_user_id: str, owner_role: str, listing_type: str, title: str, payload: dict | None = None) -> str:
  listing_id = str(uuid.uuid4())
  now = utc_iso()

  with get_connection() as connection:
    connection.execute(
      """
      INSERT INTO marketplace_listings (
        id, owner_user_id, owner_role, listing_type, status, title, payload_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
      """,
      (listing_id, owner_user_id, owner_role, listing_type, title, json.dumps(payload or {}), now, now),
    )

  return listing_id


def _load_json_dict(raw_value) -> dict:
  if not raw_value:
    return {}

  try:
    payload = json.loads(raw_value)
  except (TypeError, JSONDecodeError):
    return {}

  return payload if isinstance(payload, dict) else {}


def serialize_marketplace_bid(row: sqlite3.Row) -> dict:
  payload = _load_json_dict(row["payload_json"])
  return {
    **payload,
    "id": row["id"],
    "listingId": row["listing_id"],
    "status": row["status"],
    "developerUserId": row["bidder_user_id"],
    "developerRole": row["bidder_role"],
    "createdAt": row["created_at"],
  }


def _serialize_marketplace_dashboard_bid_entry(bid: dict, listing: dict | None) -> dict:
  listing = listing or {}
  marketplace_meta = listing.get("marketplaceMeta") if isinstance(listing.get("marketplaceMeta"), dict) else {}

  entry = {
    **bid,
    "listing": {
      "id": listing.get("id") or bid.get("listingId"),
      "title": listing.get("title") or listing.get("name") or "",
      "location": listing.get("location") or "",
      "category": listing.get("projectType") or listing.get("marketplaceCategory") or marketplace_meta.get("category") or "",
      "status": marketplace_meta.get("listingStatus") or listing.get("status") or "",
      "type": listing.get("type") or "client",
    },
  }

  bid_status = str(bid.get("status") or "").strip().lower()
  if bid_status == "accepted":
    entry["clientContact"] = {
      "name": listing.get("ownerName") or listing.get("contactName") or "",
      "email": listing.get("ownerEmail") or listing.get("contactEmail") or "",
      "phone": listing.get("contactPhone") or listing.get("phoneNumber") or "",
    }

  return entry


def _list_marketplace_bids_for_listing(connection: sqlite3.Connection, listing_id: str, limit: int = BID_PREVIEW_LIMIT) -> list[dict]:
  rows = connection.execute(
    """
    SELECT *
    FROM listing_bids
    WHERE listing_id = ?
    ORDER BY datetime(created_at) DESC, rowid DESC
    LIMIT ?
    """,
    (listing_id, max(1, limit)),
  ).fetchall()

  return [serialize_marketplace_bid(row) for row in rows]


def _count_marketplace_bids_for_listing(connection: sqlite3.Connection, listing_id: str) -> int:
  row = connection.execute("SELECT COUNT(*) AS count FROM listing_bids WHERE listing_id = ?", (listing_id,)).fetchone()
  return int(row["count"] or 0) if row else 0


def _list_remote_marketplace_bids_for_listing(listing_id: str, limit: int = BID_PREVIEW_LIMIT) -> list[dict]:
  rows = _list_remote_marketplace_bid_records(listing_id)[: max(1, limit)]
  return [serialize_marketplace_bid(row) for row in rows]


def _count_remote_marketplace_bids_for_listing(listing_id: str) -> int:
  return len(_list_remote_marketplace_bid_records(listing_id))


def serialize_marketplace_listing(row: sqlite3.Row, connection: sqlite3.Connection | None = None, skip_bids: bool = False) -> dict:
  payload = _load_json_dict(row["payload_json"])
  marketplace_meta = payload.get("marketplaceMeta") if isinstance(payload.get("marketplaceMeta"), dict) else {}
  own_connection = connection is None

  if skip_bids:
    latest_bids = []
    bid_count = 0
  elif isinstance(row, dict) and "_pg_bids" in row:
    # Row fetched directly from PG REST API — bids are already embedded
    pg_bids = row.get("_pg_bids") or []
    latest_bids = [serialize_marketplace_bid(b) for b in pg_bids[:BID_PREVIEW_LIMIT]]
    bid_count = len(pg_bids)
  elif _uses_remote_marketplace_store() and not isinstance(row, sqlite3.Row):
    latest_bids = _list_remote_marketplace_bids_for_listing(row["id"], BID_PREVIEW_LIMIT)
    bid_count = _count_remote_marketplace_bids_for_listing(row["id"])
  else:
    if own_connection:
      connection = get_connection()

    try:
      latest_bids = _list_marketplace_bids_for_listing(connection, row["id"], BID_PREVIEW_LIMIT)
      bid_count = _count_marketplace_bids_for_listing(connection, row["id"])
    finally:
      if own_connection and connection is not None:
        connection.close()

  return {
    **payload,
    "id": row["id"],
    "type": row["listing_type"],
    "status": row["status"],
    "title": payload.get("title") or row["title"],
    "ownerUserId": row["owner_user_id"] or payload.get("ownerUserId"),
    "ownerRole": row["owner_role"],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
    "marketplaceMeta": {
      **marketplace_meta,
      "latestBids": latest_bids,
      "bidCount": bid_count,
    },
  }


def create_marketplace_listing(payload: dict) -> dict:
  listing_id = str(uuid.uuid4())
  now = utc_iso()
  validated_payload = validate_marketplace_listing_payload(payload)
  listing_type = validated_payload["type"]
  title = validated_payload.get("title") or validated_payload.get("name") or "Marketplace Listing"
  owner_user_id = validated_payload.get("ownerUserId")
  owner_role = validated_payload.get("ownerRole")
  stored_payload = {**validated_payload, "id": listing_id, "createdAt": now, "updatedAt": now}

  if _uses_remote_kv_marketplace_store():
    record = {
      "id": listing_id,
      "owner_user_id": owner_user_id,
      "owner_role": owner_role,
      "listing_type": listing_type,
      "status": validated_payload.get("status") or "active",
      "title": title,
      "payload_json": json.dumps(stored_payload),
      "created_at": now,
      "updated_at": now,
    }
    _kv_set(_marketplace_listing_record_key(listing_id), json.dumps(record))
    _kv_sadd(MARKETPLACE_LISTING_IDS_KEY, listing_id)
    return serialize_marketplace_listing(record)

  if _uses_supabase_marketplace_store():
    record = {
      "id": listing_id,
      "owner_user_id": owner_user_id,
      "owner_role": owner_role,
      "listing_type": listing_type,
      "status": validated_payload.get("status") or "active",
      "title": title,
      "payload_json": json.dumps(stored_payload),
      "created_at": now,
      "updated_at": now,
    }
    _upload_supabase_storage_json(_supabase_marketplace_listing_path(listing_id), record)
    return serialize_marketplace_listing(record)

  with get_connection() as connection:
    relational_owner_user_id = owner_user_id
    if relational_owner_user_id:
      owner_row = connection.execute("SELECT id FROM users WHERE id = ? LIMIT 1", (relational_owner_user_id,)).fetchone()
      if not owner_row:
        relational_owner_user_id = None

    connection.execute(
      """
      INSERT INTO marketplace_listings (
        id, owner_user_id, owner_role, listing_type, status, title, payload_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (
        listing_id,
        relational_owner_user_id,
        owner_role,
        listing_type,
        validated_payload.get("status") or "active",
        title,
        json.dumps(stored_payload),
        now,
        now,
      ),
    )
    row = connection.execute("SELECT * FROM marketplace_listings WHERE id = ? LIMIT 1", (listing_id,)).fetchone()

  return serialize_marketplace_listing(row, connection)


def update_marketplace_listing(listing_id: str, payload: dict) -> dict | None:
  existing_listing = get_marketplace_listing(listing_id)
  if not existing_listing:
    return None

  now = utc_iso()
  merged_payload = {
    **existing_listing,
    **(payload if isinstance(payload, dict) else {}),
    "id": listing_id,
    "type": existing_listing.get("type"),
    "ownerUserId": existing_listing.get("ownerUserId"),
    "ownerRole": existing_listing.get("ownerRole"),
    "createdAt": existing_listing.get("createdAt") or now,
    "updatedAt": now,
  }
  validated_payload = validate_marketplace_listing_payload(merged_payload)
  title = validated_payload.get("title") or validated_payload.get("name") or "Marketplace Listing"
  status = validated_payload.get("status") or existing_listing.get("status") or "active"
  record = {
    "id": listing_id,
    "owner_user_id": existing_listing.get("ownerUserId"),
    "owner_role": existing_listing.get("ownerRole"),
    "listing_type": validated_payload["type"],
    "status": status,
    "title": title,
    "payload_json": json.dumps(
      {
        **validated_payload,
        "id": listing_id,
        "createdAt": existing_listing.get("createdAt") or now,
        "updatedAt": now,
      }
    ),
    "created_at": existing_listing.get("createdAt") or now,
    "updated_at": now,
  }

  if _uses_remote_kv_marketplace_store():
    if not _load_remote_marketplace_listing_record(listing_id):
      return None

    _kv_set(_marketplace_listing_record_key(listing_id), json.dumps(record))
    return serialize_marketplace_listing(record)

  if _uses_supabase_marketplace_store():
    if not _load_remote_marketplace_listing_record(listing_id):
      return None

    _upload_supabase_storage_json(_supabase_marketplace_listing_path(listing_id), record)
    return serialize_marketplace_listing(record)

  with get_connection() as connection:
    updated = connection.execute(
      """
      UPDATE marketplace_listings
      SET owner_user_id = ?, owner_role = ?, listing_type = ?, status = ?, title = ?, payload_json = ?, updated_at = ?
      WHERE id = ?
      """,
      (
        existing_listing.get("ownerUserId"),
        existing_listing.get("ownerRole"),
        validated_payload["type"],
        status,
        title,
        record["payload_json"],
        now,
        listing_id,
      ),
    )

    if updated.rowcount == 0:
      return None

    row = connection.execute("SELECT * FROM marketplace_listings WHERE id = ? LIMIT 1", (listing_id,)).fetchone()

  return serialize_marketplace_listing(row, connection)


def update_marketplace_bid_status(bid_id: str, listing_id: str, status: str) -> bool:
  if not bid_id or not status:
    return False

  if _uses_remote_kv_marketplace_store():
    record = _load_remote_marketplace_bid_record(bid_id)
    if not record:
      return False
    record["status"] = status
    payload = _load_json_dict(record.get("payload_json", "{}"))
    payload["status"] = status
    record["payload_json"] = json.dumps(payload)
    _kv_set(_marketplace_bid_record_key(bid_id), json.dumps(record))
    return True

  if _uses_supabase_marketplace_store():
    if not listing_id:
      return False
    path = _supabase_marketplace_bid_path(listing_id, bid_id)
    record = _download_supabase_storage_json(path)
    if not record:
      return False
    record["status"] = status
    payload = _load_json_dict(record.get("payload_json", "{}"))
    payload["status"] = status
    record["payload_json"] = json.dumps(payload)
    _upload_supabase_storage_json(path, record)
    return True

  with get_connection() as connection:
    result = connection.execute(
      "UPDATE listing_bids SET status = ? WHERE id = ?",
      (status, bid_id),
    )
    return result.rowcount > 0


def delete_marketplace_listing(listing_id: str) -> bool:
  if _uses_remote_kv_marketplace_store():
    record = _load_remote_marketplace_listing_record(listing_id)
    if not record:
      return False

    for bid_record in _list_remote_marketplace_bid_records(listing_id):
      bid_id = get_record_value(bid_record, "id")
      if bid_id:
        _kv_delete(_marketplace_bid_record_key(str(bid_id)))
        _kv_srem(_marketplace_listing_bid_ids_key(listing_id), str(bid_id))

    _kv_delete(_marketplace_listing_bid_ids_key(listing_id))
    _kv_delete(_marketplace_listing_record_key(listing_id))
    _kv_srem(MARKETPLACE_LISTING_IDS_KEY, listing_id)
    return True

  if _uses_supabase_marketplace_store():
    record = _load_remote_marketplace_listing_record(listing_id)
    if not record:
      return False

    for item in _list_supabase_storage_objects(f"{SUPABASE_MARKETPLACE_BIDS_PREFIX}/{listing_id}"):
      name = item.get("name") if isinstance(item, dict) else None
      if not name:
        continue
      _delete_supabase_storage_object(_resolve_supabase_storage_object_path(f"{SUPABASE_MARKETPLACE_BIDS_PREFIX}/{listing_id}", name))

    _delete_supabase_storage_object(_supabase_marketplace_listing_path(listing_id))
    return True

  with get_connection() as connection:
    deleted = connection.execute("DELETE FROM marketplace_listings WHERE id = ?", (listing_id,))
    return deleted.rowcount > 0


def _fetch_pg_listing_via_rest(listing_id: str) -> dict | None:
  """Fetch a listing directly from the Supabase PostgreSQL REST API (bypasses cloud storage)."""
  if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    return None
  try:
    rest_path = f"/rest/v1/marketplace_listings?id=eq.{quote(listing_id)}&select=*,listing_bids(id,bidder_user_id,bidder_role,status,company_name,bid_amount,estimated_timeframe,proposal_message,payload,created_at)&limit=1"
    req = Request(
      f"{SUPABASE_URL}{rest_path}",
      method="GET",
      headers={
        "Accept": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Prefer": "return=representation",
      },
    )
    with urlopen(req, timeout=12) as resp:
      rows = json.loads(resp.read())
    if isinstance(rows, list) and rows:
      row = rows[0]
      # Normalize to the shape serialize_marketplace_listing expects
      bids_raw = row.pop("listing_bids", []) or []
      bids = []
      for b in bids_raw:
        bid_payload = b.get("payload") or {}
        bids.append({
          "id": b.get("id"),
          "listing_id": listing_id,
          "bidder_user_id": b.get("bidder_user_id"),
          "bidder_role": b.get("bidder_role", "developer"),
          "status": b.get("status", "submitted"),
          "payload_json": json.dumps({
            **bid_payload,
            "id": b.get("id"),
            "companyName": b.get("company_name", ""),
            "bidAmount": bid_payload.get("bidAmount") or {"label": b.get("bid_amount", "")},
            "estimatedCompletionTimeframe": bid_payload.get("estimatedCompletionTimeframe") or {"label": b.get("estimated_timeframe", "")},
            "proposalMessage": b.get("proposal_message", ""),
            "developerProfileReference": bid_payload.get("developerProfileReference") or {"userId": b.get("bidder_user_id")},
          }),
          "created_at": b.get("created_at"),
        })
      payload_data = row.get("payload") or {}
      return {
        "id": row.get("id"),
        "listing_type": row.get("listing_type", "client"),
        "status": row.get("status", "open-for-bids"),
        "title": row.get("title", ""),
        "description": row.get("description", ""),
        "location": row.get("location", ""),
        "budget": row.get("budget", ""),
        "timeframe": row.get("timeframe", ""),
        "project_type": row.get("project_type", ""),
        "category": row.get("category", ""),
        "owner_user_id": row.get("owner_user_id", ""),
        "owner_email": row.get("owner_email", ""),
        "owner_role": row.get("owner_role", "client"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "payload_json": json.dumps({
          **payload_data,
          "type": row.get("listing_type", "client"),
          "status": row.get("status", "open-for-bids"),
          "marketplaceMeta": {
            **(payload_data.get("marketplaceMeta") or {}),
            "listingStatus": row.get("status", "open-for-bids"),
            "category": row.get("category", ""),
            "bidCount": len(bids),
          },
        }),
        "_pg_bids": bids,
      }
  except Exception:
    pass
  return None


def get_marketplace_listing(listing_id: str) -> dict | None:
  if _uses_remote_marketplace_store():
    row = _load_remote_marketplace_listing_record(listing_id)
    if row:
      return serialize_marketplace_listing(row)
    # Fallback: listing may exist in PostgreSQL but not in cloud storage
    pg_row = _fetch_pg_listing_via_rest(listing_id)
    if pg_row:
      return serialize_marketplace_listing(pg_row)
    return None

  with get_connection() as connection:
    row = connection.execute("SELECT * FROM marketplace_listings WHERE id = ? LIMIT 1", (listing_id,)).fetchone()

    return serialize_marketplace_listing(row, connection) if row else None


def _expand_status_matches(status: str) -> set[str]:
  """Treat 'active' and 'open-for-bids' as equivalent visible statuses."""
  active_aliases = {"active", "open-for-bids", "live"}
  if status in active_aliases:
    return active_aliases
  return {status}


def list_marketplace_listings(
  listing_type: str | None = None,
  status: str | None = None,
  category: str | None = None,
  limit: int = 48,
  skip_bids: bool = False,
) -> list[dict]:
  status_matches = _expand_status_matches(status) if status else set()

  if _uses_remote_marketplace_store():
    records = _list_remote_marketplace_listing_records()

    if listing_type:
      records = [record for record in records if get_record_value(record, "listing_type") == listing_type]

    if status_matches:
      records = [record for record in records if get_record_value(record, "status") in status_matches]

    listings = [serialize_marketplace_listing(record, skip_bids=skip_bids) for record in records[: max(1, limit)]]

    if category:
      listings = [
        listing
        for listing in listings
        if isinstance(listing.get("marketplaceMeta"), dict)
        and listing["marketplaceMeta"].get("category") == category
      ]

    return listings

  clauses: list[str] = []
  params: list[object] = []

  if listing_type:
    clauses.append("listing_type = ?")
    params.append(listing_type)

  if status_matches:
    placeholders = ", ".join("?" for _ in status_matches)
    clauses.append(f"status IN ({placeholders})")
    params.extend(sorted(status_matches))

  where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""

  with get_connection() as connection:
    rows = connection.execute(
      f"""
      SELECT *
      FROM marketplace_listings
      {where_clause}
      ORDER BY datetime(created_at) DESC, rowid DESC
      LIMIT ?
      """,
      (*params, max(1, limit)),
    ).fetchall()

    listings = [serialize_marketplace_listing(row, connection, skip_bids=skip_bids) for row in rows]

  if category:
    listings = [
      listing
      for listing in listings
      if isinstance(listing.get("marketplaceMeta"), dict)
      and listing["marketplaceMeta"].get("category") == category
    ]

  return listings


def create_marketplace_bid(payload: dict) -> dict:
  validated_payload = validate_marketplace_bid_payload(payload)
  bid_id = str(uuid.uuid4())
  now = validated_payload.get("createdAt") or utc_iso()
  listing_id = validated_payload["listingId"]
  developer_reference = validated_payload.get("developerProfileReference") or {}
  bidder_user_id = developer_reference.get("userId")

  if _uses_remote_kv_marketplace_store():
    listing_row = _load_remote_marketplace_listing_record(listing_id)
    if not listing_row:
      # Fallback: listing may exist in PostgreSQL but not in KV store
      listing_row = _fetch_pg_listing_via_rest(listing_id)
    if not listing_row:
      raise ValueError("The target marketplace listing could not be found.")

    record = {
      "id": bid_id,
      "listing_id": listing_id,
      "bidder_user_id": bidder_user_id,
      "bidder_role": payload.get("bidderRole") or "developer",
      "status": validated_payload["status"],
      "payload_json": json.dumps({**validated_payload, "id": bid_id, "createdAt": now}),
      "created_at": now,
    }
    _kv_set(_marketplace_bid_record_key(bid_id), json.dumps(record))
    _kv_sadd(_marketplace_listing_bid_ids_key(listing_id), bid_id)
    return serialize_marketplace_bid(record)

  if _uses_supabase_marketplace_store():
    listing_row = _load_remote_marketplace_listing_record(listing_id)
    if not listing_row:
      # Fallback: listing may exist in PostgreSQL but not in cloud storage
      listing_row = _fetch_pg_listing_via_rest(listing_id)
    if not listing_row:
      raise ValueError("The target marketplace listing could not be found.")

    record = {
      "id": bid_id,
      "listing_id": listing_id,
      "bidder_user_id": bidder_user_id,
      "bidder_role": payload.get("bidderRole") or "developer",
      "status": validated_payload["status"],
      "payload_json": json.dumps({**validated_payload, "id": bid_id, "createdAt": now}),
      "created_at": now,
    }
    _upload_supabase_storage_json(_supabase_marketplace_bid_path(listing_id, bid_id), record)
    return serialize_marketplace_bid(record)

  with get_connection() as connection:
    listing_row = connection.execute("SELECT id FROM marketplace_listings WHERE id = ? LIMIT 1", (listing_id,)).fetchone()
    if not listing_row:
      raise ValueError("The target marketplace listing could not be found.")

    connection.execute(
      """
      INSERT INTO listing_bids (
        id, listing_id, bidder_user_id, bidder_role, status, payload_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      """,
      (
        bid_id,
        listing_id,
        bidder_user_id,
        payload.get("bidderRole") or "developer",
        validated_payload["status"],
        json.dumps({**validated_payload, "id": bid_id, "createdAt": now}),
        now,
      ),
    )
    row = connection.execute("SELECT * FROM listing_bids WHERE id = ? LIMIT 1", (bid_id,)).fetchone()

  return serialize_marketplace_bid(row)


def list_marketplace_bids(listing_id: str, limit: int = BID_PREVIEW_LIMIT) -> list[dict]:
  if _uses_remote_marketplace_store():
    return _list_remote_marketplace_bids_for_listing(listing_id, limit)

  with get_connection() as connection:
    return _list_marketplace_bids_for_listing(connection, listing_id, limit)


def list_marketplace_bids_for_bidder(bidder_user_id: str, limit: int = 120) -> list[dict]:
  if not bidder_user_id:
    return []

  max_limit = max(1, limit)

  if _uses_remote_marketplace_store():
    entries: list[dict] = []
    for record in _list_remote_marketplace_listing_records():
      listing_id = get_record_value(record, "id")
      if not listing_id:
        continue

      listing = serialize_marketplace_listing(record)
      for bid_record in _list_remote_marketplace_bid_records(str(listing_id)):
        if str(get_record_value(bid_record, "bidder_user_id") or "") != bidder_user_id:
          continue
        entries.append(_serialize_marketplace_dashboard_bid_entry(serialize_marketplace_bid(bid_record), listing))

    entries.sort(key=lambda bid: str(bid.get("createdAt") or ""), reverse=True)
    return entries[:max_limit]

  with get_connection() as connection:
    rows = connection.execute(
      """
      SELECT
        b.*,
        l.payload_json AS listing_payload_json,
        l.status AS listing_status,
        l.listing_type AS listing_type,
        l.title AS listing_title,
        l.owner_user_id AS listing_owner_user_id,
        l.owner_role AS listing_owner_role,
        l.created_at AS listing_created_at,
        l.updated_at AS listing_updated_at
      FROM listing_bids b
      JOIN marketplace_listings l ON l.id = b.listing_id
      WHERE b.bidder_user_id = ?
      ORDER BY datetime(b.created_at) DESC, b.rowid DESC
      LIMIT ?
      """,
      (bidder_user_id, max_limit),
    ).fetchall()

  entries: list[dict] = []
  for row in rows:
    listing_payload = _load_json_dict(row["listing_payload_json"])
    listing = {
      **listing_payload,
      "id": row["listing_id"],
      "type": row["listing_type"],
      "status": row["listing_status"],
      "title": listing_payload.get("title") or row["listing_title"],
      "ownerUserId": row["listing_owner_user_id"] or listing_payload.get("ownerUserId"),
      "ownerRole": row["listing_owner_role"],
      "createdAt": row["listing_created_at"],
      "updatedAt": row["listing_updated_at"],
    }
    entries.append(_serialize_marketplace_dashboard_bid_entry(serialize_marketplace_bid(row), listing))

  return entries
