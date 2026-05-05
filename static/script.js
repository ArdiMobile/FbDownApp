async function downloadVideo() {
    const urlInput = document.getElementById('videoUrl').value;
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Processing...';

    if (!urlInput) {
        resultDiv.innerHTML = 'Please paste a URL.';
        return;
    }

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlInput })
        });
        const data = await response.json();

        if (data.url) {
            resultDiv.innerHTML = `
                <h3>${data.title}</h3>
                <img src="${data.thumbnail}" style="max-width:200px;"><br>
                <a href="${data.url}" target="_blank" download>
                    <button style="background-color:green; color:white;">Download Video</button>
                </a>
            `;
        } else {
            resultDiv.innerHTML = 'Error: ' + data.error;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Error: ' + error;
    }
}
