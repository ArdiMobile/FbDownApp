from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import traceback, sys
import yt_dlp


class handler(BaseHTTPRequestHandler):

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self._set_headers()

        try:
            # 🔹 Get URL
            q = parse_qs(urlparse(self.path).query)
            url = q.get('url', [None])[0]

            if not url:
                self.wfile.write(json.dumps({
                    "status": "error",
                    "message": "No URL provided"
                }).encode())
                return

            if not url.startswith('http'):
                url = 'https://' + url

            # 🔥 Optimized yt-dlp config (Vercel safe)
            ydl_opts = {
                'quiet': True,
                'noplaylist': True,
                'no_warnings': True,
                'format': 'best[ext=mp4][acodec!=none]',
                'nocheckcertificate': True,
                'socket_timeout': 10,
                'retries': 2
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            if not info:
                raise Exception("No video found")

            formats = []
            seen = set()

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

                if u in seen:
                    continue

                seen.add(u)

                formats.append({
                    "quality": f"{h}p",
                    "url": u,
                    "has_audio": True,
                    "format_note": f.get('format_note', ''),
                    "filesize_approx": f.get('filesize') or f.get('filesize_approx')
                })

            # ✅ Safe sorting (prevents crash)
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

            response = {
                "status": "success",
                "title": info.get('title', 'Video'),
                "thumbnail": info.get('thumbnail', ''),
                "uploader": info.get('uploader', ''),
                "duration": info.get('duration', 0),
                "formats": unique   # 🔥 no limit (better UX)
            }

            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            print(traceback.format_exc(), file=sys.stderr)

            self.wfile.write(json.dumps({
                "status": "error",
                "message": str(e)[:200]
            }).encode())