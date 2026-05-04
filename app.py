from flask import Flask, request, jsonify, render_template, Response
import yt_dlp
import os

app = Flask(__name__)

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
            
            # Get available formats
            formats = []
            for f in info.get('formats', []):
                if f.get('ext') == 'mp4' and f.get('filesize'):
                    formats.append({
                        'format_id': f.get('format_id'),
                        'quality': f.get('height', 'audio'),
                        'filesize': f.get('filesize'),
                        'ext': f.get('ext'),
                        'resolution': f"{f.get('width', '')}x{f.get('height', '')}"
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

# DOWNLOAD ENDPOINT
@app.route("/api/download")
def download_video():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400
    
    try:
        ydl_opts = {
            'format': f'{format_id}+bestaudio/best' if format_id else 'best',
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get direct download URL
            if format_id:
                for f in info['formats']:
                    if f['format_id'] == format_id:
                        return jsonify({
                            "status": "success",
                            "download_url": f['url'],
                            "title": info.get('title'),
                            "ext": f['ext'],
                            "filesize": f.get('filesize', 0),
                            "quality": f.get('height', 'Unknown')
                        })
            
            # Default to best quality
            return jsonify({
                "status": "success",
                "download_url": info['url'],
                "title": info.get('title'),
                "ext": info.get('ext', 'mp4')
            })
            
    except Exception as e:
        print("Download ERROR:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

# RUN
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))