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
            # Normalize URL
            if not url.startswith('http'):
                url = 'https://' + url
            if "facebook.com" in url and "m.facebook.com" not in url:
                url = url.replace("www.facebook.com", "m.facebook.com").replace("web.facebook.com", "m.facebook.com")

            # Optimized for audio + good quality
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
                'merge_output_format': 'mp4',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                if not info:
                    raise Exception("Failed to extract video information")

                formats = []

                for f in info.get("formats", []):
                    if not f.get("url"):
                        continue

                    height = f.get("height") or 0
                    vcodec = f.get("vcodec", "none")
                    acodec = f.get("acodec", "none")

                    has_video = vcodec != "none" and height > 0
                    has_audio = acodec != "none"

                    if has_video:
                        label = f"{height}p"
                        if has_audio:
                            label += " 🔊"
                        else:
                            label += " 🔇"

                        formats.append({
                            "quality": label,
                            "height": height,
                            "url": f["url"],
                            "has_audio": has_audio,
                            "format_id": f.get("format_id", "")
                        })

                if not formats:
                    raise Exception("No downloadable formats found")

                # Sort: Audio first, then highest quality
                formats.sort(key=lambda x: (not x["has_audio"], -x["height"]))

                # Deduplicate (prefer version with audio)
                seen = {}
                unique = []
                for f in formats:
                    base_quality = f["quality"].replace(" 🔊", "").replace(" 🔇", "")
                    if base_quality not in seen or (f["has_audio"] and not seen[base_quality]["has_audio"]):
                        seen[base_quality] = f
                        unique.append(f)

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "uploader_url": info.get("uploader_url", ""),
                    "duration": info.get("duration", 0),
                    "formats": unique[:7]
                }

        except Exception as e:
            error_msg = str(e)
            print(f"Error: {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            response_data = {
                "status": "error", 
                "message": error_msg[:200]
            }

        self.wfile.write(json.dumps(response_data).encode())