const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

const ICON_URL = 'https://raw.githubusercontent.com/ArdiMobile/FbDownApp/main/images/Galmee%20icon.png';

const randomAds = [
    { desktop: 'https://picsum.photos/600/400?random=1' },
    { desktop: 'https://picsum.photos/600/400?random=2' },
    { desktop: 'https://picsum.photos/600/400?random=3' },
    { desktop: 'https://picsum.photos/600/400?random=4' },
    { desktop: 'https://picsum.photos/600/400?random=5' },
    { desktop: 'https://picsum.photos/600/400?random=6' }
];

function getRandomAd() {
    return randomAds[Math.floor(Math.random() * randomAds.length)];
}

function detectPlatform(url) {
    if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
    return 'unknown';
}

function isValidUrl(url) {
    return url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch') ||
           url.includes('instagram.com') || url.includes('instagr.am');
}

let currentPlayingHistoryItem = null;
let autoDetectEnabled = true;

document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    initSidebar();
    setTimeout(checkClipboardAndPreview, 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkClipboardAndPreview();
    });
});

// Auto detect
async function checkClipboardAndPreview() {
    try {
        const text = await navigator.clipboard.readText();
        if (text && isValidUrl(text) && autoDetectEnabled) {
            const lastUrl = sessionStorage.getItem('lastAutoDetectUrl');
            if (lastUrl === text) return;
            sessionStorage.setItem('lastAutoDetectUrl', text);
            urlInput.value = text;
            const platform = detectPlatform(text);
            showAutoDetectNotification(platform);
            await processPreview(text);
        }
    } catch (e) {}
}

function showAutoDetectNotification(platform) {
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';
    
    preview.innerHTML = `
        <div style="text-align:center;padding:16px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;">
                <img src="${ICON_URL}" style="width:24px;height:24px;border-radius:4px;" alt="">
                <span style="background:${platformColor};color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px;">
                    <i class="fab ${platformIcon}"></i> ${platformName}
                </span>
                <span style="color:#fff;font-size:13px;font-weight:600;">Link detected!</span>
            </div>
            <div style="width:28px;height:28px;border:3px solid rgba(255,255,255,0.2);border-top:3px solid #FEC601;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 8px;"></div>
            <p style="color:rgba(255,255,255,0.8);font-size:12px;">Fetching ${platformName} video...</p>
        </div>
    `;
}

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text) && text !== urlInput.value) {
            urlInput.value = text;
            urlInput.style.background = '#e6f5ee';
            setTimeout(() => { urlInput.style.background = 'transparent'; }, 500);
            setTimeout(() => {
                if (urlInput.value === text && document.activeElement === urlInput) dlForm.requestSubmit();
            }, 1500);
        }
    } catch (e) {
        urlInput.placeholder = "Paste Facebook or Instagram link here...";
    }
});

function playHistoryVideo(event, videoUrl, historyItem) {
    event.stopPropagation();
    if (currentPlayingHistoryItem && currentPlayingHistoryItem !== historyItem) stopHistoryVideo(currentPlayingHistoryItem);
    const video = historyItem.querySelector('video');
    const thumbWrapper = historyItem.querySelector('.history-thumb-wrapper');
    if (historyItem.classList.contains('playing')) { stopHistoryVideo(historyItem); return; }
    video.src = videoUrl;
    video.style.display = 'block';
    thumbWrapper.style.display = 'none';
    historyItem.classList.add('playing');
    video.play();
    currentPlayingHistoryItem = historyItem;
    video.onended = () => { stopHistoryVideo(historyItem); };
}

function stopHistoryVideo(historyItem) {
    const video = historyItem.querySelector('video');
    const thumbWrapper = historyItem.querySelector('.history-thumb-wrapper');
    video.pause(); video.src = ''; video.style.display = 'none'; video.onended = null;
    thumbWrapper.style.display = 'block';
    historyItem.classList.remove('playing');
    if (currentPlayingHistoryItem === historyItem) currentPlayingHistoryItem = null;
}

function toggleDrawer() {
    document.getElementById('drawer').classList.toggle('show');
    document.getElementById('drawerOverlay').classList.toggle('show');
}

function switchTab(event, tabId) {
    if (event) event.preventDefault();
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.drawer-menu a').forEach(a => a.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabIds = ['tab-home', 'tab-how', 'tab-updates', 'tab-faq', 'tab-apps'];
    const index = tabIds.indexOf(tabId);
    if (index >= 0 && tabBtns[index]) tabBtns[index].classList.add('active');
    document.querySelectorAll('.drawer-menu a').forEach(link => {
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabId)) link.classList.add('active');
    });
    document.getElementById('drawer')?.classList.remove('show');
    document.getElementById('drawerOverlay')?.classList.remove('show');
}

