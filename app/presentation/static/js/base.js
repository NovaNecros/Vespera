"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVesperaPalette = getVesperaPalette;
exports.showLoadingOverlay = showLoadingOverlay;
exports.hideLoadingOverlay = hideLoadingOverlay;
exports.apiFetch = apiFetch;
exports.formatBytes = formatBytes;
exports.truncateHash = truncateHash;
function getVesperaPalette() {
    const style = getComputedStyle(document.documentElement);
    return {
        void: style.getPropertyValue("--vespera-void").trim() || "#040406",
        obsidian: style.getPropertyValue("--vespera-obsidian").trim() || "#08090C",
        velvet: style.getPropertyValue("--vespera-velvet").trim() || "#0F1015",
        surface: style.getPropertyValue("--vespera-surface").trim() || "#1C1E2B",
        surfaceHover: style.getPropertyValue("--vespera-surface-hover").trim() || "#1C1E2B",
        bloodCoagulated: style.getPropertyValue("--vespera-blood-coagulated").trim() || "#480208",
        wine: style.getPropertyValue("--vespera-wine").trim() || "#380208",
        crimsonDark: style.getPropertyValue("--vespera-crimson-dark").trim() || "#5C000B",
        crimson: style.getPropertyValue("--vespera-crimson").trim() || "#8A0303",
        crimsonBright: style.getPropertyValue("--vespera-crimson-bright").trim() || "#B80D1A",
        crimsonGlow: style.getPropertyValue("--vespera-crimson-glow").trim() || "#FF1A2A",
        goldShadow: style.getPropertyValue("--vespera-gold-shadow").trim() || "#3D2D10",
        goldDark: style.getPropertyValue("--vespera-gold-dark").trim() || "#7D6124",
        gold: style.getPropertyValue("--vespera-gold").trim() || "#C5A059",
        goldBright: style.getPropertyValue("--vespera-gold-bright").trim() || "#E8CA84",
        goldGlow: style.getPropertyValue("--vespera-gold-glow").trim() || "#FFF0C2",
        amethystDark: style.getPropertyValue("--vespera-amethyst-dark").trim() || "#190520",
        amethyst: style.getPropertyValue("--vespera-amethyst").trim() || "#481157",
        violetGlow: style.getPropertyValue("--vespera-violet-glow").trim() || "#9838B8",
        lilacMist: style.getPropertyValue("--vespera-lilac-mist").trim() || "#D8BFD8",
        boneShadow: style.getPropertyValue("--vespera-bone-shadow").trim() || "#4A4845",
        boneSilent: style.getPropertyValue("--vespera-bone-silent").trim() || "#85808A",
        boneInk: style.getPropertyValue("--vespera-bone-ink").trim() || "#D6D2CC",
        bone: style.getPropertyValue("--vespera-bone").trim() || "#EAe6DF",
        parchment: style.getPropertyValue("--vespera-parchment").trim() || "#F5EFE0",
        white: style.getPropertyValue("--vespera-white").trim() || "#FFFFFF",
        borderSubtle: style.getPropertyValue("--vespera-border-subtle").trim() || "rgba(138, 3, 3, 0.18)",
        borderCrimson: style.getPropertyValue("--vespera-border-crimson").trim() || "rgba(138, 3, 3, 0.45)",
        borderGold: style.getPropertyValue("--vespera-border-gold").trim() || "rgba(197, 160, 89, 0.40)",
        borderGlow: style.getPropertyValue("--vespera-border-glow").trim() || "rgba(194, 13, 26, 0.65)",
        glassBg: style.getPropertyValue("--vespera-glass-bg").trim() || "rgba(15, 16, 21, 0.78)",
        glassBorder: style.getPropertyValue("--vespera-glass-border").trim() || "rgba(197, 160, 89, 0.22)",
        shadowAmbient: style.getPropertyValue("--vespera-shadow-ambient").trim() || "0 8px 32px 0 rgba(0, 0, 0, 0.75)",
        glowCrimson: style.getPropertyValue("--vespera-glow-crimson").trim() || "0 0 20px rgba(138, 3, 3, 0.40)",
        glowCrimsonInt: style.getPropertyValue("--vespera-glow-crimson-int").trim() || "0 0 25px rgba(230, 0, 0, 0.60)",
        glowGold: style.getPropertyValue("--vespera-glow-gold").trim() || "0 0 15px rgba(197, 160, 89, 0.35)",
        glowAmethyst: style.getPropertyValue("--vespera-glow-amethyst").trim() || "0 0 20px rgba(152, 56, 184, 0.35)"
    };
}
function showLoadingOverlay(options) {
    const overlay = document.getElementById("loading-overlay");
    const titleEl = document.getElementById("overlay-title");
    const subEl = document.getElementById("overlay-subtitle");
    if (!overlay)
        return;
    if (titleEl && options?.title)
        titleEl.textContent = options.title;
    if (subEl && options?.subtitle)
        subEl.innerHTML = options.subtitle;
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
}
function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay)
        return;
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
}
async function apiFetch(url, options) {
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok || !result.success) {
            const errorMsg = result.error || `HTTP Error ${response.status}`;
            window.showAlertModal?.({
                title: "Invocation Failed",
                message: errorMsg,
                type: "danger"
            });
        }
        return result;
    }
    catch (error) {
        const errorMsg = error?.message || "An unexpected alchemical failure occurred.";
        window.showAlertModal?.({
            title: "Invocation Failed",
            message: errorMsg,
            type: "danger"
        });
        return {
            success: false,
            error: errorMsg,
            status_code: 500
        };
    }
}
function formatBytes(bytes) {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KiB", "MiB", "GiB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
function truncateHash(hash, chars = 8) {
    if (!hash || hash.length <= chars * 2)
        return hash;
    return `${hash.substring(0, chars)}...${hash.substring(hash.length - chars)}`;
}
window.getVesperaPalette = getVesperaPalette;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.apiFetch = apiFetch;
window.formatBytes = formatBytes;
window.truncateHash = truncateHash;
