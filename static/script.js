const form = document.getElementById('form');
const preview = document.getElementById('preview');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('url').value.trim();
    
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        alert("Please enter a valid YouTube URL");
        return;
    }

    preview.innerHTML = `<p style="text-align:center; padding:40px;">⏳ Fetching video info...</p>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.status !== "success") {
            preview.innerHTML = `<p style="color:red; text-align:center;">${data.message}</p>`;
            return;
        }

        let html = `
            <h2 style="margin:15px 0;">${data.title}</h2>
            <img src="${data.thumbnail}" style="width:100%; border-radius:12px; margin-bottom:20px;">
            <h3>🎥 Video Downloads</h3>`;

        data.video_formats.forEach(f => {
            html += `<button onclick="window.open('/api/download?url=${encodeURIComponent(url)}&itag=${encodeURIComponent(f.url)}', '_blank')" 
                style="width:100%; padding:14px; margin:6px 0; background:#333; border:none; border-radius:8px; color:white;">
                ${f.quality} ${f.has_audio ? '🔊' : '🔇'}
            </button>`;
        });

        html += `<h3 style="margin-top:25px;">🎵 MP3 Audio</h3>`;

        data.audio_formats.forEach(f => {
            html += `<button onclick="window.open('/api/download?url=${encodeURIComponent(url)}&itag=${encodeURIComponent(f.url)}&audio=true', '_blank')" 
                style="width:100%; padding:14px; margin:6px 0; background:#ff0000; border:none; border-radius:8px; color:white;">
                ${f.quality} MP3
            </button>`;
        });

        preview.innerHTML = html;

    } catch (err) {
        preview.innerHTML = `<p style="color:red;">Connection error. Try again.</p>`;
    }
});