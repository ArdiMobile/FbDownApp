function goToVideo(url) {
    if (!url) return;
    // Directs to the /download route handled by app.py
    window.location.href = `/download?url=${encodeURIComponent(url)}`;
}

// Ensure your search works
async function searchVideos() {
    const query = document.getElementById('searchInput').value;
    // You can add an /api/search route to app.py if needed!
}
