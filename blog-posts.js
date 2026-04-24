// Blog posts database - Add new posts here and they auto-appear on blog page
const blogPosts = [
    {
        id: 1,
        title: "How to Download Facebook Videos in HD Quality",
        slug: "download-facebook-videos-hd",
        excerpt: "Learn the easiest way to download Facebook videos in Full HD quality. Step-by-step guide with screenshots...",
        content: "full-content-here",
        thumbnail: "https://picsum.photos/800/400?random=1",
        date: "2026-06-15",
        author: "Yasin Gelma",
        views: 12500,
        readTime: "5 min read",
        tags: ["Facebook", "HD Video", "Tutorial", "Downloader"],
        category: "Tutorial"
    },
    {
        id: 2,
        title: "Top 5 Facebook Video Downloader Tools in 2026",
        slug: "top-5-downloader-tools-2026",
        excerpt: "Compare the best Facebook video downloader tools available this year. Features, pros, and cons...",
        content: "full-content-here",
        thumbnail: "https://picsum.photos/800/400?random=2",
        date: "2026-06-10",
        author: "Yasin Gelma",
        views: 8200,
        readTime: "7 min read",
        tags: ["Tools", "Comparison", "2026", "Downloader"],
        category: "Review"
    },
    {
        id: 3,
        title: "Save Facebook Videos Without Installing Any App",
        slug: "save-facebook-videos-no-app",
        excerpt: "No app needed! Use our online tool to save Facebook videos directly to your device...",
        content: "full-content-here",
        thumbnail: "https://picsum.photos/800/400?random=3",
        date: "2026-06-05",
        author: "Yasin Gelma",
        views: 5100,
        readTime: "4 min read",
        tags: ["Online", "No App", "Free", "Guide"],
        category: "Guide"
    },
    {
        id: 4,
        title: "How to Fix Facebook Video Not Downloading",
        slug: "fix-facebook-video-not-downloading",
        excerpt: "Having trouble downloading? Here are quick fixes for common Facebook video download issues...",
        content: "full-content-here",
        thumbnail: "https://picsum.photos/800/400?random=4",
        date: "2026-05-28",
        author: "Yasin Gelma",
        views: 3400,
        readTime: "6 min read",
        tags: ["Troubleshooting", "Fix", "Help"],
        category: "Support"
    },
    {
        id: 5,
        title: "Download Facebook Reels in 3 Simple Steps",
        slug: "download-facebook-reels",
        excerpt: "Facebook Reels are popular! Here's how to download them easily with YasinG Downloader...",
        content: "full-content-here",
        thumbnail: "https://picsum.photos/800/400?random=5",
        date: "2026-05-20",
        author: "Yasin Gelma",
        views: 9100,
        readTime: "3 min read",
        tags: ["Reels", "Facebook", "Quick Guide"],
        category: "Tutorial"
    }
];

// FAQ database - Organized by post date
const faqPosts = blogPosts
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest first
    .map(post => ({
        question: post.title,
        answer: `Posted on ${new Date(post.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })} • ${post.views.toLocaleString()} views • <a href="page/post.html?id=${post.id}" style="color:var(--blue);">Read full post →</a>`,
        date: post.date,
        category: post.category
    }));