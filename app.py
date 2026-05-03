from flask import Flask, request, jsonify, render_template
import yt_dlp
import os

app = Flask(__name__)

# ================= ROUTES =================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/download")
def download_page():
    return render_template("download.html")

# ================= API =================

@app.route("/api/info")
def get_video():
    url = request.args.get("url")

    if not url:
        return jsonify({"status": "error", "message": "No URL provided"})

    try:
        ydl_opts = {
            'quiet': True,
            'noplaylist': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader"),
                "url": url
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"status": "error", "message": "Failed to fetch"})


# 🔍 SEARCH API
@app.route("/api/search")
def search():
    query = request.args.get("q")

    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            results = ydl.extract_info(f"ytsearch5:{query}", download=False)

            videos = []
            for v in results['entries']:
                videos.append({
                    "title": v["title"],
                    "url": v["webpage_url"],
                    "thumbnail": v["thumbnail"]
                })

            return jsonify({"status": "success", "results": videos})

    except:
        return jsonify({"status": "error"})


# ================= RUN =================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))