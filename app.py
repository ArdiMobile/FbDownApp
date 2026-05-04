from flask import Flask, request, jsonify, send_file, render_template
import yt_dlp
import traceback
import os
import tempfile

app = Flask(__name__, template_folder='templates', static_folder='static')

TEMP_DIR = tempfile.gettempdir()

def is_youtube_url(url):
    return any(x in url.lower() for x in ['youtube.com', 'youtu.be'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download.html')
def download_page():
    return render_template('download.html')

@app.route('/api/info', methods=['GET'])
def get_info():
    url = request.args.get('url', '').strip()
    
    if not url or not is_youtube_url(url):
        return jsonify({"status": "error", "message": "Please provide a valid YouTube URL"})

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'noplaylist': True,
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

                if vcodec != "none" and height >= 144:
                    video_formats.append({
                        "quality": f"{height}p",
                        "url": f["url"],
                        "has_audio": acodec != "none"
                    })

                if vcodec == "none" and acodec != "none":
                    abr = int(f.get("abr") or 128)
                    audio_formats.append({
                        "quality": f"{abr}kbps",
                        "url": f["url"]
                    })

            video_formats = sorted(video_formats, key=lambda x: int(x["quality"][:-1]), reverse=True)
            audio_formats = sorted(audio_formats, key=lambda x: int(x["quality"][:-4]), reverse=True)

            return jsonify({
                "status": "success",
                "title": info.get("title", "YouTube Video"),
                "thumbnail": info.get("thumbnail", ""),
                "duration": info.get("duration", 0),
                "uploader": info.get("uploader", ""),
                "video_formats": video_formats[:8],
                "audio_formats": audio_formats[:6]
            })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": "Failed to fetch video. Please try again with another link."
        })

@app.route('/api/download', methods=['GET'])
def download():
    url = request.args.get('url')
    format_url = request.args.get('format_url')
    is_audio = request.args.get('audio', 'false').lower() == 'true'

    if not url or not format_url:
        return jsonify({"status": "error", "message": "Missing parameters"})

    try:
        ydl_opts = {
            'quiet': True,
            'noplaylist': True,
            'outtmpl': os.path.join(TEMP_DIR, '%(title)s.%(ext)s'),
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
                filename = os.path.splitext(filename)[0] + '.mp3'

        return send_file(filename, as_attachment=True, download_name=os.path.basename(filename))

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": "Download failed. Please try again."})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)