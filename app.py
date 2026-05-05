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
                        'url': f.get('url', '')
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
        return jsonify({"status": "error", "message": "Cannot access video. It may be private or expired."}), 500

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
            if os.path.getmtime(fp) < current - 300:
                try:
                    os.remove(fp)
                except:
                    pass
    except:
        pass
    
    file_id = str(uuid.uuid4())[:8]
    output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
    
    try:
        # First, try to get direct URL
        ydl_opts_info = {
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
            info = ydl.extract_info(url, download=False)
        
        # Find the direct URL for the requested format
        direct_url = None
        for f in info.get('formats', []):
            if f.get('format_id') == format_id:
                direct_url = f.get('url')
                break
        
        # If no specific format, use best
        if not direct_url:
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('url'):
                    direct_url = f.get('url')
                    break
        
        if direct_url:
            print(f"Direct URL found, downloading...")
            
            # Download using requests
            import requests
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.facebook.com/',
            }
            
            response = requests.get(direct_url, headers=headers, timeout=60, stream=True)
            
            if response.status_code == 200:
                output_file = os.path.join(TEMP_DIR, f'{file_id}.mp4')
                with open(output_file, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
                    print(f"Downloaded: {output_file} ({os.path.getsize(output_file)} bytes)")
                    return jsonify({
                        "status": "success",
                        "file_path": output_file,
                        "filename": "galmee_video.mp4"
                    })
        
        # Fallback: use yt-dlp download
        print("Falling back to yt-dlp download...")
        ydl_opts = {
            'outtmpl': output_template,
            'format': format_id if format_id else 'best[ext=mp4]/best',
            'merge_output_format': 'mp4',
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 120,
            'retries': 2,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Find file
        for filename in os.listdir(TEMP_DIR):
            if file_id in filename:
                output_file = os.path.join(TEMP_DIR, filename)
                print(f"Found: {output_file}")
                return jsonify({
                    "status": "success",
                    "file_path": output_file,
                    "filename": "galmee_video.mp4"
                })
        
        raise Exception("File not created")
            
    except Exception as e:
        print("DOWNLOAD ERROR:", str(e))
        return jsonify({"status": "error", "message": "Download failed. Try a different video or quality."}), 500

@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    try:
        filename = os.path.basename(file_path)
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
                'Content-Disposition': f'attachment; filename="galmee_video.mp4"',
                'Content-Length': str(file_size),
            }
        )
    except Exception as e:
        print("SERVE ERROR:", str(e))
        return "Error", 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)