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
        return jsonify({"status": "error", "message": "No URL"})
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "uploader": info.get("uploader"),
                "formats": []
            })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/api/download")
def download_video():
    url = request.args.get("url")
    format_id = request.args.get("format_id", "")
    download_type = request.args.get("type", "video")
    
    try:
        file_id = str(uuid.uuid4())[:8]
        output_template = os.path.join(TEMP_DIR, f'{file_id}.%(ext)s')
        
        if download_type == "audio":
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
                'quiet': True,
            }
        else:
            format_string = f'{format_id}+bestaudio/best' if format_id else 'bestvideo+bestaudio/best'
            ydl_opts = {
                'format': format_string,
                'outtmpl': output_template,
                'merge_output_format': 'mp4',
                'quiet': True,
            }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(url, download=True)
        
        ext = 'mp3' if download_type == 'audio' else 'mp4'
        downloaded_file = os.path.join(TEMP_DIR, f'{file_id}.{ext}')
        
        if os.path.exists(downloaded_file):
            return jsonify({"status": "success", "file_path": downloaded_file})
        raise Exception("File not created")
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/api/serve-file")
def serve_file():
    file_path = request.args.get("path")
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    def generate():
        with open(file_path, 'rb') as f:
            yield from f
        os.remove(file_path)
    
    return Response(generate(), mimetype='video/mp4' if file_path.endswith('.mp4') else 'audio/mpeg')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))