from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from urllib.error import URLError
from urllib.request import Request, urlopen

from .config import ADMIN_ROLES, ALL_ROLES, DATA_DIR, DB_PATH, KV_REST_TOKEN, KV_REST_URL, SEED_DB_PATH, SESSION_TTL_SECONDS, USE_REMOTE_USER_STORE
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
      return json.loads(raw) if raw else {"result": None}
  except URLError as error:
    raise RuntimeError("Remote user store is unavailable.") from error


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


def _user_record_key(user_id: str) -> str:
  return f"yapply:user:{user_id}"


def _user_email_key(email: str) -> str:
  return f"yapply:user-by-email:{email.strip().lower()}"


def _user_username_key(username: str) -> str:
  return f"yapply:user-by-username:{username.strip().lower()}"


USER_IDS_KEY = "yapply:user-ids"


def _load_remote_user_by_id(user_id: str) -> dict | None:
  raw = _kv_get(_user_record_key(user_id))
  if not raw:
    return None

  try:
    return json.loads(raw) if isinstance(raw, str) else raw
  except json.JSONDecodeError:
    return None


def _load_remote_user_by_index(key: str) -> dict | None:
  user_id = _kv_get(key)
  if not user_id:
    return None

  return _load_remote_user_by_id(str(user_id))


def _list_remote_users() -> list[dict]:
  users = [_load_remote_user_by_id(user_id) for user_id in _kv_smembers(USER_IDS_KEY)]
  filtered = [user for user in users if user]
  filtered.sort(key=lambda user: (user.get("created_at") or "", user.get("full_name") or ""), reverse=True)
  return filtered


def _count_remote_active_admin_users(exclude_user_id: str | None = None) -> int:
  count = 0
  for user in _list_remote_users():
    if exclude_user_id and user.get("id") == exclude_user_id:
      continue
    if user.get("role") in ADMIN_ROLES and int(user.get("is_active", 1)) == 1:
      count += 1
  return count


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


def serialize_user(row: sqlite3.Row) -> dict:
  return {
    "id": row["id"],
    "username": row["username"],
    "email": row["email"],
    "role": row["role"],
    "fullName": row["full_name"],
    "phoneNumber": row["phone_number"],
    "companyName": row["company_name"],
    "professionType": row["profession_type"],
    "serviceArea": row["service_area"],
    "yearsExperience": row["years_experience"],
    "specialties": row["specialties"],
    "preferredRegion": row["preferred_region"],
    "website": row["website"],
    "createdAt": row["created_at"],
    "status": "active" if row["is_active"] else "inactive",
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
      previous_email = (existing.get("email") or "").strip().lower()
      previous_username = (existing.get("username") or "").strip().lower() or None
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

      _kv_set(_user_record_key(existing["id"]), json.dumps(record))
      _kv_set(_user_email_key(normalized_email), existing["id"])
      _kv_sadd(USER_IDS_KEY, existing["id"])

      if previous_email and previous_email != normalized_email:
        _kv_delete(_user_email_key(previous_email))

      if previous_username and previous_username != normalized_username:
        _kv_delete(_user_username_key(previous_username))

      if normalized_username:
        _kv_set(_user_username_key(normalized_username), existing["id"])
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


def serialize_marketplace_listing(row: sqlite3.Row) -> dict:
  payload = json.loads(row["payload_json"] or "{}")
  return {
    **payload,
    "id": row["id"],
    "type": row["listing_type"],
    "status": row["status"],
    "title": payload.get("title") or row["title"],
    "ownerUserId": row["owner_user_id"],
    "ownerRole": row["owner_role"],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
  }


def create_marketplace_listing(payload: dict) -> dict:
  listing_id = str(uuid.uuid4())
  now = utc_iso()
  listing_type = payload["type"]
  title = payload.get("title") or payload.get("name") or "Marketplace Listing"
  owner_user_id = payload.get("ownerUserId")
  owner_role = payload.get("ownerRole")
  stored_payload = {**payload, "id": listing_id, "createdAt": now, "updatedAt": now}

  with get_connection() as connection:
    connection.execute(
      """
      INSERT INTO marketplace_listings (
        id, owner_user_id, owner_role, listing_type, status, title, payload_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (
        listing_id,
        owner_user_id,
        owner_role,
        listing_type,
        payload.get("status") or "active",
        title,
        json.dumps(stored_payload),
        now,
        now,
      ),
    )
    row = connection.execute("SELECT * FROM marketplace_listings WHERE id = ? LIMIT 1", (listing_id,)).fetchone()

  return serialize_marketplace_listing(row)


def get_marketplace_listing(listing_id: str) -> dict | None:
  with get_connection() as connection:
    row = connection.execute("SELECT * FROM marketplace_listings WHERE id = ? LIMIT 1", (listing_id,)).fetchone()

  return serialize_marketplace_listing(row) if row else None
