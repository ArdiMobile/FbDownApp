from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query_params = parse_qs(urlparse(self.path).query)
        facebook_url = query_params.get('url', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if not facebook_url:
            self.wfile.write(json.dumps({"status":"error","message":"No URL"}).encode())
            return

        try:
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(facebook_url, download=False)

                formats = []
                for f in info.get("formats", []):
                    if f.get("url") and f.get("height"):
                        formats.append({
                            "quality": f"{f.get('height')}p",
                            "url": f.get("url")
                        })

                seen = set()
                unique_formats = []
                for f in formats:
                    if f["quality"] not in seen:
                        seen.add(f["quality"])
                        unique_formats.append(f)

                response_data = {
                    "status": "success",
                    "title": info.get("title"),
                    "thumbnail": info.get("thumbnail"),
                    "formats": unique_formats[:5],
                    "uploader": info.get("uploader"),
                    "uploader_url": info.get("uploader_url")
                }

        except Exception as e:
            response_data = {"status":"error","message":str(e)}

        self.wfile.write(json.dumps(response_data).encode())
