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

let autoDetectEnabled = true;

document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    initSidebar();
    startClipboardWatcher();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkClipboardOnce();
    });
});

// ============ AUTO-PASTE & DETECTION ============

let lastClipboardText = '';
let clipboardCheckInterval = null;

function startClipboardWatcher() {
    if (clipboardCheckInterval) clearInterval(clipboardCheckInterval);
    clipboardCheckInterval = setInterval(checkClipboardOnce, 2000);
    checkClipboardOnce();
}

async function checkClipboardOnce() {
    if (!autoDetectEnabled) return;
    if (document.activeElement === urlInput) return;
    
    try {
        const text = await navigator.clipboard.readText();
        if (!text || text === lastClipboardText) return;
        
        lastClipboardText = text;
        
        if (isValidUrl(text)) {
            const lastUrl = sessionStorage.getItem('lastAutoDetectUrl');
            if (lastUrl === text) return;
            
            sessionStorage.setItem('lastAutoDetectUrl', text);
            urlInput.value = text;
            
            urlInput.style.background = '#e6f5ee';
            urlInput.style.borderColor = '#009959';
            setTimeout(() => { 
                urlInput.style.background = ''; 
                urlInput.style.borderColor = '';
            }, 1500);
            
            const platform = detectPlatform(text);
            showAutoDetectNotification(platform);
            
            setTimeout(() => {
                if (urlInput.value === text) {
                    processPreview(text);
                }
            }, 800);
        }
    } catch (e) {}
}

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text) && text !== urlInput.value) {
            urlInput.value = text;
            urlInput.style.background = '#e6f5ee';
            setTimeout(() => { urlInput.style.background = ''; }, 500);
        }
    } catch (e) {
        urlInput.placeholder = "Paste Facebook or Instagram link...";
    }
});

urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const pastedText = urlInput.value.trim();
        if (isValidUrl(pastedText)) {
            urlInput.style.background = '#e6f5ee';
            setTimeout(() => { urlInput.style.background = ''; }, 500);
            setTimeout(() => {
                if (urlInput.value === pastedText && document.activeElement === urlInput) {
                    processPreview(pastedText);
                }
            }, 600);
        }
    }, 100);
});

