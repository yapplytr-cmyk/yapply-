from http.server import BaseHTTPRequestHandler

from api._utils import bootstrap_backend, handle_login


bootstrap_backend()


class handler(BaseHTTPRequestHandler):
  def do_POST(self):
    handle_login(self)

