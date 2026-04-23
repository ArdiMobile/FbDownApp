const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');
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

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return alert("Paste link");

    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";

    preview.innerHTML = `<div class="spinner" style="margin:20px auto;"></div>`;
            renderPreview(data);

    } catch {
        preview.innerHTML = `<p style="color:red">Error</p>`;
    }
});

function renderPreview(data) {
    let buttons = data.formats.map(f => `
        <a href="${f.url}" target="_blank"
        style="display:block;margin:8px 0;padding:12px;
        background:#1877f2;color:#fff;border-radius:8px;text-align:center;">
        Download ${f.quality}
        </a>
    `).join("");

    preview.innerHTML = `
        <div style="background:#fff;padding:15px;border-radius:12px;margin-top:20px;">
            ${data.thumbnail ? `<img src="${data.thumbnail}" style="width:100%;border-radius:10px;">` : ""}
            <h3>${data.title}</h3>
            ${buttons}
        </div>
    `;
}
// RESET
function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}