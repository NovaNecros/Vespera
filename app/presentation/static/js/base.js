export function getVesperaPalette() {
    const style = getComputedStyle(document.documentElement);
    return {
        smokeCenter: style.getPropertyValue("--vespera-smoke-center").trim() || "#DFE1EA",
        smokeInner: style.getPropertyValue("--vespera-smoke-inner").trim() || "#BBBEC4",
        smokeOuter: style.getPropertyValue("--vespera-smoke-outer").trim() || "#66686C",
        void: style.getPropertyValue("--vespera-void").trim() || "#060608",
        voidBorder: style.getPropertyValue("--vespera-void-border").trim() || "#14151B",
        obsidian: style.getPropertyValue("--vespera-obsidian").trim() || "#0B0C11",
        charcoal: style.getPropertyValue("--vespera-velvet").trim() || "#111319",
        surface: style.getPropertyValue("--vespera-surface").trim() || "#181A22",
        surfaceHover: style.getPropertyValue("--vespera-surface-hover").trim() || "#2E3242",
        bloodCoagulated: style.getPropertyValue("--vespera-blood-coagulated").trim() || "#1A0003",
        wine: style.getPropertyValue("--vespera-wine").trim() || "#2E0207",
        crimsonDark: style.getPropertyValue("--vespera-crimson-dark").trim() || "#4D0008",
        crimson: style.getPropertyValue("--vespera-crimson").trim() || "#800008",
        crimsonBright: style.getPropertyValue("--vespera-crimson-bright").trim() || "#B80A18",
        crimsonGlow: style.getPropertyValue("--vespera-crimson-glow").trim() || "#FF1A2A",
        ironBlack: style.getPropertyValue("--vespera-iron-black").trim() || "#050508",
        ironDark: style.getPropertyValue("--vespera-iron-dark").trim() || "#151720",
        iron: style.getPropertyValue("--vespera-iron").trim() || "#262936",
        pewter: style.getPropertyValue("--vespera-pewter").trim() || "#585E70",
        silver: style.getPropertyValue("--vespera-silver").trim() || "#9FA5B5",
        silverBright: style.getPropertyValue("--vespera-silver-bright").trim() || "#D8DCE6",
        silverGlow: style.getPropertyValue("--vespera-silver-glow").trim() || "#F0F3FA",
        amethystDark: style.getPropertyValue("--vespera-amethyst-dark").trim() || "#16041C",
        amethyst: style.getPropertyValue("--vespera-amethyst").trim() || "#380C42",
        violetGlow: style.getPropertyValue("--vespera-violet-glow").trim() || "#7E2699",
        lilacMist: style.getPropertyValue("--vespera-lilac-mist").trim() || "#C3A5C3",
        boneShadow: style.getPropertyValue("--vespera-bone-shadow").trim() || "#3C3E44",
        boneSilent: style.getPropertyValue("--vespera-bone-silent").trim() || "#727682",
        boneInk: style.getPropertyValue("--vespera-bone-ink").trim() || "#C5C9D3",
        bone: style.getPropertyValue("--vespera-bone").trim() || "#E2DFD8",
        parchment: style.getPropertyValue("--vespera-parchment").trim() || "#ECEAE4",
        white: style.getPropertyValue("--vespera-white").trim() || "#FFFFFF",
        glassBg: style.getPropertyValue("--vespera-glass-bg").trim() || "rgba( 12,  14,  20, 0.52)",
        borderBlack: style.getPropertyValue("--vespera-border-black").trim() || "rgba(  5,   5,   8, 0.90)",
        borderIron: style.getPropertyValue("--vespera-border-iron").trim() || "rgba( 38,  41,  54, 0.60)",
        borderSilver: style.getPropertyValue("--vespera-border-silver").trim() || "rgba(159, 165, 181, 0.25)",
        borderCrimson: style.getPropertyValue("--vespera-border-crimson").trim() || "rgba(128,   0,   8, 0.45)",
        borderGlow: style.getPropertyValue("--vespera-border-glow").trim() || "rgba(184,  10,  24, 0.65)",
        shadowAmbient: style.getPropertyValue("--vespera-shadow-ambient").trim() || "0 8px 32px 0 rgba(0, 0, 0, 0.75)",
        glowCrimson: style.getPropertyValue("--vespera-glow-crimson").trim() || "0 0 20px rgba(138, 3, 3, 0.40)",
        glowCrimsonInt: style.getPropertyValue("--vespera-glow-crimson-int").trim() || "0 0 25px rgba(230, 0, 0, 0.60)",
        glowGold: style.getPropertyValue("--vespera-glow-gold").trim() || "0 0 15px rgba(197, 160, 89, 0.35)",
        glowAmethyst: style.getPropertyValue("--vespera-glow-amethyst").trim() || "0 0 20px rgba(152, 56, 184, 0.35)"
    };
}
export function showLoadingOverlay(options) {
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
export function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay)
        return;
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
}
export function openModalWithTransition(modalEl) {
    if (!modalEl)
        return;
    modalEl.classList.remove("hidden", "closing");
    modalEl.classList.add("flex");
    document.body.classList.add("overflow-hidden");
    void modalEl.offsetHeight;
    modalEl.classList.add("active");
}
export function closeModalWithTransition(modalEl, onClosed) {
    if (!modalEl)
        return;
    modalEl.classList.remove("active");
    modalEl.classList.add("closing");
    setTimeout(() => {
        modalEl.classList.remove("closing", "flex");
        modalEl.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
        if (onClosed)
            onClosed();
    }, 260);
}
export async function apiFetch(url, options) {
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
export function formatBytes(bytes) {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KiB", "MiB", "GiB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
export function truncateHash(hash, chars = 8) {
    if (!hash || hash.length <= chars * 2)
        return hash;
    return `${hash.substring(0, chars)}...${hash.substring(hash.length - chars)}`;
}
export function buildPaletteLut(stops) {
    const lut = new Uint8ClampedArray(256 * 3);
    const sortedStops = [...stops].sort((a, b) => a.stop_position - b.stop_position);
    for (let i = 0; i < 256; ++i) {
        const t = i / 255.0;
        let lower = sortedStops[0];
        let upper = sortedStops[sortedStops.length - 1];
        for (let s = 0; s < sortedStops.length - 1; ++s) {
            if (t >= sortedStops[s].stop_position && t <= sortedStops[s + 1].stop_position) {
                lower = sortedStops[s];
                upper = sortedStops[s + 1];
                break;
            }
        }
        const range = upper.stop_position - lower.stop_position;
        const factor = range === 0 ? 0 : (t - lower.stop_position) / range;
        lut[i * 3] = Math.round(lower.r + (upper.r - lower.r) * factor);
        lut[i * 3 + 1] = Math.round(lower.g + (upper.g - lower.g) * factor);
        lut[i * 3 + 2] = Math.round(lower.b + (upper.b - lower.b) * factor);
    }
    return lut;
}
export function applyPalette(data, lut) {
    for (let p = 0; p < data.length; p += 4) {
        data[p] = lut[data[p] * 3];
        data[p + 1] = lut[data[p] * 3 + 1];
        data[p + 2] = lut[data[p] * 3 + 2];
    }
}
window.getVesperaPalette = getVesperaPalette;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.openModalWithTransition = openModalWithTransition;
window.closeModalWithTransition = closeModalWithTransition;
window.apiFetch = apiFetch;
window.formatBytes = formatBytes;
window.truncateHash = truncateHash;
window.buildPaletteLut = buildPaletteLut;
