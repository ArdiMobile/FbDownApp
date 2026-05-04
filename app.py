from flask import Flask, render_template, request, jsonify, send_from_directory
import yt_dlp
import os
import uuid

app = Flask(__name__)
TEMP_FOLDER = 'temp'

if not os.path.exists(TEMP_FOLDER):
    os.makedirs(TEMP_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download')
def download_page():
    return render_template('download.html')

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"}), 400

    ydl_opts = {'quiet': True, 'noplaylist': True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            for f in info.get('formats', []):
                # Filter for formats that have both video and audio for simplicity
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    formats.append({
                        "format_id": f.get('format_id'),
                        "resolution": f.get('resolution') or f.get('format_note'),
                        "filesize": f.get('filesize') or 0,
                        "ext": f.get('ext')
                    })
            
            return jsonify({
                "status": "success",
                "title": info.get('title'),
                "uploader": info.get('uploader'),
                "duration": info.get('duration'),
                "formats": formats[:10] # Top 10 options
            })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/download')
def download_video():
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    
    unique_id = str(uuid.uuid4())[:8]
    output_filename = f"video_{unique_id}.mp4"
    output_path = os.path.join(TEMP_FOLDER, output_filename)

    ydl_opts = {
        'format': format_id if format_id else 'best',
        'outtmpl': output_path,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return jsonify({"status": "success", "file_path": output_path})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/serve-file')
def serve_file():
    path = request.args.get('path')
    # Safety check: only allow files from the temp directory
    return send_from_directory(TEMP_FOLDER, os.path.basename(path), as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
