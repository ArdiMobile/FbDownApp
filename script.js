const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

// Load history and sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
    initSidebar();
});

function toggleMenu() {
    document.getElementById("menu").classList.toggle("show");
}

function openTab(evt, tabId) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-link").forEach(t => t.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    if (evt) evt.currentTarget.classList.add("active");
    document.getElementById("menu").classList.remove("show");
}

function toggleFaq(el) {
    el.classList.toggle("active");
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
    if (panel) panel.classList.add('active');
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

// SUBMIT
dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return alert("Paste a link");

    // Show HD transparent spinner on button
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<div class="btn-spinner"></div>`;

    preview.innerHTML = `
        <div style="text-align:center;padding:30px 20px;">
            <div class="spinner-container">
                <div class="custom-spinner"></div>
            </div>
            <p class="loading-text">Fetching video...</p>
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
                    <i class="fas fa-exclamation-circle" style="font-size:40px;color:#e74c3c;display:block;margin-bottom:10px;"></i>
                    <p style="color:#e74c3c;font-weight:500;">${data.message}</p>
                </div>
            `;
            return;
        }

        // Save to history
        saveToHistory(data);

        const firstVideo = data.formats[0]?.url;

        // Quality styles with gradients
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
                <a href="${f.url}" target="_blank" download
                   style="display:flex;align-items:center;justify-content:center;gap:10px;
                   margin:8px 0;padding:14px 15px;
                   background:${style.bg};color:#fff;border-radius:12px;
                   text-decoration:none;font-weight:600;font-size:14px;
                   box-shadow:0 4px 12px rgba(0,0,0,0.2);
                   transition:all 0.2s ease;
                   position:relative;overflow:hidden;"
                   onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)'"
                   onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'">
                   ${isBest ? '<span style="position:absolute;top:8px;right:8px;background:#fff;color:#333;font-size:9px;padding:3px 10px;border-radius:10px;font-weight:700;letter-spacing:0.5px;">BEST</span>' : ''}
                   <i class="fas ${style.icon}" style="font-size:16px;"></i>
                   Download ${f.quality} (${style.label})
                </a>
            `;
        }).join("");

        // Use the new function for result with sidebar on desktop
        preview.innerHTML = showResultWithSidebar(data, firstVideo, formatButtons);

        // Refresh history after download
        setTimeout(loadDownloadHistory, 1500);

    } catch (err) {
        console.log('Download error:', err);
        preview.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <i class="fas fa-exclamation-triangle" style="font-size:45px;color:#e74c3c;display:block;margin-bottom:12px;"></i>
                <p style="color:#e74c3c;font-weight:500;">Connection error, Check url and try again</p>
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
                        ${!item.thumbnail ? '<i class="fas fa-video" style="font-size:32px;color:#1877f2;"></i>' : ''}
                        <div class="video-thumb-play"></div>
                    </div>
                    <p>${item.title ? item.title.substring(0, 28) : 'Facebook Video'}</p>
                    <div style="text-align:center;">
                        <span class="thumb-quality">${item.quality || 'HD'}</span>
                    </div>
                </div>
            `).join('');

            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:30px;">
                    <i class="fas fa-history" style="font-size:40px;color:#ccc;display:block;margin-bottom:10px;"></i>
                    <p style="color:#888;font-size:13px;">No downloads yet. Be the first!</p>
                </div>
            `;
        }
    } catch (err) {
        console.log('History load error:', err);
        historyContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px;">
                <p style="color:#888;font-size:13px;">Loading history...</p>
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
    return `
        <!-- Ad Card -->
        <div class="sidebar-card sidebar-ad">
            <a href="https://www.yasing.com.et" target="_blank">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" alt="Ad">
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

        <!-- Another Ad -->
        <div class="sidebar-card sidebar-ad">
            <a href="https://www.yasing.com.et" target="_blank">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" alt="Ad">
            </a>
        </div>
    `;
}

function renderVideoContent(data, firstVideo, formatButtons) {
    return `
    <div style="background:#fff;padding:20px;border-radius:16px;color:#111;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

        <video controls playsinline style="width:100%;border-radius:12px;background:#000;max-height:400px;">
            <source src="${firstVideo}" type="video/mp4">
            Your browser does not support the video tag.
        </video>

        <h3 style="margin-top:15px;font-size:17px;font-weight:700;line-height:1.4;">${data.title}</h3>

        ${data.uploader ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <i class="fas fa-user-circle" style="color:#1877f2;font-size:20px;"></i>
            <span style="color:#555;font-size:13px;font-weight:500;">${data.uploader}</span>
        </div>` : ""}

        ${data.uploader_url ? `
        <a href="${data.uploader_url}" target="_blank" 
        style="display:inline-flex;align-items:center;gap:6px;
        margin:10px 0;padding:8px 16px;
        color:#1877f2;background:#e8f0fe;border-radius:20px;
        text-decoration:none;font-size:13px;font-weight:600;
        transition:all 0.2s ease;"
        onmouseover="this.style.background='#d0e1fd'"
        onmouseout="this.style.background='#e8f0fe'">
        <i class="fas fa-external-link-alt"></i> View more from uploader
        </a>` : ""}

        <!-- AD -->
        <div style="margin:15px 0;border-radius:12px;overflow:hidden;border:1px solid #e4e6eb;">
            <a href="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" target="_blank">
                <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" style="width:100%;display:block;" alt="Ad">
            </a>
        </div>

        <div style="margin:15px 0;">
            <p style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px;">
                <i class="fas fa-arrow-down" style="color:#1877f2;"></i> Available Downloads:
            </p>
            ${formatButtons}
        </div>

        <button onclick="resetDownloader()" 
            style="margin-top:10px;padding:14px 20px;width:100%;
            border:2px solid #e4e6eb;background:#f8f9fa;color:#333;border-radius:12px;
            font-size:14px;font-weight:600;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:8px;
            transition:all 0.2s ease;"
            onmouseover="this.style.background='#e9ecef';this.style.borderColor='#ccc'"
            onmouseout="this.style.background='#f8f9fa';this.style.borderColor='#e4e6eb'">
            <i class="fas fa-redo"></i> Download Another Video
        </button>
    </div>
    `;
}

function showResultWithSidebar(data, firstVideo, formatButtons) {
    const isDesktop = window.innerWidth >= 1025;
    
    if (isDesktop) {
        return `
            <div class="result-layout">
                <div class="result-main">
                    ${renderVideoContent(data, firstVideo, formatButtons)}
                </div>
                <div class="result-sidebar">
                    <div class="sidebar-sticky">
                        ${renderSidebar()}
                    </div>
                </div>
            </div>
        `;
    } else {
        return renderVideoContent(data, firstVideo, formatButtons);
    }
}

function initSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (sidebarContent) {
        sidebarContent.innerHTML = renderSidebar();
    }
}