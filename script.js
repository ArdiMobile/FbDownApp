const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

// Random ads array
const randomAds = [
    { desktop: 'https://picsum.photos/600/400?random=1', mobile: 'https://picsum.photos/400/300?random=1' },
    { desktop: 'https://picsum.photos/600/400?random=2', mobile: 'https://picsum.photos/400/300?random=2' },
    { desktop: 'https://picsum.photos/600/400?random=3', mobile: 'https://picsum.photos/400/300?random=3' },
    { desktop: 'https://picsum.photos/600/400?random=4', mobile: 'https://picsum.photos/400/300?random=4' },
    { desktop: 'https://picsum.photos/600/400?random=5', mobile: 'https://picsum.photos/400/300?random=5' },
    { desktop: 'https://picsum.photos/600/400?random=6', mobile: 'https://picsum.photos/400/300?random=6' }
];

function getRandomAd() {
    return randomAds[Math.floor(Math.random() * randomAds.length)];
}

// Supported platforms detection
function detectPlatform(url) {
    if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) {
        return 'facebook';
    }
    if (url.includes('instagram.com') || url.includes('instagr.am')) {
        return 'instagram';
    }
    return 'unknown';
}

function isValidUrl(url) {
    return url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch') ||
           url.includes('instagram.com') || url.includes('instagr.am');
}

// Track currently playing history item
let currentPlayingHistoryItem = null;
let autoDetectEnabled = true;

document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    initSidebar();
    setTimeout(checkClipboardAndPreview, 1000);
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkClipboardAndPreview();
        }
    });
});

// =====================
// AUTO DETECT + PREVIEW
// =====================

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
    } catch (e) {
        console.log("Clipboard access blocked or empty");
    }
}

function showAutoDetectNotification(platform) {
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';
    
    preview.innerHTML = `
        <div style="text-align:center;padding:20px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
                <i class="fas fa-magic" style="color:#fff;font-size:18px;"></i>
                <span style="background:${platformColor};color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;">
                    <i class="fab ${platformIcon}"></i> ${platformName}
                </span>
                <span style="color:#fff;font-size:14px;font-weight:600;">Link detected!</span>
            </div>
            <div class="custom-spinner" style="margin:0 auto 8px;"></div>
            <p style="color:rgba(255,255,255,0.8);font-size:13px;">Fetching ${platformName} video...</p>
        </div>
    `;
}

// =====================
// MANUAL PASTE
// =====================

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text) && text !== urlInput.value) {
            urlInput.value = text;
            urlInput.style.background = '#e8f0fe';
            setTimeout(() => { urlInput.style.background = 'transparent'; }, 500);
            
            setTimeout(() => {
                if (urlInput.value === text && document.activeElement === urlInput) {
                    dlForm.requestSubmit();
                }
            }, 1500);
        }
    } catch (e) {
        urlInput.placeholder = "Paste Facebook or Instagram link here...";
    }
});

// Update placeholder based on input
urlInput.addEventListener('input', () => {
    const platform = detectPlatform(urlInput.value);
    if (platform === 'instagram') {
        urlInput.style.borderColor = '#E4405F';
    } else if (platform === 'facebook') {
        urlInput.style.borderColor = '#1877f2';
    }
});

// =====================
// HISTORY VIDEO PLAYER
// =====================

function playHistoryVideo(event, videoUrl, historyItem) {
    event.stopPropagation();
    
    if (currentPlayingHistoryItem && currentPlayingHistoryItem !== historyItem) {
        stopHistoryVideo(currentPlayingHistoryItem);
    }
    
    const video = historyItem.querySelector('video');
    const thumbWrapper = historyItem.querySelector('.history-thumb-wrapper');
    
    if (historyItem.classList.contains('playing')) {
        stopHistoryVideo(historyItem);
        return;
    }
    
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
    
    video.pause();
    video.src = '';
    video.style.display = 'none';
    video.onended = null;
    thumbWrapper.style.display = 'block';
    historyItem.classList.remove('playing');
    
    if (currentPlayingHistoryItem === historyItem) {
        currentPlayingHistoryItem = null;
    }
}

// =====================
// DRAWER & TABS
// =====================

function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('show');
        overlay.classList.toggle('show');
    }
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
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabId)) {
            link.classList.add('active');
        }
    });
    
    document.getElementById('drawer')?.classList.remove('show');
    document.getElementById('drawerOverlay')?.classList.remove('show');
    document.getElementById('tabBar')?.scrollIntoView({ behavior: 'smooth' });
}

// =====================
// DOWNLOAD FUNCTIONS
// =====================

