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

            # CRITICAL: Merge best video + best audio together
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                'force_generic_extractor': False,
                # THIS IS THE KEY FIX - merges video + audio
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'merge_output_format': 'mp4',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(facebook_url, download=False)

                if not info:
                    raise Exception("Failed to extract video information")

                formats = []
                
                # Get all available formats
                for f in info.get("formats", []):
                    vcodec = f.get("vcodec", "none")
                    acodec = f.get("acodec", "none")
                    has_video = vcodec and vcodec != "none"
                    has_audio = acodec and acodec != "none"
                    height = f.get("height")
                    
                    if f.get("url") and height:
                        formats.append({
                            "quality": f"{height}p",
                            "height": height,
                            "url": f.get("url"),
                            "has_video": has_video,
                            "has_audio": has_audio,
                            "format_id": f.get("format_id", ""),
                            "ext": f.get("ext", ""),
                            "filesize": f.get("filesize", 0),
                            "filesize_approx": f.get("filesize_approx", 0),
                            "format_note": f.get("format_note", ""),
                            "vcodec": vcodec,
                            "acodec": acodec,
                        })

                if not formats:
                    raise Exception("No downloadable formats found")

                # Sort by height (highest first)
                formats = sorted(formats, key=lambda x: x["height"], reverse=True)

                # Prefer formats that have BOTH video AND audio
                formats_with_audio = [f for f in formats if f["has_audio"]]
                formats_without_audio = [f for f in formats if not f["has_audio"]]

                # Combine: audio formats first, then video-only
                all_formats = formats_with_audio + formats_without_audio

                # Remove duplicates by quality
                seen = set()
                unique = []
                for f in all_formats:
                    if f["quality"] not in seen:
                        seen.add(f["quality"])
                        unique.append({
                            "quality": f["quality"],
                            "url": f["url"],
                            "has_audio": f["has_audio"],
                            "format_note": f.get("format_note", ""),
                            "filesize_approx": f.get("filesize_approx", 0) or f.get("filesize", 0),
                        })

                # If no formats with audio, try getting the best available
                if not formats_with_audio and unique:
                    # Mark the best quality one
                    pass

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Facebook Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "uploader_url": info.get("uploader_url", ""),
                    "duration": info.get("duration", 0),
                    "view_count": info.get("view_count", 0),
                    "like_count": info.get("like_count", 0),
                    "description": info.get("description", ""),
                    "tags": info.get("tags", []),
                    "has_audio_formats": len(formats_with_audio) > 0,
                    "formats": unique[:5]
                }

        except Exception as e:
            error_msg = str(e)
            print(f"Error: {error_msg}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            # More helpful error messages
            if "format" in error_msg.lower() or "available" in error_msg.lower():
                error_msg = "Video format not available. The video may be private or deleted."
            elif "login" in error_msg.lower():
                error_msg = "This content requires login. Only public videos can be downloaded."
            
            response_data = {
                "status": "error", 
                "message": error_msg[:150]
            }

        self.wfile.write(json.dumps(response_data).encode())