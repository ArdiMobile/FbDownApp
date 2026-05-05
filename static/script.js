document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const preview = document.getElementById('preview');
    const urlInput = document.getElementById('url');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();

        if (!url) return alert("Please paste a YouTube link");

        preview.innerHTML = `
            <div style="text-align:center; padding:50px 20px;">
                <div class="spinner"></div>
                <p>Fetching video information...</p>
            </div>`;

        try {
            const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.status !== "success") {
                preview.innerHTML = `<p style="color:#ff4444; text-align:center; padding:30px;">${data.message}</p>`;
                return;
            }

            let html = `
                <div style="text-align:center; margin-bottom:20px;">
                    <img src="${data.thumbnail}" style="max-width:100%; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                    <h2 style="margin:15px 0 8px 0; color:white;">${data.title}</h2>
                    ${data.uploader ? `<p style="color:#aaa;">${data.uploader}</p>` : ''}
                </div>

                <h3 style="color:#ff0000; margin:20px 0 10px 0;">🎥 Video Downloads</h3>`;

            // Video Formats
            data.video_formats.forEach(f => {
                html += `
                    <button onclick="downloadFile('${url}', '${f.url}', false)" 
                        style="width:100%; padding:16px; margin:8px 0; background:#333; border:none; border-radius:10px; color:white; font-size:16px; font-weight:600;">
                        ${f.quality} ${f.has_audio ? '🔊 With Audio' : '🔇 No Audio'}
                    </button>`;
            });

            // MP3 Audio Section
            html += `<h3 style="color:#00cc00; margin:30px 0 10px 0;">🎵 MP3 Audio Downloads</h3>`;

            data.audio_formats.forEach(f => {
                html += `
                    <button onclick="downloadFile('${url}', '${f.url}', true)" 
                        style="width:100%; padding:16px; margin:8px 0; background:linear-gradient(135deg,#00cc00,#009900); border:none; border-radius:10px; color:white; font-size:17px; font-weight:700;">
                        ${f.quality} MP3 <i class="fas fa-download"></i>
                    </button>`;
            });

            preview.innerHTML = html;

        } catch (err) {
            preview.innerHTML = `<p style="color:#ff4444; text-align:center; padding:40px;">Connection error. Please try again.</p>`;
        }
    });
});

function downloadFile(url, formatUrl, isAudio) {
    let downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format_url=${encodeURIComponent(formatUrl)}`;
    if (isAudio) downloadUrl += '&audio=true';
    
    window.location.href = downloadUrl;
}

// Optional: Auto-paste from clipboard
document.getElementById('url').addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text.includes('youtube') && !document.getElementById('url').value) {
            document.getElementById('url').value = text;
        }
    } catch (e) {}
});