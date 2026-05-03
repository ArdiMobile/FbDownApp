from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import traceback, sys
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Access-Control-Allow-Methods','GET,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type')
        self.end_headers()

    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        url = q.get('url',[None])[0]
        
        self.send_response(200)
        self.send_header('Content-type','application/json')
        self.send_header('Access-Control-Allow-Origin','*')
        self.end_headers()

        if not url:
            self.wfile.write(json.dumps({"status":"error","message":"No URL"}).encode())
            return

        try:
            if not url.startswith('http'): url = 'https://'+url
            if "facebook.com" in url and "m.facebook.com" not in url:
                url = url.replace("www.facebook.com","m.facebook.com").replace("web.facebook.com","m.facebook.com")
            
            is_ig = 'instagram.com' in url or 'instagr.am' in url
            
            # KEY CHANGE: Use 'best' format which often has audio for SD
            # Then fall back to merged formats for HD
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'extract_flat': False,
                # Try multiple format strategies
                'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
                'merge_output_format': 'mp4',
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info: raise Exception("No video found")

                formats = []
                seen_urls = set()

                # Check for merged formats (video+audio)
                requested_formats = info.get('requested_formats', [])
                has_merged = len(requested_formats) > 1

                if has_merged:
                    merged_url = info.get('url')
                    if merged_url:
                        heights = [f.get('height', 0) or 0 for f in requested_formats]
                        best_height = max(heights) if heights else 0
                        total_size = sum([f.get('filesize', 0) or f.get('filesize_approx', 0) or 0 for f in requested_formats])
                        
                        formats.append({
                            "quality": f"{best_height}p" if best_height > 0 else "HD",
                            "height": best_height,
                            "url": merged_url,
                            "has_audio": True,  # Merged = has audio!
                            "format_note": "Video + Audio (Merged)",
                            "filesize_approx": total_size,
                        })
                        seen_urls.add(merged_url)

                # Add all individual formats
                for f in info.get("formats", []):
                    url_f = f.get('url', '')
                    height = f.get('height')
                    vcodec = f.get('vcodec', 'none')
                    acodec = f.get('acodec', 'none')
                    has_video = vcodec and vcodec != 'none'
                    has_audio = acodec and acodec != 'none'
                    ext = f.get('ext', '')
                    format_note = f.get('format_note', '')
                    
                    if url_f and height and url_f not in seen_urls:
                        seen_urls.add(url_f)
                        
                        # Determine if this format has audio
                        audio_present = has_audio
                        # Some formats marked as 'mp4' with format_note containing audio info
                        if not audio_present and ext == 'mp4' and 'audio' in format_note.lower():
                            audio_present = True
                        
                        formats.append({
                            "quality": f"{height}p",
                            "height": height,
                            "url": url_f,
                            "has_video": has_video,
                            "has_audio": audio_present,
                            "format_id": f.get('format_id', ''),
                            "ext": ext,
                            "filesize": f.get('filesize', 0),
                            "filesize_approx": f.get('filesize_approx', 0),
                            "format_note": format_note,
                        })

                if not formats:
                    raise Exception("No downloadable formats found")

                # SORT: Audio formats FIRST, then by height (highest)
                formats.sort(key=lambda x: (
                    not x.get('has_audio', False),  # Formats with audio first
                    -(x.get('height', 0) or 0)       # Then highest quality
                ))

                # Remove duplicate qualities, keeping the one with audio if possible
                seen_qualities = {}
                unique = []
                for f in formats:
                    quality = f['quality']
                    if quality not in seen_qualities:
                        seen_qualities[quality] = f
                        unique.append(f)
                    else:
                        existing = seen_qualities[quality]
                        # Replace if this one has audio and existing doesn't
                        if f.get('has_audio') and not existing.get('has_audio'):
                            for i, item in enumerate(unique):
                                if item['quality'] == quality:
                                    unique[i] = f
                                    seen_qualities[quality] = f
                                    break

                # Build response
                response_formats = []
                for f in unique[:6]:
                    response_formats.append({
                        "quality": f['quality'],
                        "url": f['url'],
                        "has_audio": f.get('has_audio', False),
                        "format_note": f.get('format_note', ''),
                        "filesize_approx": f.get('filesize_approx', 0) or f.get('filesize', 0),
                    })

                response_data = {
                    "status": "success",
                    "title": info.get('title', 'Video'),
                    "thumbnail": info.get('thumbnail', ''),
                    "uploader": info.get('uploader', ''),
                    "uploader_url": info.get('uploader_url', ''),
                    "duration": info.get('duration', 0),
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