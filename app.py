import os
import yt_dlp
from flask import Flask, request, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    # These options are critical for Railway to bypass bot detection
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'format': 'best',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # extract_info will now work more reliably
            info = ydl.extract_info(url, download=False)
            
            # Formats extraction logic
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    # Filter for formats that have both video and audio
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        res = f.get('height')
                        if res:
                            formats.append({
                                'quality': f"{res}p",
                                'url': f.get('url'),
                                'ext': f.get('ext')
                            })
            
            # If no multi-formats found, just take the best single URL
            if not formats:
                formats.append({
                    'quality': 'HD',
                    'url': info.get('url'),
                    'ext': 'mp4'
                })

            return jsonify({
                'title': info.get('title', 'Social Video'),
                'uploader': info.get('uploader', 'User'),
                'views': info.get('view_count', 'Unknown'),
                'thumbnail': info.get('thumbnail'),
                'formats': formats[::-1] # Highest quality first
            })
            
    except Exception as e:
        print(f"Error: {str(e)}") # This will show in your Railway logs
        return jsonify({'error': "Video is private or link is invalid"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
