import os
from flask import Flask

app = Flask(__name__)

# Railway sometimes needs this
PORT = int(os.environ.get("PORT", 5000))

# ... rest of your code

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)

from flask import Flask, request, jsonify, send_file
import yt_dlp
import json
import traceback
import os
from urllib.parse import urlparse

app = Flask(__name__)

# Create downloads folder if not exists
os.makedirs("downloads", exist_ok=True)

def is_youtube_url(url):
    return 'youtube.com' in url or 'youtu.be' in url

@app.route('/')
def index():
    return open('index.html', 'r', encoding='utf-8').read()

@app.route('/download.html')
def download_page():
    return open('download.html', 'r', encoding='utf-8').read()

@app.route('/api/info', methods=['GET'])
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({"status": "error", "message": "No URL provided"})

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/bestaudio/best',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            video_formats = []
            audio_formats = []

            for f in info.get("formats", []):
                if not f.get("url"):
                    continue
                height = f.get("height") or 0
                vcodec = f.get("vcodec", "none")
                acodec = f.get("acodec", "none")

                # Video
                if vcodec != "none" and height >= 144:
                    video_formats.append({
                        "quality": f"{height}p",
                        "url": f["url"],
                        "has_audio": acodec != "none"
                    })

                # Audio only
                if vcodec == "none" and acodec != "none":
                    abr = int(f.get("abr") or 128)
                    audio_formats.append({
                        "quality": f"{abr}kbps",
                        "url": f["url"],
                        "ext": f.get("ext", "m4a")
                    })

            # Sort
            video_formats = sorted(video_formats, key=lambda x: int(x["quality"][:-1]), reverse=True)
            audio_formats = sorted(audio_formats, key=lambda x: int(x["quality"][:-4]), reverse=True)

            response = {
                "status": "success",
                "title": info.get("title", "YouTube Video"),
                "thumbnail": info.get("thumbnail", ""),
                "duration": info.get("duration", 0),
                "uploader": info.get("uploader", ""),
                "video_formats": video_formats[:8],
                "audio_formats": audio_formats[:6]
            }
            return jsonify(response)

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": "Failed to fetch video. Try again or use another link."
        })

@app.route('/api/download', methods=['GET'])
def download():
    url = request.args.get('url')
    itag = request.args.get('itag')  # format url
    is_audio = request.args.get('audio', 'false').lower() == 'true'

    if not url or not itag:
        return jsonify({"status": "error", "message": "Missing parameters"})

    try:
        ydl_opts = {
            'quiet': True,
            'outtmpl': 'downloads/%(title)s.%(ext)s',
            'noplaylist': True,
        }

        if is_audio:
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            })

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            if is_audio:
                filename = filename.rsplit('.', 1)[0] + '.mp3'

        return send_file(filename, as_attachment=True)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)