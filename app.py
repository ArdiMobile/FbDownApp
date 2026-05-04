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
            self.wfile.write(json.dumps({
                "status": "error", 
                "message": "No URL provided"
            }).encode())
            return

        try:
            # Normalize URL
            original_url = url
            if "facebook.com" in url or "fb.watch" in url:
                if "m.facebook.com" not in url:
                    url = url.replace("www.facebook.com", "m.facebook.com")
                    url = url.replace("web.facebook.com", "m.facebook.com")
                if not url.startswith("http"):
                    url = "https://" + url

            # Improved yt-dlp options
            ydl_opts = {
                'quiet': False,           # Changed to False for better debugging
                'noplaylist': True,
                'no_warnings': False,
                'extract_flat': False,
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best',
                'merge_output_format': 'mp4',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
                }
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                if not info:
                    raise Exception("Could not extract video info from Facebook/Instagram")

                formats_list = []
                
                for f in info.get("formats", []):
                    if not f.get("url"):
                        continue
                    height = f.get("height") or 0
                    vcodec = f.get("vcodec", "none")
                    acodec = f.get("acodec", "none")
                    
                    if vcodec != "none" and height > 100:   # Valid video
                        has_audio = acodec != "none"
                        quality_label = f"{height}p"
                        if has_audio:
                            quality_label += " 🔊"
                        else:
                            quality_label += " 🔇"
                            
                        formats_list.append({
                            "quality": quality_label,
                            "height": height,
                            "url": f["url"],
                            "has_audio": has_audio
                        })

                if not formats_list:
                    # Fallback: try any format with video
                    for f in info.get("formats", []):
                        if f.get("url") and f.get("height"):
                            height = f.get("height")
                            formats_list.append({
                                "quality": f"{height}p 🔇",
                                "height": height,
                                "url": f["url"],
                                "has_audio": False
                            })

                if not formats_list:
                    raise Exception("No video formats found. The video might be private or restricted.")

                # Sort and deduplicate
                formats_list = sorted(formats_list, key=lambda x: x["height"], reverse=True)
                seen = set()
                unique_formats = []
                for f in formats_list:
                    q = f["quality"].split()[0]  # e.g. "1080p"
                    if q not in seen:
                        seen.add(q)
                        unique_formats.append(f)

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "duration": info.get("duration", 0),
                    "formats": unique_formats[:6]
                }

        except Exception as e:
            error_msg = str(e)
            print("=== ERROR ===", file=sys.stderr)
            print(f"URL: {original_url}", file=sys.stderr)
            print(f"Error: {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            response_data = {
                "status": "error", 
                "message": f"Download failed: {error_msg[:200]}"
            }

        self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode('utf-8'))