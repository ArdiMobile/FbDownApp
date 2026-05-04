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

            # IMPROVED OPTIONS - Better chance of getting audio
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                'force_generic_extractor': False,
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',  # Prioritize combined MP4
                'merge_output_format': 'mp4',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(facebook_url, download=False)

                if not info:
                    raise Exception("Failed to extract video information")

                formats_list = []
                
                for f in info.get("formats", []):
                    if not f.get("url"):
                        continue
                        
                    vcodec = f.get("vcodec", "none")
                    acodec = f.get("acodec", "none")
                    height = f.get("height") or 0
                    
                    has_video = vcodec != "none" and height > 0
                    has_audio = acodec != "none"
                    
                    if has_video:
                        formats_list.append({
                            "quality": f"{height}p",
                            "height": height,
                            "url": f.get("url"),
                            "has_audio": has_audio,
                            "format_id": f.get("format_id", ""),
                            "ext": f.get("ext", "")
                        })

                if not formats_list:
                    raise Exception("No downloadable formats found")

                # Sort by height descending
                formats_list = sorted(formats_list, key=lambda x: x["height"], reverse=True)

                # Remove duplicates, prefer formats WITH audio
                seen = set()
                unique = []
                for f in formats_list:
                    quality = f["quality"]
                    if quality not in seen:
                        seen.add(quality)
                        label = quality
                        if f["has_audio"]:
                            label += " 🔊"
                        else:
                            label += " 🔇"
                        unique.append({
                            "quality": label,
                            "url": f["url"],
                            "has_audio": f["has_audio"]
                        })

                # Fallback if no audio formats found
                if not any(f.get("has_audio") for f in unique):
                    for f in info.get("formats", []):
                        if (f.get("acodec") and f.get("acodec") != "none" and 
                            f.get("height") and f.get("url")):
                            quality = f"{f.get('height')}p 🔊"
                            if quality not in seen:
                                seen.add(quality)
                                unique.append({
                                    "quality": quality,
                                    "url": f.get("url"),
                                    "has_audio": True
                                })

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Facebook/Instagram Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "uploader_url": info.get("uploader_url", ""),
                    "duration": info.get("duration", 0),
                    "formats": unique[:6]   # Up to 6 qualities
                }

        except Exception as e:
            error_msg = str(e)
            print(f"Error: {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            response_data = {
                "status": "error", 
                "message": f"Failed to get video: {error_msg[:150]}"
            }

        self.wfile.write(json.dumps(response_data).encode())