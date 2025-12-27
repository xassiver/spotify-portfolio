import ColorThief from 'colorthief';

const USER_ID = "766202953312108554";
const playButton = document.getElementById('play-button');
const progressRing = document.getElementById('progress-ring');
const progressCircle = document.getElementById('progress-ring-circle');
const glowBg = document.getElementById('glow-bg');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const statusText = document.getElementById('status');
const container = document.getElementById('container');

let currentTrackId = null;
let audio = new Audio();
audio.crossOrigin = "anonymous";
let socket = null;
let heartbeatInterval = null;
let previewUrl = null;
let isFetching = false;

// Progress Ring Setup
const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    progressCircle.style.strokeDashoffset = offset;
}

// Web Audio API for Bass Visualization
let audioCtx = null;
let analyser = null;
let source = null;
let dataArray = null;
let animationFrameId = null;

const colorThief = new ColorThief();

const discordMini = document.getElementById('discord-mini');
const discordMiniAvatar = document.getElementById('discord-mini-avatar');
const discordMiniName = document.getElementById('discord-mini-name');

// Initialize Audio
audio.volume = 0.5;

function connect() {
    if (socket) {
        socket.close();
    }

    socket = new WebSocket('wss://api.lanyard.rest/socket');

    socket.onopen = () => {
        console.log("WebSocket connected");
        // We don't set statusText here anymore to avoid flicker, 
        // we wait for the first INIT_STATE
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Op 1: Hello (contains heartbeat interval)
        if (data.op === 1) {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ op: 3 }));
                }
            }, data.d.heartbeat_interval);

            // Subscribe to user
            socket.send(JSON.stringify({
                op: 2,
                d: { subscribe_to_id: USER_ID }
            }));
        }

        // Op 0: Event (INIT_STATE or PRESENCE_UPDATE)
        if (data.op === 0) {
            // Lanyard returns user presence in data.d for these events
            updateSpotify(data.d);
        }
    };

    socket.onclose = () => {
        clearInterval(heartbeatInterval);
        // Only show reconnect text when no track is active so transient UI changes
        // (like muting/pausing) don't overwrite the current song status.
        if (!currentTrackId) {
            statusText.innerText = "Reconnecting...";
        }
        setTimeout(connect, 5000);
    };
}

