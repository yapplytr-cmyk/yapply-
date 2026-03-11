from __future__ import annotations

import argparse

from .config import SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_FULL_NAME, SEEDED_ADMIN_PASSWORD, SEEDED_ADMIN_ROLE, SEEDED_ADMIN_USERNAME
from .db import ensure_database, seed_admin_account


def main() -> None:
  parser = argparse.ArgumentParser(description="Seed a Yapply admin or moderator account.")
  parser.add_argument("--email", default=SEEDED_ADMIN_EMAIL, help="Admin or moderator email")
  parser.add_argument("--username", default=SEEDED_ADMIN_USERNAME, help="Admin or moderator username")
  parser.add_argument("--password", default=SEEDED_ADMIN_PASSWORD, help="Admin or moderator password")
  parser.add_argument("--full-name", default=SEEDED_ADMIN_FULL_NAME, help="Display name for the admin account")
  parser.add_argument("--role", choices=["admin", "moderator"], default=SEEDED_ADMIN_ROLE, help="Role to assign")
  args = parser.parse_args()

  ensure_database()
  user = seed_admin_account(args.email, args.password, args.full_name, args.role, args.username)
  print(f"Seeded {user['role']} account for {user['username'] or user['email']}")


if __name__ == "__main__":
  main()
