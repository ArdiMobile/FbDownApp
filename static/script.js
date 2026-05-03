const input = document.getElementById("urlInput");
const preview = document.getElementById("preview");
const form = document.getElementById("dlForm");

// ==============================
// PREVENT FORM RELOAD
// ==============================
if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        handleInput(input.value.trim());
    });
}

// ==============================
// AUTO DETECT PASTE
// ==============================
input.addEventListener("paste", () => {
    setTimeout(() => {
        handleInput(input.value.trim());
    }, 200);
});

// ==============================
// HELPER: CHECK YOUTUBE LINK
// ==============================
function isYouTube(url) {
    return url.includes("youtube.com") || url.includes("youtu.be");
}

// ==============================
// MAIN HANDLER
// ==============================
function handleInput(value) {
    if (!value) return;

    if (isYouTube(value)) {
        // Redirect to download page
        window.location.href = `/download?url=${encodeURIComponent(value)}`;
    } else {
        // Search instead
        searchVideo(value);
    }
}

// ==============================
// SEARCH FUNCTION
// ==============================
async function searchVideo(query) {
    if (!query || query.length < 2) return;

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.status !== "success") {
            preview.innerHTML = "<p>Failed to load results</p>";
            return;
        }

        preview.innerHTML = data.results.map(v => `
            <div onclick="goToVideo('${v.url}')" 
                 style="margin-bottom:15px;cursor:pointer;">
                
                <img src="${v.thumbnail}" 
                     style="width:100%;border-radius:10px;">
                
                <p style="margin-top:5px;">${v.title}</p>
            </div>
        `).join("");

    } catch (err) {
        console.error(err);
        preview.innerHTML = "<p>Error loading search</p>";
    }
}

// ==============================
// CLICK RESULT → REDIRECT
// ==============================
function goToVideo(url) {
    window.location.href = `/download?url=${encodeURIComponent(url)}`;
}