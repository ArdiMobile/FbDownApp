from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import yt_dlp
import uvicorn

app = FastAPI(title="Facebook Video Downloader API")

class VideoRequest(BaseModel):
    url: str

def get_video_info(url):
    ydl_opts = {
        'format': 'best',
        'quiet': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return info
        except Exception as e:
            raise Exception(f"Failed to extract video: {str(e)}")

@app.post("/info")
async def get_info(request: VideoRequest = Body(...)):
    """
    Takes a Facebook video URL and returns downloadable formats.
    """
    try:
        info = get_video_info(request.url)
        
        # Extract direct links for different qualities
        formats = info.get('formats', [])
        video_links = []
        for f in formats:
            if f.get('vcodec') != 'none' and f.get('acodec') != 'none': # Only streams with audio
                video_links.append({
                    "quality": f.get('format_note'),
                    "url": f.get('url'),
                    "extension": f.get('ext')
                })

        return {
            "title": info.get('title'),
            "thumbnail": info.get('thumbnail'),
            "duration": info.get('duration'),
            "download_options": video_links
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)