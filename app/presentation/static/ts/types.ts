// Vespera/app/presentation/static/ts/types.ts

// --- API CONTRACTS ---
export interface APIResponse<T = any>
{
    success     : boolean;
    data?       : T;
    error?      : string;
    message?    : string;
    status_code : number;
}

// --- DOMAIN MODELS ---
export interface SourceImage
{
    id_source_image   : number;
    sha256_hash       : string;
    original_filename : string;
    width             : number;
    height            : number;
    file_size_bytes   : number;
    created_at        : string | null;
}

export interface ConfigTuring
{
    id_config     : number;
    config_hash   : string;
    feed_rate     : number;
    kill_rate     : number;
    diff_u        : number;
    diff_v        : number;
    dt            : number;
    iterations    : number;
    color_palette : string;
    created_at    : string | null;
}

export interface SynthesisArtifact
{
    id_artifact        : number;
    artifact_hash      : string;
    id_source_image    : number;
    id_parent_artifact : number | null;
    seed               : number;
    execution_time_ms  : number;
    is_favorite        : boolean;
    user_notes         : string;
    created_at         : string | null;
    keyframes?         : string[];
    children?          : SynthesisArtifact[];
    source_image       : SourceImage | null;
    config             : ConfigTuring | null;
}

// --- VAULT PAYLOADS ---
export interface VaultGalleryData
{
    items       : SynthesisArtifact[];
    total_items : number;
    page        : number;
    per_page    : number;
    total_pages : number;
}

export interface GraveyardData
{
    items : SourceImage[];
    count : number;
}

// --- MODAL & OVERLAY CONTRACTS ---
export type AlertType = "danger" | "error" | "warning" | "success" | "info";

export interface AlertModalOptions
{
    title?  : string;
    message : string;
    type?   : AlertType;
    icon?   : string;
    isHtml? : boolean;
}

export interface LoadingOverlayOptions
{
    title?    : string;
    subtitle? : string;
}

// --- PALETTE ---
export interface VesperaPalette
{
    void            : string;
    obsidian        : string;
    velvet          : string;
    surface         : string;
    surfaceHover    : string;

    bloodCoagulated : string;
    wine            : string;
    crimsonDark     : string;
    crimson         : string;
    crimsonBright   : string;
    crimsonGlow     : string;

    goldShadow      : string;
    goldDark        : string;
    gold            : string;
    goldBright      : string;
    goldGlow        : string

    amethystDark    : string;
    amethyst        : string;
    violetGlow      : string;
    lilacMist       : string;

    boneShadow      : string;
    boneSilent      : string;
    boneInk         : string;
    bone            : string;
    parchment       : string;
    white           : string;

    borderSubtle    : string;
    borderCrimson   : string;
    borderGold      : string;
    borderGlow      : string;
    glassBg         : string;
    glassBorder     : string;

    shadowAmbient   : string;
    glowCrimson     : string;
    glowCrimsonInt  : string;
    glowGold        : string;
    glowAmethyst    : string;
}