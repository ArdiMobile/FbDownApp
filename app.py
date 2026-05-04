from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid
import time
import sys

app = Flask(__name__)

# Create temp directory for downloaded files
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'galmee_downloads')
os.makedirs(TEMP_DIR, exist_ok=True)

# Increase timeout for large files
app.config['TIMEOUT'] = 600  # 10 minutes

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
        return jsonify({"status": "error", "message": f"Failed to fetch info: {str(e)}"}), 500

# API - Download Audio Only
@app.route("/api/download")
def download_audio():
    url = request.args.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        # Clean old temp files first
        cleanup_old_files()
        
        # Create unique filename
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        print(f"Starting download for: {url}")
        
        # Simpler download options
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': False,
            'no_warnings': False,
            'socket_timeout': 120,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            print(f"Download completed: {info.get('title')}")
        
        # Find the mp3 file - check multiple possible locations
        mp3_file = os.path.join(TEMP_DIR, f'{file_id}.mp3')
        
        # If not found, search for it
        if not os.path.exists(mp3_file):
            print(f"Looking for MP3 file with ID: {file_id}")
            for filename in os.listdir(TEMP_DIR):
                if file_id in filename and filename.endswith('.mp3'):
                    mp3_file = os.path.join(TEMP_DIR, filename)
                    print(f"Found MP3: {mp3_file}")
                    break
        
        if os.path.exists(mp3_file):
            file_size = os.path.getsize(mp3_file)
            print(f"MP3 ready: {mp3_file} ({file_size} bytes)")
            
            return jsonify({
                "status": "success",
                "file_path": mp3_file,
                "filename": f"{info.get('title', 'audio')[:50]}.mp3",
                "filesize": file_size
            })
        else:
            print("MP3 file not created!")
            return jsonify({
                "status": "error", 
                "message": "Conversion failed. Please try again."
            }), 500
            
    except Exception as e:
        error_msg = str(e)
        print(f"Download ERROR: {error_msg}")
        
        # Provide more specific error messages
        if "HTTP Error 403" in error_msg:
            return jsonify({
                "status": "error", 
                "message": "This video is restricted. Try a different video."
            }), 500
        elif "Video unavailable" in error_msg:
            return jsonify({
                "status": "error", 
                "message": "Video not available. It may be private or deleted."
            }), 500
        else:
            return jsonify({
                "status": "error", 
                "message": "Download failed. Please try a different video."
            }), 500

# API - Serve downloaded file
@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return jsonify({"error": "File not found"}), 404
    
    try:
        original_filename = os.path.basename(file_path)
        safe_filename = original_filename.replace(' ', '_').replace('/', '_')
        file_size = os.path.getsize(file_path)
        
        print(f"Serving file: {safe_filename} ({file_size} bytes)")
        
        def generate():
            with open(file_path, 'rb') as f:
                data = f.read(8192)
                while data:
                    yield data
                    data = f.read(8192)
            # Delete file after serving
            try:
                os.remove(file_path)
                print(f"Deleted: {file_path}")
            except Exception as e:
                print(f"Could not delete file: {e}")
        
        response = Response(
            generate(),
            mimetype='audio/mpeg',
            headers={
                'Content-Disposition': f'attachment; filename="{safe_filename}"',
                'Content-Length': str(file_size),
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache'
            }
        )
        return response
        
    except Exception as e:
        print(f"Serve ERROR: {str(e)}")
        return jsonify({"error": "Error serving file"}), 500

def cleanup_old_files():
    """Remove temp files older than 1 hour"""
    try:
        current_time = time.time()
        count = 0
        for filename in os.listdir(TEMP_DIR):
            filepath = os.path.join(TEMP_DIR, filename)
            try:
                if os.path.getmtime(filepath) < current_time - 3600:
                    os.remove(filepath)
                    count += 1
            except:
                pass
        if count > 0:
            print(f"Cleaned up {count} old files")
    except Exception as e:
        print(f"Cleanup error: {e}")

# RUN
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Galmee MP3 Downloader on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)