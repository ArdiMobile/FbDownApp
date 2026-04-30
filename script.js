const dlForm = document.getElementById('dlForm');
const urlInput = document.getElementById('urlInput');
const preview = document.getElementById('preview');

function downloadVideo(url, quality) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `galmee-${quality}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function processPreview(url) {
    preview.innerHTML = `<p style="color:white">Fetching video...</p>`;

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (data.status !== "success") {
            preview.innerHTML = `<p style="color:red">${data.message}</p>`;
            return;
        }

        const firstVideo = data.formats[0]?.url;

        let buttons = data.formats.map(f => {
            return `
                <button onclick="downloadVideo('${f.url}','${f.quality}')"
                style="margin:5px;padding:10px;background:#009959;color:#fff;border:none;border-radius:8px;">
                Download ${f.quality}
                </button>`;
        }).join('');

        preview.innerHTML = `
            <video controls style="width:100%;margin-bottom:10px;">
                <source src="${firstVideo}" type="video/mp4">
            </video>
            ${buttons}
        `;

    } catch (err) {
        preview.innerHTML = `<p style="color:red">Error fetching video</p>`;
    }
}

dlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    if (!url) return alert("Paste URL");

    await processPreview(url);
});