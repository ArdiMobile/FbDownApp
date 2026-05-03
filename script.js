const API_BASE = ""; // leave empty → same domain (Railway handles it)

const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

function isValidUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

function downloadVideo(url) {
    const a = document.createElement('a');
    a.href = url;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function processPreview(url) {
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<span class="btn-spinner"></span>`;

    preview.innerHTML = `<div style="text-align:center;padding:20px;color:white;">Fetching video...</div>`;

    try {
        const res = await fetch(`${API_BASE}/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `
            <div style="background:#fff;padding:20px;border-radius:12px;text-align:center;">
                <h4 style="color:red;">Failed to Fetch</h4>
                <p>${data.message}</p>
                <button onclick="resetDownloader()">Try Again</button>
            </div>`;
            return;
        }

        preview.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:15px;">
            <img src="${data.thumbnail}" style="width:100%;border-radius:10px;margin-bottom:10px;">
            <h4>${data.title}</h4>
            <p style="font-size:12px;color:#666;">${data.uploader}</p>

            ${data.formats.map(f => `
                <button onclick="downloadVideo('${f.url}')"
                    style="display:block;width:100%;margin-top:8px;padding:10px;background:#009959;color:white;border:none;border-radius:8px;">
                    Download ${f.quality}
                </button>
            `).join('')}
        </div>`;
    } catch (err) {
        preview.innerHTML = `
        <div style="background:#fff;padding:20px;border-radius:12px;text-align:center;">
            <h4 style="color:red;">Connection Error</h4>
            <button onclick="resetDownloader()">Try Again</button>
        </div>`;

        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
    }
}

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) return alert("Paste URL");
    if (!isValidUrl(url)) return alert("Invalid YouTube link");

    processPreview(url);
});

function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
}