function downloadVideo(url, quality) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${quality}.mp4`;
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
            preview.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <i class="fas fa-exclamation-circle" style="font-size:40px;color:#e74c3c;display:block;margin-bottom:10px;"></i>
                    <p style="color:#e74c3c;font-weight:600;font-size:14px;">${data.message}</p>
                </div>
            `;
            return;
        }

        saveToHistory(data, platform);

        const firstVideo = data.formats[0]?.url;
        const randomAd = getRandomAd();

        const qualityStyles = {
            '1080p': { bg: 'linear-gradient(135deg, #e74c3c, #c0392b)', icon: 'fa-crown', label: 'Full HD' },
            '720p': { bg: 'linear-gradient(135deg, #f39c12, #e67e22)', icon: 'fa-star', label: 'HD' },
            '480p': { bg: 'linear-gradient(135deg, #1877f2, #1565c0)', icon: 'fa-video', label: 'SD' },
            '360p': { bg: 'linear-gradient(135deg, #2ecc71, #27ae60)', icon: 'fa-play', label: 'Low' },
            '240p': { bg: 'linear-gradient(135deg, #95a5a6, #7f8c8d)', icon: 'fa-download', label: 'Low' }
        };

        let formatButtons = data.formats.map((f, index) => {
            const style = qualityStyles[f.quality] || { bg: 'linear-gradient(135deg, #1877f2, #1565c0)', icon: 'fa-download', label: f.quality };
            const isBest = index === 0;
            
            return `
                <button onclick="downloadVideo('${f.url}', '${f.quality}')"
                   class="dl-quality-btn"
                   style="background:${style.bg};">
                   ${isBest ? '<span class="best-badge">BEST</span>' : ''}
                   <i class="fas ${style.icon}"></i>
                   Download ${f.quality} (${style.label})
                </button>
            `;
        }).join("");

        preview.innerHTML = showResultWithSidebar(data, firstVideo, formatButtons, randomAd, platform);
        setTimeout(loadDownloadHistory, 1500);

    } catch (err) {
        preview.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:40px;color:#e74c3c;display:block;margin-bottom:10px;"></i>
                <p style="color:#e74c3c;font-weight:600;font-size:14px;">Connection error, please try again</p>
            </div>
        `;
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
    }
}

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return alert("Please paste a Facebook or Instagram video link");
    if (!isValidUrl(url)) return alert("Please enter a valid Facebook or Instagram URL");
    await processPreview(url);
});

function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    urlInput.style.borderColor = '';
    sessionStorage.removeItem('lastAutoDetectUrl');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    dlBtnIcon.style.display = "block";
    btnLoader.style.display = "none";
}

// =====================
// HISTORY FUNCTIONS
// =====================

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
                        <img src="${item.thumbnail || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22180%22><rect fill=%22%23e8f0fe%22 width=%22320%22 height=%22180%22/></svg>'}" alt="${item.title}" loading="lazy">
                        <div class="play-overlay">
                            <div class="play-btn-circle">
                                <div class="play-triangle"></div>
                            </div>
                        </div>
                    </div>
                    <video preload="none" playsinline></video>
                    <div class="history-info">
                        <p class="history-title"><i class="fab ${platformIcon}" style="font-size:10px;margin-right:4px;"></i>${item.title ? item.title.substring(0, 28) : 'Video'}</p>
                        <span class="history-quality">${item.quality || 'HD'}</span>
                    </div>
                </div>
                `;
            }).join('');

            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px;">
                    <i class="fas fa-history" style="font-size:40px;color:#ccc;display:block;margin-bottom:10px;"></i>
                    <p style="color:#888;font-size:13px;">No downloads yet</p>
                </div>
            `;
        }
    } catch (err) {
        historyContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;">
                <p style="color:#888;font-size:13px;">Loading history...</p>
            </div>
        `;
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

// =====================
// SIDEBAR FUNCTIONS
// =====================

