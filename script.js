const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

// Random ads array
const randomAds = [
    {
        desktop: 'https://picsum.photos/600/400?random=1',
        mobile: 'https://picsum.photos/400/300?random=1'
    },
    {
        desktop: 'https://picsum.photos/600/400?random=2',
        mobile: 'https://picsum.photos/400/300?random=2'
    },
    {
        desktop: 'https://picsum.photos/600/400?random=3',
        mobile: 'https://picsum.photos/400/300?random=3'
    },
    {
        desktop: 'https://picsum.photos/600/400?random=4',
        mobile: 'https://picsum.photos/400/300?random=4'
    },
    {
        desktop: 'https://picsum.photos/600/400?random=5',
        mobile: 'https://picsum.photos/400/300?random=5'
    },
    {
        desktop: 'https://picsum.photos/600/400?random=6',
        mobile: 'https://picsum.photos/400/300?random=6'
    }
];

// Get random ad
function getRandomAd() {
    const randomIndex = Math.floor(Math.random() * randomAds.length);
    return randomAds[randomIndex];
}

// Load history and sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    initSidebar();
});

// Drawer toggle
function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('show');
        overlay.classList.toggle('show');
    }
}

// Tab switching
function switchTab(event, tabId) {
    if (event) event.preventDefault();
    
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.drawer-menu a').forEach(a => a.classList.remove('active'));
    
    const panel = document.getElementById(tabId);
    if (panel) {
        panel.classList.add('active');
    }
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabIds = ['tab-home', 'tab-how', 'tab-updates', 'tab-faq', 'tab-apps'];
    const index = tabIds.indexOf(tabId);
    if (index >= 0 && tabBtns[index]) {
        tabBtns[index].classList.add('active');
    }
    
    const drawerLinks = document.querySelectorAll('.drawer-menu a');
    drawerLinks.forEach(link => {
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabId)) {
            link.classList.add('active');
        }
    });
    
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    
    const tabBar = document.getElementById('tabBar');
    if (tabBar) tabBar.scrollIntoView({ behavior: 'smooth' });
}

// AUTO PASTE
urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text.includes("facebook.com")) {
            urlInput.value = text;
        }
    } catch (e) {
        console.log("Clipboard blocked");
    }
});

