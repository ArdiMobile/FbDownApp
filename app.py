from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid
import time

app = Flask(__name__)

# Create temp directory for downloaded files
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'galmee_downloads')
os.makedirs(TEMP_DIR, exist_ok=True)

# HOME
@app.route("/")
def home():
    return render_template("index.html")

# DOWNLOAD PAGE  
@app.route("/download")
def download_page():
    return render_template("download.html")

# API - Get video info
@app.route("/api/info")
def get_video():
    url = request.args.get("url")

    if not url:
        return jsonify({"status": "error", "message": "No URL"})

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown Title"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", info.get("channel", "Unknown")),
                "duration": info.get("duration", 0),
                "video_id": info.get("id", "")
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"status": "error", "message": "Invalid URL. Please check and try again."})

# API - Download Audio Only
@app.route("/api/download")
def download_audio():
    url = request.args.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        # Clean old temp files
        cleanup_old_files()
        
        # Create unique filename
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        # Download and convert to MP3
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        
        # Find the mp3 file
        mp3_file = os.path.join(TEMP_DIR, f'{file_id}.mp3')
        if os.path.exists(mp3_file):
            # Get file size
            file_size = os.path.getsize(mp3_file)
            
            return jsonify({
                "status": "success",
                "file_path": mp3_file,
                "filename": f"{info.get('title', 'audio')}.mp3",
                "title": info.get('title', 'audio'),
                "filesize": file_size
            })
        else:
            return jsonify({"status": "error", "message": "Failed to convert to MP3"}), 500
            
    except Exception as e:
        print("Download ERROR:", str(e))
        return jsonify({"status": "error", "message": "Download failed. Please try again."}), 500

# API - Serve downloaded file
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
            # Delete file after serving
            try:
                os.remove(file_path)
            except:
                pass
        
        response = Response(
            generate(),
            mimetype='audio/mpeg',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(file_size),
                'Cache-Control': 'no-cache'
            }
        )
        return response
        
    except Exception as e:
        print("Serve ERROR:", str(e))
        return jsonify({"error": "Error serving file"}), 500

def cleanup_old_files():
    """Remove temp files older than 1 hour"""
    try:
        current_time = time.time()
        for filename in os.listdir(TEMP_DIR):
            filepath = os.path.join(TEMP_DIR, filename)
            try:
                if os.path.getmtime(filepath) < current_time - 3600:
                    os.remove(filepath)
            except:
                pass
    except:
        pass

# RUN
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)