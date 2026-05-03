from flask import Flask, request, jsonify
import yt_dlp

app = Flask(__name__)

@app.route("/api/info")
def get_video():
    url = request.args.get("url")

    if not url:
        return jsonify({"status": "error", "message": "No URL provided"})

    try:
        ydl_opts = {
            'quiet': True,
            'noplaylist': True,
            'format': 'bestvideo+bestaudio/best',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            formats = []
            for f in info.get("formats", []):
                if f.get("url") and f.get("height"):
                    formats.append({
                        "quality": f"{f.get('height')}p",
                        "url": f["url"]
                    })

            formats = sorted(formats, key=lambda x: int(x["quality"].replace("p","")), reverse=True)[:6]

            return jsonify({
                "status": "success",
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "uploader": info.get("uploader"),
                "formats": formats
            })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({
            "status": "error",
            "message": "Failed to fetch video"
        })

# IMPORTANT: Railway runs on PORT env
if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
