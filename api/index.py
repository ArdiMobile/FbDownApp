from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import yt_dlp
import traceback

class handler(BaseHTTPRequestHandler):

    # ✅ Handle CORS preflight
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
                "message": "No URL"
            }).encode())
            return

        try:
            # ✅ Better Facebook URL normalization
            if "facebook.com" in facebook_url and "m.facebook.com" not in facebook_url:
                facebook_url = facebook_url.replace("www.", "").replace("web.", "")
                facebook_url = facebook_url.replace("facebook.com", "m.facebook.com")

            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'extractor_args': {
                    'facebook': {
                        'format': 'sd',
                    }
                }
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(facebook_url, download=False)

                if not info:
                    raise Exception("Failed to extract video info")

                formats = []

                # ✅ Fallback if no formats
                if not info.get("formats") and info.get("url"):
                    formats.append({
                        "quality": "default",
                        "height": 0,
                        "url": info.get("url")
                    })
                else:
                    for f in info.get("formats", []):
                        if f.get("url") and f.get("height"):
                            formats.append({
                                "quality": f"{f.get('height')}p",
                                "height": f.get("height"),
                                "url": f.get("url")
                            })

                # ✅ Sort by highest quality first
                formats = sorted(formats, key=lambda x: x.get("height", 0), reverse=True)

                # ✅ Remove duplicates
                seen = set()
                unique_formats = []
                for f in formats:
                    if f["quality"] not in seen:
                        seen.add(f["quality"])
                        unique_formats.append({
                            "quality": f["quality"],
                            "url": f["url"]
                        })

                response_data = {
                    "status": "success",
                    "title": info.get("title"),
                    "thumbnail": info.get("thumbnail"),
                    "formats": unique_formats[:5],
                    "uploader": info.get("uploader"),
                    "uploader_url": info.get("uploader_url")
                }

        except Exception as e:
            print(traceback.format_exc())  # ✅ logs in Vercel

            response_data = {
                "status": "error",
                "message": str(e)
            }

        self.wfile.write(json.dumps(response_data).encode())