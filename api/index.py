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
        video_url = query_params.get('url', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if not video_url:
            self.wfile.write(json.dumps({
                "status": "error", 
                "message": "No URL provided"
            }).encode())
            return

        try:
            # Normalize URL
            if "facebook.com" in video_url and "m.facebook.com" not in video_url:
                video_url = video_url.replace("www.facebook.com", "m.facebook.com")
                video_url = video_url.replace("web.facebook.com", "m.facebook.com")
            if not video_url.startswith("http"):
                video_url = "https://" + video_url

            # Detect platform
            is_instagram = "instagram.com" in video_url or "instagr.am" in video_url
            
            if is_instagram:
                # Instagram: Try multiple format strategies
                ydl_opts = {
                    'quiet': True,
                    'noplaylist': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    # Try all possible format combinations for Instagram
                    'format': 'bestvideo+bestaudio/bestvideo+bestaudio/best',
                    'merge_output_format': 'mp4',
                }
            else:
                # Facebook: Standard merged format
                ydl_opts = {
                    'quiet': True,
                    'noplaylist': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                    'merge_output_format': 'mp4',
                }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)

                if not info:
                    raise Exception("Failed to extract video information")

                formats = []
                requested_formats = info.get("requested_formats", [])
                
                # Check if we got merged formats (video+audio combined)
                if requested_formats and len(requested_formats) > 1:
                    # Success! We have a merged video+audio format
                    merged_url = info.get("url")
                    if merged_url:
                        best_height = max([f.get("height", 0) or 0 for f in requested_formats])
                        formats.append({
                            "quality": f"{best_height}p" if best_height else "HD",
                            "height": best_height,
                            "url": merged_url,
                            "has_audio": True,
                            "format_note": "Merged (Video + Audio)",
                            "filesize_approx": sum([f.get("filesize", 0) or f.get("filesize_approx", 0) or 0 for f in requested_formats]),
                        })

                # Also add individual formats as fallback
                for f in info.get("formats", []):
                    vcodec = f.get("vcodec", "none")
                    acodec = f.get("acodec", "none")
                    has_video = vcodec and vcodec != "none"
                    has_audio = acodec and acodec != "none"
                    height = f.get("height")
                    url = f.get("url", "")
                    
                    if url and height:
                        # Skip if already added as merged
                        if not any(existing["url"] == url for existing in formats):
                            formats.append({
                                "quality": f"{height}p",
                                "height": height,
                                "url": url,
                                "has_video": has_video,
                                "has_audio": has_audio,
                                "format_id": f.get("format_id", ""),
                                "ext": f.get("ext", ""),
                                "filesize": f.get("filesize", 0),
                                "filesize_approx": f.get("filesize_approx", 0),
                                "format_note": f.get("format_note", ""),
                            })

                if not formats:
                    raise Exception("No downloadable formats found")

                # Sort: merged formats first, then by height
                formats = sorted(formats, key=lambda x: (
                    not x.get("has_audio", False),  # Audio formats first
                    -(x.get("height", 0) or 0)      # Highest quality first
                ))

                # Remove duplicates by URL
                seen_urls = set()
                unique = []
                for f in formats:
                    if f["url"] not in seen_urls:
                        seen_urls.add(f["url"])
                        unique.append({
                            "quality": f["quality"],
                            "url": f["url"],
                            "has_audio": f.get("has_audio", False),
                            "format_note": f.get("format_note", ""),
                            "filesize_approx": f.get("filesize_approx", 0) or f.get("filesize", 0),
                        })

                response_data = {
                    "status": "success",
                    "title": info.get("title", "Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "uploader_url": info.get("uploader_url", ""),
                    "duration": info.get("duration", 0),
                    "view_count": info.get("view_count", 0),
                    "like_count": info.get("like_count", 0),
                    "description": info.get("description", "") or "",
                    "tags": info.get("tags", []) or [],
                    "formats": unique[:6]
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