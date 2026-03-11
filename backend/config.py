import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
DATA_DIR = BACKEND_DIR / "data"
SEED_DB_PATH = DATA_DIR / "yapply.db"
IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))
DB_PATH = Path(os.environ.get("YAPPLY_DB_PATH", "/tmp/yapply.db" if IS_VERCEL else str(SEED_DB_PATH)))

HOST = "127.0.0.1"
PORT = 4174
FRONTEND_ORIGINS = {
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
}

SESSION_COOKIE_NAME = "yapply_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 14

PUBLIC_SIGNUP_ROLES = {"developer", "client"}
ADMIN_ROLES = {"admin", "moderator"}
ALL_ROLES = PUBLIC_SIGNUP_ROLES | ADMIN_ROLES

SEEDED_ADMIN_USERNAME = "armandino"
SEEDED_ADMIN_EMAIL = "armandino@yapply.internal"
SEEDED_ADMIN_PASSWORD = "skylarkyapply877!"
SEEDED_ADMIN_FULL_NAME = "Armandino"
SEEDED_ADMIN_ROLE = "admin"
