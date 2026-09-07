// Vespera/app/presentation/static/ts/base.ts

import { APIResponse, LoadingOverlayOptions, VesperaPalette } from "./types.js";

export function getVesperaPalette() : VesperaPalette
{
    const style : CSSStyleDeclaration = getComputedStyle(document.documentElement);
    return {
        void            : style.getPropertyValue("--vespera-void").trim()             || "#040406",
        obsidian        : style.getPropertyValue("--vespera-obsidian").trim()         || "#08090C",
        velvet          : style.getPropertyValue("--vespera-velvet").trim()           || "#0F1015",
        surface         : style.getPropertyValue("--vespera-surface").trim()          || "#1C1E2B",
        surfaceHover    : style.getPropertyValue("--vespera-surface-hover").trim()    || "#1C1E2B",

        bloodCoagulated : style.getPropertyValue("--vespera-blood-coagulated").trim() || "#480208",
        wine            : style.getPropertyValue("--vespera-wine").trim()             || "#380208",
        crimsonDark     : style.getPropertyValue("--vespera-crimson-dark").trim()     || "#5C000B",
        crimson         : style.getPropertyValue("--vespera-crimson").trim()          || "#8A0303",
        crimsonBright   : style.getPropertyValue("--vespera-crimson-bright").trim()   || "#B80D1A",
        crimsonGlow     : style.getPropertyValue("--vespera-crimson-glow").trim()     || "#FF1A2A",

        goldShadow      : style.getPropertyValue("--vespera-gold-shadow").trim()      || "#3D2D10",
        goldDark        : style.getPropertyValue("--vespera-gold-dark").trim()        || "#7D6124",
        gold            : style.getPropertyValue("--vespera-gold").trim()             || "#C5A059",
        goldBright      : style.getPropertyValue("--vespera-gold-bright").trim()      || "#E8CA84",
        goldGlow        : style.getPropertyValue("--vespera-gold-glow").trim()        || "#FFF0C2",

        amethystDark    : style.getPropertyValue("--vespera-amethyst-dark").trim()    || "#190520",
        amethyst        : style.getPropertyValue("--vespera-amethyst").trim()         || "#481157",
        violetGlow      : style.getPropertyValue("--vespera-violet-glow").trim()      || "#9838B8",
        lilacMist       : style.getPropertyValue("--vespera-lilac-mist").trim()       || "#D8BFD8",

        boneShadow      : style.getPropertyValue("--vespera-bone-shadow").trim()      || "#4A4845",
        boneSilent      : style.getPropertyValue("--vespera-bone-silent").trim()      || "#85808A",
        boneInk         : style.getPropertyValue("--vespera-bone-ink").trim()         || "#D6D2CC",
        bone            : style.getPropertyValue("--vespera-bone").trim()             || "#EAe6DF",
        parchment       : style.getPropertyValue("--vespera-parchment").trim()        || "#F5EFE0",
        white           : style.getPropertyValue("--vespera-white").trim()            || "#FFFFFF",

        borderSubtle    : style.getPropertyValue("--vespera-border-subtle").trim()    || "rgba(138, 3, 3, 0.18)",
        borderCrimson   : style.getPropertyValue("--vespera-border-crimson").trim()   || "rgba(138, 3, 3, 0.45)",
        borderGold      : style.getPropertyValue("--vespera-border-gold").trim()      || "rgba(197, 160, 89, 0.40)",
        borderGlow      : style.getPropertyValue("--vespera-border-glow").trim()      || "rgba(194, 13, 26, 0.65)",
        glassBg         : style.getPropertyValue("--vespera-glass-bg").trim()         || "rgba(15, 16, 21, 0.78)",
        glassBorder     : style.getPropertyValue("--vespera-glass-border").trim()     || "rgba(197, 160, 89, 0.22)",

        shadowAmbient   : style.getPropertyValue("--vespera-shadow-ambient").trim()   || "0 8px 32px 0 rgba(0, 0, 0, 0.75)",
        glowCrimson     : style.getPropertyValue("--vespera-glow-crimson").trim()     || "0 0 20px rgba(138, 3, 3, 0.40)",
        glowCrimsonInt  : style.getPropertyValue("--vespera-glow-crimson-int").trim() || "0 0 25px rgba(230, 0, 0, 0.60)",
        glowGold        : style.getPropertyValue("--vespera-glow-gold").trim()        || "0 0 15px rgba(197, 160, 89, 0.35)",
        glowAmethyst    : style.getPropertyValue("--vespera-glow-amethyst").trim()    || "0 0 20px rgba(152, 56, 184, 0.35)"
    };
}

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

// FETCH API DECORATOR
export async function apiFetch<T = any>(
    url      : string,
    options? : RequestInit
) : Promise<APIResponse<T>>
{
    try
    {
        const response : Response       = await fetch(url, options);
        const result   : APIResponse<T> = await response.json();

        if(!response.ok || !result.success)
        {
            const errorMsg : string = result.error || `HTTP Error ${response.status}`;
            (window as any).showAlertModal?.({
                title   : "Invocation Failed",
                message : errorMsg,
                type    : "danger"
            });
        }

        return result;
    }
    catch(error : any)
    {
        const errorMsg : string = error?.message || "An unexpected alchemical failure occurred.";
        (window as any).showAlertModal?.({
            title   : "Invocation Failed",
            message : errorMsg,
            type    : "danger"
        });
        return {
            success     : false,
            error       : errorMsg,
            status_code : 500
        };
    }
}

// --- UTILS ---
export function formatBytes(bytes : number) : string
{
    if(bytes === 0) return "0 Bytes";
    const k     : number   = 1024;
    // KB, MB y GB son múltiplos de 1000
    // KiB, MiB y GiB son múltiplos de 1024
    // *nerd glasses emoji*
    const sizes : string[] = ["Bytes", "KiB", "MiB", "GiB"];
    const i     : number   = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function truncateHash(hash : string, chars : number = 8) : string
{
    if(!hash || hash.length <= chars*2) return hash;
    return `${hash.substring(0, chars)}...${hash.substring(hash.length - chars)}`;
}

(window as any).getVesperaPalette  = getVesperaPalette;
(window as any).showLoadingOverlay = showLoadingOverlay;
(window as any).hideLoadingOverlay = hideLoadingOverlay;
(window as any).apiFetch           = apiFetch;
(window as any).formatBytes        = formatBytes;
(window as any).truncateHash       = truncateHash;