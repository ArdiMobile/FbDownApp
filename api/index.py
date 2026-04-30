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
            # Normalize FB URL
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

                # ✅ STEP 1: Try progressive formats (BEST - already has audio)
                for f in info.get("formats", []):
                    if (
                        f.get("vcodec") != "none" and
                        f.get("acodec") != "none" and
                        f.get("ext") == "mp4" and
                        f.get("height") and
                        f.get("url")
                    ):
                        q = f"{f.get('height')}p"
                        if q not in seen:
                            seen.add(q)
                            formats.append({
                                "quality": q,
                                "url": f.get("url")
                            })

                # ✅ STEP 2: If none found → fallback to ANY playable format
                if not formats:
                    for f in info.get("formats", []):
                        if f.get("vcodec") != "none" and f.get("url") and f.get("height"):
                            q = f"{f.get('height')}p"
                            if q not in seen:
                                seen.add(q)
                                formats.append({
                                    "quality": q,
                                    "url": f.get("url")
                                })

                # Sort highest first
                formats = sorted(
                    formats,
                    key=lambda x: int(x["quality"].replace("p", "")),
                    reverse=True
                )

                if not formats:
                    raise Exception("No playable formats found")

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