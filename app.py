from flask import Flask, request, jsonify, render_template
import yt_dlp
import os

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/youtube")
def youtube():
    return render_template("YouTube.html")

@app.route("/download")
def download_page():
    return render_template("download.html")


# ================= API =================

@app.route("/api/info")
def get_video():
    url = request.args.get("url")

    if not url:
        return jsonify({"status": "error", "message": "No URL"})

    try:
        ydl_opts = {'quiet': True, 'noplaylist': True}

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader"),
                "video_url": url
            })

    except Exception as e:
        print(e)
        return jsonify({"status": "error", "message": "Failed"})


# 🔍 SEARCH API
@app.route("/api/search")
def search():
    query = request.args.get("q")

    try:
        ydl = yt_dlp.YoutubeDL({'quiet': True})
        results = ydl.extract_info(f"ytsearch5:{query}", download=False)

        videos = []
        for e in results['entries']:
            videos.append({
                "title": e["title"],
                "url": e["webpage_url"],
                "thumbnail": e["thumbnail"]
            })

        return jsonify({"status": "success", "results": videos})

    except:
        return jsonify({"status": "error"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))