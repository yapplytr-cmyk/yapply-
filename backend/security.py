from __future__ import annotations

import hashlib
import hmac
import secrets


PBKDF2_ITERATIONS = 260_000


def hash_password(password: str, salt_hex: str | None = None) -> str:
  salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
  digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
  return f"{PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
  try:
    iteration_text, salt_hex, digest_hex = stored_hash.split("$", 2)
    iterations = int(iteration_text)
  except ValueError:
    return False

  digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), iterations)
  return hmac.compare_digest(digest.hex(), digest_hex)


def issue_session_token() -> tuple[str, str]:
  token = secrets.token_urlsafe(32)
  token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
  return token, token_hash