// SUBMIT
dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return alert("Please paste a Facebook video link");

    // Show spinner on button
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<div style="width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #fff; border-radius: 50%; animation: spin 0.7s linear infinite;"></div>`;

    preview.innerHTML = `
        <div style="text-align:center;padding:50px 20px;">
            <div style="display:flex;align-items:center;justify-content:center;flex-direction:column;">
                <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.2); border-top: 4px solid #fff; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
            <p style="color:rgba(255,255,255,0.95);margin-top:18px;font-size:15px;font-weight:500;">Fetching your video...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        // Hide spinner, show download icon
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `
                <div style="text-align:center;padding:30px;">
                    <i class="fas fa-exclamation-circle" style="font-size:52px;color:#e74c3c;display:block;margin-bottom:14px;"></i>
                    <p style="color:#e74c3c;font-weight:600;font-size:15px;">${data.message}</p>
                </div>
            `;
            return;
        }

        // Save to history
        saveToHistory(data);

        const firstVideo = data.formats[0]?.url;
        const randomAd = getRandomAd();

        // Quality styles with gradients
        const qualityStyles = {
            '1080p': { bg: 'linear-gradient(135deg, #e74c3c, #c0392b)', icon: 'fa-crown', label: 'Full HD', emoji: '👑' },
            '720p': { bg: 'linear-gradient(135deg, #f39c12, #e67e22)', icon: 'fa-star', label: 'HD', emoji: '⭐' },
            '480p': { bg: 'linear-gradient(135deg, #1877f2, #1565c0)', icon: 'fa-video', label: 'SD', emoji: '📹' },
            '360p': { bg: 'linear-gradient(135deg, #2ecc71, #27ae60)', icon: 'fa-play', label: 'Low', emoji: '▶️' },
            '240p': { bg: 'linear-gradient(135deg, #95a5a6, #7f8c8d)', icon: 'fa-download', label: 'Low', emoji: '⬇️' }
        };

        let formatButtons = data.formats.map((f, index) => {
            const style = qualityStyles[f.quality] || { bg: 'linear-gradient(135deg, #1877f2, #1565c0)', icon: 'fa-download', label: f.quality, emoji: '📥' };
            const isBest = index === 0;
            
            return `
                <a href="${f.url}" target="_blank" download
                   style="display:flex;align-items:center;justify-content:center;gap:12px;
                   margin:10px 0;padding:16px 20px;
                   background:${style.bg};color:#fff;border-radius:14px;
                   text-decoration:none;font-weight:600;font-size:15px;
                   box-shadow:0 6px 18px rgba(0,0,0,0.25);
                   transition:all 0.3s ease;
                   position:relative;overflow:hidden;"
                   onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.35)'"
                   onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'">
                   ${isBest ? '<span style="position:absolute;top:10px;right:10px;background:#fff;color:#333;font-size:10px;padding:4px 12px;border-radius:12px;font-weight:700;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">BEST</span>' : ''}
                   <span style="font-size:18px;">${style.emoji}</span>
                   <i class="fas ${style.icon}" style="font-size:16px;"></i>
                   Download ${f.quality} (${style.label})
                </a>
            `;
        }).join("");

        // Use the new function for result with sidebar on desktop
        preview.innerHTML = showResultWithSidebar(data, firstVideo, formatButtons, randomAd);

        // Refresh history after download
        setTimeout(loadDownloadHistory, 1500);

    } catch (err) {
        console.log('Download error:', err);
        preview.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <i class="fas fa-exclamation-triangle" style="font-size:52px;color:#e74c3c;display:block;margin-bottom:14px;"></i>
                <p style="color:#e74c3c;font-weight:600;font-size:15px;">Connection error, please check the URL and try again</p>
            </div>
        `;
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
    }
});

// RESET
function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
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
            let html = data.history.slice(0, 6).map((item, index) => `
                <div class="video-thumb-card" onclick="window.open('${item.url}', '_blank')" title="${item.title}">
                    <div class="video-thumb-img" style="background-image:url('${item.thumbnail || ''}');background-size:cover;background-position:center;">
                        ${!item.thumbnail ? '<i class="fas fa-video" style="font-size:36px;color:#1877f2;"></i>' : ''}
                        <div class="video-thumb-play"></div>
                    </div>
                    <div class="thumb-info">
                        <p class="thumb-title">${item.title ? item.title.substring(0, 30) : 'Facebook Video'}</p>
                        <span class="thumb-quality">${item.quality || 'HD'}</span>
                    </div>
                </div>
            `).join('');

            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:50px;">
                    <i class="fas fa-history" style="font-size:52px;color:#ccc;display:block;margin-bottom:14px;"></i>
                    <p style="color:#888;font-size:15px;">No downloads yet. Be the first!</p>
                </div>
            `;
        }
    } catch (err) {
        console.log('History load error:', err);
        historyContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:30px;">
                <p style="color:#888;font-size:14px;">Loading history...</p>
            </div>
        `;
    }
}

async function saveToHistory(videoData) {
    try {
        const payload = {
            title: videoData.title || 'Unknown',
            thumbnail: videoData.thumbnail || '',
            url: videoData.formats?.[0]?.url || '',
            quality: videoData.formats?.[0]?.quality || 'HD'
        };
        
        await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.log('History save failed:', err);
    }
}

// =====================
// SIDEBAR FUNCTIONS
// =====================

function renderSidebar() {
    const randomAd = getRandomAd();
    
    return `
        <!-- Random Ad Card -->
        <div class="sidebar-card sidebar-ad">
            <a href="/purchase.html" target="_blank" title="Purchase this tool - YasinG Downloader">
                <img src="${randomAd.desktop}" alt="Advertisement - YasinG Downloader">
            </a>
        </div>

        <!-- Related Posts -->
        <div class="sidebar-card">
            <div class="sidebar-title">
                <i class="fas fa-fire"></i> Related Posts
            </div>
            <a href="#" class="related-post" onclick="document.getElementById('urlInput').value='https://www.facebook.com/reel/example1';document.getElementById('dlForm').requestSubmit();return false;">
                <div class="related-thumb"><i class="fas fa-play"></i></div>
                <div class="related-info">
                    <h4>How to Download Facebook Videos in HD</h4>
                    <span><i class="fas fa-eye"></i> 12.5K views</span>
                </div>
            </a>
            <a href="#" class="related-post" onclick="document.getElementById('urlInput').value='https://www.facebook.com/reel/example2';document.getElementById('dlForm').requestSubmit();return false;">
                <div class="related-thumb"><i class="fas fa-play"></i></div>
                <div class="related-info">
                    <h4>Top 5 Video Downloader Tools 2026</h4>
                    <span><i class="fas fa-eye"></i> 8.2K views</span>
                </div>
            </a>
            <a href="#" class="related-post" onclick="document.getElementById('urlInput').value='https://www.facebook.com/reel/example3';document.getElementById('dlForm').requestSubmit();return false;">
                <div class="related-thumb"><i class="fas fa-play"></i></div>
                <div class="related-info">
                    <h4>Save Facebook Videos Without App</h4>
                    <span><i class="fas fa-eye"></i> 5.1K views</span>
                </div>
            </a>
        </div>

        <!-- Tags -->
        <div class="sidebar-card">
            <div class="sidebar-title">
                <i class="fas fa-tags"></i> Popular Tags
            </div>
            <div class="tag-list">
                <a href="#" class="tag-item">Facebook</a>
                <a href="#" class="tag-item">Downloader</a>
                <a href="#" class="tag-item">HD Video</a>
                <a href="#" class="tag-item">Free</a>
                <a href="#" class="tag-item">MP4</a>
                <a href="#" class="tag-item">Online</a>
            </div>
        </div>

        <!-- Another Random Ad -->
        <div class="sidebar-card sidebar-ad">
            <a href="/purchase.html" target="_blank" title="Get your own video downloader - YasinG">
                <img src="${getRandomAd().desktop}" alt="Advertisement - Get YasinG Downloader">
            </a>
        </div>
    `;
}

function renderVideoContent(data, firstVideo, formatButtons, randomAd) {
    return `
    <div style="background:#fff;padding:28px;border-radius:18px;color:#111;box-shadow:0 8px 30px rgba(0,0,0,0.12);border:2px solid #e4e6eb;">

        <video controls playsinline style="width:100%;border-radius:14px;background:#000;max-height:450px;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
            <source src="${firstVideo}" type="video/mp4">
            Your browser does not support the video tag.
        </video>

        <!-- Video Info Card with Stylish Border -->
        <div class="video-info-card">
            <h3 class="video-title">${data.title || 'Facebook Video'}</h3>
            
            ${data.uploader ? `
            <div class="uploader-info">
                <div class="uploader-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="uploader-details">
                    <div class="uploader-name">${data.uploader}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">Content Creator</div>
                </div>
                ${data.uploader_url ? `
                <a href="${data.uploader_url}" target="_blank" class="uploader-link">
                    <i class="fas fa-external-link-alt"></i> Visit Profile
                </a>` : ''}
            </div>` : ''}
        </div>

        <!-- Random Ad -->
        <div style="margin:24px 0;border-radius:14px;overflow:hidden;border:2px solid #e4e6eb;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
            <a href="/purchase.html" target="_blank" title="Get your own video downloader">
                <img src="${randomAd.desktop}" style="width:100%;display:block;" alt="Advertisement">
            </a>
        </div>

        <div style="margin:24px 0;">
            <p style="font-weight:700;color:#333;margin-bottom:16px;font-size:17px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-arrow-down" style="color:#1877f2;font-size:18px;"></i> Available Downloads:
            </p>
            ${formatButtons}
        </div>

        <button onclick="resetDownloader()" 
            style="margin-top:16px;padding:16px 24px;width:100%;
            border:2px solid #e4e6eb;background:#f8f9fa;color:#333;border-radius:14px;
            font-size:15px;font-weight:600;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:10px;
            transition:all 0.3s ease;"
            onmouseover="this.style.background='#e9ecef';this.style.borderColor='#1877f2';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.background='#f8f9fa';this.style.borderColor='#e4e6eb';this.style.transform='translateY(0)'">
            <i class="fas fa-redo"></i> Download Another Video
        </button>
        
        <button onclick="window.location.href='/purchase.html'" 
            style="margin-top:12px;padding:16px 24px;width:100%;
            border:2px solid #e74c3c;background:#e74c3c;color:#fff;border-radius:14px;
            font-size:15px;font-weight:600;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:10px;
            transition:all 0.3s ease;"
            onmouseover="this.style.background='#c0392b';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(231,76,60,0.3)'"
            onmouseout="this.style.background='#e74c3c';this.style.transform='translateY(0)';this.style.boxShadow='none'">
            <i class="fas fa-dollar"></i> BUY THIS TOOL
        </button>
        
        <p style="text-align:center;margin-top:16px;color:var(--text-secondary);font-size:13px;padding-top:16px;border-top:2px solid #e4e6eb;">
            Ardi Mobile Inc | Developed by <strong style="color:#1877f2;">Yasin Gelma</strong> - @anayasingg
        </p>
    </div>
    `;
}

function showResultWithSidebar(data, firstVideo, formatButtons, randomAd) {
    const isDesktop = window.innerWidth >= 1025;
    
    if (isDesktop) {
        return `
            <div class="result-layout" style="display:flex;gap:24px;align-items:flex-start;margin-top:16px;">
                <div class="result-main" style="flex:1;min-width:0;">
                    ${renderVideoContent(data, firstVideo, formatButtons, randomAd)}
                </div>
                <div class="result-sidebar" style="width:320px;flex-shrink:0;">
                    <div class="sidebar-sticky" style="position:sticky;top:80px;">
                        ${renderSidebar()}
                    </div>
                </div>
            </div>
        `;
    } else {
        return renderVideoContent(data, firstVideo, formatButtons, randomAd);
    }
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) {
        sidebarContent.innerHTML = renderSidebar();
    }
}

// Credit protection
(function () {
    const REDIRECT_URL = "https://yasing.com.et/purchase.html";

    function checkCredit() {
        const credit = document.getElementById("credit-link");
        if (!credit || credit.innerText.trim() === "") {
            triggerRedirect();
        }
    }

    function triggerRedirect() {
        if (!window.location.href.includes(REDIRECT_URL)) {
            window.location.href = REDIRECT_URL;
        }
    }

    setTimeout(checkCredit, Math.random() * 3000 + 1000);
    setInterval(checkCredit, 4000);
})();