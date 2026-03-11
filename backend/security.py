from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from .config import SESSION_SIGNING_SECRET


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


def _encode_token_part(value: bytes) -> str:
  return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode_token_part(value: str) -> bytes:
  padding = "=" * (-len(value) % 4)
  return base64.urlsafe_b64decode(f"{value}{padding}")


def issue_signed_session_token(payload: dict, ttl_seconds: int) -> str:
  issued_at = int(time.time())
  token_payload = {
    **payload,
    "iat": issued_at,
    "exp": issued_at + ttl_seconds,
  }
  body = json.dumps(token_payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
  signature = hmac.new(SESSION_SIGNING_SECRET.encode("utf-8"), body, hashlib.sha256).digest()
  return f"{_encode_token_part(body)}.{_encode_token_part(signature)}"


def verify_signed_session_token(token: str) -> dict | None:
  try:
    body_part, signature_part = token.split(".", 1)
    body = _decode_token_part(body_part)
    provided_signature = _decode_token_part(signature_part)
  except Exception:
    return None

  expected_signature = hmac.new(SESSION_SIGNING_SECRET.encode("utf-8"), body, hashlib.sha256).digest()

  if not hmac.compare_digest(provided_signature, expected_signature):
    return None

  try:
    payload = json.loads(body.decode("utf-8"))
  except json.JSONDecodeError:
    return None

  if int(payload.get("exp", 0)) <= int(time.time()):
    return None

  return payload
