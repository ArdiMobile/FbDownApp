const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

const ICON_URL = 'https://raw.githubusercontent.com/ArdiMobile/FbDownApp/main/images/Galmee%20icon.png';
const SITE_URL = 'https://yasing.com.et';

function detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
    return 'unknown';
}

function isValidUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be') ||
           url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch') ||
           url.includes('instagram.com') || url.includes('instagr.am');
}

document.addEventListener('DOMContentLoaded', () => { initSidebar(); });

urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (isValidUrl(text) && text !== urlInput.value) urlInput.value = text;
    } catch (e) {}
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
    const platformName = platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'youtube' ? 'fa-youtube' : platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'youtube' ? '#FF0000' : platform === 'instagram' ? '#E4405F' : '#1877f2';

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

        const thumbnail = data.thumbnail || '';
        const title = data.title || platformName + ' Video';
        const uploader = data.uploader || '';
        const firstVideo = data.formats[0]?.url;

        let qualityButtons = data.formats.map((f, index) => {
            const isBest = index === 0;
            return `<button onclick="downloadVideo('${f.url}','${f.quality}')" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:${isBest?'13px 14px':'11px 12px'};margin-bottom:6px;background:linear-gradient(145deg,#009959,#006b3d);color:#fff;border:none;border-radius:10px;font-size:${isBest?'13px':'12px'};font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><span>${f.quality}</span><i class="fas fa-download"></i></button>`;
        }).join('');

        preview.innerHTML = `
            <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1);">
                <div style="display:flex;flex-wrap:wrap;">
                    <div style="position:relative;width:320px;flex-shrink:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:200px;">
                        <video controls playsinline poster="${thumbnail}" style="width:100%;height:100%;object-fit:contain;max-height:240px;"><source src="${firstVideo}" type="video/mp4"></video>
                    </div>
                    <div style="flex:1;min-width:240px;padding:16px 18px;">
                        <h4 style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:10px;">${title}</h4>
                        ${qualityButtons}
                    </div>
                </div>
            </div>`;
    } catch (err) {
        preview.innerHTML = `<div style="background:#fff;padding:24px;border-radius:16px;text-align:center;"><p style="color:#e74c3c;">Connection Error. Please try again.</p><button onclick="resetDownloader()">Try Again</button></div>`;
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
    }
}

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();   // This prevents page reload
    const url = urlInput.value.trim();
    if (!url) return alert("Please paste a link");
    if (!isValidUrl(url)) return alert("Please enter a valid YouTube, Facebook or Instagram URL");
    await processPreview(url);
});

function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
    dlBtnIcon.style.display = "block";
    btnLoader.style.display = "none";
}

function initSidebar() {
    // Keep your sidebar as is
}