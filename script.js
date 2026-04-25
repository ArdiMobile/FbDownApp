async function processPreview(url) {
    // Show spinning icon on button
    dlBtnIcon.style.display = "none";
    btnLoader.style.display = "block";
    btnLoader.innerHTML = `<img src="${ICON_URL}" style="width:22px;height:22px;border-radius:4px;animation:spin 0.8s linear infinite;">`;

    const platform = detectPlatform(url);
    const platformName = platform === 'instagram' ? 'Instagram' : 'Facebook';
    const platformIcon = platform === 'instagram' ? 'fa-instagram' : 'fa-facebook';
    const platformColor = platform === 'instagram' ? '#E4405F' : '#1877f2';

    try {
        const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";

        // Handle API errors
        if (data.status !== "success") {
            let errorMessage = data.message || 'Failed to fetch video';
            let errorIcon = 'fa-exclamation-circle';
            let errorTitle = 'Error';
            let suggestions = [];
            
            // Detect specific error types
            if (errorMessage.includes('rate-limit') || errorMessage.includes('rate limit')) {
                errorIcon = 'fa-clock';
                errorTitle = 'Too Many Requests';
                if (platform === 'instagram') {
                    suggestions = [
                        'Instagram is temporarily limiting requests',
                        'Wait 5-10 minutes and try again',
                        'Make sure the video is from a public account',
                        'Try using a different Instagram link'
                    ];
                }
            } else if (errorMessage.includes('login') || errorMessage.includes('Login')) {
                errorIcon = 'fa-lock';
                errorTitle = 'Login Required';
                if (platform === 'instagram') {
                    suggestions = [
                        'This Instagram content requires login to view',
                        'Make sure the account is public',
                        'Try downloading from a public Instagram account'
                    ];
                }
            } else if (errorMessage.includes('not available') || errorMessage.includes('Not available')) {
                errorIcon = 'fa-eye-slash';
                errorTitle = 'Content Not Available';
                suggestions = [
                    'This video may be private or deleted',
                    'Check if the link is correct',
                    'The account may have restricted access',
                    'Try copying the link again from the app'
                ];
            } else if (errorMessage.includes('private')) {
                errorIcon = 'fa-lock';
                errorTitle = 'Private Content';
                suggestions = [
                    'This content is from a private account',
                    'Only public videos can be downloaded',
                    'Ask the account owner to make it public'
                ];
            }
            
            preview.innerHTML = `
                <div style="background:#fff;padding:20px;border-radius:14px;border:1px solid #d4e6da;text-align:center;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
                        <img src="${ICON_URL}" style="width:24px;height:24px;border-radius:6px;" alt="">
                        <span style="background:${platformColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;">
                            <i class="fab ${platformIcon}"></i> ${platformName}
                        </span>
                    </div>
                    <i class="fas ${errorIcon}" style="font-size:44px;color:#e74c3c;display:block;margin-bottom:10px;"></i>
                    <h4 style="color:#e74c3c;font-weight:700;font-size:15px;margin-bottom:6px;">${errorTitle}</h4>
                    <p style="color:#666;font-size:13px;margin-bottom:12px;">${errorMessage}</p>
                    ${suggestions.length > 0 ? `
                    <div style="text-align:left;background:#fff9e6;padding:12px 16px;border-radius:10px;margin-bottom:12px;border-left:3px solid #FEC601;">
                        <p style="font-size:12px;font-weight:600;color:#002611;margin-bottom:6px;"><i class="fas fa-lightbulb" style="color:#FEC601;"></i> Suggestions:</p>
                        <ul style="list-style:none;padding:0;">
                            ${suggestions.map(s => `<li style="font-size:11px;color:#4a6b56;padding:3px 0;"><i class="fas fa-chevron-right" style="font-size:8px;margin-right:6px;color:#009959;"></i>${s}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    <button onclick="resetDownloader()" style="padding:10px 20px;background:#009959;color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                        <i class="fas fa-redo"></i> Try Another Video
                    </button>
                </div>
            `;
            return;
        }

        // Success - save and show preview
        saveToHistory(data, platform);
        const firstVideo = data.formats[0]?.url;
        const randomAd = getRandomAd();

        const qualityColors = {
            '1080p': 'linear-gradient(135deg, #009959, #007a47)',
            '720p': 'linear-gradient(135deg, #007a47, #005a35)',
            '480p': 'linear-gradient(135deg, #FEC601, #e6b300)',
            '360p': 'linear-gradient(135deg, #5a8a6a, #4a7a5a)',
            '240p': 'linear-gradient(135deg, #8a9a8a, #7a8a7a)'
        };

        let qualityButtons = data.formats.map((f, index) => {
            const bg = qualityColors[f.quality] || 'linear-gradient(135deg, #009959, #007a47)';
            const isBest = index === 0;
            return `
                <button onclick="downloadVideo('${f.url}', '${f.quality}')"
                   style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 14px;margin-bottom:6px;background:${isBest ? 'linear-gradient(135deg, #FEC601, #e6b300)' : bg};color:${isBest ? '#002611' : '#fff'};border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s ease;border-left:4px solid ${isBest ? '#002611' : 'rgba(255,255,255,0.3)'};"
                   onmouseover="this.style.transform='translateX(4px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'"
                   onmouseout="this.style.transform='translateX(0)';this.style.boxShadow='none'">
                   <span style="display:flex;align-items:center;gap:8px;">
                      ${isBest ? '<span style="background:#002611;color:#FEC601;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;">BEST</span>' : ''}
                      <i class="fas fa-download" style="font-size:13px;"></i>
                      Download ${f.quality} ${f.format_note ? '(' + f.format_note + ')' : ''}
                   </span>
                   <span style="font-size:11px;opacity:0.8;">${f.filesize_approx ? (f.filesize_approx / 1024 / 1024).toFixed(1) + ' MB' : ''}</span>
                </button>
            `;
        }).join('');

        preview.innerHTML = `
            <div style="background:#fff;padding:16px;border-radius:14px;border:1px solid #d4e6da;box-shadow:0 2px 12px rgba(0,38,17,0.08);">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <img src="${ICON_URL}" style="width:22px;height:22px;border-radius:5px;" alt="">
                    <span style="background:${platformColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;">
                        <i class="fab ${platformIcon}"></i> ${platformName}
                    </span>
                </div>
                <div style="display:flex;gap:14px;flex-wrap:wrap;">
                    <div style="width:320px;max-width:100%;flex-shrink:0;">
                        <video controls playsinline muted style="width:100%;border-radius:10px;background:#000;max-height:240px;">
                            <source src="${firstVideo}" type="video/mp4">
                        </video>
                        <p style="font-size:11px;color:#999;text-align:center;margin-top:4px;">
                            <i class="fas fa-volume-mute"></i> Muted · <span onclick="const v=this.parentElement.previousElementSibling;v.muted=!v.muted;this.innerHTML=v.muted?'<i class=\\'fas fa-volume-mute\\'></i> Muted':'<i class=\\'fas fa-volume-up\\'></i> Sound on'" style="cursor:pointer;color:#009959;font-weight:600;">Unmute</span>
                        </p>
                    </div>
                    <div style="flex:1;min-width:200px;">
                        <h4 style="font-size:14px;font-weight:700;color:#002611;margin-bottom:4px;line-height:1.3;">${data.title || platformName + ' Video'}</h4>
                        ${data.uploader ? `
                        <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#e6f5ee;border-radius:8px;margin-bottom:10px;">
                            <img src="${ICON_URL}" style="width:24px;height:24px;border-radius:50%;">
                            <span style="font-size:12px;font-weight:600;color:#002611;">${data.uploader}</span>
                        </div>` : ''}
                        <div style="margin-bottom:10px;">${qualityButtons}</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button onclick="resetDownloader()" style="padding:8px 14px;border:1px solid #d4e6da;background:#f5f8f6;color:#002611;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;">
                                <i class="fas fa-redo"></i> New Video
                            </button>
                            <button onclick="window.location.href='page/purchase.html'" style="padding:8px 14px;border:none;background:linear-gradient(135deg,#FEC601,#e6b300);color:#002611;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;">
                                <i class="fas fa-crown"></i> Buy Tool
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding:0 4px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:600;color:#4a6b56;">Share:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;"><i class="fab fa-facebook-f"></i></a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Download ' + platformName + ' videos free: ' + SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;"><i class="fab fa-whatsapp"></i></a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#0088cc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;"><i class="fab fa-telegram-plane"></i></a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(SITE_URL)}" target="_blank" style="width:30px;height:30px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;"><i class="fab fa-twitter"></i></a>
            </div>
        `;

        setTimeout(loadDownloadHistory, 1500);
    } catch (err) {
        console.log('Network error:', err);
        preview.innerHTML = `
            <div style="background:#fff;padding:20px;border-radius:14px;border:1px solid #d4e6da;text-align:center;">
                <i class="fas fa-wifi" style="font-size:44px;color:#e74c3c;display:block;margin-bottom:10px;"></i>
                <h4 style="color:#e74c3c;font-weight:700;font-size:15px;margin-bottom:6px;">Connection Error</h4>
                <p style="color:#666;font-size:13px;margin-bottom:12px;">Please check your internet connection and try again.</p>
                <button onclick="resetDownloader()" style="padding:10px 20px;background:#009959;color:#fff;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        dlBtnIcon.style.display = "block";
        btnLoader.style.display = "none";
    }
}