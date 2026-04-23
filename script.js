const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');
const dlBtnIcon = document.getElementById('dlBtnIcon');
const btnLoader = document.getElementById('btnLoader');
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

// SUBMIT
dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) return alert("Paste a link");

    preview.innerHTML = "Loading.... please wait";

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.status !== "success") {
            preview.innerHTML = `<p style="color:red">${data.message}</p>`;
            return;
        }

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
  <img src=" https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi3emvbxUKCk0RWnwHkvZsa-R9GSRca9bmPcokzxCElc7TPFnoErZcE9dlU9X3mCwXxUJdRB0qMWLRu3HcKpbMjPMBbvQ4KjGNCZGq658mW-2KaHHbSwcWD2JcbqjDhXrUJV9QyXeXwLtX7jgEEc6ZcGyE0WxTxwDKFgoovhQbl4I2wYQtFVMjqXoSzfCw/s320/20250.png " alt="Buy now">
</a>
</div>


            <div>${formatButtons}</div>
                        <!-- AD1 -->
         <div style="height: 300px;">
<a href="https://www.yasing.com.et">
  <img src=" https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi3emvbxUKCk0RWnwHkvZsa-R9GSRca9bmPcokzxCElc7TPFnoErZcE9dlU9X3mCwXxUJdRB0qMWLRu3HcKpbMjPMBbvQ4KjGNCZGq658mW-2KaHHbSwcWD2JcbqjDhXrUJV9QyXeXwLtX7jgEEc6ZcGyE0WxTxwDKFgoovhQbl4I2wYQtFVMjqXoSzfCw/s320/20250.png " alt="Buy now">
</a>
</div>

            <button onclick="resetDownloader()" 
                style="margin-top:15px;padding:10px 20px;
                border:none;background:#333;color:#fff;border-radius:8px;">
                Download another video
            </button>

        </div>
        `;

    } catch (err) {
        preview.innerHTML = `<p style="color:red">Connection error, Check url and try again</p>`;
    }
});

// RESET
function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}