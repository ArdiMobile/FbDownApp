const input = document.getElementById("urlInput");
const form = document.getElementById("dlForm");

// Function to handle URL processing
function processUrl(url) {
    if (!url || url.length < 5) return;
    
    // Simple validation - check if it looks like a URL
    if (url.includes('http') || url.includes('www.') || url.includes('.com') || url.includes('youtu.be')) {
        // Redirect to download page
        window.location.href = `/download?url=${encodeURIComponent(url)}`;
    } else {
        // Show error for invalid URLs
        alert('Please enter a valid video URL from YouTube, Facebook, or Instagram');
    }
}

// Form submit handler
if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        processUrl(input.value.trim());
    });
}

// Auto-detect paste
input.addEventListener("paste", () => {
    setTimeout(() => {
        processUrl(input.value.trim());
    }, 300);
});

// Enter key handler
input.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        processUrl(input.value.trim());
    }
});