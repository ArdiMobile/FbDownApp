from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import yt_dlp
import sys

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get('url', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if not url:
            self.wfile.write(json.dumps({"status": "error", "message": "No URL"}).encode())
            return

        try:
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'format': 'bestvideo+bestaudio/best',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                formats = []
                for f in info.get("formats", []):
                    if f.get("url") and f.get("height"):
                        formats.append({
                            "quality": f"{f.get('height')}p",
                            "url": f["url"]
                        })

                formats = sorted(formats, key=lambda x: int(x["quality"].replace("p","")), reverse=True)[:5]

                response = {
                    "status": "success",
                    "title": info.get("title"),
                    "thumbnail": info.get("thumbnail"),
                    "uploader": info.get("uploader"),
                    "formats": formats
                }

        except Exception as e:
            print("ERROR:", str(e), file=sys.stderr)
            response = {
                "status": "error",
                "message": "Failed to fetch video"
            }

        self.wfile.write(json.dumps(response).encode())