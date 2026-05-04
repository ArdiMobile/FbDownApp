const express = require('express');
const ytDl = require('yt-dlp-exec');
const path = require('path');
const app = express();

app.use(express.static('public')); // Put your HTML/JS in a 'public' folder

// THIS FIXES THE "PLEASE CHECK URL" ERROR
app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;
    try {
        const output = await ytDl(videoUrl, {
            dumpSingleJson: true,
            noCheckCertificates: true,
        });

        // Sending back the success status your frontend expects
        res.json({
            status: "success",
            title: output.title,
            uploader: output.uploader,
            duration: output.duration,
            formats: output.formats
                .filter(f => f.vcodec !== 'none' && f.acodec !== 'none') // Only formats with both
                .map(f => ({
                    format_id: f.format_id,
                    resolution: f.resolution || f.format_note,
                    filesize: f.filesize || 0,
                    fps: f.fps || 0
                }))
        });
    } catch (error) {
        res.json({ status: "error", message: error.message });
    }
});

// The download endpoint you asked about
app.get('/api/download', async (req, res) => {
    // 1. Download logic here...
    // 2. Return the success JSON
    res.json({
        "status": "success",
        "file_path": "temp/video_123.mp4" 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