async function fetchPreview(song, artist) {
    // 1. Better metadata cleaning
    const primaryArtist = artist.split(/[;|,]/)[0].trim();
    const cleanSong = song
        .split(' - ')[0] 
        .replace(/\(feat\..*?\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .trim();

    // Try a few variations of the query to maximize success
    const queryVariations = [
        `${primaryArtist} ${cleanSong}`,
        `${cleanSong} ${primaryArtist}`,
        cleanSong
    ];

    for (const q of queryVariations) {
        const query = encodeURIComponent(q);
        
        // Try iTunes Search API
        try {
            const itunesUrl = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
            const response = await fetch(itunesUrl);
            const data = await response.json();
            if (data.results?.[0]?.previewUrl) return data.results[0].previewUrl;
        } catch (e) {}

        // Try Deezer API with CORS Proxy
        try {
            const deezerUrl = `https://api.deezer.com/search?q=${query}&limit=1`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(deezerUrl)}`;
            const response = await fetch(proxyUrl);
            const dataWrap = await response.json();
            const data = JSON.parse(dataWrap.contents);
            if (data.data?.[0]?.preview) return data.data[0].preview;
        } catch (e) {}
    }

    return null;
}

async function getDominantColor(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            try {
                const color = colorThief.getColor(img);
                resolve(color.join(','));
            } catch (e) {
                resolve("29, 185, 84"); // Fallback to Spotify Green
            }
        };
        img.onerror = () => resolve("29, 185, 84");
    });
}

async function updateSpotify(presence) {
    const data = (presence && presence[USER_ID]) ? presence[USER_ID] : presence;
    const spotify = data.spotify;

    if (!spotify) {
        if (currentTrackId !== null) {
            currentTrackId = null;
            previewUrl = null;
            fadeUpdate(() => {
                playButton.classList.add('hidden');
                progressRing.classList.add('hidden');
                statusText.innerText = "Not listening to anything right now";
                audio.pause();
                updateUIState(false);
            });
        } else {
            statusText.innerText = "Not listening to anything right now";
            playButton.classList.add('hidden');
        }
        return;
    }

    const trackId = spotify.track_id;

    if (trackId !== currentTrackId && !isFetching) {
        // Reset progress on track change
        setProgress(0);
        isFetching = true;
        playButton.classList.add('loading');
        currentTrackId = trackId;
        
        const songName = spotify.song;
        const artistName = spotify.artist;
        const albumArt = spotify.album_art_url;

        try {
            statusText.innerText = "Renkler ve önizleme ayarlanıyor...";
            const color = await getDominantColor(albumArt);
            document.documentElement.style.setProperty('--accent-color', color);

            const newPreviewUrl = await fetchPreview(songName, artistName);
            
            fadeUpdate(() => {
                // Build clickable song + artists (each opens in new tab). Dash is non-clickable but has hover.
                const songLink = currentTrackId ? `https://open.spotify.com/track/${currentTrackId}` : '#';
                // Split artists by common separators ; , & and trim
                const artistParts = artistName.split(/\s*(?:;|,|&)\s*/).filter(Boolean);
                const artistHtml = artistParts.map((a) => {
                    const url = `https://open.spotify.com/search/${encodeURIComponent(a)}`;
                    return `<a class="artist-link" href="${url}" target="_blank" rel="noopener">${a}</a>`;
                }).join(', ');
                const statusHtml = `<a class="song-link" href="${songLink}" target="_blank" rel="noopener">${songName}</a><span class="dash">-</span>${artistHtml}`;

                statusText.innerHTML = statusHtml;
                playButton.classList.remove('hidden');
                progressRing.classList.remove('hidden');
                playButton.style.backgroundImage = `url(${albumArt})`;
                
                // Update tiny Discord mini-profile if discord user info exists
                try {
                    const discordUser = (data && data.discord_user) ? data.discord_user : (presence && presence.discord_user) ? presence.discord_user : null;
                    if (discordUser) {
                        // Lanyard discord avatar URL pattern (cdn.discordapp.com) - prefer full avatar URL if available
                        const avatarHash = discordUser.avatar;
                        const userId = discordUser.id;
                        if (avatarHash && userId) {
                            const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
                            const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=64`;
                            discordMiniAvatar.style.backgroundImage = `url(${avatarUrl})`;
                        } else {
                            discordMiniAvatar.style.backgroundImage = '';
                        }
                        discordMiniName.textContent = discordUser.username ? discordUser.username : (discordUser.global_name || 'user');
                        discordMini.style.opacity = '0.95';
                    } else {
                        // Hide if not available
                        discordMini.style.opacity = '0';
                    }
                } catch (e) {
                    discordMini.style.opacity = '0';
                }

                if (newPreviewUrl) {
                    audio.pause();
                    audio.src = newPreviewUrl;
                    previewUrl = newPreviewUrl;
                    updateUIState(false);
                } else {
                    statusText.innerText = "Preview not found";
                    previewUrl = null;
                    audio.pause();
                    updateUIState(false);
                }
            });
        } catch (err) {
            console.error("Update error:", err);
        } finally {
            isFetching = false;
            playButton.classList.remove('loading');
        }
    }
}

function initAudioContext() {
    if (audioCtx) return;
    
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // Smaller FFT for snappier bass response
        analyser.smoothingTimeConstant = 0.4;
        
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
        console.error("AudioContext error:", e);
    }
}

function visualize() {
    if (!analyser || audio.paused) {
        glowBg.style.transform = 'scale(1)';
        animationFrameId = null;
        return;
    }
    
    animationFrameId = requestAnimationFrame(visualize);
    
    // Update Progress
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setProgress(progress);
    }

    analyser.getByteFrequencyData(dataArray);
    
    // Focus on the sub-bass and bass ranges (first few bins)
    let bass = 0;
    const bins = 4; 
    for (let i = 0; i < bins; i++) {
        bass += dataArray[i];
    }
    bass = bass / bins;
    
    // More aggressive scaling for visual impact
    // 0-255 range. We want the glow to expand significantly on hit.
    const sensitivity = 1.2; 
    const scale = 1 + (bass / 255) * sensitivity;
    
    // Direct DOM update for performance
    glowBg.style.transform = `scale(${scale})`;
}

function updateUIState(isPlaying) {
    if (isPlaying) {
        playButton.classList.add('playing');
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        if (!animationFrameId) {
            // Small timeout to ensure audio is actually flowing
            setTimeout(visualize, 50);
        }
    } else {
        playButton.classList.remove('playing');
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        glowBg.style.transform = 'scale(1)';
    }
}

function fadeUpdate(callback) {
    container.style.opacity = '0';
    setTimeout(() => {
        callback();
        container.style.opacity = '1';
    }, 500);
}

playButton.addEventListener('click', () => {
    if (!previewUrl) return;

    initAudioContext();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (audio.paused) {
        audio.play();
        updateUIState(true);
    } else {
        audio.pause();
        updateUIState(false);
    }
});

// Open the current track on right-click
playButton.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!currentTrackId) return;
    const trackUrl = `https://open.spotify.com/track/${currentTrackId}`;
    window.open(trackUrl, '_blank', 'noopener');
});

audio.addEventListener('ended', () => {
    updateUIState(false);
});

/* Prevent dragging/selection of images and SVGs in runtime (extra guard) */
document.addEventListener('dragstart', (e) => {
    e.preventDefault();
});
document.querySelectorAll('img, svg').forEach(el => {
    try { el.draggable = false; } catch (e) {}
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none';
    el.style.msUserSelect = 'none';
});

connect();

// Mouse-wheel volume control when cursor is over the play button
let volumeHudTimeout = null;
let isPointerOverPlay = false;

function applyVolumeFeedback() {
    // subtle glow/scale feedback based on volume
    const vol = Math.max(0, Math.min(1, audio.volume));
    playButton.style.transform = audio.paused ? 'scale(0.95)' : 'scale(1)';
    playButton.style.boxShadow = `0 0 ${20 + vol * 40}px rgba(var(--accent-color), ${0.15 + vol * 0.5})`;
    clearTimeout(volumeHudTimeout);
    volumeHudTimeout = setTimeout(() => {
        playButton.style.transform = '';
        playButton.style.boxShadow = '';
    }, 300);
}

function adjustVolumeByDelta(deltaY) {
    const step = 0.05; // volume step per scroll notch
    if (deltaY > 0) {
        audio.volume = Math.max(0, audio.volume - step);
    } else {
        audio.volume = Math.min(1, audio.volume + step);
    }
    applyVolumeFeedback();
}

// track pointer over the play button so scrolling only affects volume when hovered
playButton.addEventListener('mouseenter', () => { isPointerOverPlay = true; });
playButton.addEventListener('mouseleave', () => { isPointerOverPlay = false; });

// Listen for wheel events and change volume when pointer is over the play button
window.addEventListener('wheel', (e) => {
    // Only intercept when play button is visible and pointer is over it
    if (!playButton.classList.contains('hidden') && isPointerOverPlay) {
        e.preventDefault();
        adjustVolumeByDelta(e.deltaY);
    }
}, { passive: false });

/* connect() already called above; keep a single connection attempt */