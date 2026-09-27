// Vespera/app/presentation/static/ts/partials/_overlay.ts

import { LoadingOverlayOptions } from "../types.js";

// LOADING OVERLAY
export function showLoadingOverlay(options? : LoadingOverlayOptions) : void
{
    const overlay : HTMLElement | null = document.getElementById("loading-overlay");
    const titleEl : HTMLElement | null = document.getElementById("overlay-title");
    const subEl   : HTMLElement | null = document.getElementById("overlay-subtitle");

    if(!overlay) return;

    if(titleEl && options?.title)    titleEl.textContent = options.title;
    if(subEl   && options?.subtitle) subEl.innerHTML     = options.subtitle;

    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
}

export function hideLoadingOverlay() : void
{
    const overlay : HTMLElement | null = document.getElementById("loading-overlay");
    if(!overlay) return;
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
}

(window as any).showLoadingOverlay = showLoadingOverlay;
(window as any).hideLoadingOverlay = hideLoadingOverlay;