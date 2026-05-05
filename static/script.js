async function downloadVideo() {
    const urlInput = document.getElementById('videoUrl').value;
    const btn = document.querySelector('.download-btn');
    const preview = document.getElementById('preview-container');
    const videoPlayer = document.getElementById('video-player');
    const directLink = document.getElementById('direct-link');
    const title = document.getElementById('video-title');

    if (!urlInput) {
        alert('Please paste a link first!');
        return;
    }

    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlInput })
        });
        const data = await response.json();

        if (data.url) {
            title.innerText = data.title;
            videoPlayer.src = data.url; // Sets the video player source
            directLink.href = data.url;
            
            preview.style.display = 'block';
            videoPlayer.load(); // Reloads player with new source
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Something went wrong. Check console.');
        console.error(error);
    } finally {
        btn.innerText = "Download";
        btn.disabled = false;
    }
}
