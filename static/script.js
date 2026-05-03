const input = document.getElementById("urlInput");
const preview = document.getElementById("preview");

// AUTO URL DETECT
input.addEventListener("paste", () => {
    setTimeout(() => {
        handleInput(input.value);
    }, 300);
});

async function handleInput(value) {
    if (value.includes("youtube.com") || value.includes("youtu.be")) {
        window.location.href = `/download?url=${encodeURIComponent(value)}`;
    } else {
        searchVideo(value);
    }
}

// SEARCH
async function searchVideo(query) {
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();

    preview.innerHTML = data.results.map(v => `
        <div onclick="go('${v.url}')">
            <img src="${v.thumbnail}" width="100%">
            <p>${v.title}</p>
        </div>
    `).join('');
}

function go(url){
    window.location.href = `/download?url=${encodeURIComponent(url)}`;
}