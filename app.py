from flask import Flask, request, jsonify, send_file, render_template
import yt_dlp
import traceback
import os
import tempfile

app = Flask(__name__, template_folder='templates', static_folder='static')

TEMP_DIR = tempfile.gettempdir()

def is_supported_url(url):
    """Checks if the URL is from Facebook or Instagram."""
    url = url.lower()
    return any(x in url for x in ['facebook.com', 'fb.watch', 'instagram.com', 'reels'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/info', methods=['GET'])
def get_info():
    url = request.args.get('url', '').strip()
    if not url or not is_supported_url(url):
        return jsonify({"status": "error", "message": "Please provide a valid Facebook or Instagram URL"})

    try:
        # Optimized options for FB/IG
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'noplaylist': True,
            'ignoreerrors': False,
            # User agent helps prevent some blocks from Meta platforms
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            video_formats = []
            
            # FB/IG usually provide direct mp4 links
            for f in info.get("formats", []):
                # We want formats that have video and are not just metadata
                if f.get('vcodec') != 'none' and f.get('url'):
                    quality = f.get('format_note') or f.get('resolution') or "HD"
                    video_formats.append({
                        "quality": quality,
                        "url": f["url"],
                        "ext": f.get("ext", "mp4")
                    })

            # Return the best available formats
            return jsonify({
                "status": "success",
                "title": info.get("title", "Social Media Video")[:50],
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", "User"),
                "video_formats": video_formats[-5:] # Return last 5 (usually highest quality)
            })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({
            "status": "error", 
            "message": "Could not fetch video. Meta platforms often block automated requests."
        })

@app.route('/api/download', methods=['GET'])
def download():
    # Note: For FB/IG, many URLs are temporary. 
    # It is often better to let the frontend open the format_url directly.
    url = request.args.get('url')
    if not url:
        return jsonify({"status": "error", "message": "Missing URL"})

    try:
        file_path = os.path.join(TEMP_DIR, 'downloaded_video.mp4')
        ydl_opts = {
            'outtmpl': file_path,
            'format': 'best', # Simplest for FB/IG to get video+audio combined
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        return send_file(file_path, as_attachment=True)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
