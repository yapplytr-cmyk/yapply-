import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
DATA_DIR = BACKEND_DIR / "data"
SEED_DB_PATH = DATA_DIR / "yapply.db"
IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"))
DB_PATH = Path(os.environ.get("YAPPLY_DB_PATH", "/tmp/yapply.db" if IS_VERCEL else str(SEED_DB_PATH)))
SESSION_SIGNING_SECRET = os.environ.get("YAPPLY_SESSION_SIGNING_SECRET", "yapply-dev-session-secret")


def _read_first_env(*names: str) -> tuple[str, str]:
  for name in names:
    value = os.environ.get(name, "").strip()
    if value:
      return value, name
  return "", ""


SUPABASE_URL, SUPABASE_URL_SOURCE = _read_first_env(
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
)
SUPABASE_URL = SUPABASE_URL.rstrip("/")

SUPABASE_PUBLIC_KEY, SUPABASE_PUBLIC_KEY_SOURCE = _read_first_env(
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
)

SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_KEY_SOURCE = _read_first_env(
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
)

# Backward-compatible aliases for the rest of the codebase.
SUPABASE_ANON_KEY = SUPABASE_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_KEY

HOST = "127.0.0.1"
PORT = 4174
FRONTEND_ORIGINS = {
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
  "capacitor://localhost",
  "https://yapplytr.com",
}

SESSION_COOKIE_NAME = "yapply_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 14
KV_REST_URL = os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL") or ""
KV_REST_TOKEN = os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN") or ""
USE_REMOTE_USER_STORE = bool(KV_REST_URL and KV_REST_TOKEN)
ADMIN_BOOTSTRAP_TOKEN = os.environ.get("YAPPLY_ADMIN_BOOTSTRAP_TOKEN", "").strip()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Yapply <noreply@yapplytr.com>").strip()

PUBLIC_SIGNUP_ROLES = {"developer", "client"}
ADMIN_ROLES = {"admin", "moderator"}
ALL_ROLES = PUBLIC_SIGNUP_ROLES | ADMIN_ROLES

SEEDED_ADMIN_USERNAME = "armandino"
SEEDED_ADMIN_EMAIL = "armandino@yapply.internal"
SEEDED_ADMIN_PASSWORD = "skylarkyapply877!"
SEEDED_ADMIN_FULL_NAME = "Armandino"
SEEDED_ADMIN_ROLE = "admin"
