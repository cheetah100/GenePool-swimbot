#!/usr/bin/env python3
"""Serve the GenePool folder on http://localhost:8000 with caching disabled.

Plain `python3 -m http.server` lets browsers (Firefox especially) keep old
copies of the .js files, so code changes may not show up on reload.

Usage:  python3 serve.py [port]
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "GenePool")
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(("", port), handler) as server:
        print(f"Gene Pool running at http://localhost:{port}/  (Ctrl+C to stop)")
        server.serve_forever()
