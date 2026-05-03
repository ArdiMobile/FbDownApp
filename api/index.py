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
                'extract_flat': False,
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'merge_output_format': 'mp4',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                if not info:
                    raise Exception("Failed to extract video")

                formats = []
                for f in info.get("formats", []):
                    if not f.get("url"):
                        continue
                    height = f.get("height") or 0
                    if height < 144:
                        continue
                        
                    has_audio = f.get("acodec") != "none"
                    label = f"{height}p"
                    if has_audio:
                        label += " 🔊"
                    else:
                        label += " 🔇"

                    formats.append({
                        "quality": label,
                        "height": height,
                        "url": f["url"],
                        "has_audio": has_audio
                    })

                # Sort: Audio first, highest quality
                formats.sort(key=lambda x: (not x["has_audio"], -x["height"]))

                # Deduplicate
                seen = {}
                unique = []
                for f in formats:
                    base = str(f["height"])
                    if base not in seen or (f["has_audio"] and not seen[base]["has_audio"]):
                        seen[base] = f
                        unique.append(f)

                response_data = {
                    "status": "success",
                    "title": info.get("title", "YouTube Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "duration": info.get("duration", 0),
                    "formats": unique[:8]
                }

        except Exception as e:
            response_data = {
                "status": "error", 
                "message": "Failed to fetch video. Make sure it's a valid YouTube link."
            }

        self.wfile.write(json.dumps(response_data).encode())