from http.server import BaseHTTPRequestHandler

from api._utils import handle_admin_accounts, run_api_action


class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    run_api_action(self, handle_admin_accounts)
