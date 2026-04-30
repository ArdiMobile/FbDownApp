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

            # Detect platform for format strategy
            is_instagram = "instagram.com" in video_url or "instagr.am" in video_url

            # Format selection based on platform
            if is_instagram:
                format_str = 'bestvideo+bestaudio/best'
            else:
                format_str = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'

            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                'force_generic_extractor': False,
                'format': format_str,
                'merge_output_format': 'mp4',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)

                if not info:
                    raise Exception("Failed to extract video information")

                formats = []
                seen_urls = set()

                # Check if we got a merged format (video+audio)
                requested_formats = info.get("requested_formats", [])
                has_merged = len(requested_formats) > 1

                # If merged format exists, add it as the primary option
                if has_merged:
                    merged_url = info.get("url")
                    if merged_url:
                        # Get the best height from the merged formats
                        heights = [f.get("height", 0) or 0 for f in requested_formats]
                        best_height = max(heights) if heights else 0
                        total_size = sum([f.get("filesize", 0) or f.get("filesize_approx", 0) or 0 for f in requested_formats])
                        
                        formats.append({
                            "quality": f"{best_height}p" if best_height > 0 else "HD",
                            "height": best_height if best_height > 0 else 1080,
                            "url": merged_url,
                            "has_audio": True,
                            "format_note": "Video + Audio",
                            "filesize": total_size,
                            "filesize_approx": total_size,
                        })
                        seen_urls.add(merged_url)

                # Add individual formats
                for f in info.get("formats", []):
                    url = f.get("url", "")
                    height = f.get("height")
                    vcodec = f.get("vcodec", "none")
                    acodec = f.get("acodec", "none")
                    has_video = vcodec and vcodec != "none"
                    has_audio = acodec and acodec != "none"
                    
                    if url and height and url not in seen_urls:
                        seen_urls.add(url)
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
                            "vcodec": vcodec,
                            "acodec": acodec,
                        })

                if not formats:
                    raise Exception("No downloadable formats found. The video may be private or deleted.")

                # Sort: formats with audio first, then by height (highest first)
                formats.sort(key=lambda x: (
                    not x.get("has_audio", False),
                    -(x.get("height", 0) or 0)
                ))

                # Remove duplicate qualities (keep the one with audio if available)
                seen_qualities = {}
                unique = []
                for f in formats:
                    quality = f["quality"]
                    if quality not in seen_qualities:
                        seen_qualities[quality] = f
                        unique.append(f)
                    else:
                        # If this one has audio and the existing one doesn't, replace it
                        existing = seen_qualities[quality]
                        if f.get("has_audio") and not existing.get("has_audio"):
                            # Replace the existing one
                            for i, item in enumerate(unique):
                                if item["quality"] == quality:
                                    unique[i] = f
                                    seen_qualities[quality] = f
                                    break

                # Build final response formats
                response_formats = []
                for f in unique[:6]:
                    response_formats.append({
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
                    "formats": response_formats
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