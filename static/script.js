document.getElementById('downloadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlInput = document.getElementById('videoUrl');
    const resultDiv = document.getElementById('result');
    const url = urlInput.value.trim();

    resultDiv.innerHTML = 'Processing...';

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url})
        });
        const data = await response.json();

        if (response.ok) {
            resultDiv.innerHTML = `<a href="${data.video_url}" target="_blank" download>Download Video</a>`;
        } else {
            resultDiv.textContent = data.error || 'Error downloading video';
        }
    } catch (err) {
        resultDiv.textContent = 'Network error';
    }
});