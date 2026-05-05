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
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            formats = []
            seen = set()
            for f in info.get('formats', []):
                h = f.get('height') or 0
                if h > 0 and f.get('ext') == 'mp4' and h not in seen:
                    seen.add(h)
                    formats.append({
                        'format_id': f.get('format_id'),
                        'quality': h,
                        'filesize': f.get('filesize', 0),
                        'resolution': f"{f.get('width', '')}x{h}"
                    })
            formats.sort(key=lambda x: x['quality'], reverse=True)

            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader", info.get("channel", "")),
                "duration": info.get("duration", 0),
                "formats": formats[:15]
            })
    except Exception as e:
        print(f"ERROR: {e}")
        return jsonify({"status": "error", "message": "Cannot fetch video. Check the URL."}), 500

@app.route("/api/download")
def download_video():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    download_type = request.args.get("type", "video")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL"}), 400
    
    try:
        cleanup_old_files()
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        if download_type == "audio":
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
                'quiet': True,
            }
        else:
            fmt = f'{format_id}+bestaudio/best' if format_id else 'bestvideo+bestaudio/best'
            ydl_opts = {
                'format': fmt,
                'outtmpl': output_template,
                'merge_output_format': 'mp4',
                'quiet': True,
            }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        
        ext = 'mp3' if download_type == 'audio' else 'mp4'
        file_path = os.path.join(TEMP_DIR, f'{file_id}.{ext}')
        
        if not os.path.exists(file_path):
            for fn in os.listdir(TEMP_DIR):
                if file_id in fn:
                    file_path = os.path.join(TEMP_DIR, fn)
                    break
        
        if os.path.exists(file_path):
            return jsonify({
                "status": "success",
                "file_path": file_path,
                "filename": f"galmee_{download_type}_{file_id}.{ext}"
            })
        
        return jsonify({"status": "error", "message": "Download failed"}), 500
    except Exception as e:
        print(f"Download ERROR: {e}")
        return jsonify({"status": "error", "message": "Download failed. Try another video."}), 500

@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    try:
        filename = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        def generate():
            with open(file_path, 'rb') as f:
                while chunk := f.read(8192):
                    yield chunk
            try:
                os.remove(file_path)
            except:
                pass
        
        mimetype = 'audio/mpeg' if file_path.endswith('.mp3') else 'video/mp4'
        return Response(generate(), mimetype=mimetype, headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Length': str(file_size)
        })
    except Exception as e:
        print(f"Serve ERROR: {e}")
        return jsonify({"error": "Error serving file"}), 500

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