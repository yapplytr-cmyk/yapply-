from http.server import BaseHTTPRequestHandler

from api._utils import bootstrap_backend, handle_admin_accounts


bootstrap_backend()


class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    handle_admin_accounts(self)

