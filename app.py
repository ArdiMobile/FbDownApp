from flask import Flask, request, jsonify, render_template
import yt_dlp
import os

app = Flask(__name__)

# HOME
@app.route("/")
def home():
    return render_template("index.html")

# DOWNLOAD PAGE
@app.route("/download")
def download():
    return render_template("download.html")

# API
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
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader")
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"status": "error", "message": "Failed"})

# RUN
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))