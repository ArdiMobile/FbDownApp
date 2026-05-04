document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const preview = document.getElementById('preview');
    const urlInput = document.getElementById('url');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();

        // 1. Updated validation for Social Media
        if (!url) return alert("Please paste a Facebook or Instagram link");

        preview.innerHTML = `
            <div style="text-align:center; padding:50px 20px;">
                <div class="spinner"></div>
                <p>Fetching media details...</p>
            </div>`;

        try {
            const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.status !== "success") {
                preview.innerHTML = `<p style="color:#ff4444; text-align:center; padding:30px;">${data.message}</p>`;
                return;
            }

            // 2. Updated UI to reflect Social Media content
            let html = `
                <div style="text-align:center; margin-bottom:20px;">
                    <img src="${data.thumbnail}" style="max-width:100%; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                    <h2 style="margin:15px 0 8px 0; color:white;">${data.title}</h2>
                    ${data.uploader ? `<p style="color:#aaa;">By ${data.uploader}</p>` : ''}
                </div>

                <h3 style="color:#4267B2; margin:20px 0 10px 0;">📥 Available Downloads</h3>`;

            // Display combined Video Formats
            if (data.video_formats && data.video_formats.length > 0) {
                data.video_formats.forEach(f => {
                    html += `
                        <button onclick="downloadFile('${url}', '${f.url}', false)" 
                            style="width:100%; padding:16px; margin:8px 0; background:linear-gradient(135deg,#405DE6,#5851DB); border:none; border-radius:10px; color:white; font-size:16px; font-weight:600; cursor:pointer;">
                            Download Video (${f.quality})
                        </button>`;
                });
            } else {
                html += `<p style="color:#ccc; text-align:center;">No direct download links found. The video might be private.</p>`;
            }

            preview.innerHTML = html;

        } catch (err) {
            preview.innerHTML = `<p style="color:#ff4444; text-align:center; padding:40px;">Connection error. Please check your internet.</p>`;
        }
    });
});

function downloadFile(url, formatUrl, isAudio) {
    // Triggers the backend download route we defined earlier
    let downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format_url=${encodeURIComponent(formatUrl)}`;
    if (isAudio) downloadUrl += '&audio=true';
    
    window.location.href = downloadUrl;
}

// 3. Updated Auto-paste for FB and Instagram
document.getElementById('url').addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        const isSocial = ['facebook', 'fb.watch', 'instagram', 'reels'].some(el => text.toLowerCase().includes(el));
        
        if (isSocial && !document.getElementById('url').value) {
            document.getElementById('url').value = text;
        }
    } catch (e) {
        // Clipboard access might be denied by user
    }
});
