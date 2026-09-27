// Vespera/app/presentation/static/ts/types.ts

// --- DB MODELS ---
export interface RGBColor
{
    r : number;
    g : number;
    b : number;
}

export interface PaletteStop extends RGBColor
{
    id_stop       : number;
    id_palette    : number;
    stop_position : number;
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
    user_notes?  : string;
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
    id_config    : number;
    config_hash  : string;
    display_name : string | null;
    is_system    : boolean;
    feed_rate    : number;
    kill_rate    : number;
    diff_u       : number;
    diff_v       : number;
    dt           : number;
    iterations   : number;
    created_at   : string | null;
}

export interface RelArtifactPalette
{
    id_rel      : number;
    id_artifact : number;
    id_palette  : number;
    palette?    : ColorPalette | null;
    created_at  : string       | null;
}

export interface ArtifactManifestation
{
    id_rel             : number;
    id_artifact        : number;
    alias              : string;
    artifact_hash      : string;
    id_source_image    : number;
    id_parent_artifact : number       | null;
    seed               : number;
    execution_time     : number;
    is_favorite        : boolean;
    user_notes         : string;
    palette            : ColorPalette | null;
    created_at         : string       | null;
    source_image       : SourceImage  | null;
    config             : ConfigTuring | null;
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
    frames?            : SynthesisFrame[];
    children?          : SynthesisArtifact[];
    source_image       : SourceImage  | null;
    config             : ConfigTuring | null;
    manifestations?    : RelArtifactPalette[];
}


// --- API CONTRACTS ---
export interface APIResponse<T = any>
{
    success     : boolean;
    data?       : T;
    error?      : string;
    message?    : string;
    status_code : number;
}

export interface HydrationSourceImage
{
    id_source_image : number;
    alias           : string;
    sha256_hash     : string;
    width           : number;
    height          : number;
    stream_url      : string;
}

export interface HydrationConfig
{
    id_config     : number;
    display_name? : string       | null;
    is_system     : boolean;
    feed_rate     : number;
    kill_rate     : number;
    diff_u        : number;
    diff_v        : number;
    dt            : number;
    iterations    : number;
    id_palette    : number;
    palette       : ColorPalette | null;
}

export interface HydrationBundle
{
    id_artifact        : number;
    alias              : string;
    artifact_hash      : string;
    parent_artifact_id : number;
    user_notes         : string;
    selected_palette?  : ColorPalette         | null;
    source_image       : HydrationSourceImage | null;
    config             : HydrationConfig      | null;
    frames             : string[];
    frame_iterations   : number[];
    frame_count        : number;
}

export interface VaultGalleryPayload
{
    id_palette      : number | null;
    id_config       : number | "custom" | null;
    id_source_image : number | null;
    favorites       : boolean;
    search          : string;
    sort_by         : string;
    sort_dir        : "asc"  | "desc";
    page            : number;
    per_page        : number;
}

export interface VaultGalleryData
{
    items       : ArtifactManifestation[];
    total_items : number;
    page        : number;
    per_page    : number;
    total_pages : number;
}

export interface SourceCatalogPayload
{
    search   : string;
    page     : number;
    per_page : number;
}

export interface SourceCatalogItem
{
    id_source_image   : number;
    sha256_hash       : string;
    alias             : string;
    width             : number;
    height            : number;
    file_size_bytes   : number;
    artifact_count    : number;
    latest_hash       : string | null;
    latest_thumb_url  : string | null;
    source_stream_url : string;
    created_at        : string | null;
}

export interface SourceCatalogData
{
    items       : SourceCatalogItem[];
    total_items : number;
    page        : number;
    per_page    : number;
    total_pages : number;
}

export interface AliasUpdatePayload
{
    alias : string;
}

export interface AliasUpdateData
{
    target_type    : string;
    target_id      : number;
    original_alias : string;
    new_alias      : string;
}

export interface NotesUpdatePayload
{
    user_notes : string;
}

export interface NotesUpdateData
{
    id_artifact : number;
    user_notes  : string | null;
}

export interface FavoriteToggleData
{
    id_artifact : number;
    is_favorite : boolean;
}

export interface SynthesisGenerateData
{
    artifact_hash  : string;
    execution_time : number;
    keyframes      : string[];
    captured_iters : number[];
    frame_count    : number;
    is_committed   : boolean;
}

export interface SynthesisCommitPayload
{
    artifact_hash      : string;
    alias              : string;
    parent_artifact_id : number | null;
    id_palette         : number;
    user_notes         : string | null;
}

export interface DeleteManifestationData
{
    id_rel                   : number;
    id_artifact              : number;
    artifact_alias           : string;
    remaining_manifestations : number;
}

export interface DeleteArtifactData
{
    id_artifact         : number;
    artifact_alias      : string;
    id_source_image     : number;
    source_alias        : string;
    remaining_artifacts : number;
}

export interface PaletteStopPayload extends RGBColor
{
    stop_position : number;
}

export interface PaletteMutationPayload
{
    display_name : string;
    user_notes?  : string;
    stops        : PaletteStopPayload[];
}


// --- PARTIAL ELEMENT CONTRACTS ---
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


// --- SYSTEM PALETTE ---
export interface VesperaPalette
{
    smokeCenter     : string;
    smokeInner      : string;
    smokeOuter     : string;

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