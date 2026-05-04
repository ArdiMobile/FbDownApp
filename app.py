from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid
import time
import json

app = Flask(__name__)

# Create temp directory for downloaded files
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'galmee_downloads')
COOKIES_DIR = os.path.join(tempfile.gettempdir(), 'galmee_cookies')
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(COOKIES_DIR, exist_ok=True)

# Create a simple cookies file if it doesn't exist
COOKIES_FILE = os.path.join(COOKIES_DIR, 'cookies.txt')
if not os.path.exists(COOKIES_FILE):
    # Create empty cookies file with Netscape format header
    with open(COOKIES_FILE, 'w') as f:
        f.write("# Netscape HTTP Cookie File\n")

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
            'cookiefile': COOKIES_FILE,
            # Add headers to look like a real browser
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Accept-Encoding': 'gzip,deflate',
                'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
            },
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown Title"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", info.get("channel", "Unknown")),
                "duration": info.get("duration", 0),
            })

    except Exception as e:
        error_msg = str(e)
        print(f"ERROR: {error_msg}")
        
        # Try alternative method if first fails
        try:
            ydl_opts2 = {
                'quiet': True,
                'extract_flat': True,
                'force_generic_extractor': False,
                'cookiefile': COOKIES_FILE,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
            
            with yt_dlp.YoutubeDL(ydl_opts2) as ydl:
                info = ydl.extract_info(url, download=False)
                return jsonify({
                    "status": "success",
                    "title": info.get("title", "Unknown Title"),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", "Unknown"),
                    "duration": info.get("duration", 0),
                })
        except:
            pass
            
        return jsonify({
            "status": "error", 
            "message": "YouTube requires verification. Please try a different video or try again later."
        }), 500

# API - Download Audio Only
@app.route("/api/download")
def download_audio():
    url = request.args.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        cleanup_old_files()
        
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        print(f"Starting download for: {url}")
        
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
            'cookiefile': COOKIES_FILE,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            # Try to bypass bot detection
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                }
            },
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            print(f"Download completed: {info.get('title')}")
        
        # Find the mp3 file
        mp3_file = os.path.join(TEMP_DIR, f'{file_id}.mp3')
        
        if not os.path.exists(mp3_file):
            for filename in os.listdir(TEMP_DIR):
                if file_id in filename and filename.endswith('.mp3'):
                    mp3_file = os.path.join(TEMP_DIR, filename)
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
            return jsonify({
                "status": "error", 
                "message": "Conversion failed. Please try again."
            }), 500
            
    except Exception as e:
        error_msg = str(e)
        print(f"Download ERROR: {error_msg}")
        
        if "Sign in to confirm" in error_msg or "bot" in error_msg.lower():
            return jsonify({
                "status": "error", 
                "message": "YouTube is blocking this request. Please try a different video."
            }), 500
        
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
        safe_filename = os.path.basename(file_path).replace(' ', '_')
        file_size = os.path.getsize(file_path)
        
        print(f"Serving file: {safe_filename} ({file_size} bytes)")
        
        def generate():
            with open(file_path, 'rb') as f:
                data = f.read(8192)
                while data:
                    yield data
                    data = f.read(8192)
            try:
                os.remove(file_path)
                print(f"Deleted: {file_path}")
            except Exception as e:
                print(f"Could not delete: {e}")
        
        return Response(
            generate(),
            mimetype='audio/mpeg',
            headers={
                'Content-Disposition': f'attachment; filename="{safe_filename}"',
                'Content-Length': str(file_size),
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache'
            }
        )
        
    except Exception as e:
        print(f"Serve ERROR: {str(e)}")
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
    print(f"Starting Galmee MP3 Downloader on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)