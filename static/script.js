document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const preview = document.getElementById('preview');
    const urlInput = document.getElementById('url');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();

        if (!url) {
            preview.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:30px;">Please paste a Facebook or Instagram link</p>`;
            return;
        }

        preview.innerHTML = `
            <div style="text-align:center; padding:30px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--primary);"></i>
                <p style="margin-top:10px;color:rgba(255,255,255,0.7);">Fetching media details...</p>
            </div>`;

        try {
            const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.status !== "success") {
                preview.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:30px;">${data.message || 'Failed to load video'}</p>`;
                return;
            }

            let html = `
                <div style="background:#fff;border-radius:12px;padding:20px;margin-top:15px;text-align:center;">
                    ${data.thumbnail ? `<img src="${data.thumbnail}" style="max-width:100%;max-height:200px;border-radius:10px;margin-bottom:15px;">` : ''}
                    <h3 style="color:var(--dark);margin-bottom:5px;">${data.title || 'Video'}</h3>
                    ${data.uploader ? `<p style="color:var(--text-secondary);font-size:13px;">By ${data.uploader}</p>` : ''}
                    ${data.duration ? `<p style="color:var(--text-secondary);font-size:12px;"><i class="fas fa-clock"></i> ${formatDuration(data.duration)}</p>` : ''}
                </div>
                <h4 style="color:#fff; margin:15px 0 8px 0;">📥 Available Downloads</h4>`;

            if (data.formats && data.formats.length > 0) {
                data.formats.forEach(f => {
                    html += `
                        <button onclick="downloadMedia('${encodeURIComponent(url)}', '${f.format_id}')" 
                            style="width:100%; padding:14px; margin:6px 0; background:linear-gradient(135deg,var(--primary),var(--primary-dark)); border:none; border-radius:10px; color:white; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.2s;"
                            onmouseover="this.style.transform='scale(1.02)'"
                            onmouseout="this.style.transform='scale(1)'">
                            <i class="fas fa-download"></i> Download Video (${f.resolution || f.quality}p)
                        </button>`;
                });
            } else {
                html += `<p style="color:rgba(255,255,255,0.6); text-align:center;">No formats available. Try a different video.</p>`;
            }

            preview.innerHTML = html;

        } catch (err) {
            preview.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:40px;">Connection error. Please try again.</p>`;
        }
    });
});

function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function downloadMedia(url, formatId) {
    window.location.href = `/api/download?url=${encodeURIComponent(url)}&format_id=${formatId}`;
}

// Auto-detect paste
document.getElementById('url').addEventListener('paste', () => {
    setTimeout(() => {
        const input = document.getElementById('url');
        if (input.value) {
            document.getElementById('form').dispatchEvent(new Event('submit'));
        }
    }, 300);
});