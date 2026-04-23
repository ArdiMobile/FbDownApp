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
        facebook_url = query_params.get('url', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if not facebook_url:
            self.wfile.write(json.dumps({
                "status": "error", 
                "message": "No URL provided"
            }).encode())
            return

        try:
            # Normalize URL
            if "facebook.com" in facebook_url and "m.facebook.com" not in facebook_url:
                facebook_url = facebook_url.replace("www.facebook.com", "m.facebook.com")
                facebook_url = facebook_url.replace("web.facebook.com", "m.facebook.com")
                if not facebook_url.startswith("http"):
                    facebook_url = "https://" + facebook_url

            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                'force_generic_extractor': False,
                'format': 'bestvideo+bestaudio/best',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(facebook_url, download=False)

                if not info:
                    raise Exception("Failed to extract video information")

                formats = []
                for f in info.get("formats", []):
                    if f.get("url") and f.get("height"):
                        formats.append({
                            "quality": f"{f.get('height')}p",
                            "height": f.get("height"),
                            "url": f.get("url")
                        })

                if not formats:
                    raise Exception("No downloadable formats found")

                formats = sorted(formats, key=lambda x: x["height"], reverse=True)

                seen = set()
                unique = []
                for f in formats:
                    if f["quality"] not in seen:
                        seen.add(f["quality"])
                        unique.append({
                            "quality": f["quality"],
                            "url": f["url"]
                        })

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Facebook Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "uploader_url": info.get("uploader_url", ""),
                    "duration": info.get("duration", 0),
                    "formats": unique[:5]
                }

        except Exception as e:
            error_msg = str(e)
            print(f"Error: {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            response_data = {
                "status": "error", 
                "message": f"Failed to get video: {error_msg[:100]}"
            }

        self.wfile.write(json.dumps(response_data).encode())