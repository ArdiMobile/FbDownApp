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

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'best'
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Extract metadata
            formats = []
            for f in info.get('formats', []):
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    res = f.get('height')
                    if res:
                        formats.append({
                            'quality': f"{res}p",
                            'url': f.get('url'),
                            'ext': f.get('ext')
                        })

            return jsonify({
                'title': info.get('title', 'Social Video'),
                'uploader': info.get('uploader', 'Unknown Creator'),
                'views': f"{info.get('view_count', 0):,}",
                'thumbnail': info.get('thumbnail'),
                'formats': formats[::-1][:4] # Top 4 unique qualities
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
