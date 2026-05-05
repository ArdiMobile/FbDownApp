from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid
import time

app = Flask(__name__)

TEMP_DIR = os.path.join(tempfile.gettempdir(), 'galmee_downloads')
os.makedirs(TEMP_DIR, exist_ok=True)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/download")
def download_page():
    return render_template("download.html")

@app.route("/api/info")
def get_video():
    url = request.args.get("url")
    if not url:
        return jsonify({"status": "error", "message": "No URL"}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 30,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            formats = []
            seen = set()
            
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('height'):
                    h = f.get('height')
                    if h not in seen:
                        seen.add(h)
                        formats.append({
                            'format_id': f.get('format_id'),
                            'quality': h,
                            'resolution': f"{f.get('width', '')}x{f.get('height', '')}",
                        })
            
            formats.sort(key=lambda x: x['quality'], reverse=True)
            
            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", info.get("channel", "Unknown")),
                "duration": info.get("duration", 0),
                "formats": formats[:10]
            })

    except Exception as e:
        print("INFO ERROR:", str(e))
        return jsonify({"status": "error", "message": "Cannot access video. Try another."}), 500

@app.route("/api/download")
def download_media():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL"}), 400
    
    try:
        cleanup_old_files()
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        print(f"Downloading: {url} | Format: {format_id}")
        
        ydl_opts = {
            'format': format_id if format_id else 'best',
            'outtmpl': output_template,
            'merge_output_format': 'mp4',
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 120,
            'retries': 3,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            print(f"Downloaded: {info.get('title')}")
        
        # Find file
        downloaded_file = None
        for ext in ['mp4', 'mkv', 'webm']:
            test = os.path.join(TEMP_DIR, f'{file_id}.{ext}')
            if os.path.exists(test):
                downloaded_file = test
                break
        
        if not downloaded_file:
            for f in os.listdir(TEMP_DIR):
                if file_id in f:
                    downloaded_file = os.path.join(TEMP_DIR, f)
                    break
        
        if downloaded_file and os.path.exists(downloaded_file):
            print(f"File ready: {downloaded_file} ({os.path.getsize(downloaded_file)} bytes)")
            return jsonify({
                "status": "success",
                "file_path": downloaded_file,
                "filename": "galmee_video.mp4"
            })
        
        print("File not created!")
        return jsonify({"status": "error", "message": "Download failed"}), 500
            
    except Exception as e:
        print("DOWNLOAD ERROR:", str(e))
        return jsonify({"status": "error", "message": "Download failed"}), 500

@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    try:
        file_size = os.path.getsize(file_path)
        
        def generate():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
            try:
                os.remove(file_path)
            except:
                pass
        
        return Response(
            generate(),
            mimetype='video/mp4',
            headers={
                'Content-Disposition': 'attachment; filename="galmee_video.mp4"',
                'Content-Length': str(file_size),
            }
        )
    except Exception as e:
        print("SERVE ERROR:", str(e))
        return "Error", 500

def cleanup_old_files():
    try:
        current = time.time()
        for f in os.listdir(TEMP_DIR):
            fp = os.path.join(TEMP_DIR, f)
            try:
                if os.path.getmtime(fp) < current - 1800:
                    os.remove(fp)
            except:
                pass
    except:
        pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)