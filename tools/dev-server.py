"""Local preview server for the portfolio.

Like `python3 -m http.server`, but tells the browser not to cache anything, so edits always show up
on reload (the default server lets the browser keep stale copies of the JS modules).

Usage:  python3 tools/dev-server.py [port] [directory]
"""
import functools
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    directory = sys.argv[2] if len(sys.argv) > 2 else "site"
    handler = functools.partial(NoCacheHandler, directory=directory)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"Serving {directory} at http://localhost:{port} (no caching)")
        server.serve_forever()
