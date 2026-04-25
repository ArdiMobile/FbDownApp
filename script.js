const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

const ICON_URL = 'https://raw.githubusercontent.com/ArdiMobile/FbDownApp/main/images/Galmee%20icon.png';
const SITE_URL = 'https://galmee.vercel.app';

const randomAds = [
    { desktop: 'https://picsum.photos/600/400?random=1' },
    { desktop: 'https://picsum.photos/600/400?random=2' },
    { desktop: 'https://picsum.photos/600/400?random=3' },
    { desktop: 'https://picsum.photos/600/400?random=4' }
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
                <img src="${ICON_URL}" style="width:24px;height:24px;border-radius:6px;" alt="">
                <span style="background:${platformColor};color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;">
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
    video.muted = false;
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
    // Show spinning icon on button
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<img src="${ICON_URL}" style="width:22px;height:22px;border-radius:4px;animation:spin 0.8s linear infinite;">`;

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

        // Quality buttons in list style with "Download" word
        const qualityColors = {
            '1080p': { bg: 'linear-gradient(135deg, #009959, #007a47)', border: '#009959' },
            '720p': { bg: 'linear-gradient(135deg, #007a47, #005a35)', border: '#007a47' },
            '480p': { bg: 'linear-gradient(135deg, #FEC601, #e6b300)', border: '#FEC601' },
            '360p': { bg: 'linear-gradient(135deg, #5a8a6a, #4a7a5a)', border: '#5a8a6a' },
            '240p': { bg: 'linear-gradient(135deg, #8a9a8a, #7a8a7a)', border: '#8a9a8a' }
        };

        let qualityButtons = data.formats.map((f, index) => {
            const style = qualityColors[f.quality] || { bg: 'linear-gradient(135deg, #009959, #007a47)', border: '#009959' };
            const isBest = index === 0;
            return `
                <button onclick="downloadVideo('${f.url}', '${f.quality}')"
                   style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 14px;margin-bottom:6px;background:${style.bg};color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s ease;border-left:4px solid ${isBest ? '#FEC601' : style.border};"
                   onmouseover="this.style.transform='translateX(4px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
                   onmouseout="this.style.transform='translateX(0)';this.style.boxShadow='none'">
                   <span style="display:flex;align-items:center;gap:8px;">
                      ${isBest ? '<span style="background:#FEC601;color:#002611;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;">BEST</span>' : ''}
                      <i class="fas fa-download" style="font-size:13px;"></i>
                      Download ${f.quality} ${f.format_note ? '(' + f.format_note + ')' : ''}
                   </span>
                   <span style="font-size:11px;opacity:0.8;">${f.filesize_approx ? (f.filesize_approx / 1024 / 1024).toFixed(1) + ' MB' : ''}</span>
                </button>
            `;
        }).join('');

        // Half-size horizontal preview
        preview.innerHTML = `
            <div style="background:#fff;padding:16px;border-radius:14px;border:1px solid #d4e6da;box-shadow:0 2px 12px rgba(0,38,17,0.08);">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <img src="${ICON_URL}" style="width:22px;height:22px;border-radius:5px;" alt="">
                    <span style="background:${platformColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;">
                        <i class="fab ${platformIcon}"></i> ${platformName}
                    </span>
                </div>
                <div style="display:flex;gap:14px;flex-wrap:wrap;">
                    <!-- Half size video -->
                    <div style="width:320px;max-width:100%;flex-shrink:0;">
                        <video controls playsinline muted style="width:100%;border-radius:10px;background:#000;max-height:240px;">
                            <source src="${firstVideo}" type="video/mp4">
                        </video>
                        <p style="font-size:11px;color:#999;text-align:center;margin-top:4px;">
                            <i class="fas fa-volume-mute"></i> Tap to unmute · <span onclick="this.parentElement.previousElementSibling.muted=!this.parentElement.previousElementSibling.muted;this.innerHTML=this.parentElement.previousElementSibling.muted?'<i class=\\'fas fa-volume-mute\\'></i> Tap to unmute':'<i class=\\'fas fa-volume-up\\'></i> Sound on'" style="cursor:pointer;color:var(--primary);">Unmute</span>
                        </p>
                    </div>
                    <!-- Info and downloads -->
                    <div style="flex:1;min-width:200px;">
                        <h4 style="font-size:14px;font-weight:700;color:#002611;margin-bottom:4px;line-height:1.3;">${data.title || platformName + ' Video'}</h4>
                        ${data.uploader ? `
                        <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#e6f5ee;border-radius:8px;margin-bottom:10px;">
                            <img src="${ICON_URL}" style="width:20px;height:20px;border-radius:50%;">
                            <span style="font-size:12px;font-weight:600;color:#002611;">${data.uploader}</span>
                        </div>` : ''}
                        <!-- List style download buttons -->
                        <div style="margin-bottom:10px;">
                            ${qualityButtons}
                        </div>
                        <!-- Action buttons -->
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                           <button onclick="resetDownloader()" style="width:40%;padding:8px 14px;border:1px solid #d4e6da;background:#f5f8f6;color:#002611;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;">
    <i class="fas fa-redo"></i> New Video
</button>

                            <button onclick="window.location.href='page/purchase.html'" style="padding:8px 14px;border:none;background:linear-gradient(135deg,#FEC601,#e6b300);color:#002611;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;">
                                <i class="fas fa-crown"></i> Buy Tool <img src="${ICON_URL}" style="width:20px;height:20px;border-radius:50%;">
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Share -->
            <div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding:0 4px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:600;color:#4a6b56;">Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s ease;"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Download Facebook & Instagram videos free: ' + SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s ease;"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent('Galmee - Free Video Downloader')}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#0088cc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s ease;"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent('Galmee - Free Facebook & Instagram Video Downloader')}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s ease;"><i class="fab fa-twitter"></i></a>
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
                const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';
                return `
                <div class="history-item" id="historyItem${index}">
                    <div class="history-thumb-wrapper" onclick="playHistoryVideo(event, '${item.url}', document.getElementById('historyItem${index}'))">
                        <img src="${item.thumbnail || ICON_URL}" alt="${item.title}" loading="lazy">
                        <div class="play-overlay"><div class="play-btn-circle"><div class="play-triangle"></div></div></div>
                        <span style="position:absolute;top:6px;left:6px;background:${platformColor};color:#fff;padding:2px 6px;border-radius:8px;font-size:8px;font-weight:600;"><i class="fab ${platformIcon}"></i></span>
                    </div>
                    <video preload="none" playsinline muted></video>
                    <div class="history-info">
                        <p class="history-title">${item.title ? item.title.substring(0, 28) : 'Video'}</p>
                        <span class="history-quality">${item.quality || 'HD'}</span>
                    </div>
                </div>`;
            }).join('');
            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;"><img src="${ICON_URL}" style="width:36px;height:36px;border-radius:8px;margin-bottom:8px;opacity:0.5;"><p style="color:#999;font-size:12px;">No downloads yet</p></div>`;
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
            <div class="sidebar-title"><img src="${ICON_URL}" style="width:20px;height:20px;border-radius:4px;" alt=""> Supported Platforms</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#e6f5ee;border-radius:10px;border-left:3px solid #1877f2;">
                    <i class="fab fa-facebook" style="color:#1877f2;font-size:20px;"></i>
                    <div><span style="font-size:13px;font-weight:600;color:#002611;display:block;">Facebook</span><span style="font-size:10px;color:#4a6b56;">Videos, Reels, Watch</span></div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff9e6;border-radius:10px;border-left:3px solid #E4405F;">
                    <i class="fab fa-instagram" style="color:#E4405F;font-size:20px;"></i>
                    <div><span style="font-size:13px;font-weight:600;color:#002611;display:block;">Instagram</span><span style="font-size:10px;color:#4a6b56;">Reels, Stories, Posts</span></div>
                </div>
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
    const REDIRECT_URL = "https://galmee.vercel.app/page/purchase.html";
    function checkCredit() {
        const credit = document.getElementById("credit-link");
        if (!credit || credit.innerText.trim() === "") {
            if (!window.location.href.includes(REDIRECT_URL)) window.location.href = REDIRECT_URL;
        }
    }
    setTimeout(checkCredit, Math.random() * 3000 + 1000);
    setInterval(checkCredit, 4000);
})();