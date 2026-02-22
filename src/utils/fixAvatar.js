// Prepend Vite's base path to avatar URLs from the backend
// Backend returns paths like "/dev.png", but on GitHub Pages the app
// lives under "/agent-monitor/", so we need "/agent-monitor/dev.png".

const BASE = import.meta.env.BASE_URL; // e.g. "/" or "/agent-monitor/"

export const fixAvatar = (avatarPath) => {
    if (!avatarPath) return `${BASE}default.png`;
    // Already has full URL (http/https) — leave it alone
    if (avatarPath.startsWith('http')) return avatarPath;
    // Already prefixed — leave it alone
    if (avatarPath.startsWith(BASE)) return avatarPath;
    // Strip leading slash and prepend base
    const clean = avatarPath.replace(/^\//, '');
    return `${BASE}${clean}`;
};
