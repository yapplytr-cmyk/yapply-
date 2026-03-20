from http.server import BaseHTTPRequestHandler

from api._utils import bootstrap_backend, handle_marketplace_listing_index


bootstrap_backend()


class handler(BaseHTTPRequestHandler):
  def do_GET(self):
    handle_marketplace_listing_index(self)
