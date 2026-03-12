from http.server import BaseHTTPRequestHandler

from api.supabase_utils import handle_public_signup, run_supabase_action


class handler(BaseHTTPRequestHandler):
  def do_POST(self):
    run_supabase_action(self, handle_public_signup)
