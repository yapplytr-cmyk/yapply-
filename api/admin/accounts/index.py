from http.server import BaseHTTPRequestHandler

from api.supabase_utils import handle_admin_accounts, run_supabase_action


class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    run_supabase_action(self, handle_admin_accounts)
