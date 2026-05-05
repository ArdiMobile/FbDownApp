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

        if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('instagram.com')) {
            preview.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:30px;">Only Facebook and Instagram links are supported</p>`;
            return;
        }

        preview.innerHTML = `
            <div style="text-align:center; padding:30px 20px;">
                <i class="fas fa-spinner fa-spin" style="font-size:32px;color:var(--primary);"></i>
                <p style="margin-top:10px;color:rgba(255,255,255,0.7);">Fetching video...</p>
            </div>`;

        try {
            const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.status !== "success") {
                preview.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:30px; background:#fff; border-radius:12px; margin-top:15px;">${data.message || 'Failed to load video'}</p>`;
                return;
            }

            let html = `
                <div style="background:#fff;border-radius:12px;padding:20px;margin-top:15px;text-align:center;">
                    ${data.thumbnail ? `<img src="${data.thumbnail}" style="max-width:100%;max-height:200px;border-radius:10px;margin-bottom:15px;" onerror="this.style.display='none'">` : ''}
                    <h3 style="color:var(--dark);margin-bottom:5px;">${data.title || 'Video'}</h3>
                    ${data.uploader ? `<p style="color:var(--text-secondary);font-size:13px;">By ${data.uploader}</p>` : ''}
                    ${data.duration ? `<p style="color:var(--text-secondary);font-size:12px;"><i class="fas fa-clock"></i> ${formatDuration(data.duration)}</p>` : ''}
                </div>
                <h4 style="color:#fff; margin:15px 0 8px 0;">📥 Available Downloads</h4>`;

            if (data.formats && data.formats.length > 0) {
                data.formats.forEach((f, index) => {
                    html += `
                        <button id="dl-btn-${index}" onclick="downloadMedia('${encodeURIComponent(url)}', '${f.format_id}', ${index})" 
                            style="width:100%; padding:14px; margin:6px 0; background:linear-gradient(135deg,var(--primary),var(--primary-dark)); border:none; border-radius:10px; color:white; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.2s;"
                            onmouseover="if(!this.disabled) { this.style.transform='scale(1.02)'; }"
                            onmouseout="if(!this.disabled) { this.style.transform='scale(1)'; }">
                            <i class="fas fa-download"></i> Download Video (${f.resolution || f.quality}p)
                        </button>`;
                });
            } else {
                html += `<p style="color:rgba(255,255,255,0.6); text-align:center; background:#fff; border-radius:12px; padding:20px;">No formats found. Try a different video.</p>`;
            }

            preview.innerHTML = html;

        } catch (err) {
            console.error(err);
            preview.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:40px; background:#fff; border-radius:12px; margin-top:15px;">Connection error. Please try again.</p>`;
        }
    });
});

function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function downloadMedia(url, formatId, btnIndex) {
    const btn = document.getElementById(`dl-btn-${btnIndex}`);
    if (!btn) return;
    
    // Save original state
    const originalHTML = btn.innerHTML;
    const originalBg = btn.style.background;
    
    // Set loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';

    try {
        const response = await fetch(`/api/download?url=${encodeURIComponent(url)}&format_id=${formatId}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.file_path) {
            const downloadUrl = `/api/serve-file?path=${encodeURIComponent(data.file_path)}`;
            
            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'galmee_video.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Success state
            btn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
            btn.style.background = 'var(--gold)';
            btn.style.color = 'var(--dark)';
            btn.style.opacity = '1';
            
            // Reset after 3 seconds
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = originalBg || '';
                btn.style.color = '';
                btn.disabled = false;
                btn.style.cursor = 'pointer';
            }, 3000);
            
        } else {
            throw new Error(data.message || 'Download failed');
        }
    } catch (err) {
        console.error('Download error:', err);
        
        // Error state
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed - Try Again';
        btn.style.background = '#e74c3c';
        btn.style.opacity = '1';
        
        // Show alert
        alert('Download failed. Please try again or choose a different quality.');
        
        // Reset after 3 seconds
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = originalBg || '';
            btn.style.color = '';
            btn.disabled = false;
            btn.style.cursor = 'pointer';
        }, 3000);
    }
}

// Auto-paste detection
document.getElementById('url').addEventListener('paste', () => {
    setTimeout(() => {
        const input = document.getElementById('url');
        if (input.value && (input.value.includes('facebook.com') || input.value.includes('fb.watch') || input.value.includes('instagram.com'))) {
            document.getElementById('form').dispatchEvent(new Event('submit'));
        }
    }, 500);
});