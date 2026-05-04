import os
import uuid
import yt_dlp
from flask import Flask, render_template, request, jsonify, send_from_directory

# Explicitly tell Flask where to find your files
app = Flask(__name__, 
            template_folder='templates', 
            static_folder='static')

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

    # Options for yt-dlp to get video data
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'format': 'best',
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Format list for the dropdown
            formats = []
            raw_formats = info.get('formats', [])
            for f in raw_formats:
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    formats.append({
                        "format_id": f.get('format_id'),
                        "resolution": f.get('resolution') or f.get('format_note', 'Unknown'),
                        "filesize": f.get('filesize') or 0,
                        "ext": f.get('ext')
                    })

            return jsonify({
                "status": "success",
                "title": info.get('title', 'Unknown Title'),
                "uploader": info.get('uploader', 'Unknown Artist'),
                "duration": info.get('duration', 0),
                "formats": formats[:8] # Send top 8 quality options
            })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/download')
def start_download():
    url = request.args.get('url')
    fid = request.args.get('format_id', 'best')
    
    unique_id = str(uuid.uuid4())[:8]
    filename = f"video_{unique_id}.mp4"
    filepath = os.path.join(TEMP_FOLDER, filename)

    ydl_opts = {
        'format': fid,
        'outtmpl': filepath,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return jsonify({"status": "success", "file_path": filepath})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/api/serve-file')
def serve_file():
    filepath = request.args.get('path')
    return send_from_directory(TEMP_FOLDER, os.path.basename(filepath), as_attachment=True)

if __name__ == '__main__':
    # Railway provides the PORT environment variable automatically
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
