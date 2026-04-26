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

document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    initSidebar();
});

// ============ SIMPLE FOCUS PASTE (No auto-detect) ============

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text) && text !== urlInput.value) {
            urlInput.value = text;
        }
    } catch (e) {
        urlInput.placeholder = "Paste Facebook or Instagram link...";
    }
});

// ============ DRAWER & TABS ============

function toggleDrawer() {
    document.getElementById('drawer')?.classList.toggle('show');
    document.getElementById('drawerOverlay')?.classList.toggle('show');
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
}

// ============ DOWNLOAD FUNCTION ============

function downloadVideo(url, quality) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `galmee-${quality}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ============ PREVIEW PROCESSING ============

async function processPreview(url) {
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<span class="btn-spinner"></span>`;

    const platform = detectPlatform(url);
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';

    preview.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:20px;background:rgba(255,255,255,0.05);border-radius:16px;backdrop-filter:blur(10px);">
            <div class="custom-spinner spinner-dark"></div>
            <span style="color:#fff;font-size:14px;font-weight:500;">Fetching ${platformName} video...</span>
        </div>
    `;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `
                <div style="background:linear-gradient(135deg,#fff,#f8f8f8);padding:24px;border-radius:16px;border:1px solid #eee;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                    <div style="width:56px;height:56px;background:linear-gradient(135deg,#ffe0e0,#ffcccc);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <i class="fas fa-exclamation-circle" style="font-size:24px;color:#e74c3c;"></i>
                    </div>
                    <h4 style="color:#e74c3c;font-weight:700;font-size:15px;margin-bottom:4px;">Failed to Fetch</h4>
                    <p style="color:#888;font-size:13px;margin-bottom:14px;">${data.message || 'Please try a different link'}</p>
                    <button onclick="resetDownloader()" style="padding:10px 28px;background:#009959;color:#fff;border:none;border-radius:25px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 15px rgba(0,153,89,0.3);"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,153,89,0.4)'"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(0,153,89,0.3)'">
                        <i class="fas fa-redo" style="margin-right:5px;"></i> Try Again
                    </button>
                </div>
            `;
            return;
        }

        saveToHistory(data, platform);
        const thumbnail = data.thumbnail || '';
        const title = data.title || platformName + ' Video';
        const uploader = data.uploader || '';
        const firstVideo = data.formats[0]?.url;

        // Quality config
        const qConfig = {
            '2160p': { color: '#8B0000', gradient: 'linear-gradient(145deg,#8B0000,#5c0000)', emoji: '👑' },
            '1920p': { color: '#009959', gradient: 'linear-gradient(145deg,#009959,#006b3d)', emoji: '💎' },
            '1280p': { color: '#0077cc', gradient: 'linear-gradient(145deg,#0077cc,#005a99)', emoji: '⭐' },
            '1080p': { color: '#e67e22', gradient: 'linear-gradient(145deg,#e67e22,#c0651f)', emoji: '🔥' },
            '720p': { color: '#8e44ad', gradient: 'linear-gradient(145deg,#8e44ad,#6c3483)', emoji: '✨' },
            '480p': { color: '#2ecc71', gradient: 'linear-gradient(145deg,#2ecc71,#27ae60)', emoji: '📱' },
            '360p': { color: '#95a5a6', gradient: 'linear-gradient(145deg,#95a5a6,#7f8c8d)', emoji: '📶' }
        };

        let qualityButtons = data.formats.map((f, index) => {
            const q = qConfig[f.quality] || { color: '#009959', gradient: 'linear-gradient(145deg,#009959,#006b3d)', emoji: '📥' };
            const isBest = index === 0;
            
            return `
                <button onclick="downloadVideo('${f.url}','${f.quality}')"
                    style="display:flex;align-items:center;justify-content:space-between;width:100%;
                    padding:${isBest ? '14px 16px' : '12px 14px'};margin-bottom:6px;
                    background:${q.gradient};color:#fff;border:none;border-radius:10px;
                    font-size:${isBest ? '14px' : '12px'};font-weight:600;cursor:pointer;
                    transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
                    box-shadow:${isBest ? '0 6px 20px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.12)'};
                    position:relative;overflow:hidden;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.35)'"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='${isBest ? '0 6px 20px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.12)'}'">
                    <span style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;">${q.emoji}</span>
                        <span>${f.quality} <span style="opacity:0.8;font-weight:400;font-size:${isBest ? '12px' : '11px'};">${isBest ? '· Best Quality' : ''}</span></span>
                    </span>
                    <span style="display:flex;align-items:center;gap:6px;">
                        ${f.filesize_approx ? `<span style="font-size:10px;opacity:0.9;background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:10px;">${(f.filesize_approx/1024/1024).toFixed(1)}MB</span>` : ''}
                        <i class="fas fa-download" style="font-size:13px;"></i>
                    </span>
                </button>
            `;
        }).join('');

        // COMPACT STYLISH LAYOUT: Video Left | Info Right
        preview.innerHTML = `
            <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);border:1px solid #f0f0f0;">
                
                <!-- Main Flex Row -->
                <div style="display:flex;flex-wrap:wrap;">
                    
                    <!-- LEFT: Video Player (340px) -->
                    <div style="position:relative;width:340px;flex-shrink:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:220px;">
                        <video controls playsinline 
                            poster="${thumbnail}"
                            style="width:100%;height:100%;object-fit:contain;max-height:260px;"
                            onplay="this.parentElement.querySelector('.video-watermark').style.opacity='0'"
                            onpause="this.parentElement.querySelector('.video-watermark').style.opacity='1'"
                            onended="this.parentElement.querySelector('.video-watermark').style.opacity='1'">
                            <source src="${firstVideo}" type="video/mp4">
                        </video>
                        
                        <!-- Watermark on Video ONLY -->
                        <div class="video-watermark" style="position:absolute;bottom:8px;left:8px;display:flex;align-items:center;gap:5px;
                            background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);padding:5px 10px;border-radius:20px;
                            transition:opacity 0.3s ease;z-index:5;pointer-events:none;">
                            <img src="${ICON_URL}" style="font-family: 'Playfair Display', Georgia, serif;
            font-style: italic;
            font-size: 26px;
            font-weight: 900;
            background: linear-gradient(135deg, var(--gold) 0%, #ffe680 50%, var(--gold) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;">GALMEE</span>
                        </div>
                        
                        <!-- Platform Badge -->
                        <span style="position:absolute;top:8px;left:8px;background:${platformColor};color:#fff;padding:4px 10px;border-radius:6px;font-size:9px;font-weight:600;z-index:5;">
                            <i class="fab ${platformIcon}"></i> ${platformName}
                        </span>
                        
                        ${data.duration ? `<span style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.75);color:#fff;padding:3px 7px;border-radius:4px;font-size:10px;font-weight:500;">${Math.floor(data.duration/60)}:${(data.duration%60).toString().padStart(2,'0')}</span>` : ''}
                    </div>
                    
                    <!-- RIGHT: Info & Downloads -->
                    <div style="flex:1;min-width:260px;padding:18px 20px;display:flex;flex-direction:column;justify-content:center;">
                        
                        <!-- Title Section -->
                        <div style="margin-bottom:12px;">
                            <h4 style="font-size:15px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0 0 4px 0;">${title}</h4>
                            ${uploader ? `<p style="font-size:12px;color:#666;margin:0;font-weight:500;">${uploader}</p>` : ''}
                        </div>
                        
                        <!-- Download Buttons -->
                        <div style="margin-bottom:10px;">
                            ${qualityButtons}
                        </div>
                        
                        <!-- Actions -->
                        <div style="display:flex;gap:8px;">
                            <button onclick="resetDownloader()"
                                style="flex:1;padding:10px;border:2px solid #e0e0e0;background:#fff;color:#555;border-radius:10px;
                                font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;
                                transition:all 0.2s;"
                                onmouseover="this.style.background='#f5f5f5';this.style.borderColor='#ccc'"
                                onmouseout="this.style.background='#fff';this.style.borderColor='#e0e0e0'">
                                <i class="fas fa-plus-circle"></i> New Link
                            </button>
                            <a href="page/purchase.html"
                                style="flex:1;padding:10px;border:none;background:linear-gradient(135deg,#FEC601,#e6b300);color:#1a1a1a;border-radius:10px;
                                font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;
                                text-decoration:none;transition:all 0.2s;box-shadow:0 4px 15px rgba(254,198,1,0.3);"
                                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(254,198,1,0.5)'"
                                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(254,198,1,0.3)'"
                                id="credit-link">
                                <i class="fas fa-crown"></i> Premium
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Share Bar -->
            <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:600;color:#888;">Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:34px;height:34px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;box-shadow:0 2px 8px rgba(24,119,242,0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Download FB & IG videos free: ' + SITE_URL)}" target="_blank" style="width:34px;height:34px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;box-shadow:0 2px 8px rgba(37,211,102,0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:34px;height:34px;border-radius:50%;background:#0088cc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,136,204,0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:34px;height:34px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-twitter"></i></a>
            </div>
        `;

        setTimeout(loadDownloadHistory, 1500);
    } catch (err) {
        preview.innerHTML = `
            <div style="background:linear-gradient(135deg,#fff,#f8f8f8);padding:24px;border-radius:16px;border:1px solid #eee;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                <div style="width:56px;height:56px;background:linear-gradient(135deg,#ffe0e0,#ffcccc);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fas fa-wifi" style="font-size:24px;color:#e74c3c;"></i>
                </div>
                <h4 style="color:#e74c3c;font-weight:700;font-size:15px;margin-bottom:4px;">Connection Error</h4>
                <p style="color:#888;font-size:13px;margin-bottom:14px;">Check your internet and try again</p>
                <button onclick="resetDownloader()" style="padding:10px 28px;background:#009959;color:#fff;border:none;border-radius:25px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 15px rgba(0,153,89,0.3);"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,153,89,0.4)'"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(0,153,89,0.3)'">
                    <i class="fas fa-redo" style="margin-right:5px;"></i> Try Again
                </button>
            </div>
        `;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    dlBtnIcon.style.display = "block";
    btnLoader.style.display = "none";
}

// ============ HISTORY FUNCTIONS ============

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
                <div style="cursor:pointer;border-radius:12px;overflow:hidden;background:#fff;border:1px solid #f0f0f0;transition:all 0.2s;box-shadow:0 2px 10px rgba(0,0,0,0.04);"
                     onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)'"
                     onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 10px rgba(0,0,0,0.04)'">
                    <div style="position:relative;width:100%;height:140px;overflow:hidden;background:#000;">
                        <img src="${item.thumbnail || ICON_URL}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:34px;height:34px;background:rgba(0,153,89,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.9);">
                            <div style="width:0;height:0;border-left:10px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;margin-left:2px;"></div>
                        </div>
                        <span style="position:absolute;top:5px;left:5px;background:${platformColor};color:#fff;padding:2px 6px;border-radius:4px;font-size:7px;font-weight:600;"><i class="fab ${platformIcon}"></i></span>
                        <span style="position:absolute;bottom:5px;left:5px;font-size:8px;font-weight:800;color:#009959;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:8px;">GALMEE</span>
                    </div>
                    <div style="padding:8px 10px;">
                        <p style="font-size:10px;font-weight:600;color:#333;margin:0 0 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title ? item.title.substring(0,20) : 'Video'}</p>
                        <span style="font-size:8px;color:#009959;font-weight:600;background:#e6f5ee;padding:2px 6px;border-radius:6px;">${item.quality||'HD'}</span>
                    </div>
                </div>`;
            }).join('');
            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;"><img src="${ICON_URL}" style="width:32px;height:32px;border-radius:8px;margin-bottom:8px;opacity:0.5;"><p style="color:#999;font-size:11px;">No downloads yet</p></div>`;
        }
    } catch (err) {
        historyContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;"><p style="color:#999;font-size:11px;">Loading...</p></div>`;
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

// ============ SIDEBAR ============

function renderSidebar() {
    const ad = getRandomAd();
    return `
        <div class="sidebar-card sidebar-ad"><a href="page/purchase.html"><img src="${ad.desktop}" alt="Ad" loading="lazy"></a></div>
        <div class="sidebar-card">
            <div class="sidebar-title"><img src="${ICON_URL}" style="width:18px;height:18px;border-radius:4px;" alt=""> Supported</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#e6f5ee;border-radius:10px;border-left:3px solid #1877f2;">
                    <i class="fab fa-facebook" style="color:#1877f2;font-size:18px;"></i>
                    <div><span style="font-size:12px;font-weight:600;color:#002611;">Facebook</span><span style="font-size:9px;color:#4a6b56;display:block;">Videos, Reels</span></div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#fff9e6;border-radius:10px;border-left:3px solid #E4405F;">
                    <i class="fab fa-instagram" style="color:#E4405F;font-size:18px;"></i>
                    <div><span style="font-size:12px;font-weight:600;color:#002611;">Instagram</span><span style="font-size:9px;color:#4a6b56;display:block;">Reels, Stories</span></div>
                </div>
            </div>
        </div>
        <div class="sidebar-card">
            <div class="sidebar-title"><i class="fas fa-tags"></i> Tags</div>
            <div class="tag-list">
                <a href="#" class="tag-item">FB</a><a href="#" class="tag-item">IG</a><a href="#" class="tag-item">HD</a>
                <a href="#" class="tag-item">Reels</a><a href="#" class="tag-item">Free</a><a href="#" class="tag-item">MP4</a>
            </div>
        </div>
        <div class="sidebar-card sidebar-ad"><a href="page/purchase.html"><img src="${getRandomAd().desktop}" alt="Ad" loading="lazy"></a></div>
    `;
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.innerHTML = renderSidebar();
}

// ============ PROTECTION ============

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