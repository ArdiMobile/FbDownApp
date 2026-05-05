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
            'extract_flat': False,
            'socket_timeout': 30,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            formats = []
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('height'):
                    formats.append({
                        'format_id': f.get('format_id'),
                        'quality': f.get('height'),
                        'resolution': f"{f.get('width', '')}x{f.get('height', '')}",
                        'filesize': f.get('filesize', 0)
                    })
            
            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", info.get("channel", "Unknown")),
                "duration": info.get("duration", 0),
                "formats": formats[:10]
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"status": "error", "message": "Cannot access this video. Please try another."}), 500

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
        
        if format_id:
            format_string = f'{format_id}+bestaudio/best'
        else:
            format_string = 'bestvideo+bestaudio/best'
        
        ydl_opts = {
            'format': format_string,
            'outtmpl': output_template,
            'merge_output_format': 'mp4',
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 120,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        
        mp4_file = os.path.join(TEMP_DIR, f'{file_id}.mp4')
        if not os.path.exists(mp4_file):
            for f in os.listdir(TEMP_DIR):
                if file_id in f and f.endswith('.mp4'):
                    mp4_file = os.path.join(TEMP_DIR, f)
                    break
        
        if os.path.exists(mp4_file):
            return jsonify({
                "status": "success",
                "file_path": mp4_file,
                "filename": f"{info.get('title', 'video')[:50]}.mp4"
            })
        
        return jsonify({"status": "error", "message": "Download failed"}), 500
            
    except Exception as e:
        print("Download ERROR:", str(e))
        return jsonify({"status": "error", "message": "Download failed"}), 500

@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    def generate():
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                yield chunk
        try:
            os.remove(file_path)
        except:
            pass
    
    return Response(
        generate(),
        mimetype='video/mp4',
        headers={'Content-Disposition': f'attachment; filename="galmee_video.mp4"'}
    )

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