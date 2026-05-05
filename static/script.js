async function processVideo() {
    const urlInput = document.getElementById('videoUrl').value;
    const mainBtn = document.getElementById('mainBtn');
    const inputContainer = document.getElementById('input-container');
    const previewArea = document.getElementById('preview-area');
    const player = document.getElementById('video-player');
    const downloadLink = document.getElementById('hd-download');
    const title = document.getElementById('video-title');

    if (!urlInput) return alert("Please enter a URL");

    mainBtn.innerText = "Processing...";
    mainBtn.disabled = true;

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlInput })
        });
        const data = await response.json();

        if (data.url) {
            // Hide input, show preview
            inputContainer.classList.add('hidden');
            previewArea.style.display = 'block';

            // Set content
            title.innerText = data.title;
            player.src = data.url;
            downloadLink.href = data.url;
        } else {
            alert("Error: " + data.error);
            resetApp();
        }
    } catch (e) {
        alert("Failed to fetch video.");
        resetApp();
    }
}

function resetApp() {
    // Show input container again
    document.getElementById('input-container').classList.remove('hidden');
    document.getElementById('preview-area').style.display = 'none';
    
    // Clear fields
    document.getElementById('videoUrl').value = '';
    document.getElementById('mainBtn').innerText = "Download";
    document.getElementById('mainBtn').disabled = false;
    document.getElementById('video-player').src = '';
}
