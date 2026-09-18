// Vespera/app/presentation/static/ts/base.ts

import {
    APIResponse,
    LoadingOverlayOptions,
    VesperaPalette,
    ColorPalette,    PaletteStop,
    HydrationBundle, HydrationConfig
} from "./types.js";

export function getVesperaPalette() : VesperaPalette
{
    const style : CSSStyleDeclaration = getComputedStyle(document.documentElement);
    return {
        smokeCenter     : style.getPropertyValue("--vespera-smoke-center").trim()     || "#DFE1EA",
        smokeInner      : style.getPropertyValue("--vespera-smoke-inner").trim()      || "#BBBEC4",
        smokeOuter      : style.getPropertyValue("--vespera-smoke-outer").trim()      || "#66686C",

        void            : style.getPropertyValue("--vespera-void").trim()             || "#060608",
        voidBorder      : style.getPropertyValue("--vespera-void-border").trim()      || "#14151B",
        obsidian        : style.getPropertyValue("--vespera-obsidian").trim()         || "#0B0C11",
        charcoal        : style.getPropertyValue("--vespera-velvet").trim()           || "#111319",
        surface         : style.getPropertyValue("--vespera-surface").trim()          || "#181A22",
        surfaceHover    : style.getPropertyValue("--vespera-surface-hover").trim()    || "#2E3242",

        bloodCoagulated : style.getPropertyValue("--vespera-blood-coagulated").trim() || "#1A0003",
        wine            : style.getPropertyValue("--vespera-wine").trim()             || "#2E0207",
        crimsonDark     : style.getPropertyValue("--vespera-crimson-dark").trim()     || "#4D0008",
        crimson         : style.getPropertyValue("--vespera-crimson").trim()          || "#800008",
        crimsonBright   : style.getPropertyValue("--vespera-crimson-bright").trim()   || "#B80A18",
        crimsonGlow     : style.getPropertyValue("--vespera-crimson-glow").trim()     || "#FF1A2A",

        ironBlack       : style.getPropertyValue("--vespera-iron-black").trim()       || "#050508",
        ironDark        : style.getPropertyValue("--vespera-iron-dark").trim()        || "#151720",
        iron            : style.getPropertyValue("--vespera-iron").trim()             || "#262936",
        pewter          : style.getPropertyValue("--vespera-pewter").trim()           || "#585E70",
        silver          : style.getPropertyValue("--vespera-silver").trim()           || "#9FA5B5",
        silverBright    : style.getPropertyValue("--vespera-silver-bright").trim()    || "#D8DCE6",
        silverGlow      : style.getPropertyValue("--vespera-silver-glow").trim()      || "#F0F3FA",

        amethystDark    : style.getPropertyValue("--vespera-amethyst-dark").trim()    || "#16041C",
        amethyst        : style.getPropertyValue("--vespera-amethyst").trim()         || "#380C42",
        violetGlow      : style.getPropertyValue("--vespera-violet-glow").trim()      || "#7E2699",
        lilacMist       : style.getPropertyValue("--vespera-lilac-mist").trim()       || "#C3A5C3",

        boneShadow      : style.getPropertyValue("--vespera-bone-shadow").trim()      || "#3C3E44",
        boneSilent      : style.getPropertyValue("--vespera-bone-silent").trim()      || "#727682",
        boneInk         : style.getPropertyValue("--vespera-bone-ink").trim()         || "#C5C9D3",
        bone            : style.getPropertyValue("--vespera-bone").trim()             || "#E2DFD8",
        parchment       : style.getPropertyValue("--vespera-parchment").trim()        || "#ECEAE4",
        white           : style.getPropertyValue("--vespera-white").trim()            || "#FFFFFF",

        glassBg         : style.getPropertyValue("--vespera-glass-bg").trim()         || "rgba( 12,  14,  20, 0.52)",
        borderBlack     : style.getPropertyValue("--vespera-border-black").trim()     || "rgba(  5,   5,   8, 0.90)",
        borderIron      : style.getPropertyValue("--vespera-border-iron").trim()      || "rgba( 38,  41,  54, 0.60)",
        borderSilver    : style.getPropertyValue("--vespera-border-silver").trim()    || "rgba(159, 165, 181, 0.25)",
        borderCrimson   : style.getPropertyValue("--vespera-border-crimson").trim()   || "rgba(128,   0,   8, 0.45)",
        borderGlow      : style.getPropertyValue("--vespera-border-glow").trim()      || "rgba(184,  10,  24, 0.65)",

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

export function buildPaletteLut(stops : PaletteStop[]) : Uint8ClampedArray
{
    const lut : Uint8ClampedArray = new Uint8ClampedArray(256 * 3);
    const sortedStops : PaletteStop[] = [...stops].sort((a, b) => a.stop_position - b.stop_position);

    for(let i : number = 0; i < 256; ++i)
    {
        const t : number = i / 255.0;
        let lower : PaletteStop = sortedStops[0];
        let upper : PaletteStop = sortedStops[sortedStops.length - 1];

        for(let s : number = 0; s < sortedStops.length - 1; ++s)
        {
            if(t >= sortedStops[s].stop_position && t <= sortedStops[s + 1].stop_position)
            {
                lower = sortedStops[s];
                upper = sortedStops[s + 1];
                break;
            }
        }

        const range  : number = upper.stop_position - lower.stop_position;
        const factor : number = range === 0 ? 0 : (t - lower.stop_position) / range;

        lut[i * 3]     = Math.round(lower.r + (upper.r - lower.r) * factor);
        lut[i * 3 + 1] = Math.round(lower.g + (upper.g - lower.g) * factor);
        lut[i * 3 + 2] = Math.round(lower.b + (upper.b - lower.b) * factor);
    }

    return lut;
}

(window as any).getVesperaPalette  = getVesperaPalette;
(window as any).showLoadingOverlay = showLoadingOverlay;
(window as any).hideLoadingOverlay = hideLoadingOverlay;
(window as any).apiFetch           = apiFetch;
(window as any).formatBytes        = formatBytes;
(window as any).truncateHash       = truncateHash;
(window as any).buildPaletteLut    = buildPaletteLut;