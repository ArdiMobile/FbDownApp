const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');

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

    preview.innerHTML = "Loading...";

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
            style="display:inline-block;margin-bottom:10px;color:#1877f2;">
            View more from uploader
            </a>` : ""}

            <!-- AD -->
            <div style="background:#ddd;text-align:center;padding:15px;margin:15px 0;border-radius:10px;">
                Ads Banner (468x60)
            </div>

            <div>${formatButtons}</div>

            <button onclick="resetDownloader()" 
                style="margin-top:15px;padding:10px 20px;
                border:none;background:#333;color:#fff;border-radius:8px;">
                Download Another Video
            </button>

        </div>
        `;

    } catch (err) {
        preview.innerHTML = `<p style="color:red">Connection error</p>`;
    }
});

// RESET
function resetDownloader() {
    preview.innerHTML = "";
    urlInput.value = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}