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

// --- DB MODELS ---
export interface PaletteStop
{
    id_stop       : number;
    id_palette    : number;
    stop_position : number;
    r             : number;
    g             : number;
    b             : number;
    hex           : string;
}

export interface ColorPalette
{
    id_palette   : number;
    name         : string;
    display_name : string;
    is_system    : boolean;
    is_favorite  : boolean;
    stops        : PaletteStop[];
    created_at   : string | null;
}

export interface SourceImage
{
    id_source_image   : number;
    sha256_hash       : string;
    alias             : string;
    width             : number;
    height            : number;
    file_size_bytes   : number;
    created_at        : string | null;
}

export interface ConfigTuring
{
    id_config   : number;
    config_hash : string;
    feed_rate   : number;
    kill_rate   : number;
    diff_u      : number;
    diff_v      : number;
    dt          : number;
    iterations  : number;
    id_palette  : number;
    palette     : string;
    created_at  : string | null;
}

export interface SynthesisFrame
{
    id_frame    : number;
    id_artifact : number;
    frame_index : number;
    iteration   : number;
    frame_hash  : string;
    created_at  : string | null;
}

export interface SynthesisArtifact
{
    id_artifact        : number;
    alias              : string;
    artifact_hash      : string;
    id_source_image    : number;
    id_parent_artifact : number       | null;
    seed               : number;
    execution_time     : number;
    is_favorite        : boolean;
    user_notes         : string;
    created_at         : string       | null;
    keyframes?         : string[];
    children?          : SynthesisArtifact[];
    source_image       : SourceImage  | null;
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
    title?            : string;
    message           : string;
    type?             : AlertType;
    icon?             : string;
    isHtml?           : boolean;
    showInput?        : boolean;
    inputLabel?       : string;
    inputPlaceholder? : string;
    inputValue        : string;
    confirmText?      : string;
    cancelText?       : string;
    onConfirm         : ((value : string) => void) | null;
    onCancel          : (() => void)               | null;
}

export interface LoadingOverlayOptions
{
    title?    : string;
    subtitle? : string;
}

// --- PALETTE ---
export interface VesperaPalette
{
    smokeCenter     : string;
    smokeInner      : string;
    smokerOuter     : string;

    void            : string;
    voidBorder      : string;
    obsidian        : string;
    charcoal        : string;
    surface         : string;
    surfaceHover    : string;

    bloodCoagulated : string;
    wine            : string;
    crimsonDark     : string;
    crimson         : string;
    crimsonBright   : string;
    crimsonGlow     : string;

    ironBlack       : string;
    ironDark        : string;
    iron            : string;
    pewter          : string;
    silver          : string;
    silverBright    : string;
    silverGlow      : string;

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

    glassBg         : string;
    borderBlack     : string;
    borderIron      : string;
    borderSilver    : string;
    borderCrimson   : string;
    borderGlow      : string;

    shadowAmbient   : string;
    glowCrimson     : string;
    glowCrimsonInt  : string;
    glowGold        : string;
    glowAmethyst    : string;
}