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
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
