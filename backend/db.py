from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from .config import ADMIN_ROLES, ALL_ROLES, DATA_DIR, DB_PATH, SEED_DB_PATH, SESSION_TTL_SECONDS
from .security import hash_password


def utc_now() -> datetime:
  return datetime.now(timezone.utc)


def utc_iso(dt: datetime | None = None) -> str:
  return (dt or utc_now()).replace(microsecond=0).isoformat()


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
  with get_connection() as connection:
    return connection.execute("SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1", (email.strip(),)).fetchone()


def get_user_by_username(username: str) -> sqlite3.Row | None:
  with get_connection() as connection:
    return connection.execute("SELECT * FROM users WHERE lower(username) = lower(?) LIMIT 1", (username.strip(),)).fetchone()


def get_user_by_identifier(identifier: str) -> sqlite3.Row | None:
  return get_user_by_email(identifier) or get_user_by_username(identifier)


def get_user_by_id(user_id: str) -> sqlite3.Row | None:
  with get_connection() as connection:
    return connection.execute("SELECT * FROM users WHERE id = ? LIMIT 1", (user_id,)).fetchone()


def count_active_admin_users(exclude_user_id: str | None = None) -> int:
  query = "SELECT COUNT(*) FROM users WHERE role IN (?, ?) AND is_active = 1"
  params: list[str] = ["admin", "moderator"]

  if exclude_user_id:
    query += " AND id != ?"
    params.append(exclude_user_id)

  with get_connection() as connection:
    return int(connection.execute(query, tuple(params)).fetchone()[0])


def update_user_status(user_id: str, is_active: bool) -> dict | None:
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
  with get_connection() as connection:
    cursor = connection.execute("DELETE FROM users WHERE id = ?", (user_id,))

  return cursor.rowcount > 0


def create_user(payload: dict) -> dict:
  role = payload["role"]
  if role not in ALL_ROLES:
    raise ValueError("Unsupported role.")

  now = utc_iso()
  user_id = str(uuid.uuid4())

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
    with get_connection() as connection:
      connection.execute(
        """
        UPDATE users
        SET username = ?, email = ?, password_hash = ?, role = ?, full_name = ?, updated_at = ?, is_active = 1
        WHERE id = ?
        """,
        (username, email.strip().lower(), hash_password(password), role, full_name.strip(), now, existing["id"]),
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
