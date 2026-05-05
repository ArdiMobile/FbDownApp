async function fetchVideo() {
    const url = document.getElementById('videoUrl').value;
    const btn = document.querySelector('.btn-main');
    if (!url) return alert("Please enter a URL");

    btn.innerText = "Analyzing...";
    btn.disabled = true;

    try {
        const res = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });
        const data = await res.json();

        if (data.formats) {
            document.getElementById('input-box').style.display = 'none';
            document.getElementById('result-area').style.display = 'flex';
            
            document.getElementById('v-title').innerText = data.title;
            document.getElementById('v-user').innerText = data.uploader;
            document.getElementById('v-views').innerText = data.views;
            
            // Set Player
            const player = document.getElementById('player');
            player.src = data.formats[0].url;

            // Generate Quality Buttons
            const list = document.getElementById('quality-list');
            list.innerHTML = '';
            data.formats.forEach(f => {
                const a = document.createElement('a');
                a.className = 'quality-btn';
                a.href = f.url;
                a.target = '_blank';
                a.download = true;
                a.innerHTML = `<span>MP4 ${f.quality}</span> <span>Download ↓</span>`;
                list.appendChild(a);
            });
        } else {
            alert("Error: " + data.error);
            location.reload();
        }
    } catch (e) {
        alert("System error. Try again.");
        location.reload();
    }
}