function showAutoDetectNotification(platform) {
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';
    
    preview.innerHTML = `
        <div style="text-align:center;padding:16px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <img src="${ICON_URL}" style="width:24px;height:24px;border-radius:6px;" alt="Galmee">
                <span style="background:${platformColor};color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;">
                    <i class="fab ${platformIcon}"></i> ${platformName}
                </span>
                <span style="color:#fff;font-size:13px;font-weight:600;">Link detected!</span>
            </div>
            <div class="btn-spinner" style="margin:0 auto 8px;"></div>
            <p style="color:rgba(255,255,255,0.8);font-size:12px;">Fetching ${platformName} video...</p>
        </div>
    `;
}

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
    a.download = `galmee-video-${quality}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ============ FORMAT VIEWS/REACTIONS ============

function formatCount(num) {
    if (!num) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ============ PREVIEW PROCESSING ============

async function processPreview(url) {
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<span class="btn-spinner"></span>`;

    
    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            let errorMessage = data.message || 'Failed to fetch video';
            let errorIcon = 'fa-exclamation-circle';
            let errorTitle = 'Error';
            let suggestions = [];
            
            if (errorMessage.toLowerCase().includes('rate-limit') || errorMessage.toLowerCase().includes('rate limit')) {
                errorIcon = 'fa-clock';
                errorTitle = 'Too Many Requests';
                suggestions = ['Wait a few minutes and try again', 'Make sure the video is from a public account', 'Try a different video link'];
            } else if (errorMessage.toLowerCase().includes('login')) {
                errorIcon = 'fa-lock';
                errorTitle = 'Login Required';
                suggestions = ['This content requires login to view', 'Make sure the account is public', 'Try a public account'];
            } else if (errorMessage.toLowerCase().includes('not available') || errorMessage.toLowerCase().includes('not found')) {
                errorIcon = 'fa-eye-slash';
                errorTitle = 'Content Not Available';
                suggestions = ['This video may be private or deleted', 'Check if the link is correct', 'Try copying the link again'];
            } else if (errorMessage.toLowerCase().includes('private')) {
                errorIcon = 'fa-lock';
                errorTitle = 'Private Content';
                suggestions = ['This is from a private account', 'Only public videos can be downloaded', 'Ask the owner to make it public'];
            }
            
            preview.innerHTML = `
                <div style="background:#fff;padding:20px;border-radius:14px;border:1px solid #e0e0e0;text-align:center;">
                    <img src="${ICON_URL}" style="width:40px;height:40px;border-radius:8px;margin-bottom:10px;" alt="Galmee">
                    <i class="fas ${errorIcon}" style="font-size:40px;color:#e74c3c;display:block;margin-bottom:8px;"></i>
                    <h4 style="color:#e74c3c;font-weight:700;font-size:14px;margin-bottom:4px;">${errorTitle}</h4>
                    <p style="color:#666;font-size:12px;margin-bottom:12px;">${errorMessage}</p>
                    ${suggestions.length > 0 ? `
                    <div style="text-align:left;background:#fff9e6;padding:10px 14px;border-radius:10px;margin-bottom:10px;border-left:3px solid #FEC601;">
                        <p style="font-size:11px;font-weight:600;color:#002611;margin-bottom:4px;"><i class="fas fa-lightbulb" style="color:#FEC601;"></i> Suggestions:</p>
                        ${suggestions.map(s => `<p style="font-size:10px;color:#4a6b56;margin:2px 0;">• ${s}</p>`).join('')}
                    </div>` : ''}
                    <button onclick="resetDownloader()" style="padding:10px 24px;background:#009959;color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-redo"></i> Try Another Video
                    </button>
                </div>
            `;
            return;
        }

        saveToHistory(data, platform);
        const thumbnail = data.thumbnail || '';
        const title = data.title || platformName + ' Video';
        const uploader = data.uploader || '';
        const views = data.view_count || data.like_count || 0;
        const reactions = data.like_count || 0;
        const description = data.description || '';
        const tags = data.tags || [];
        const duration = data.duration || 0;

        // Quality colors matching brand
        const qualityConfig = {
            '1920p': { bg: '#009959', gradient: 'linear-gradient(135deg, #009959, #007a47)', label: 'Full HD', borderColor: '#007a47' },
            '1280p': { bg: '#007a47', gradient: 'linear-gradient(135deg, #007a47, #005a35)', label: 'HD', borderColor: '#005a35' },
            '1080p': { bg: '#009959', gradient: 'linear-gradient(135deg, #009959, #007a47)', label: 'Full HD', borderColor: '#007a47' },
            '960p': { bg: '#FEC601', gradient: 'linear-gradient(135deg, #FEC601, #e6b300)', label: 'SD', borderColor: '#cc9f00' },
            '720p': { bg: '#007a47', gradient: 'linear-gradient(135deg, #007a47, #005a35)', label: 'HD', borderColor: '#005a35' },
            '480p': { bg: '#5a8a6a', gradient: 'linear-gradient(135deg, #5a8a6a, #4a7a5a)', label: 'Medium', borderColor: '#3a6a4a' },
            '360p': { bg: '#8a9a8a', gradient: 'linear-gradient(135deg, #8a9a8a, #6a7a6a)', label: 'Low', borderColor: '#5a6a5a' }
        };

        let qualityButtons = data.formats.map((f, index) => {
            const config = qualityConfig[f.quality] || { bg: '#009959', gradient: 'linear-gradient(135deg, #009959, #007a47)', label: f.quality, borderColor: '#007a47' };
            const isBest = index === 0;
            
            return `
                <button onclick="downloadVideo('${f.url}', '${f.quality}')"
                   style="display:flex;align-items:center;justify-content:space-between;width:100%;
                   padding:10px 12px;margin-bottom:6px;
                   background:${isBest ? '#009959' : '#f5f5f5'};
                   color:${isBest ? '#fff' : '#333'};
                   border:${isBest ? 'none' : '1px solid #e0e0e0'};border-radius:8px;font-size:12px;
                   font-weight:${isBest ? '700' : '500'};cursor:pointer;
                   transition:all 0.15s ease;"
                   onmouseover="this.style.opacity='0.85'"
                   onmouseout="this.style.opacity='1'">
                   <span style="display:flex;align-items:center;gap:6px;">
                      ${isBest ? '<span style="background:#007a47;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">BEST</span>' : ''}
                      <i class="fas fa-download" style="font-size:11px;"></i>
                      <span>${f.quality}</span>
                   </span>
                   <span>${f.quality}</span>
                </button>
            `;
        }).join('');

        // Tags HTML
        let tagsHTML = '';
        if (tags.length > 0) {
            tagsHTML = tags.slice(0, 10).map(tag => 
                `<span style="color:#1877f2;font-size:11px;margin-right:4px;">#${tag}</span>`
            ).join(' ');
        } else if (description) {
            // Extract hashtags from description
            const hashtags = description.match(/#\w+/g) || [];
            tagsHTML = hashtags.slice(0, 10).map(tag => 
                `<span style="color:#1877f2;font-size:11px;margin-right:4px;">${tag}</span>`
            ).join(' ');
        }

        // Desktop Layout (matching screenshot exactly)
        preview.innerHTML = `
            <!-- Desktop Layout -->
            <div class="preview-desktop" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden;display:flex;flex-wrap:wrap;">
                
                <!-- LEFT: Thumbnail -->
                <div style="position:relative;width:300px;min-height:300px;flex-shrink:0;background:#000;
                    ${thumbnail ? `background-image:url('${thumbnail}');background-size:cover;background-position:center;` : 'display:flex;align-items:center;justify-content:center;'}">
                    
                    ${!thumbnail ? `<img src="${ICON_URL}" style="width:50px;height:50px;border-radius:10px;opacity:0.8;" alt="">` : ''}
                    
                    <!-- Platform Badge - Top Left -->
                    <span style="position:absolute;top:10px;left:10px;background:${platformColor};color:#fff;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;">
                        <i class="fab ${platformIcon}"></i> ${platformName}
                    </span>
                    
                    <!-- Play Button - Center -->
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                        width:55px;height:55px;background:rgba(0,153,89,0.85);border-radius:50%;
                        display:flex;align-items:center;justify-content:center;
                        border:3px solid rgba(255,255,255,0.9);cursor:pointer;">
                        <div style="width:0;height:0;border-left:18px solid #fff;border-top:11px solid transparent;border-bottom:11px solid transparent;margin-left:4px;"></div>
                    </div>
                    
                    <!-- GALMEE Watermark - Bottom Left -->
                    <div style="position:absolute;bottom:10px;left:10px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.6);padding:4px 8px;border-radius:12px;">
                        <span style="font-size:10px;font-weight:800;color:#009959;letter-spacing:0.5px;">GALMEE</span>
                    </div>
                    
                    <!-- Duration - Bottom Right -->
                    ${duration ? `<span style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:#fff;padding:3px 7px;border-radius:4px;font-size:10px;font-weight:500;">${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}.${Math.floor((duration%1)*1000).toString().padStart(3,'0').substring(0,3)}</span>` : ''}
                </div>
                
                <!-- RIGHT: Content -->
                <div style="flex:1;min-width:280px;padding:16px 20px;display:flex;flex-direction:column;justify-content:space-between;">
                    
                    <!-- Top Content -->
                    <div>
                        <!-- Galmee Icon + Title -->
                        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
                            <img src="${ICON_URL}" style="width:24px;height:24px;border-radius:6px;flex-shrink:0;margin-top:2px;" alt="Galmee">
                            <div style="flex:1;">
                                <h4 style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px 0;line-height:1.3;">${title}</h4>
                                ${uploader ? `<p style="font-size:11px;color:#666;margin:0;font-weight:500;">${uploader}</p>` : ''}
                            </div>
                        </div>
                        
                        <!-- Views & Reactions -->
                        ${views > 0 ? `
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:11px;color:#888;">
                            ${views > 0 ? `<span><i class="fas fa-eye" style="font-size:10px;"></i> ${formatCount(views)} views</span>` : ''}
                            ${reactions > 0 ? `<span>·</span><span><i class="fas fa-heart" style="font-size:10px;color:#e74c3c;"></i> ${formatCount(reactions)} reactions</span>` : ''}
                        </div>` : ''}
                        
                        <!-- Description / Caption -->
                        ${description ? `
                        <p style="font-size:11px;color:#555;line-height:1.4;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">
                            ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}
                        </p>` : ''}
                        
                        <!-- Tags -->
                        ${tagsHTML ? `
                        <div style="margin-bottom:8px;line-height:1.5;">
                            ${tagsHTML}
                        </div>` : ''}
                    </div>
                    
                    <!-- Bottom: Download Section -->
                    <div>
                        <p style="font-size:11px;font-weight:700;color:#333;margin-bottom:6px;display:flex;align-items:center;gap:5px;">
                            <i class="fas fa-download" style="color:#009959;font-size:10px;"></i> Downloads:
                        </p>
                        
                        <!-- Quality Buttons -->
                        <div style="margin-bottom:10px;">
                            ${qualityButtons}
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display:flex;gap:8px;">
                            <button onclick="resetDownloader()" 
                                style="flex:1;padding:9px;border:1px solid #e0e0e0;
                                background:#f5f5f5;color:#333;border-radius:8px;font-size:12px;
                                font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;
                                transition:all 0.2s ease;"
                                onmouseover="this.style.background='#eee'"
                                onmouseout="this.style.background='#f5f5f5'">
                                <i class="fas fa-redo" style="font-size:10px;"></i> New Video
                            </button>
                            <a href="page/purchase.html" 
                                style="flex:1;padding:9px;border:1px solid #FEC601;
                                background:#fff;color:#333;border-radius:8px;
                                font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;
                                text-decoration:none;transition:all 0.2s ease;"
                                onmouseover="this.style.background='#fff9e6'"
                                onmouseout="this.style.background='#fff'"
                                id="credit-link">
                                <i class="fas fa-crown" style="font-size:10px;color:#FEC601;"></i> Buy this Tool
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Share Row -->
            <div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:0 4px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:600;color:#666;">Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:32px;height:32px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Download FB & IG videos free: ' + SITE_URL)}" target="_blank" style="width:32px;height:32px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:32px;height:32px;border-radius:50%;background:#0088cc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:32px;height:32px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-twitter"></i></a>
            </div>
        `;

        setTimeout(loadDownloadHistory, 1500);
    } catch (err) {
        console.log('Error:', err);
        preview.innerHTML = `
            <div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e0e0e0;text-align:center;">
                <img src="${ICON_URL}" style="width:40px;height:40px;border-radius:8px;margin-bottom:10px;opacity:0.6;" alt="">
                <i class="fas fa-wifi" style="font-size:40px;color:#e74c3c;display:block;margin-bottom:8px;"></i>
                <h4 style="color:#e74c3c;font-weight:700;font-size:14px;margin-bottom:4px;">Download Error</h4>
                <p style="color:#666;font-size:12px;margin-bottom:12px;">This is may be due to auto url ditection. Check your url.</p>
                <button onclick="resetDownloader()" style="padding:10px 24px;background:#009959;color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">
                    <i class="fas fa-redo"></i> Try Again
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
    lastClipboardText = url;
    await processPreview(url);
});