function downloadVideo(url, quality) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `galmee-video-${quality}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function processPreview(url) {
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<span class="btn-spinner"></span>`;
    const platform = detectPlatform(url);

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `<div style="text-align:center;padding:16px;"><i class="fas fa-exclamation-circle" style="font-size:36px;color:#e74c3c;display:block;margin-bottom:8px;"></i><p style="color:#e74c3c;font-weight:600;font-size:13px;">${data.message}</p></div>`;
            return;
        }

        saveToHistory(data, platform);
        const firstVideo = data.formats[0]?.url;
        const randomAd = getRandomAd();
        const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
        const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';
        const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';

        // Quality buttons
        const qualityColors = {
            '1080p': 'linear-gradient(135deg, #e74c3c, #c0392b)',
            '720p': 'linear-gradient(135deg, #f39c12, #e67e22)',
            '480p': 'linear-gradient(135deg, #009959, #007a47)',
            '360p': 'linear-gradient(135deg, #2ecc71, #27ae60)',
            '240p': 'linear-gradient(135deg, #95a5a6, #7f8c8d)'
        };

        let qualityButtons = data.formats.map((f, index) => {
            const bg = qualityColors[f.quality] || 'linear-gradient(135deg, #009959, #007a47)';
            const isBest = index === 0;
            return `
                <button onclick="downloadVideo('${f.url}', '${f.quality}')"
                   class="quality-btn-small ${isBest ? 'best' : f.quality.includes('1080') || f.quality.includes('720') ? 'hd' : 'sd'}"
                   style="background:${isBest ? 'linear-gradient(135deg, #FEC601, #e6b300)' : bg};color:${isBest ? '#002611' : '#fff'};">
                   ${isBest ? '⭐ ' : ''}${f.quality}
                </button>
            `;
        }).join('');

        // Horizontal preview layout
        preview.innerHTML = `
            <div class="video-preview-horizontal" style="background:#fff;padding:14px;border-radius:14px;border:1px solid #d4e6da;">
                <video controls playsinline style="width:300px;max-width:100%;border-radius:10px;background:#000;" poster="${data.thumbnail || ''}">
                    <source src="${firstVideo}" type="video/mp4">
                </video>
                <div class="video-preview-info" style="flex:1;min-width:200px;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                        <img src="${ICON_URL}" style="width:20px;height:20px;border-radius:4px;" alt="">
                        <span style="background:${platformColor};color:#fff;padding:3px 8px;border-radius:12px;font-size:10px;font-weight:600;">
                            <i class="fab ${platformIcon}"></i> ${platformName}
                        </span>
                    </div>
                    <p class="video-title" style="font-size:15px;font-weight:700;color:#002611;margin-bottom:8px;">${data.title || platformName + ' Video'}</p>
                    ${data.uploader ? `
                    <div class="uploader-row" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#e6f5ee;border-radius:8px;margin-bottom:10px;">
                        <img src="${ICON_URL}" style="width:28px;height:28px;border-radius:50%;">
                        <span style="font-size:13px;font-weight:600;color:#002611;">${data.uploader}</span>
                    </div>` : ''}
                    <div class="quality-buttons-horizontal" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                        ${qualityButtons}
                    </div>
                    <div class="action-row" style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button onclick="resetDownloader()" class="btn-sm btn-sm-reset"><i class="fas fa-redo"></i> New</button>
                        <button onclick="window.location.href='page/purchase.html'" class="btn-sm btn-sm-buy"><i class="fas fa-crown"></i> Buy Tool</button>
                    </div>
                </div>
            </div>
            <div class="share-section" style="margin-top:10px;">
                <span>Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://fbdownapk.vercel.app/" target="_blank" class="share-btn-sm fb"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Download ' + platformName + ' videos free: https://fbdownapk.vercel.app/')}" target="_blank" class="share-btn-sm whatsapp"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=https://fbdownapk.vercel.app/" target="_blank" class="share-btn-sm telegram"><i class="fab fa-telegram-plane"></i></a>
            </div>
        `;

        setTimeout(loadDownloadHistory, 1500);
    } catch (err) {
        preview.innerHTML = `<div style="text-align:center;padding:16px;"><i class="fas fa-exclamation-triangle" style="font-size:36px;color:#e74c3c;display:block;margin-bottom:8px;"></i><p style="color:#e74c3c;font-weight:600;font-size:13px;">Connection error, try again</p></div>`;
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
    }
}

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return alert("Please paste a Facebook or Instagram link");
    if (!isValidUrl(url)) return alert("Please enter a valid Facebook or Instagram URL");
    await processPreview(url);
});

