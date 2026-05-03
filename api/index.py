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
            
            # KEY FIX: Download the video to get merged audio
            import tempfile, os
            tmp = tempfile.mkdtemp()
            out = os.path.join(tmp, 'video.mp4')
            
            fmt = 'bestvideo+bestaudio/best' if is_ig else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            
            ydl_opts = {
                'quiet': True, 'noplaylist': True, 'no_warnings': True,
                'format': fmt, 'merge_output_format': 'mp4',
                'outtmpl': out,
            }
            
            info = yt_dlp.YoutubeDL(ydl_opts).extract_info(url, download=False)
            if not info: raise Exception("No video found")
            
            # Build formats list
            formats = []
            seen = set()
            
            # Add merged format if available
            rf = info.get('requested_formats',[])
            if len(rf) > 1:
                murl = info.get('url')
                if murl:
                    h = max([f.get('height',0)or 0 for f in rf])
                    sz = sum([f.get('filesize',0)or f.get('filesize_approx',0)or 0 for f in rf])
                    formats.append({"quality":f"{h}p"if h else"HD","url":murl,"has_audio":True,"filesize_approx":sz})
                    seen.add(murl)
            
            for f in info.get('formats',[]):
                u,h = f.get('url',''), f.get('height')
                if u and h and u not in seen:
                    seen.add(u)
                    a = f.get('acodec','none')!='none'
                    sz = f.get('filesize',0)or f.get('filesize_approx',0)
                    formats.append({"quality":f"{h}p","url":u,"has_audio":a,"filesize_approx":sz})
            
            formats.sort(key=lambda x:(not x['has_audio'],-int(x['quality'].replace('p','')or 0)))
            
            uniq = []; sq = set()
            for f in formats:
                if f['quality'] not in sq: sq.add(f['quality']); uniq.append(f)
            
            self.wfile.write(json.dumps({
                "status":"success",
                "title":info.get('title','Video'),
                "thumbnail":info.get('thumbnail',''),
                "uploader":info.get('uploader',''),
                "uploader_url":info.get('uploader_url',''),
                "duration":info.get('duration',0),
                "formats":uniq[:5]
            }).encode())
            
        except Exception as e:
            print(traceback.format_exc(),file=sys.stderr)
            self.wfile.write(json.dumps({"status":"error","message":str(e)[:150]}).encode())