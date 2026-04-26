const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');

// MENU
function toggleMenu() {
    document.getElementById("menu").classList.toggle("show");
}

// ✅ FIXED TAB SYSTEM (NO CRASH)
function openTab(evt, tabId) {
    const contents = document.getElementsByClassName("tab-content");
    for (let content of contents) {
        content.classList.remove("active");
    }

    const links = document.getElementsByClassName("tab-link");
    for (let link of links) {
        link.classList.remove("active");
    }

    document.getElementById(tabId).classList.add("active");

    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add("active");
    }

    document.getElementById("menu").classList.remove("show");
}

// FAQ
function toggleFaq(el) {
    el.classList.toggle('active');
}

// ✅ AUTO PASTE (FB + IG)
urlInput.addEventListener('focus', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (
            text.includes("facebook.com") ||
            text.includes("fb.watch") ||
            text.includes("instagram.com")
        ) {
            urlInput.value = text;
        }
    } catch (e) {}
});

// DOWNLOAD
dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return alert("Please paste a video link");

    let platform = "Video";
    if (url.includes("facebook") || url.includes("fb.watch")) platform = "Facebook";
    if (url.includes("instagram")) platform = "Instagram";

    // START LOADER
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";

    preview.innerHTML = `<div class="spinner" style="margin:20px auto;"></div>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        // STOP LOADER
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        if (data.status !== "success") {
            preview.innerHTML = `<p style="color:red; background:#fff; padding:10px; border-radius:8px;">${data.message}</p>`;
            return;
        }

        renderPreview(data, platform);

    } catch (err) {
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
        preview.innerHTML = `<p style="color:red">Connection error. Try again.</p>`;
    }
});

// ✅ FIXED PREVIEW (WORKS + MATCHES YOUR UI)
function renderPreview(data, platform) {

    let formatButtons = data.formats.map(f => `
        <a href="${f.url}" target="_blank"
           style="display:block;margin:8px 0;padding:12px;
           background:var(--blue);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
           Download ${f.quality}
        </a>
    `).join("");

    preview.innerHTML = `
        <div class="card">
            
            <div style="position:relative;">
                <img src="${data.thumbnail}" style="width:100%;border-radius:10px;">
                <div style="
                    position:absolute;
                    top:50%;left:50%;
                    transform:translate(-50%,-50%);
                    background:rgba(0,0,0,0.6);
                    color:#fff;
                    padding:15px;
                    border-radius:50%;
                ">▶</div>
            </div>

            <h3>${data.title}</h3>
            <p style="color:#666;">Source: ${platform}</p>

            ${formatButtons}

            <button onclick="resetDownloader()" class="btn-dl" style="width:100%;margin-top:10px;">
                Download Another
            </button>
        </div>
    `;
}

// RESET
function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}