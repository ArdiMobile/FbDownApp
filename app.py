from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os
import tempfile
import uuid

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
        return jsonify({"status": "error", "message": "No URL provided"}), 400
        
    print(f"Fetching info for: {url}")
    
    try:
        # Different options for different platforms
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
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
            
            print(f"Success: {info.get('title')}")
            
            return jsonify({
                "status": "success",
                "title": info.get("title", "Unknown Title"),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", info.get("channel", "Unknown")),
                "duration": info.get("duration", 0),
                "formats": formats[:10],
                "video_id": info.get("id", "")
            })
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "status": "error", 
            "message": "Failed to fetch video info. Please check the URL."
        }), 500