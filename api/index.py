from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
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
            self.wfile.write(json.dumps({
                "status": "error",
                "message": "No URL provided"
            }).encode())
            return

        try:
            if "facebook.com" in url and "m.facebook.com" not in url:
                url = url.replace("www.facebook.com", "m.facebook.com")
                url = url.replace("web.facebook.com", "m.facebook.com")

            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                formats = []
                seen = set()

                for f in info.get("formats", []):
                    has_video = f.get("vcodec") != "none"
                    has_audio = f.get("acodec") != "none"
                    height = f.get("height")

                    if has_video and has_audio and height and f.get("url"):
                        quality = f"{height}p"

                        if quality not in seen:
                            seen.add(quality)
                            formats.append({
                                "quality": quality,
                                "url": f.get("url")
                            })

                # Sort highest quality first
                formats = sorted(formats, key=lambda x: int(x["quality"].replace("p", "")), reverse=True)

                if not formats:
                    raise Exception("No formats with audio found")

                response = {
                    "status": "success",
                    "title": info.get("title", "Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "duration": info.get("duration", 0),
                    "formats": formats[:5]
                }

        except Exception as e:
            response = {
                "status": "error",
                "message": str(e)
            }

        self.wfile.write(json.dumps(response).encode())