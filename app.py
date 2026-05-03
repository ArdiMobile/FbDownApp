from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid
import time

app = Flask(__name__)

# Create temp directory for merged files
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'galmee_downloads')
os.makedirs(TEMP_DIR, exist_ok=True)

# HOME
@app.route("/")
def home():
    return render_template("index.html")

# DOWNLOAD PAGE
@app.route("/download")
def download():
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
            
            # Get available formats
            formats = []
            seen_qualities = set()
            
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('height'):
                    quality = f.get('height')
                    # Avoid duplicate qualities
                    if quality not in seen_qualities:
                        seen_qualities.add(quality)
                        formats.append({
                            'format_id': f.get('format_id'),
                            'quality': quality,
                            'filesize': f.get('filesize', 0),
                            'ext': f.get('ext'),
                            'resolution': f"{f.get('width', '')}x{f.get('height', '')}",
                            'fps': f.get('fps', 0)
                        })

            # Sort by quality (highest first)
            formats.sort(key=lambda x: x['quality'], reverse=True)

            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader"),
                "duration": info.get("duration"),
                "formats": formats[:10],  # Limit to top 10
                "video_id": info.get("id")
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"status": "error", "message": str(e)})

# API - Download with audio merging
@app.route("/api/download")
def download_video():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    download_type = request.args.get("type", "video")  # video or audio
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        # Clean old temp files (older than 1 hour)
        cleanup_old_files()
        
        # Create unique filename
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        if download_type == "audio":
            # Audio only - extract as MP3
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
                return jsonify({
                    "status": "success",
                    "file_path": mp3_file,
                    "filename": f"galmee_audio_{file_id}.mp3",
                    "title": info.get('title', 'audio')
                })
                
        else:
            # Video download with audio
            if format_id:
                # Specific quality + best audio
                format_string = f'{format_id}+bestaudio/best'
            else:
                # Best quality with audio
                format_string = 'bestvideo+bestaudio/best'
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': output_template,
                'merge_output_format': 'mp4',
                'postprocessors': [{
                    'key': 'FFmpegVideoConvertor',
                    'preferedformat': 'mp4',
                }],
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
            
            # Find the merged mp4 file
            mp4_file = os.path.join(TEMP_DIR, f'{file_id}.mp4')
            if os.path.exists(mp4_file):
                # Verify file has audio
                if not check_audio(mp4_file):
                    # If no audio, try downloading again with different format
                    print("No audio detected, retrying...")
                    os.remove(mp4_file)
                    
                    # Fallback: use a format that definitely has audio
                    ydl_opts_fallback = {
                        'format': 'best[ext=mp4]',
                        'outtmpl': output_template,
                        'quiet': True,
                        'no_warnings': True,
                    }
                    
                    with yt_dlp.YoutubeDL(ydl_opts_fallback) as ydl:
                        info = ydl.extract_info(url, download=True)
                    
                    mp4_file = os.path.join(TEMP_DIR, f'{file_id}.mp4')
                
                if os.path.exists(mp4_file):
                    return jsonify({
                        "status": "success",
                        "file_path": mp4_file,
                        "filename": f"galmee_video_{file_id}.mp4",
                        "title": info.get('title', 'video'),
                        "has_audio": True
                    })
        
        return jsonify({"status": "error", "message": "Failed to create downloadable file"}), 500
            
    except Exception as e:
        print("Download ERROR:", str(e))
        
        # Fallback: try downloading with simpler format
        try:
            file_id = str(uuid.uuid4())[:8]
            output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
            
            ydl_opts = {
                'format': 'best',
                'outtmpl': output_template,
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
            
            # Look for any downloaded file
            for ext in ['mp4', 'webm', 'mkv']:
                test_file = os.path.join(TEMP_DIR, f'{file_id}.{ext}')
                if os.path.exists(test_file):
                    return jsonify({
                        "status": "success",
                        "file_path": test_file,
                        "filename": f"galmee_video_{file_id}.{ext}",
                        "title": info.get('title', 'video')
                    })
                    
        except Exception as fallback_error:
            print("Fallback ERROR:", str(fallback_error))
            
        return jsonify({"status": "error", "message": str(e)}), 500

# API - Serve downloaded file
@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    try:
        # Determine content type
        if file_path.endswith('.mp4'):
            mimetype = 'video/mp4'
        elif file_path.endswith('.mp3'):
            mimetype = 'audio/mpeg'
        elif file_path.endswith('.webm'):
            mimetype = 'video/webm'
        elif file_path.endswith('.mkv'):
            mimetype = 'video/x-matroska'
        else:
            mimetype = 'application/octet-stream'
        
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
            mimetype=mimetype,
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

# Helper functions
def check_audio(filepath):
    """Check if video file has audio stream"""
    try:
        import subprocess
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type', 
             '-of', 'default=noprint_wrappers=1:nokey=1', filepath],
            capture_output=True, text=True
        )
        return 'audio' in result.stdout
    except:
        return True  # Assume audio exists if we can't check

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