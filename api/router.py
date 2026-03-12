from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from api._utils import (
  handle_marketplace_listing_create,
  handle_marketplace_listing_detail,
  json_response,
  run_api_action,
)
from api.supabase_utils import (
  handle_admin_account_delete,
  handle_admin_login,
  handle_admin_account_store_status,
  handle_admin_account_status,
  handle_admin_accounts,
  handle_admin_identifier_resolve,
  handle_public_auth_config,
  run_supabase_action,
)


def resolve_route(path: str) -> str:
  parsed = urlparse(path)
  route = parse_qs(parsed.query).get("route", [""])[0].strip("/")

  if route:
    return route

  return parsed.path.strip("/")


class handler(BaseHTTPRequestHandler):
  def do_OPTIONS(self):
    self.send_response(HTTPStatus.NO_CONTENT)
    self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.end_headers()

  def do_GET(self):
    route = resolve_route(self.path)

    if route == "auth/config":
      run_supabase_action(self, handle_public_auth_config)
      return

    if route == "admin/accounts":
      run_supabase_action(self, handle_admin_accounts)
      return

    if route == "admin/account-store-status":
      run_supabase_action(self, handle_admin_account_store_status)
      return

    if route == "marketplace/listings/detail":
      run_api_action(self, handle_marketplace_listing_detail)
      return

    json_response(
      self,
      HTTPStatus.NOT_FOUND,
      {"ok": False, "code": "NOT_FOUND", "message": "The requested API route could not be found."},
    )

  def do_POST(self):
    route = resolve_route(self.path)

    if route == "auth/admin/login":
      run_supabase_action(self, handle_admin_login)
      return

    if route == "auth/admin/resolve":
      run_supabase_action(self, handle_admin_identifier_resolve)
      return

    if route == "admin/accounts/status":
      run_supabase_action(self, handle_admin_account_status)
      return

    if route == "admin/accounts/delete":
      run_supabase_action(self, handle_admin_account_delete)
      return

    if route == "marketplace/listings/create":
      run_api_action(self, handle_marketplace_listing_create)
      return

    json_response(
      self,
      HTTPStatus.NOT_FOUND,
      {"ok": False, "code": "NOT_FOUND", "message": "The requested API route could not be found."},
    )
