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

document.addEventListener('DOMContentLoaded', () => { 
    if (typeof initSidebar === 'function') initSidebar(); 
});

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
    a.href = url;
    a.download = `galmee-${quality}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function processPreview(url) {
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<span class="btn-spinner"></span>`;

    const platform = detectPlatform(url);
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';

    preview.innerHTML = `<div style="text-align:center;padding:20px;"><span class="btn-spinner" style="width:24px;height:24px;border:2px solid rgba(0,153,89,0.3);border-top:2px solid #009959;display:inline-block;border-radius:50%;animation:spin 0.6s linear infinite;"></span><p style="color:#4a6b56;font-size:13px;margin-top:8px;">Fetching ${platformName} video...</p></div>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `<div style="background:#fff;padding:20px;border-radius:14px;text-align:center;border:1px solid #d4e6da;"><p style="color:#e74c3c;font-weight:600;font-size:14px;">❌ ${data.message || 'Failed to fetch video'}</p><button onclick="resetDownloader()" style="margin-top:10px;padding:8px 20px;background:#009959;color:#fff;border:none;border-radius:20px;font-size:12px;cursor:pointer;">Try Again</button></div>`;
            return;
        }

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

        let qualityButtons = '';
        data.formats.forEach((f, index) => {
            const q = qConfig[f.quality] || {gradient:'linear-gradient(145deg,#009959,#006b3d)',emoji:'📥'};
            const isBest = index === 0;
            const hasAudio = f.has_audio || false;
            const fileSize = f.filesize_approx ? (f.filesize_approx/1024/1024).toFixed(1) + 'MB' : '';
            
            qualityButtons += `<button onclick="downloadVideo('${f.url}','${f.quality}')" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:${isBest?'13px 14px':'11px 12px'};margin-bottom:6px;background:${q.gradient};color:#fff;border:none;border-radius:10px;font-size:${isBest?'13px':'11px'};font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:${isBest?'0 4px 15px rgba(0,0,0,0.25)':'0 2px 6px rgba(0,0,0,0.1)'};" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:15px;">${q.emoji}</span>${f.quality} ${isBest?'<span style="opacity:0.8;font-weight:400;font-size:11px;">· Best</span>':''}</span><span style="display:flex;align-items:center;gap:6px;">${hasAudio?'<span style="font-size:9px;background:rgba(0,200,83,0.25);color:#00c853;padding:2px 7px;border-radius:4px;font-weight:700;">🎵 SOUND</span>':'<span style="font-size:9px;background:rgba(255,255,255,0.1);color:#aaa;padding:2px 7px;border-radius:4px;">🔇 MUTED</span>'}${fileSize?'<span style="font-size:9px;background:rgba(255,255,255,0.2);padding:2px 7px;border-radius:8px;">'+fileSize+'</span>':''}<i class="fas fa-download" style="font-size:12px;"></i></span></button>`;
        });

        preview.innerHTML = `
            <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1);border:1px solid #f0f0f0;">
                <div style="display:flex;flex-wrap:wrap;">
                    <div style="position:relative;width:320px;flex-shrink:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:200px;">
                        <video controls playsinline poster="${thumbnail}" style="width:100%;height:100%;object-fit:contain;max-height:240px;"><source src="${firstVideo}" type="video/mp4"></video>
                        <div style="position:absolute;bottom:8px;left:8px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.65);padding:4px 8px;border-radius:16px;z-index:5;pointer-events:none;"><img src="${ICON_URL}" style="width:16px;height:16px;border-radius:4px;"><span style="font-size:9px;font-weight:800;color:#009959;">GALMEE</span></div>
                        <span style="position:absolute;top:8px;left:8px;background:${platformColor};color:#fff;padding:3px 8px;border-radius:5px;font-size:9px;font-weight:600;z-index:5;"><i class="fab ${platformIcon}"></i> ${platformName}</span>
                    </div>
                    <div style="flex:1;min-width:240px;padding:16px 18px;">
                        <h4 style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 4px 0;">${title}</h4>
                        ${uploader?`<p style="font-size:11px;color:#4a6b56;margin:0 0 10px 0;">${uploader}</p>`:''}
                        ${qualityButtons}
                        <div style="display:flex;gap:6px;margin-top:10px;">
                            <button onclick="resetDownloader()" style="flex:1;padding:9px;border:2px solid #d4e6da;background:#fff;color:#002611;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;"><i class="fas fa-redo"></i> New Video</button>
                            <a href="page/purchase.html" style="flex:1;padding:9px;border:none;background:linear-gradient(135deg,#FEC601,#e6b300);color:#002611;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;"><i class="fas fa-crown"></i> Buy Galmee</a>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex;justify-content:center;gap:8px;margin-top:8px;">
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Free Video Downloader: '+SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#0088cc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;"><i class="fab fa-twitter"></i></a>
            </div>`;
    } catch (err) {
        console.log('Error:', err);
        preview.innerHTML = `<div style="background:#fff;padding:20px;border-radius:14px;text-align:center;border:1px solid #d4e6da;"><p style="color:#e74c3c;font-weight:600;">Connection error. Check your internet.</p><button onclick="resetDownloader()" style="margin-top:10px;padding:8px 20px;background:#009959;color:#fff;border:none;border-radius:20px;font-size:12px;cursor:pointer;">Try Again</button></div>`;
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

function renderSidebar() {
    return `
        <div class="sidebar-card"><div style="background:#f0f0f0;padding:40px 20px;border-radius:8px;text-align:center;color:#999;font-size:12px;font-weight:500;"><i class="fas fa-ad" style="font-size:20px;display:block;margin-bottom:6px;"></i>Ad Space</div></div>
        <div class="sidebar-card">
            <div class="sidebar-title"><img src="${ICON_URL}" style="width:18px;height:18px;border-radius:4px;"> Supported</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#e6f5ee;border-radius:10px;border-left:3px solid #1877f2;"><i class="fab fa-facebook" style="color:#1877f2;"></i><div><span style="font-size:12px;font-weight:600;">Facebook</span><span style="font-size:9px;color:#4a6b56;display:block;">Videos, Reels</span></div></div>
                <div style="display:flex;align-items:center;gap:8px;padding:10px;background:#fff9e6;border-radius:10px;border-left:3px solid #E4405F;"><i class="fab fa-instagram" style="color:#E4405F;"></i><div><span style="font-size:12px;font-weight:600;">Instagram</span><span style="font-size:9px;color:#4a6b56;display:block;">Reels, Stories</span></div></div>
            </div>
        </div>
        <div class="sidebar-card"><div style="background:#f0f0f0;padding:40px 20px;border-radius:8px;text-align:center;color:#999;font-size:12px;font-weight:500;"><i class="fas fa-ad" style="font-size:20px;display:block;margin-bottom:6px;"></i>Ad Space</div></div>`;
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) sidebarContent.innerHTML = renderSidebar();
}