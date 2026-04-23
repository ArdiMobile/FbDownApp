const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');
let downloadType = 'video'; // 'video' or 'audio'

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

// Download type toggle
function setDownloadType(type) {
    downloadType = type;
    const videoBtn = document.getElementById('videoBtn');
    const audioBtn = document.getElementById('audioBtn');
    const searchInput = document.getElementById('urlInput');
    
    if (type === 'video') {
        videoBtn.style.background = '#1877f2';
        videoBtn.style.color = '#fff';
        audioBtn.style.background = '#e0e0e0';
        audioBtn.style.color = '#333';
        searchInput.placeholder = "Paste Facebook link...";
    } else {
        audioBtn.style.background = '#1DB954';
        audioBtn.style.color = '#fff';
        videoBtn.style.background = '#e0e0e0';
        videoBtn.style.color = '#333';
        searchInput.placeholder = "Paste Facebook link for MP3...";
    }
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
    if (!url) return alert("Paste a link");

    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    preview.innerHTML = "Loading.... please wait";

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}&type=${downloadType}`);
        const data = await res.json();

        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `<p style="color:red">${data.message}</p>`;
            return;
        }

        if (data.type === 'audio') {
            // Audio preview
            const audioUrl = data.formats[0]?.url;
            
            preview.innerHTML = `
            <div style="background:#fff;padding:20px;border-radius:15px;color:#111;">
                ${data.thumbnail ? `<img src="${data.thumbnail}" style="width:100%;border-radius:10px;">` : ''}

                <h3 style="margin-top:10px;">🎵 ${data.title}</h3>
                
                ${data.duration ? `<p style="color:#555;">Duration: ${Math.floor(data.duration/60)}:${(data.duration%60).toString().padStart(2,'0')}</p>` : ''}

                <a href="${audioUrl}" target="_blank" download
                   style="display:block;margin:10px 0;padding:15px;
                   background:#1DB954;color:#fff;border-radius:8px;text-align:center;
                   text-decoration:none;font-weight:bold;font-size:16px;">
                   <i class="fas fa-music"></i> Download MP3 (192kbps)
                </a>

                <!-- AD1 -->
                <div style="height: 60px;">
                <a href="https://www.yasing.com.et">
                  <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi3emvbxUKCk0RWnwHkvZsa-R9GSRca9bmPcokzxCElc7TPFnoErZcE9dlU9X3mCwXxUJdRB0qMWLRu3HcKpbMjPMBbvQ4KjGNCZGq658mW-2KaHHbSwcWD2JcbqjDhXrUJV9QyXeXwLtX7jgEEc6ZcGyE0WxTxwDKFgoovhQbl4I2wYQtFVMjqXoSzfCw/s320/20250.png" alt="Buy now">
                </a>
                </div>

                <button onclick="resetDownloader()" 
                    style="margin-top:15px;padding:10px 20px;
                    border:none;background:#333;color:#fff;border-radius:8px;">
                    Download another
                </button>
            </div>
            `;
        } else {
            // Video preview (your original code)
            const firstVideo = data.formats[0]?.url;

            let formatButtons = data.formats.map(f => `
                <a href="${f.url}" target="_blank"
                   style="display:block;margin:5px 0;padding:10px;
                   background:#1877f2;color:#fff;border-radius:6px;text-decoration:none;">
                   Download ${f.quality}
                </a>
            `).join("");

            preview.innerHTML = `
            <div style="background:#fff;padding:20px;border-radius:15px;color:#111;">

                <video controls style="width:100%;border-radius:10px;">
                    <source src="${firstVideo}">
                </video>

                <h3 style="margin-top:10px;">${data.title}</h3>

                <p style="color:#555;">
                    ${data.uploader ? "By: " + data.uploader : ""}
                </p>

                ${data.uploader_url ? `
                <a href="${data.uploader_url}" target="_blank" 
                style="display:inline-block;margin-bottom:10px;color:#1877f2;background:gray;border-radius:20px;border: solid black 1px">
                View more from uploader
                </a>` : ""}

                <!-- AD1 -->
                <div style="height: 60px;">
                <a href="https://www.yasing.com.et">
                  <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgK6iDLBJrJkvsyqRw7GiZuy6A0pI7Apb3iJ5jWUxwHaUq_GK1R9doWYd9jrnRPbEFNEde1OjOM3lpD_HvcMnMIodYtmYy5iDvk80Q2kpifHMJYg35r0raHWAzT9L7EXzncINcZ-6Dlp2P4raDG7XAM4m4oHhhFX2PV_LHRTd9mPv4QB9VZHHNBIcnRwbM/s2320/20494.jpg" alt="Buy now">
                </a>
                </div>

                <div>${formatButtons}</div>

                <!-- AD2 -->
                <div style="height: 300px;">
                <a href="https://www.yasing.com.et">
                  <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhEYVd0X7fpF5433IIfmgb7UWjljRaTSIJ7FB1kqc3RMF4Q_KnN6jfCOGTUNPRX9JNxEXNiXdGTNvkjv_OGDe2C32hMf2WsqF7GHLLKdlYoX3pTbkygmelzYBVnMDAePCHjvmefopzSXOjMFRAyRbG8KK3Mv6azrO8gyg8i_HsfMa_9qVpI2p-DN0q8g-s/s320/20493.jpg" alt="Buy now">
                </a>
                </div>

                <button onclick="resetDownloader()" 
                    style="margin-top:15px;padding:10px 20px;
                    border:none;background:#333;color:#fff;border-radius:8px;">
                    Download another video
                </button>

            </div>
            `;
        }

    } catch (err) {
        preview.innerHTML = `<p style="color:red">Connection error, Check url and try again</p>`;
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