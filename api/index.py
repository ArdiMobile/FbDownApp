import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yt_dlp

class handler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        self._set_headers()
        
        try:
            # 🔹 Get URL from query params
            q = parse_qs(urlparse(self.path).query)
            url = q.get('url', [None])[0]

            if not url:
                self.wfile.write(json.dumps({"error": "No URL provided"}).encode())
                return

            if not url.startswith('http'):
                url = 'https://' + url

            # 🔥 Optimized yt-dlp config (Vercel safe)
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                # Select best mp4 with audio, avoiding formats that require merging
                'format': 'best[ext=mp4][acodec!=none]',
                'nocheckcertificate': True,
                'socket_timeout': 10,
                'retries': 2,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                formats = []
                # ✅ Extract ONLY formats with audio
                for f in info.get('formats', []):
                    u = f.get('url')
                    h = f.get('height')
                    acodec = f.get('acodec', 'none')

                    if not u or not h:
                        continue
                    
                    # ❗ skip formats without audio
                    if acodec == 'none':
                        continue

                    formats.append({
                        "url": u,
                        "quality": f"{h}p",
                        "extension": f.get('ext', 'mp4'),
                        "filesize_approx": f.get('filesize') or f.get('filesize_approx')
                    })

                # ✅ Safe sorting (prevents crash if quality isn't a standard string)
                formats.sort(
                    key=lambda x: -int(x['quality'].replace('p', '')) 
                    if x['quality'].replace('p', '').isdigit() else 0
                )

                # ✅ Remove duplicate qualities
                unique = []
                used = set()
                for f in formats:
                    if f['quality'] not in used:
                        used.add(f['quality'])
                        unique.append(f)

                # ✅ Response Construction
                response = {
                    "status": "success",
                    "title": info.get('title', 'Video'),
                    "thumbnail": info.get('thumbnail', ''),
                    "uploader": info.get('uploader', ''),
                    "duration": info.get('duration', 0),
                    "formats": unique # 🔥 No limit (better UX)
                }

                self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())

