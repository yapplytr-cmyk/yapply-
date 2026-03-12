from __future__ import annotations

import argparse
import sys

from .config import SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_FULL_NAME, SEEDED_ADMIN_PASSWORD, SEEDED_ADMIN_ROLE, SEEDED_ADMIN_USERNAME
from .db import ensure_database, get_account_store_status, get_record_value, get_user_by_identifier, seed_admin_account
from .security import verify_password


def main() -> None:
  parser = argparse.ArgumentParser(description="Seed a Yapply admin or moderator account.")
  parser.add_argument("--email", default=SEEDED_ADMIN_EMAIL, help="Admin or moderator email")
  parser.add_argument("--username", default=SEEDED_ADMIN_USERNAME, help="Admin or moderator username")
  parser.add_argument("--password", default=SEEDED_ADMIN_PASSWORD, help="Admin or moderator password")
  parser.add_argument("--full-name", default=SEEDED_ADMIN_FULL_NAME, help="Display name for the admin account")
  parser.add_argument("--role", choices=["admin", "moderator"], default=SEEDED_ADMIN_ROLE, help="Role to assign")
  parser.add_argument("--require-remote", action="store_true", help="Fail unless the remote KV-backed account store is active")
  args = parser.parse_args()

  ensure_database()
  status = get_account_store_status()

  if args.require_remote and status.get("mode") != "remote-kv":
    print("Remote KV-backed account store is not active in this runtime.", file=sys.stderr)
    raise SystemExit(1)

  user = seed_admin_account(args.email, args.password, args.full_name, args.role, args.username)
  stored_user = get_user_by_identifier(args.username or args.email)

  if not stored_user:
    print("Seed verification failed: admin account could not be read back from the active account store.", file=sys.stderr)
    raise SystemExit(1)

  stored_role = get_record_value(stored_user, "role")
  stored_password_hash = get_record_value(stored_user, "password_hash", "passwordHash")

  if stored_role != args.role:
    print("Seed verification failed: stored role does not match the requested admin role.", file=sys.stderr)
    raise SystemExit(1)

  if not stored_password_hash or not verify_password(args.password, stored_password_hash):
    print("Seed verification failed: stored password hash does not match the requested admin password.", file=sys.stderr)
    raise SystemExit(1)

  print(f"Seeded {user['role']} account for {user['username'] or user['email']}")
  print(f"Account store mode: {status.get('mode')}")
  print(f"Remote configured: {status.get('remoteConfigured')}")
  print(f"Remote reachable: {status.get('remoteReachable')}")


if __name__ == "__main__":
  main()
