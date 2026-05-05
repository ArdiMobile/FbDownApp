from flask import Flask, request, jsonify, render_template, Response, redirect
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
                ext = f.get('ext', '')
                height = f.get('height')
                if ext == 'mp4' and height and height not in seen:
                    seen.add(height)
                    formats.append({
                        'format_id': f.get('format_id'),
                        'quality': height,
                        'resolution': f"{f.get('width', '')}x{f.get('height', '')}",
                    })
            
            formats.sort(key=lambda x: x['quality'], reverse=True)
            
            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", info.get("channel", "Unknown")),
                "duration": info.get("duration", 0),
                "formats": formats[:8]
            })

    except Exception as e:
        print("INFO ERROR:", str(e))
        return jsonify({"status": "error", "message": "Cannot access video"}), 500

@app.route("/api/download")
def download_media():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL"}), 400
    
    # Clean old files
    try:
        current = time.time()
        for f in os.listdir(TEMP_DIR):
            fp = os.path.join(TEMP_DIR, f)
            if os.path.getmtime(fp) < current - 600:
                try:
                    os.remove(fp)
                except:
                    pass
    except:
        pass
    
    file_id = str(uuid.uuid4())[:8]
    output_file = os.path.join(TEMP_DIR, f'{file_id}.mp4')
    
    try:
        print(f"Downloading: {url}")
        print(f"Format: {format_id}")
        print(f"Output: {output_file}")
        
        # Download and merge video+audio in one step
        ydl_opts = {
            'outtmpl': output_file,
            'format': f'{format_id}+bestaudio[ext=m4a]/best' if format_id else 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 120,
            'retries': 5,
            'fragment_retries': 5,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        print(f"Download complete. Checking file...")
        
        # Check for the file
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            file_size = os.path.getsize(output_file)
            print(f"SUCCESS: {output_file} ({file_size} bytes)")
            return jsonify({
                "status": "success",
                "file_path": output_file,
                "filename": "galmee_video.mp4",
                "filesize": file_size
            })
        
        # Search for any file with our ID
        for f in os.listdir(TEMP_DIR):
            if file_id in f:
                found_file = os.path.join(TEMP_DIR, f)
                file_size = os.path.getsize(found_file)
                print(f"FOUND: {found_file} ({file_size} bytes)")
                return jsonify({
                    "status": "success",
                    "file_path": found_file,
                    "filename": "galmee_video.mp4"
                })
        
        print("FAILED: No file created")
        print("Directory contents:", os.listdir(TEMP_DIR))
        return jsonify({"status": "error", "message": "Download failed"}), 500
            
    except Exception as e:
        print("DOWNLOAD ERROR:", str(e))
        return jsonify({"status": "error", "message": "Download failed. Try another quality."}), 500

@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return "File not found", 404
    
    try:
        file_size = os.path.getsize(file_path)
        print(f"Serving: {file_path} ({file_size} bytes)")
        
        def generate():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    yield chunk
            try:
                time.sleep(2)
                os.remove(file_path)
                print(f"Cleaned: {file_path}")
            except:
                pass
        
        response = Response(
            generate(),
            mimetype='video/mp4',
            headers={
                'Content-Disposition': 'attachment; filename="galmee_video.mp4"',
                'Content-Length': str(file_size),
            }
        )
        return response
        
    except Exception as e:
        print("SERVE ERROR:", str(e))
        return "Error serving file", 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Galmee running on port {port}")
    app.run(host="0.0.0.0", port=port)