function renderSidebar() {
    const ad = getRandomAd();
    
    return `
        <div class="sidebar-card sidebar-ad">
            <a href="purchase.html" target="_blank">
                <img src="${ad.desktop}" alt="Ad" loading="lazy">
            </a>
        </div>
        <div class="sidebar-card">
            <div class="sidebar-title"><i class="fas fa-fire"></i> Supported Platforms</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#e8f0fe;border-radius:8px;">
                    <i class="fab fa-facebook" style="color:#1877f2;font-size:20px;"></i>
                    <span style="font-size:13px;font-weight:600;">Facebook Videos</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fce4ec;border-radius:8px;">
                    <i class="fab fa-instagram" style="color:#E4405F;font-size:20px;"></i>
                    <span style="font-size:13px;font-weight:600;">Instagram Videos</span>
                </div>
            </div>
        </div>
        <div class="sidebar-card">
            <div class="sidebar-title"><i class="fas fa-tags"></i> Popular Tags</div>
            <div class="tag-list">
                <a href="#" class="tag-item">Facebook</a>
                <a href="#" class="tag-item">Instagram</a>
                <a href="#" class="tag-item">HD Video</a>
                <a href="#" class="tag-item">Reels</a>
                <a href="#" class="tag-item">Free</a>
                <a href="#" class="tag-item">MP4</a>
            </div>
        </div>
        <div class="sidebar-card sidebar-ad">
            <a href="purchase.html" target="_blank">
                <img src="${getRandomAd().desktop}" alt="Ad" loading="lazy">
            </a>
        </div>
    `;
}

function renderVideoContent(data, firstVideo, formatButtons, randomAd, platform) {
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    
    return `
    <div style="background:#fff;padding:18px;border-radius:14px;color:#111;box-shadow:0 4px 20px rgba(0,0,0,0.1);border:2px solid #e4e6eb;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="background:${platformColor};color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px;">
                <i class="fab ${platformIcon}"></i> ${platformName}
            </span>
        </div>
        
        <video controls playsinline style="width:100%;border-radius:10px;background:#000;max-height:400px;">
            <source src="${firstVideo}" type="video/mp4">
        </video>
        <div class="video-info-card">
            <h3 class="video-title">${data.title || platformName + ' Video'}</h3>
            ${data.uploader ? `
            <div class="uploader-info">
                <div class="uploader-avatar"><i class="fas fa-user"></i></div>
                <div class="uploader-details">
                    <div class="uploader-name">${data.uploader}</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Content Creator</div>
                </div>
                ${data.uploader_url ? `
                <a href="${data.uploader_url}" target="_blank" class="uploader-link">
                    <i class="fas fa-external-link-alt"></i> Visit Profile
                </a>` : ''}
            </div>` : ''}
        </div>
        <div style="margin:14px 0;border-radius:10px;overflow:hidden;border:2px solid #e4e6eb;">
            <a href="purchase.html" target="_blank">
                <img src="${randomAd.desktop}" style="width:100%;display:block;" alt="Ad" loading="lazy">
            </a>
        </div>
        <div style="margin:14px 0;">
            <p style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px;">
                <i class="fas fa-arrow-down" style="color:${platformColor};"></i> Available Downloads:
            </p>
            ${formatButtons}
        </div>
        <button onclick="resetDownloader()" 
            style="margin-top:8px;padding:14px 20px;width:100%;border:2px solid #e4e6eb;background:#f8f9fa;color:#333;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="fas fa-redo"></i> Download Another Video
        </button>
        <button onclick="window.location.href='purchase.html'" 
            style="margin-top:8px;padding:14px 20px;width:100%;border:2px solid #e74c3c;background:#e74c3c;color:#fff;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="fas fa-dollar"></i> BUY THIS TOOL
        </button>
        <p style="text-align:center;margin-top:12px;padding-top:12px;border-top:2px solid #e4e6eb;color:var(--text-secondary);font-size:12px;">
            Ardi Mobile Inc | Developed by <strong style="background:linear-gradient(135deg,#1877f2,#E4405F);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Yasin Gelma</strong>
        </p>
    </div>
    `;
}

function showResultWithSidebar(data, firstVideo, formatButtons, randomAd, platform) {
    const isDesktop = window.innerWidth >= 1025;
    
    if (isDesktop) {
        return `
            <div class="result-layout">
                <div class="result-main">
                    ${renderVideoContent(data, firstVideo, formatButtons, randomAd, platform)}
                </div>
                <div class="result-sidebar">
                    <div class="sidebar-sticky" style="position:sticky;top:80px;">
                        ${renderSidebar()}
                    </div>
                </div>
            </div>
        `;
    } else {
        return renderVideoContent(data, firstVideo, formatButtons, randomAd, platform);
    }
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.innerHTML = renderSidebar();
}

// Credit protection
(function () {
    const REDIRECT_URL = "https://yasing.com.et/purchase.html";
    
    function checkCredit() {
        const credit = document.getElementById("credit-link");
        if (!credit || credit.innerText.trim() === "") {
            if (!window.location.href.includes(REDIRECT_URL)) {
                window.location.href = REDIRECT_URL;
            }
        }
    }
    
    setTimeout(checkCredit, Math.random() * 3000 + 1000);
    setInterval(checkCredit, 4000);
})();