const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const resultDiv = document.getElementById('result');
let currentPlatform = 'facebook';

function setPlatform(platform, btn) {
    currentPlatform = platform;
    document.querySelectorAll('.plat-btn').forEach(b => b.classList.remove('active','fb','ig'));
    btn.classList.add('active', platform);
    urlInput.placeholder = `Paste ${platform === 'facebook' ? 'Facebook' : 'Instagram'} link...`;
    urlInput.value = '';
    resultDiv.classList.remove('show');
}

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text)) urlInput.value = text;
    } catch(e) {}
});

function isValidUrl(url) {
    return url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch') ||
           url.includes('instagram.com') || url.includes('instagr.am');
}

function detectPlatform(url) {
    if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
    return 'facebook';
}

function downloadVideo(url, quality) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidgrab-${quality}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return alert('Please paste a video link');
    if (!isValidUrl(url)) return alert('Please enter a valid Facebook or Instagram URL');
    
    const platform = detectPlatform(url);
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platColor = platform === 'instagram' ? '#e4405f' : '#1877f2';
    const platIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';

    resultDiv.classList.add('show');
    resultDiv.innerHTML = `<div class="loading"><div class="spinner"></div><p>Fetching ${platformName} video...</p></div>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.status !== 'success') {
            resultDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i><h4>Failed</h4><p style="color:var(--text2);font-size:13px;">${data.message || 'Could not download this video'}</p><button onclick="resultDiv.classList.remove('show')" style="margin-top:12px;padding:8px 20px;border-radius:50px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-family:inherit;">Try Another</button></div>`;
            return;
        }

        const title = data.title || platformName + ' Video';
        const uploader = data.uploader || '';
        const thumbnail = data.thumbnail || '';
        const firstVideo = data.formats[0]?.url;
        
        let dlButtons = data.formats.slice(0,5).map((f, i) => {
            const isBest = i === 0;
            const hasAudio = f.has_audio;
            return `<button onclick="downloadVideo('${f.url}','${f.quality}')" class="dl-option ${isBest?'best':i===1?'hd':'sd'}">
                <span style="display:flex;align-items:center;gap:8px;">
                    ${isBest?'⭐ ':''}${f.quality} ${f.format_note?`(${f.format_note})`:''}
                    <span class="badge ${hasAudio?'audio':'no-audio'}">${hasAudio?'🔊 Sound':'🔇 Muted'}</span>
                </span>
                <span style="display:flex;align-items:center;gap:6px;">${f.filesize_approx?`<span style="font-size:10px;opacity:.7;">${(f.filesize_approx/1024/1024).toFixed(1)}MB</span>`:''}<i class="fas fa-download"></i></span>
            </button>`;
        }).join('');

        resultDiv.innerHTML = `
            <div class="video-card">
                <div class="video-wrapper">
                    <video controls playsinline poster="${thumbnail}" style="width:100%"><source src="${firstVideo}" type="video/mp4"></video>
                    <div class="watermark">VIDGRAB</div>
                    <span class="plat-badge ${platform}"><i class="fab ${platIcon}"></i> ${platformName}</span>
                </div>
                <div class="video-info">
                    <h3>${title}</h3>
                    ${uploader?`<div class="uploader"><i class="fas fa-user-circle" style="color:var(--accent2)"></i>${uploader}</div>`:''}
                    <div class="dl-options">${dlButtons}</div>
                    <div class="actions">
                        <button onclick="resultDiv.classList.remove('show');urlInput.value=''" class="btn btn-reset"><i class="fas fa-redo"></i> New Video</button>
                        <button onclick="window.open('https://t.me/anayasingg','_blank')" class="btn btn-buy"><i class="fas fa-crown"></i> Buy Source</button>
                    </div>
                </div>
            </div>
            <div class="share-bar">
                <span>Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://yasing.com.et" target="_blank" class="share-btn fb"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=Free%20Video%20Downloader:%20https://yasing.com.et" target="_blank" class="share-btn wa"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=https://yasing.com.et" target="_blank" class="share-btn tg"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=https://yasing.com.et" target="_blank" class="share-btn x"><i class="fab fa-x-twitter"></i></a>
            </div>`;
    } catch(err) {
        resultDiv.innerHTML = `<div class="error"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p style="color:var(--text2);font-size:13px;">Check your internet connection</p></div>`;
    }
});