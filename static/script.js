const input = document.getElementById("urlInput");
const preview = document.getElementById("preview");

// AUTO DETECT (paste OR typing)
input.addEventListener("input", () => {
    handleInput(input.value.trim());
});

function isYouTube(url){
    return url.includes("youtube.com") || url.includes("youtu.be");
}

function handleInput(value){
    if (!value) return;

    if (isYouTube(value)) {
        window.location.href = `/download?url=${encodeURIComponent(value)}`;
    } else {
        searchVideo(value);
    }
}

// SEARCH FUNCTION
async function searchVideo(query){
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if(data.status !== "success") return;

    preview.innerHTML = data.results.map(v => `
        <div onclick="go('${v.url}')" style="margin-bottom:10px;cursor:pointer;">
            <img src="${v.thumbnail}" style="width:100%;border-radius:10px;">
            <p>${v.title}</p>
        </div>
    `).join('');
}

function go(url){
    window.location.href = `/download?url=${encodeURIComponent(url)}`;
}