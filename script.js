const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDownloadHistory();
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

// Drawer toggle for new design
function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && overlay) {
        drawer.classList.toggle('show');
        overlay.classList.toggle('show');
    }
}

// Tab switching for new design
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

    // Close drawer
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.remove('show');
    if (overlay) overlay.classList.remove('show');

    // Scroll to tabs
    const tabBar = document.getElementById('tabBar');
    if (tabBar) tabBar.scrollIntoView({ behavior: 'smooth' });
}

// SUBMIT
dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return alert("Paste a link");

    // Show GIF spinner on button
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<img src="https://en1.savefrom.net/img/busy.gif" style="width:30px;height:30px;">`;

    preview.innerHTML = `
        <div style="text-align:center;padding:20px;">
            <img src="https://en1.savefrom.net/img/busy.gif" style="width:40px;height:40px;">
            <p style="color:#666;margin-top:10px;">Fetching video...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        // Hide spinner, show download icon
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `<p style="color:red;text-align:center;padding:20px;">${data.message}</p>`;
            return;
        }

        // Save to history
        saveToHistory(data);

        const firstVideo = data.formats[0]?.url;

        // Different colors and icons for different qualities
        const qualityStyles = {
            '1080p': { bg: '#e74c3c', icon: 'fa-crown', label: 'Full HD' },
            '720p': { bg: '#f39c12', icon: 'fa-star', label: 'HD' },
            '480p': { bg: '#1877f2', icon: 'fa-video', label: 'SD' },
            '360p': { bg: '#2ecc71', icon: 'fa-play', label: 'Low' },
            '240p': { bg: '#95a5a6', icon: 'fa-download', label: 'Low' }
        };

        let formatButtons = data.formats.map(f => {
            const quality = f.quality.replace('p', '');
            const style = qualityStyles[f.quality] || { bg: '#1877f2', icon: 'fa-download', label: f.quality };
            
            return `
                <a href="${f.url}" target="_blank"
                   style="display:flex;align-items:center;justify-content:center;gap:10px;
                   margin:8px 0;padding:12px 15px;
                   background:${style.bg};color:#fff;border-radius:10px;
                   text-decoration:none;font-weight:bold;font-size:14px;
                   box-shadow:0 3px 10px rgba(0,0,0,0.2);
                   transition:transform 0.2s ease;"
                   onmouseover="this.style.transform='scale(1.03)'"
                   onmouseout="this.style.transform='scale(1)'">
                   <i class="fas ${style.icon}" style="font-size:16px;"></i>
                   Download ${f.quality} ${style.label !== f.quality ? '(' + style.label + ')' : ''}
                </a>
            `;
        }).join("");

        preview.innerHTML = `
        <div style="background:#fff;padding:20px;border-radius:15px;color:#111;margin-top:20px;">

            <video controls playsinline style="width:100%;border-radius:10px;background:#000;">
                <source src="${firstVideo}" type="video/mp4">
                Your browser does not support the video tag.
            </video>

            <h3 style="margin-top:15px;font-size:18px;">${data.title}</h3>

            ${data.uploader ? `
            <p style="color:#555;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-user-circle" style="color:#1877f2;"></i>
                ${data.uploader}
            </p>` : ""}

            ${data.uploader_url ? `
            <a href="${data.uploader_url}" target="_blank" 
            style="display:inline-flex;align-items:center;gap:5px;
            margin-bottom:10px;padding:8px 15px;
            color:#1877f2;background:#e8f0fe;border-radius:20px;
            text-decoration:none;font-size:13px;font-weight:600;">
            <i class="fas fa-external-link-alt"></i> View more from uploader
            </a>` : ""}

            <!-- AD1 -->
            <div style="margin:15px 0;border-radius:10px;overflow:hidden;">
                <a href="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" target="_blank">
                    <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" style="width:100%;display:block;" alt="Ad">
                </a>
            </div>

            <div style="margin:15px 0;">
                <p style="font-weight:bold;color:#333;margin-bottom:10px;">
                    <i class="fas fa-arrow-down" style="color:#1877f2;"></i> Available Downloads:
                </p>
                ${formatButtons}
            </div>

            <button onclick="resetDownloader()" 
                style="margin-top:15px;padding:12px 20px;width:100%;
                border:none;background:#333;color:#fff;border-radius:10px;
                font-size:14px;font-weight:600;cursor:pointer;
                display:flex;align-items:center;justify-content:center;gap:8px;
                transition:background 0.3s ease;"
                onmouseover="this.style.background='#555'"
                onmouseout="this.style.background='#333'">
                <i class="fas fa-redo"></i> Download Another Video
            </button>
        </div>
        `;

        // Refresh history after download
        setTimeout(loadDownloadHistory, 1500);

    } catch (err) {
        preview.innerHTML = `
            <div style="text-align:center;padding:30px;color:red;">
                <i class="fas fa-exclamation-triangle" style="font-size:40px;display:block;margin-bottom:10px;"></i>
                <p>Connection error, Check url and try again</p>
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

// HISTORY FUNCTIONS
async function loadDownloadHistory() {
    const historyContainer = document.getElementById('historyVideos');
    if (!historyContainer) return;

    try {
        const res = await fetch('/api/history');
        const data = await res.json();

        if (data.status === 'success' && data.history.length > 0) {
            let html = data.history.slice(0, 6).map(item => `
                <div class="video-thumb-card" onclick="window.open('${item.url}', '_blank')" style="cursor:pointer;">
                    <div class="video-thumb-img" style="background-image:url('${item.thumbnail || ''}');background-size:cover;background-position:center;">
                        ${!item.thumbnail ? '<i class="fas fa-play-circle"></i>' : ''}
                    </div>
                    <p title="${item.title}">${item.title ? item.title.substring(0, 25) + '...' : 'Video'}</p>
                    <span style="font-size:10px;color:#888;display:block;text-align:center;padding-bottom:8px;">${item.quality || 'HD'}</span>
                </div>
            `).join('');

            historyContainer.innerHTML = html;
        } else {
            historyContainer.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;padding:20px;">No downloads yet. Be the first!</p>';
        }
    } catch (err) {
        console.log('History load error:', err);
        historyContainer.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;padding:20px;">History loading...</p>';
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