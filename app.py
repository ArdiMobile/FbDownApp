from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid
import time
import subprocess
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Create temp directory for merged files
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'galmee_downloads')
os.makedirs(TEMP_DIR, exist_ok=True)

# Install FFmpeg if needed
def ensure_ffmpeg():
    """Ensure FFmpeg is available"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        logger.info("✓ FFmpeg is available")
        return True
    except:
        logger.warning("⚠ FFmpeg not found, attempting to install...")
        try:
            subprocess.run(['apt-get', 'update'], capture_output=True)
            subprocess.run(['apt-get', 'install', '-y', 'ffmpeg'], capture_output=True, check=True)
            logger.info("✓ FFmpeg installed successfully")
            return True
        except Exception as e:
            logger.error(f"⚠ Could not install FFmpeg: {e}")
            return False

ensure_ffmpeg()

# Health check endpoint (Railway uses this)
@app.route("/health")
def health():
    return jsonify({"status": "healthy", "message": "Galmee is running"}), 200

# HOME
@app.route("/")
def home():
    try:
        return render_template("index.html")
    except Exception as e:
        logger.error(f"Error loading home: {e}")
        return f"Error loading page: {str(e)}", 500

# DOWNLOAD PAGE
@app.route("/download")
def download_page():
    try:
        return render_template("download.html")
    except Exception as e:
        logger.error(f"Error loading download page: {e}")
        return f"Error loading page: {str(e)}", 500

# API - Get video info
@app.route("/api/info")
def get_video():
    url = request.args.get("url")

    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get available formats
            formats = []
            seen_qualities = set()
            
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('height'):
                    quality = f.get('height')
                    if quality not in seen_qualities:
                        seen_qualities.add(quality)
                        formats.append({
                            'format_id': f.get('format_id'),
                            'quality': quality,
                            'filesize': f.get('filesize', 0),
                            'resolution': f"{f.get('width', '')}x{f.get('height', '')}"
                        })

            formats.sort(key=lambda x: x['quality'], reverse=True)

            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", "Unknown"),
                "duration": info.get("duration", 0),
                "formats": formats[:10],
                "video_id": info.get("id", "")
            })

    except Exception as e:
        logger.error(f"Error getting video info: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to get video info: {str(e)}"}), 500

# API - Download video
@app.route("/api/download")
def download_video():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    download_type = request.args.get("type", "video")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        if download_type == "audio":
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'quiet': True,
            }
        else:
            if format_id:
                format_string = f'{format_id}+bestaudio/best'
            else:
                format_string = 'bestvideo+bestaudio/best'
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': output_template,
                'merge_output_format': 'mp4',
                'quiet': True,
            }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        
        # Find the downloaded file
        expected_ext = 'mp3' if download_type == 'audio' else 'mp4'
        downloaded_file = os.path.join(TEMP_DIR, f'{file_id}.{expected_ext}')
        
        if os.path.exists(downloaded_file):
            return jsonify({
                "status": "success",
                "file_path": downloaded_file,
                "filename": f"galmee_{download_type}_{file_id}.{expected_ext}"
            })
        else:
            # Try to find the file with any extension
            for file in os.listdir(TEMP_DIR):
                if file.startswith(file_id):
                    downloaded_file = os.path.join(TEMP_DIR, file)
                    return jsonify({
                        "status": "success",
                        "file_path": downloaded_file,
                        "filename": f"galmee_{download_type}_{file_id}.{os.path.splitext(file)[1]}"
                    })
            
            raise Exception("Downloaded file not found")
            
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({"status": "error", "message": f"Download failed: {str(e)}"}), 500

# API - Serve file
@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    try:
        if file_path.endswith('.mp4'):
            mimetype = 'video/mp4'
        elif file_path.endswith('.mp3'):
            mimetype = 'audio/mpeg'
        else:
            mimetype = 'application/octet-stream'
        
        filename = os.path.basename(file_path)
        
        def generate():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
            # Clean up after serving
            try:
                os.remove(file_path)
            except:
                pass
        
        return Response(
            generate(),
            mimetype=mimetype,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Error serving file: {str(e)}")
        return "Error serving file", 500

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Route not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"status": "error", "message": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)