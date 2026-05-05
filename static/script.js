document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const preview = document.getElementById('preview');
    const urlInput = document.getElementById('url');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();

        if (!url) return showMessage("Please paste a video link from YouTube, Facebook, or Instagram", "error");

        preview.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <div style="width:50px;height:50px;border:3px solid var(--primary-light);border-top:3px solid var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 15px;"></div>
                <p style="color:var(--text-secondary);font-weight:500;">Fetching video details...</p>
            </div>`;

        try {
            const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.status !== "success") {
                preview.innerHTML = showErrorHTML(data.message || "Failed to fetch video. Please check the URL.");
                return;
            }

            renderVideoPreview(data, url);

        } catch (err) {
            preview.innerHTML = showErrorHTML("Connection error. Please check your internet and try again.");
        }
    });

    // Auto-paste from clipboard
    urlInput.addEventListener('focus', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.includes('youtube') || text.includes('youtu.be') || 
                text.includes('facebook') || text.includes('fb.watch') || 
                text.includes('instagram') || text.includes('reel')) && !urlInput.value) {
                urlInput.value = text;
            }
        } catch (e) {}
    });
});

function renderVideoPreview(data, url) {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isFacebook = url.includes('facebook.com') || url.includes('fb.watch');
    const isInstagram = url.includes('instagram.com');
    
    let platformName = 'Web';
    let platformIcon = 'fa-globe';
    let platformColor = '#009959';
    
    if (isYouTube) { platformName = 'YouTube'; platformIcon = 'fa-youtube'; platformColor = '#FF0000'; }
    if (isFacebook) { platformName = 'Facebook'; platformIcon = 'fa-facebook'; platformColor = '#1877f2'; }
    if (isInstagram) { platformName = 'Instagram'; platformIcon = 'fa-instagram'; platformColor = '#E4405F'; }

    function formatDuration(seconds) {
        if (!seconds) return '';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    }

    // Build quality options
    let qualityButtons = '';
    if (data.formats && data.formats.length > 0) {
        qualityButtons = data.formats.slice(0, 12).map(f => `
            <button onclick="downloadVideo('${url.replace(/'/g, "\\'")}', '${f.format_id || ''}', '${f.quality || ''}')" class="quality-btn">
                <i class="fas fa-video"></i>
                <span>${f.resolution || f.quality + 'p'}</span>
                <small>${formatSize(f.filesize) || ''}</small>
            </button>
        `).join('');
    }

    // Video player HTML
    let playerHTML = '';
    if (isYouTube) {
        const videoId = getYouTubeId(url);
        if (videoId) {
            playerHTML = `
                <div class="video-player">
                    <iframe src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" allowfullscreen allow="autoplay; encrypted-media">
                    </iframe>
                </div>`;
        }
    } else if (data.thumbnail) {
        playerHTML = `
            <div class="video-player" style="cursor:pointer;" onclick="window.open('${url}', '_blank')">
                <img src="${data.thumbnail}" alt="${data.title}" style="width:100%;height:100%;object-fit:cover;">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>`;
    }

    preview.innerHTML = `
        <div class="video-preview-card">
            ${playerHTML}
            
            <div class="video-info-section">
                <div class="platform-tag" style="background:${platformColor}15;color:${platformColor};border:1px solid ${platformColor}30;">
                    <i class="fab ${platformIcon}"></i> ${platformName}
                </div>
                <h2 class="video-title-preview">${data.title || 'Video'}</h2>
                <div class="video-meta-row">
                    ${data.uploader ? `<span><i class="fas fa-user"></i> ${data.uploader}</span>` : ''}
                    ${data.duration ? `<span><i class="fas fa-clock"></i> ${formatDuration(data.duration)}</span>` : ''}
                    <span><i class="fas fa-music"></i> With Audio</span>
                </div>
            </div>

            <div class="download-section">
                <h3 class="download-heading">
                    <i class="fas fa-download"></i> Download Options
                </h3>
                
                ${qualityButtons ? `
                    <p class="quality-label">📹 Video Quality</p>
                    <div class="quality-grid">
                        ${qualityButtons}
                    </div>
                ` : ''}
                
                <div class="action-buttons">
                    <button onclick="downloadMP3('${url.replace(/'/g, "\\'")}')" class="mp3-btn">
                        <i class="fas fa-music"></i> Download MP3 Audio
                    </button>
                    <button onclick="downloadBestVideo('${url.replace(/'/g, "\\'")}')" class="best-btn">
                        <i class="fas fa-download"></i> Download Best Quality
                    </button>
                </div>
                
                <button onclick="resetDownload()" class="reset-btn">
                    <i class="fas fa-redo"></i> Download Another Video
                </button>
            </div>
            
            <div id="downloadStatus"></div>
        </div>
    `;
}

function getYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\s?/]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const match = url.match(p);
        if (match) return match[1];
    }
    return '';
}

async function downloadVideo(videoUrl, formatId, quality) {
    const status = document.getElementById('downloadStatus');
    if (!status) return;
    
    status.innerHTML = `
        <div class="status-msg downloading">
            <i class="fas fa-spinner fa-spin"></i> Preparing ${quality || ''} video download...
        </div>`;
    
    try {
        const res = await fetch(`/api/download?url=${encodeURIComponent(videoUrl)}&format_id=${formatId || ''}&type=video`);
        const data = await res.json();
        
        if (data.status === 'success' && data.file_path) {
            triggerDownload(data.file_path, data.filename || 'galmee_video.mp4');
            status.innerHTML = `
                <div class="status-msg success">
                    <i class="fas fa-check-circle"></i> Download started! Video will save to your device.
                </div>`;
        } else {
            throw new Error(data.message || 'Download failed');
        }
    } catch (err) {
        status.innerHTML = `
            <div class="status-msg error">
                <i class="fas fa-exclamation-circle"></i> ${err.message || 'Download failed. Try again.'}
            </div>`;
    }
}

async function downloadMP3(videoUrl) {
    const status = document.getElementById('downloadStatus');
    if (!status) return;
    
    status.innerHTML = `
        <div class="status-msg downloading">
            <i class="fas fa-spinner fa-spin"></i> Converting to MP3 (192kbps)...
        </div>`;
    
    try {
        const res = await fetch(`/api/download?url=${encodeURIComponent(videoUrl)}&type=audio`);
        const data = await res.json();
        
        if (data.status === 'success' && data.file_path) {
            triggerDownload(data.file_path, data.filename || 'galmee_audio.mp3');
            status.innerHTML = `
                <div class="status-msg success">
                    <i class="fas fa-check-circle"></i> MP3 download started! High quality audio.
                </div>`;
        } else {
            throw new Error(data.message || 'Failed');
        }
    } catch (err) {
        status.innerHTML = `
            <div class="status-msg error">
                <i class="fas fa-exclamation-circle"></i> ${err.message || 'MP3 conversion failed.'}
            </div>`;
    }
}

async function downloadBestVideo(videoUrl) {
    const status = document.getElementById('downloadStatus');
    if (!status) return;
    
    status.innerHTML = `
        <div class="status-msg downloading">
            <i class="fas fa-spinner fa-spin"></i> Fetching best quality video...
        </div>`;
    
    try {
        const res = await fetch(`/api/download?url=${encodeURIComponent(videoUrl)}&type=video`);
        const data = await res.json();
        
        if (data.status === 'success' && data.file_path) {
            triggerDownload(data.file_path, data.filename || 'galmee_video.mp4');
            status.innerHTML = `
                <div class="status-msg success">
                    <i class="fas fa-check-circle"></i> Best quality download started!
                </div>`;
        } else {
            throw new Error(data.message || 'Failed');
        }
    } catch (err) {
        status.innerHTML = `
            <div class="status-msg error">
                <i class="fas fa-exclamation-circle"></i> ${err.message || 'Download failed.'}
            </div>`;
    }
}

function triggerDownload(filePath, filename) {
    const downloadUrl = `/api/serve-file?path=${encodeURIComponent(filePath)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'galmee_download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Fallback
    setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 5000);
    }, 500);
}

function resetDownload() {
    document.getElementById('preview').innerHTML = '';
    document.getElementById('url').value = '';
    document.getElementById('url').focus();
}

function showMessage(msg, type) {
    const preview = document.getElementById('preview');
    preview.innerHTML = `
        <div class="status-msg ${type}" style="text-align:center;padding:20px;">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${msg}
        </div>`;
}

function showErrorHTML(message) {
    return `
        <div style="text-align:center;padding:30px;background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
            <i class="fas fa-exclamation-triangle" style="font-size:40px;color:#e74c3c;margin-bottom:10px;"></i>
            <p style="color:var(--text);margin-bottom:15px;">${message}</p>
            <button onclick="resetDownload()" class="reset-btn">
                <i class="fas fa-redo"></i> Try Another Video
            </button>
        </div>`;
}