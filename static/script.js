const form = document.getElementById('downloadForm');
const result = document.getElementById('result');
const urlInput = document.getElementById('videoUrl');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) {
        result.innerHTML = '<div class="error-state">Please paste a Facebook video URL</div>';
        return;
    }

    if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.com')) {
        result.innerHTML = '<div class="error-state">Please enter a valid Facebook video URL</div>';
        return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    result.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Fetching video...</p>
        </div>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.status !== "success") {
            result.innerHTML = `<div class="error-state">${data.message || 'Failed to load video'}</div>`;
            return;
        }

        let html = `
            <div class="video-card">
                ${data.thumbnail ? `<img src="${data.thumbnail}" alt="${data.title}" class="video-thumb" onerror="this.style.display='none'">` : ''}
                <div class="video-info">
                    <h2 class="video-title">${data.title || 'Facebook Video'}</h2>
                    ${data.uploader ? `<p class="video-uploader"><i class="fas fa-user"></i> ${data.uploader}</p>` : ''}
                    ${data.duration ? `<p class="video-duration"><i class="fas fa-clock"></i> ${formatDuration(data.duration)}</p>` : ''}
                </div>`;

        if (data.formats && data.formats.length > 0) {
            html += `
                <div class="download-section">
                    <p class="download-heading">
                        <i class="fas fa-download"></i> Available Downloads
                    </p>
                    <div class="download-buttons">`;
            
            data.formats.forEach((f, i) => {
                html += `
                    <button class="download-option" id="btn-${i}" onclick="downloadVideo('${encodeURIComponent(url)}', '${f.format_id}', ${i})">
                        <span><i class="fas fa-video"></i> Download Video</span>
                        <span class="quality">${f.resolution || f.quality + 'p'}</span>
                    </button>`;
            });
            
            html += `
                    </div>
                </div>`;
        } else {
            html += `
                <div class="no-formats" style="margin:18px;">
                    <i class="fas fa-info-circle"></i> No download formats available
                </div>`;
        }

        html += `</div>`;
        result.innerHTML = html;

    } catch (err) {
        console.error(err);
        result.innerHTML = '<div class="error-state">Connection error. Please try again.</div>';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
});

// Auto-paste from clipboard
urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if ((text.includes('facebook.com') || text.includes('fb.watch')) && !urlInput.value) {
            urlInput.value = text;
            form.dispatchEvent(new Event('submit'));
        }
    } catch (e) {}
});

urlInput.addEventListener('paste', () => {
    setTimeout(() => {
        if (urlInput.value.includes('facebook.com') || urlInput.value.includes('fb.watch')) {
            form.dispatchEvent(new Event('submit'));
        }
    }, 300);
});

function formatDuration(seconds) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function downloadVideo(url, formatId, btnIndex) {
    const btn = document.getElementById(`btn-${btnIndex}`);
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i> Downloading...</span><span class="quality">Please wait</span>';
    
    try {
        const response = await fetch(`/api/download?url=${encodeURIComponent(url)}&format_id=${formatId}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.file_path) {
            const downloadUrl = `/api/serve-file?path=${encodeURIComponent(data.file_path)}`;
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'galmee_video.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            btn.innerHTML = '<span><i class="fas fa-check"></i> Downloaded!</span><span class="quality">✓</span>';
            btn.style.background = 'linear-gradient(135deg, var(--gold), var(--gold-dark))';
            btn.style.color = 'var(--dark)';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
                btn.style.color = '';
                btn.disabled = false;
            }, 3000);
        } else {
            throw new Error(data.message || 'Download failed');
        }
    } catch (err) {
        console.error(err);
        btn.innerHTML = '<span><i class="fas fa-exclamation-circle"></i> Failed</span><span class="quality">Try again</span>';
        btn.style.background = '#e74c3c';
        
        alert('Download failed: ' + (err.message || 'Please try a different quality'));
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.color = '';
            btn.disabled = false;
        }, 3000);
    }
}