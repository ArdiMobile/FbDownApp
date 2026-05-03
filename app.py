from flask import Flask, request, jsonify, render_template
import yt_dlp
import os
import tempfile
import uuid

app = Flask(__name__)

# Create temp directory for merged files
TEMP_DIR = tempfile.gettempdir()

# HOME
@app.route("/")
def home():
    return render_template("index.html")

# DOWNLOAD PAGE
@app.route("/download")
def download_page():
    return render_template("download.html")

# API
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
            
            # Get available formats with proper audio
            formats = []
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('filesize'):
                    formats.append({
                        'format_id': f.get('format_id'),
                        'quality': f.get('height', 'unknown'),
                        'filesize': f.get('filesize'),
                        'ext': f.get('ext'),
                        'resolution': f"{f.get('width', '')}x{f.get('height', '')}",
                        'has_audio': f.get('acodec') != 'none',
                        'fps': f.get('fps', 0)
                    })

            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader"),
                "duration": info.get("duration"),
                "formats": formats,
                "video_id": info.get("id")
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"status": "error", "message": str(e)})

# DOWNLOAD ENPOINT - PROPER AUDIO MERGING
@app.route("/api/download")
def download_video():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        # Create unique filename for this download
        output_filename = str(uuid.uuid4())
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        if format_id == "bestaudio":
            # Audio only download
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': f'{output_path}.%(ext)s',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'quiet': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            # Find the mp3 file
            mp3_file = f"{output_path}.mp3"
            if os.path.exists(mp3_file):
                return jsonify({
                    "status": "success",
                    "file_path": mp3_file,
                    "filename": f"audio.mp3"
                })
                
        else:
            # Video with audio - download and merge
            if format_id:
                # Download specific format + best audio
                ydl_opts = {
                    'format': f'{format_id}+bestaudio/best',
                    'outtmpl': f'{output_path}.%(ext)s',
                    'merge_output_format': 'mp4',
                    'quiet': True,
                }
            else:
                # Best video + best audio
                ydl_opts = {
                    'format': 'bestvideo+bestaudio/best',
                    'outtmpl': f'{output_path}.%(ext)s',
                    'merge_output_format': 'mp4',
                    'quiet': True,
                }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            # Find the merged mp4 file
            mp4_file = f"{output_path}.mp4"
            if os.path.exists(mp4_file):
                return jsonify({
                    "status": "success",
                    "file_path": mp4_file,
                    "filename": "video.mp4"
                })
        
        return jsonify({"status": "error", "message": "Download failed"}), 500
            
    except Exception as e:
        print("Download ERROR:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

# SERVE DOWNLOADED FILE
@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    try:
        # Determine content type
        if file_path.endswith('.mp4'):
            mimetype = 'video/mp4'
        elif file_path.endswith('.mp3'):
            mimetype = 'audio/mpeg'
        else:
            mimetype = 'application/octet-stream'
        
        # Read and serve the file
        with open(file_path, 'rb') as f:
            data = f.read()
        
        # Clean up the temporary file after serving
        try:
            os.remove(file_path)
        except:
            pass
        
        response = app.response_class(
            data,
            mimetype=mimetype,
            headers={
                'Content-Disposition': f'attachment; filename=galmee_{os.path.basename(file_path)}',
                'Content-Length': str(len(data))
            }
        )
        return response
        
    except Exception as e:
        print("Serve ERROR:", str(e))
        return "Error serving file", 500

# CLEANUP ENDPOINT (optional)
@app.route("/api/cleanup")
def cleanup():
    """Clean up old temp files"""
    import time
    current_time = time.time()
    for filename in os.listdir(TEMP_DIR):
        filepath = os.path.join(TEMP_DIR, filename)
        try:
            # Remove files older than 1 hour
            if os.path.getmtime(filepath) < current_time - 3600:
                os.remove(filepath)
        except:
            pass
    return jsonify({"status": "success", "message": "Cleanup completed"})

# RUN
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))