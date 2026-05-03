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

            # Best settings for getting formats WITH AUDIO
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
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
                    if height < 144:  # Skip very low useless formats
                        continue

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
                            "has_audio": has_audio
                        })

                if not formats:
                    raise Exception("No formats found")

                # Sort: With audio first, then highest resolution
                formats.sort(key=lambda x: (not x["has_audio"], -x["height"]))

                # Deduplicate keeping best (with audio if possible)
                seen = {}
                unique = []
                for f in formats:
                    base_q = f["quality"].split()[0]  # e.g. "1080p"
                    if base_q not in seen or (f["has_audio"] and not seen[base_q]["has_audio"]):
                        seen[base_q] = f
                        unique.append(f)

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "uploader_url": info.get("uploader_url", ""),
                    "duration": info.get("duration", 0),
                    "formats": unique[:6]
                }

        except Exception as e:
            error_msg = str(e)
            print(f"Error: {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            response_data = {
                "status": "error", 
                "message": "Failed to process video. Try another link."
            }

        self.wfile.write(json.dumps(response_data).encode())