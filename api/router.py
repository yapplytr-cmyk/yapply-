from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from api._utils import (
  bootstrap_backend,
  handle_admin_account_delete,
  handle_admin_account_status,
  handle_admin_accounts,
  handle_login,
  handle_logout,
  handle_marketplace_listing_create,
  handle_marketplace_listing_detail,
  handle_session,
  handle_signup,
  json_response,
)


bootstrap_backend()


def resolve_route(path: str) -> str:
  parsed = urlparse(path)
  route = parse_qs(parsed.query).get("route", [""])[0].strip("/")

  if route:
    return route

  return parsed.path.strip("/")


class handler(BaseHTTPRequestHandler):
  def do_OPTIONS(self):
    self.send_response(HTTPStatus.NO_CONTENT)
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.end_headers()

  def do_GET(self):
    route = resolve_route(self.path)

    if route == "auth/session":
      handle_session(self)
      return

    if route == "admin/accounts":
      handle_admin_accounts(self)
      return

    if route == "marketplace/listings/detail":
      handle_marketplace_listing_detail(self)
      return

    json_response(
      self,
      HTTPStatus.NOT_FOUND,
      {"ok": False, "code": "NOT_FOUND", "message": "The requested API route could not be found."},
    )

  def do_POST(self):
    route = resolve_route(self.path)

    if route == "auth/signup":
      handle_signup(self)
      return

    if route == "auth/login":
      handle_login(self)
      return

    if route == "auth/logout":
      handle_logout(self)
      return

    if route == "admin/accounts/status":
      handle_admin_account_status(self)
      return

    if route == "admin/accounts/delete":
      handle_admin_account_delete(self)
      return

    if route == "marketplace/listings/create":
      handle_marketplace_listing_create(self)
      return

    json_response(
      self,
      HTTPStatus.NOT_FOUND,
      {"ok": False, "code": "NOT_FOUND", "message": "The requested API route could not be found."},
    )
