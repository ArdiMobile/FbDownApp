from flask import Flask, request, jsonify, render_template, send_file
import requests
import re
import os
from pytube import YouTube
from io import BytesIO

app = Flask(__name__)

def download_facebook_video(url):
    # Facebook video downloader implementation (simple)
    try:
        # Get video page content
        r = requests.get(url)
        hd_url = None
        sd_url = None
        
        # Extract HD video URL
        hd_match = re.search(r'hd_src:"([^"]+)"', r.text)
        sd_match = re.search(r'sd_src:"([^"]+)"', r.text)
        
        if hd_match:
            hd_url = hd_match.group(1).replace("\\/", "/")
        if sd_match:
            sd_url = sd_match.group(1).replace("\\/", "/")
        
        return hd_url or sd_url
    except Exception:
        return None

def download_instagram_video(url):
    # Instagram video downloader implementation (simple)
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers)
        video_url = None
        # Instagram video URL pattern (simplified)
        match = re.search(r'\"video_url\":\"([^"]+)\"', r.text)
        if match:
            video_url = match.group(1).replace("\\u0026", "&")
        return video_url
    except Exception:
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    
    video_url = None
    if 'facebook.com' in url:
        video_url = download_facebook_video(url)
    elif 'instagram.com' in url:
        video_url = download_instagram_video(url)
    else:
        return jsonify({'error': 'URL must be a Facebook or Instagram video link'}), 400
    
    if not video_url:
        return jsonify({'error': 'Could not extract video URL'}), 400
    
    return jsonify({'video_url': video_url})

if __name__ == '__main__':
    app.run(debug=True)