function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    urlInput.style.background = '';
    urlInput.style.borderColor = '';
    sessionStorage.removeItem('lastAutoDetectUrl');
    lastClipboardText = '';
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
                <div class="history-item" style="cursor:pointer;border-radius:10px;overflow:hidden;background:#fff;border:1px solid #e0e0e0;transition:all 0.2s ease;"
                     onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'"
                     onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
                    <div style="position:relative;width:50%;height:150px;overflow:hidden;background:#000;">
                        <img src="${item.thumbnail || ICON_URL}" alt="${item.title || 'Video'}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
                        <!-- Play Button -->
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                            width:36px;height:36px;background:rgba(0,153,89,0.85);border-radius:50%;
                            display:flex;align-items:center;justify-content:center;
                            border:2px solid rgba(255,255,255,0.9);">
                            <div style="width:0;height:0;border-left:11px solid #fff;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px;"></div>
                        </div>
                        <!-- Platform Badge -->
                        <span style="position:absolute;top:6px;left:6px;background:${platformColor};color:#fff;padding:2px 6px;border-radius:4px;font-size:8px;font-weight:600;">
                            <i class="fab ${platformIcon}"></i>
                        </span>
                    </div>
                    <div style="padding:8px 10px;">
                        <p style="font-size:11px;font-weight:600;color:#333;margin:0 0 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title ? item.title.substring(0, 22) : 'Video'}</p>
                        <p style="font-size:10px;color:#888;margin:0 0 4px 0;">${item.views || '4M'} views · ${item.reactions || '35K'} reactions</p>
                        <span style="font-size:9px;color:#009959;font-weight:600;">${item.quality || 'HD'}</span>
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
                platform: platform || 'facebook',
                views: videoData.view_count || 0,
                reactions: videoData.like_count || 0
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

// ============ CREDIT PROTECTION ============

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