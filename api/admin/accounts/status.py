from http.server import BaseHTTPRequestHandler

from api.supabase_utils import handle_admin_account_status, run_supabase_action


class handler(BaseHTTPRequestHandler):
  def do_POST(self):
    run_supabase_action(self, handle_admin_account_status)
