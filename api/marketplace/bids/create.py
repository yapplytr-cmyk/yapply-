from http.server import BaseHTTPRequestHandler

from api._utils import bootstrap_backend, handle_marketplace_bid_create


bootstrap_backend()


class handler(BaseHTTPRequestHandler):
  def do_POST(self):
    handle_marketplace_bid_create(self)
