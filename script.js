const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

const ICON_URL = 'https://raw.githubusercontent.com/ArdiMobile/FbDownApp/main/images/Galmee%20icon.png';
const SITE_URL = 'https://yasing.com.et';

function detectPlatform(url) {
    if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
    return 'unknown';
}

function isValidUrl(url) {
    return url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch') ||
           url.includes('instagram.com') || url.includes('instagr.am');
}

document.addEventListener('DOMContentLoaded', () => { initSidebar(); });

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text) && text !== urlInput.value) urlInput.value = text;
    } catch (e) { urlInput.placeholder = "Paste Facebook or Instagram link..."; }
});

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
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabId)) link.classList.add('active');
    });
    document.getElementById('drawer')?.classList.remove('show');
    document.getElementById('drawerOverlay')?.classList.remove('show');
}

function downloadVideo(url, quality) {
    const a = document.createElement('a');
    a.href = url; a.download = `galmee-${quality}.mp4`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function processPreview(url) {
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<span class="btn-spinner"></span>`;

    const platform = detectPlatform(url);
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';

    preview.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:20px;background:rgba(255,255,255,0.05);border-radius:16px;">
            <span class="btn-spinner" style="width:24px;height:24px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></span>
            <span style="color:#fff;font-size:14px;font-weight:500;">Fetching ${platformName} video...</span>
        </div>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `<div style="background:#fff;padding:24px;border-radius:16px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.08);"><div style="width:50px;height:50px;background:#ffe0e0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;"><i class="fas fa-exclamation-circle" style="font-size:22px;color:#e74c3c;"></i></div><h4 style="color:#e74c3c;font-weight:700;font-size:14px;margin-bottom:4px;">Failed to Fetch</h4><p style="color:#888;font-size:12px;margin-bottom:12px;">${data.message||'Please try a different link'}</p><button onclick="resetDownloader()" style="padding:10px 24px;background:#009959;color:#fff;border:none;border-radius:25px;font-size:12px;font-weight:600;cursor:pointer;">Try Again</button></div>`;
            return;
        }

        saveToHistory(data, platform);
        const thumbnail = data.thumbnail || '';
        const title = data.title || platformName + ' Video';
        const uploader = data.uploader || '';
        const firstVideo = data.formats[0]?.url;

        const qConfig = {
            '2160p':{gradient:'linear-gradient(145deg,#8B0000,#5c0000)',emoji:'👑'},
            '1920p':{gradient:'linear-gradient(145deg,#009959,#006b3d)',emoji:'💎'},
            '1280p':{gradient:'linear-gradient(145deg,#0077cc,#005a99)',emoji:'⭐'},
            '1080p':{gradient:'linear-gradient(145deg,#e67e22,#c0651f)',emoji:'🔥'},
            '720p':{gradient:'linear-gradient(145deg,#8e44ad,#6c3483)',emoji:'✨'},
            '480p':{gradient:'linear-gradient(145deg,#2ecc71,#27ae60)',emoji:'📱'},
            '360p':{gradient:'linear-gradient(145deg,#95a5a6,#7f8c8d)',emoji:'📶'}
        };

                let qualityButtons = data.formats.map((f, index) => {
            const qConfig = {
                '2160p':{gradient:'linear-gradient(145deg,#8B0000,#5c0000)',emoji:'👑'},
                '1080p':{gradient:'linear-gradient(145deg,#e67e22,#c0651f)',emoji:'🔥'},
                '720p':{gradient:'linear-gradient(145deg,#8e44ad,#6c3483)',emoji:'✨'},
                '480p':{gradient:'linear-gradient(145deg,#2ecc71,#27ae60)',emoji:'📱'},
            };
            
            const baseQ = f.quality.replace(/ 🔊| 🔇/g, '').trim();
            const q = qConfig[baseQ] || {gradient:'linear-gradient(145deg,#009959,#006b3d)',emoji:'📥'};
            const isBest = index === 0;
            
            return `<button onclick="downloadVideo('${f.url}','${f.quality}')" 
                style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:${isBest?'13px 14px':'11px 12px'};margin-bottom:6px;background:${q.gradient};color:#fff;border:none;border-radius:10px;font-size:${isBest?'13px':'12px'};font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:${isBest?'0 4px 15px rgba(0,0,0,0.25)':'0 2px 6px rgba(0,0,0,0.1)'};" 
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)'" 
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='${isBest?'0 4px 15px rgba(0,0,0,0.25)':'0 2px 6px rgba(0,0,0,0.1)'}'">
                <span style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:15px;">${q.emoji}</span>
                    <span>${f.quality} ${isBest?'<span style="opacity:0.8;font-weight:400;font-size:11px;">· Best</span>':''}</span>
                </span>
                <span style="display:flex;align-items:center;gap:4px;">
                    <i class="fas fa-download" style="font-size:13px;"></i>
                </span>
            </button>`;
        }).join('');
        preview.innerHTML = `
            <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1);border:1px solid #f0f0f0;">
                <div style="display:flex;flex-wrap:wrap;">
                    <div style="position:relative;width:320px;flex-shrink:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:200px;">
                        <video controls playsinline poster="${thumbnail}" style="width:100%;height:100%;object-fit:contain;max-height:240px;" onplay="this.parentElement.querySelector('.video-watermark').style.opacity='0'" onpause="this.parentElement.querySelector('.video-watermark').style.opacity='1'" onended="this.parentElement.querySelector('.video-watermark').style.opacity='1'"><source src="${firstVideo}" type="video/mp4"></video>
                        <div class="video-watermark" style="position:absolute;bottom:8px;left:8px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.65);padding:4px 8px;border-radius:16px;transition:opacity 0.3s;z-index:5;pointer-events:none;"><img src="${ICON_URL}" style="width:16px;height:16px;border-radius:4px;"><span style="font-size:9px;font-weight:800;color:#009959;">GALMEE</span></div>
                        <span style="position:absolute;top:8px;left:8px;background:${platformColor};color:#fff;padding:3px 8px;border-radius:5px;font-size:9px;font-weight:600;z-index:5;"><i class="fab ${platformIcon}"></i> ${platformName}</span>
                        ${data.duration?`<span style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.75);color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;">${Math.floor(data.duration/60)}:${(data.duration%60).toString().padStart(2,'0')}</span>`:''}
                    </div>
                    <div style="flex:1;min-width:240px;padding:16px 18px;display:flex;flex-direction:column;justify-content:center;">
                        <div style="margin-bottom:10px;">
                            <h4 style="font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.3;margin:0 0 3px 0;">${title}</h4>
                            ${uploader?`<p style="font-size:11px;color:#4a6b56;margin:0;font-weight:500;display:flex;align-items:center;gap:5px;"><i class="fas fa-user-circle" style="color:#009959;font-size:13px;"></i>${uploader}</p>`:''}
                        </div>
                        <div style="margin-bottom:8px;">${qualityButtons}</div>
                        <div style="display:flex;gap:6px;">
                            <button onclick="resetDownloader()" style="flex:1;padding:9px;border:2px solid #d4e6da;background:#fff;color:#002611;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 0.2s;" onmouseover="this.style.background='#e6f5ee';this.style.borderColor='#009959'" onmouseout="this.style.background='#fff';this.style.borderColor='#d4e6da'"><i class="fas fa-redo" style="font-size:10px;"></i> New Video</button>
                            <a href="page/purchase.html" style="flex:1;padding:9px;border:none;background:linear-gradient(135deg,#FEC601,#e6b300);color:#002611;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;text-decoration:none;transition:all 0.2s;box-shadow:0 3px 12px rgba(254,198,1,0.3);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 5px 18px rgba(254,198,1,0.5)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 3px 12px rgba(254,198,1,0.3)'" id="credit-link"><i class="fas fa-crown" style="font-size:10px;"></i> Buy Galmee</a>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                <span style="font-size:10px;font-weight:600;color:#888;">Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Download FB & IG videos free: '+SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#0088cc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fab fa-twitter"></i></a>
            </div>`;
    } catch (err) {
        preview.innerHTML = `<div style="background:#fff;padding:24px;border-radius:16px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.08);"><div style="width:50px;height:50px;background:#ffe0e0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;"><i class="fas fa-wifi" style="font-size:22px;color:#e74c3c;"></i></div><h4 style="color:#e74c3c;font-weight:700;font-size:14px;">Connection Error</h4><p style="color:#888;font-size:12px;margin-bottom:12px;">Check your internet and try again</p><button onclick="resetDownloader()" style="padding:10px 24px;background:#009959;color:#fff;border:none;border-radius:25px;font-size:12px;font-weight:600;cursor:pointer;">Try Again</button></div>`;
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
    return `
        <div class="sidebar-card"><div style="background:#f0f0f0;padding:40px 20px;border-radius:8px;text-align:center;color:#999;font-size:12px;font-weight:500;"><i class="fas fa-ad" style="font-size:20px;display:block;margin-bottom:6px;"></i>Ad Space</div></div>
        <div class="sidebar-card">
            <div class="sidebar-title"><img src="${ICON_URL}" style="width:18px;height:18px;border-radius:4px;"> Supported</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#e6f5ee;border-radius:10px;border-left:3px solid #1877f2;"><i class="fab fa-facebook" style="color:#1877f2;font-size:18px;"></i><div><span style="font-size:12px;font-weight:600;color:#002611;">Facebook</span><span style="font-size:9px;color:#4a6b56;display:block;">Videos, Reels</span></div></div>
                <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#fff9e6;border-radius:10px;border-left:3px solid #E4405F;"><i class="fab fa-instagram" style="color:#E4405F;font-size:18px;"></i><div><span style="font-size:12px;font-weight:600;color:#002611;">Instagram</span><span style="font-size:9px;color:#4a6b56;display:block;">Reels, Stories</span></div></div>
            </div>
        </div>
        <div class="sidebar-card">
            <div class="sidebar-title"><i class="fas fa-tags"></i> Tags</div>
            <div class="tag-list">
                <span class="tag-item">Facebook</span><span class="tag-item">Instagram</span><span class="tag-item">HD</span><span class="tag-item">Reels</span><span class="tag-item">Free</span><span class="tag-item">MP4</span>
            </div>
        </div>
        <div class="sidebar-card"><div style="background:#f0f0f0;padding:40px 20px;border-radius:8px;text-align:center;color:#999;font-size:12px;font-weight:500;"><i class="fas fa-ad" style="font-size:20px;display:block;margin-bottom:6px;"></i>Ad Space</div></div>`;
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.innerHTML = renderSidebar();
}