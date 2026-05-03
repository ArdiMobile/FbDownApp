from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import traceback
import sys
import yt_dlp

class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        query_params = parse_qs(urlparse(self.path).query)
        url = query_params.get('url', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if not url:
            self.wfile.write(json.dumps({"status": "error", "message": "No URL provided"}).encode())
            return

        try:
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'format': 'bestvideo+bestaudio/best',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                formats = []
                for f in info.get("formats", []):
                    if not f.get("url") or not f.get("height"):
                        continue
                    height = f.get("height")
                    has_audio = f.get("acodec") != "none"
                    label = f"{height}p {'🔊' if has_audio else '🔇'}"
                    formats.append({
                        "quality": label,
                        "height": height,
                        "url": f["url"],
                        "has_audio": has_audio
                    })

                formats = sorted(formats, key=lambda x: -x["height"])[:8]

                response_data = {
                    "status": "success",
                    "title": info.get("title", "YouTube Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "duration": info.get("duration", 0),
                    "formats": formats
                }

        except Exception as e:
            response_data = {
                "status": "error", 
                "message": "Failed to fetch video. Make sure it's a valid public YouTube link."
            }

        self.wfile.write(json.dumps(response_data).encode())