function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    urlInput.style.background = '';
    sessionStorage.removeItem('lastAutoDetectUrl');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    dlBtnIcon.style.display = "block";
    btnLoader.style.display = "none";
}

async function loadDownloadHistory() {
    const historyContainer = document.getElementById('historyVideos');
    if (!historyContainer) return;
    try {
        const res = await fetch('/api/history');
        const data = await res.json();
        if (data.status === 'success' && data.history.length > 0) {
            let html = data.history.slice(0, 6).map((item, index) => {
                const platform = item.platform || 'facebook';
                const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
                return `
                <div class="history-item" id="historyItem${index}">
                    <div class="history-thumb-wrapper" onclick="playHistoryVideo(event, '${item.url}', document.getElementById('historyItem${index}'))">
                        <img src="${item.thumbnail || ICON_URL}" alt="${item.title}" loading="lazy">
                        <div class="play-overlay"><div class="play-btn-circle"><div class="play-triangle"></div></div></div>
                    </div>
                    <video preload="none" playsinline></video>
                    <div class="history-info">
                        <p class="history-title"><i class="fab ${platformIcon}" style="font-size:9px;"></i> ${item.title ? item.title.substring(0, 25) : 'Video'}</p>
                        <span class="history-quality">${item.quality || 'HD'}</span>
                    </div>
                </div>`;
            }).join('');
            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;"><img src="${ICON_URL}" style="width:40px;height:40px;border-radius:8px;margin-bottom:8px;opacity:0.5;"><p style="color:#999;font-size:12px;">No downloads yet</p></div>`;
        }
    } catch (err) {
        historyContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;"><p style="color:#999;font-size:12px;">Loading history...</p></div>`;
    }
}

async function saveToHistory(videoData, platform) {
    try {
        await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: videoData.title || 'Unknown',
                thumbnail: videoData.thumbnail || '',
                url: videoData.formats?.[0]?.url || '',
                quality: videoData.formats?.[0]?.quality || 'HD',
                platform: platform || 'facebook'
            })
        });
    } catch (err) {}
}

function renderSidebar() {
    const ad = getRandomAd();
    return `
        <div class="sidebar-card sidebar-ad"><a href="page/purchase.html"><img src="${ad.desktop}" alt="Ad" loading="lazy"></a></div>
        <div class="sidebar-card">
            <div class="sidebar-title"><img src="${ICON_URL}" alt=""> Supported Platforms</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#e6f5ee;border-radius:8px;"><i class="fab fa-facebook" style="color:#1877f2;font-size:18px;"></i><span style="font-size:12px;font-weight:600;">Facebook Videos</span></div>
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff9e6;border-radius:8px;"><i class="fab fa-instagram" style="color:#E4405F;font-size:18px;"></i><span style="font-size:12px;font-weight:600;">Instagram Videos</span></div>
            </div>
        </div>
        <div class="sidebar-card">
            <div class="sidebar-title"><i class="fas fa-tags"></i> Tags</div>
            <div class="tag-list">
                <a href="#" class="tag-item">Facebook</a><a href="#" class="tag-item">Instagram</a>
                <a href="#" class="tag-item">HD Video</a><a href="#" class="tag-item">Reels</a>
                <a href="#" class="tag-item">Free</a><a href="#" class="tag-item">MP4</a>
            </div>
        </div>
        <div class="sidebar-card sidebar-ad"><a href="page/purchase.html"><img src="${getRandomAd().desktop}" alt="Ad" loading="lazy"></a></div>
    `;
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.innerHTML = renderSidebar();
}

(function () {
    const REDIRECT_URL = "https://yasing.com.et/purchase.html";
    function checkCredit() {
        const credit = document.getElementById("credit-link");
        if (!credit || credit.innerText.trim() === "") {
            if (!window.location.href.includes(REDIRECT_URL)) window.location.href = REDIRECT_URL;
        }
    }
    setTimeout(checkCredit, Math.random() * 3000 + 1000);
    setInterval(checkCredit, 4000);
})();