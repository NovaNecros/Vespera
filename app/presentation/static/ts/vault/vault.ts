// Vespera/app/presentation/static/ts/vault/vault.ts

import
{
    APIResponse,        ConfigTuring,
    SynthesisArtifact,  SynthesisFrame,
    ColorPalette,       RelArtifactPalette,
    SourceCatalogItem,  SourceCatalogData,
    VaultGalleryData,   VaultGalleryPayload,
    DeleteArtifactData, DeleteManifestationData,
    AliasUpdateData,    AliasUpdatePayload,
    NotesUpdateData,    NotesUpdatePayload,
    FavoriteToggleData, SourceCatalogPayload,
    ArtifactManifestation
} from "../types.js";
import
{
    apiFetch,
    truncateHash,
    formatBytes,
    buildPaletteLut, applyPalette
} from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";

type VaultTab = "artifacts" | "catalysts";

interface VaultState
{
    activeTab            : VaultTab;
    reliquaryPage        : number;
    reliquaryPerPage     : number;
    reliquaryTotalPages  : number;
    catalystsPage        : number;
    catalystsPerPage     : number;
    catalystsTotalPages  : number;
    searchQuery          : string;
    selectedPaletteId    : string;
    selectedConfigId     : string;
    viewMonochrome       : boolean;
    filterFavorites      : boolean;
    sortBy               : string;
    sortDir              : "asc"             | "desc";
    selectedSourceId     : number            | null;
    paletteCatalog       : ColorPalette[];
    systemConfigs        : ConfigTuring[];
    activeLut            : Uint8ClampedArray | null;

    // Modal
    inspectorRelId       : number            | null;
    inspectorArtifact    : SynthesisArtifact | null;
}

document.addEventListener("DOMContentLoaded", () : void =>
{
    // --- VARIABLES ---
    const mainContainer : HTMLElement | null = document.getElementById("vault-main-container");
    if(!mainContainer) return;

    // Template URLs
    const studioTemplateUrl : string = mainContainer.dataset.studioTemplateUrl         || "";
    // API URLs
    const palettesApiUrl    : string = mainContainer.dataset.palettesApiUrl            || "";
    const configsApiUrl     : string = mainContainer.dataset.configsApiUrl             || "";
    const galleryApiUrl     : string = mainContainer.dataset.galleryApiUrl             || "";
    const sourcesApiUrl     : string = mainContainer.dataset.sourcesApiUrl             || "";
    const artifactDetailUrl : string = mainContainer.dataset.artifactDetailApiUrl      || "";
    const updateArtAliasUrl : string = mainContainer.dataset.updateArtifactAliasApiUrl || "";
    const updateSrcAliasUrl : string = mainContainer.dataset.updateSourceAliasApiUrl   || "";
    const toggleFavoriteUrl : string = mainContainer.dataset.toggleFavoriteApiUrl      || "";
    const updateNotesUrl    : string = mainContainer.dataset.updateNotesApiUrl         || "";
    const deleteRelApiUrl   : string = mainContainer.dataset.deleteRelApiUrl           || "";
    const deleteArtifactUrl : string = mainContainer.dataset.deleteArtifactApiUrl      || "";
    const dwnldManifestUrl  : string = mainContainer.dataset.downloadManifestApiUrl    || "";
    const deleteSourceUrl   : string = mainContainer.dataset.deleteSourceApiUrl        || "";
    const streamArtifactUrl : string = mainContainer.dataset.streamArtifactApiUrl      || "";
    const streamThumbUrl    : string = mainContainer.dataset.streamThumbApiUrl         || "";
    const streamSourceUrl   : string = mainContainer.dataset.streamSourceApiUrl        || "";
    const streamFrameUrl    : string = mainContainer.dataset.streamFrameApiUrl         || "";
    const enigmaApiUrl      : string = mainContainer.dataset.enigmaApiUrl              || "";

    // Tabs & Sections
    const tabReliquaryBtn   : HTMLButtonElement   | null = document.getElementById("tab-reliquary-button")          as HTMLButtonElement;
    const tabCatalystsBtn   : HTMLButtonElement   | null = document.getElementById("tab-catalysts-btn")             as HTMLButtonElement;
    const badgeTotalArt     : HTMLElement         | null = document.getElementById("badge-total-artifacts");
    const badgeTotalSrc     : HTMLElement         | null = document.getElementById("badge-total-sources");
    const viewReliquary     : HTMLElement         | null = document.getElementById("view-reliquary");
    const viewCatalysts     : HTMLElement         | null = document.getElementById("view-catalysts");

    // Controls
    const searchInput       : HTMLInputElement    | null = document.getElementById("vault-search-input")            as HTMLInputElement;
    const clearSearchBtn    : HTMLButtonElement   | null = document.getElementById("clear-search-btn")              as HTMLButtonElement;
    const filterPaletteSel  : HTMLSelectElement   | null = document.getElementById("filter-palette-select")         as HTMLSelectElement;
    const filterConfigSel   : HTMLSelectElement   | null = document.getElementById("filter-config-select")          as HTMLSelectElement;
    const toggleMonoBtn     : HTMLButtonElement   | null = document.getElementById("toggle-monochrome-view-btn")    as HTMLButtonElement;
    const filterFavBtn      : HTMLButtonElement   | null = document.getElementById("filter-favorites-btn")          as HTMLButtonElement;
    const sortBySel         : HTMLSelectElement   | null = document.getElementById("sort-by-select")                as HTMLSelectElement;
    const sortDirBtn        : HTMLButtonElement   | null = document.getElementById("sort-direction-btn")            as HTMLButtonElement;
    const sortDirIcon       : HTMLElement         | null = document.getElementById("sort-direction-icon")           as HTMLElement;
    const resetFiltersBtn   : HTMLButtonElement   | null = document.getElementById("reset-filters-btn")             as HTMLButtonElement;

    // Artifacts
    const artifactsGrid     : HTMLElement         | null = document.getElementById("vault-artifacts-grid");
    const reliquaryEmpty    : HTMLElement         | null = document.getElementById("reliquary-empty-state");
    const reliquaryPageInfo : HTMLElement         | null = document.getElementById("reliquary-page-info");
    const reliquaryPrevBtn  : HTMLButtonElement   | null = document.getElementById("reliquary-prev-page-btn")       as HTMLButtonElement;
    const reliquaryNextBtn  : HTMLButtonElement   | null = document.getElementById("reliquary-next-page-btn")       as HTMLButtonElement;
    const reliquaryPageInp  : HTMLInputElement    | null = document.getElementById("reliquary-page-input")          as HTMLInputElement;
    const reliquaryTotalP   : HTMLElement         | null = document.getElementById("reliquary-total-pages");

    // Catalysts
    const sourcesGrid       : HTMLElement         | null = document.getElementById("vault-sources-grid");
    const catalystsEmpty    : HTMLElement         | null = document.getElementById("catalysts-empty-state");
    const catalystsPageInfo : HTMLElement         | null = document.getElementById("catalysts-page-info");
    const catalystsPrevBtn  : HTMLButtonElement   | null = document.getElementById("catalysts-prev-page-btn")       as HTMLButtonElement;
    const catalystsNextBtn  : HTMLButtonElement   | null = document.getElementById("catalysts-next-page-btn")       as HTMLButtonElement;
    const catalystsPageInp  : HTMLInputElement    | null = document.getElementById("catalysts-page-input")          as HTMLInputElement;
    const catalystsTotalP   : HTMLElement         | null = document.getElementById("catalysts-total-pages");

    // Preview Modal
    const inspectorModal    : HTMLElement         | null = document.getElementById("artifact-inspector-modal")      as HTMLElement;
    const inspectorCloseBtn : HTMLButtonElement   | null = document.getElementById("inspector-close-btn")           as HTMLButtonElement;
    const inspFavToggleBtn  : HTMLButtonElement   | null = document.getElementById("inspector-favorite-toggle-btn") as HTMLButtonElement;
    const inspFavIcon       : HTMLElement         | null = document.getElementById("inspector-favorite-icon")       as HTMLElement;
    const inspAliasHeading  : HTMLElement         | null = document.getElementById("inspector-artifact-alias")      as HTMLElement;
    const inspRenameBtn     : HTMLButtonElement   | null = document.getElementById("inspector-rename-alias-btn")    as HTMLButtonElement;
    const mirror            : ScryingMirror              = new ScryingMirror();

    // Modal Metadata
    const inspPresetCont    : HTMLElement         | null = document.getElementById("inspector-preset-container")    as HTMLElement;
    const inspPresetBadge   : HTMLElement         | null = document.getElementById("inspector-preset-badge")        as HTMLElement;
    const inspFeedRate      : HTMLElement         | null = document.getElementById("inspector-feed-rate");
    const inspKillRate      : HTMLElement         | null = document.getElementById("inspector-kill-rate");
    const inspDUDV          : HTMLElement         | null = document.getElementById("inspector-du-dv");
    const inspIterDt        : HTMLElement         | null = document.getElementById("inspector-iter-dt");
    const inspPaletteBadge  : HTMLElement         | null = document.getElementById("inspector-palette-badge");
    const inspExecTime      : HTMLElement         | null = document.getElementById("inspector-execution-time");
    const inspCreatedDate   : HTMLElement         | null = document.getElementById("inspector-created-date");
    const inspArtifactHash  : HTMLElement         | null = document.getElementById("inspector-artifact-hash");
    const inspNotesTextArea : HTMLTextAreaElement | null = document.getElementById("inspector-notes-textarea")      as HTMLTextAreaElement;
    const inspSaveNotesBtn  : HTMLButtonElement   | null = document.getElementById("inspector-save-notes-btn")      as HTMLButtonElement;
    const inspBranchBtn     : HTMLButtonElement   | null = document.getElementById("inspector-branch-studio-btn")   as HTMLButtonElement;
    const inspDownloadBtn   : HTMLAnchorElement   | null = document.getElementById("inspector-download-btn")        as HTMLAnchorElement;
    const inspDelBtn        : HTMLButtonElement   | null = document.getElementById("inspector-delete-btn")          as HTMLButtonElement;

    let searchDebounceTimer : number | null = null;

    // --- FUNCTIONS ---
    // Palettes
    async function loadPaletteCatalog() : Promise<void>
    {
        const res : APIResponse<ColorPalette[]> = await apiFetch<ColorPalette[]>(palettesApiUrl);
        if(!res.success || !Array.isArray(res.data)) return;

        state.paletteCatalog = res.data;

        const bratPal : ColorPalette | undefined = state.paletteCatalog.find(
            (p : ColorPalette) => p.name === "brat");
        const bratLut : Uint8ClampedArray | null = bratPal ? buildPaletteLut(bratPal.stops) : null;
        mirror.setEnigmaTarget(enigmaApiUrl, bratLut);

        if(!filterPaletteSel) return;

        const bufferHTML : string[] = [
            `<option value="">Omnichromatic</option>`,
            `<option value="0">Monochrome</option>`
        ];
        res.data.forEach((pal : ColorPalette) =>
        {
            bufferHTML.push(`<option value="${pal.id_palette.toString()}">${pal.display_name}</option>`);
        });
        filterPaletteSel.innerHTML = bufferHTML.join("");
    }

    // System parameter configs
    async function loadSystemConfigs() : Promise<void>
    {
         if(!filterConfigSel) return;

         const res : APIResponse<ConfigTuring[]> = await apiFetch<ConfigTuring[]>(configsApiUrl);

         if(!res.success || !Array.isArray(res.data)) return;

         state.systemConfigs = res.data;

         const bufferHTML : string[] = [`<option value="">All</option>`];
         res.data.forEach((cfg : ConfigTuring) =>
         {
            bufferHTML.push(`
                <option value="${cfg.id_config.toString()}">
                    ${cfg.display_name || "Formula #" + cfg.id_config}
                </option>
            `);
         });
         bufferHTML.push(`<option value="custom">Custom Formulae</option>`);
         filterConfigSel.innerHTML = bufferHTML.join("");
    }

    // State
    function getDefaultState() : VaultState
    {
        return {
            activeTab            : "artifacts",
            reliquaryPage        : 1,
            reliquaryPerPage     : 24,
            reliquaryTotalPages  : 1,
            catalystsPage        : 1,
            catalystsPerPage     : 16,
            catalystsTotalPages  : 1,
            searchQuery          : "",
            selectedPaletteId    : "",
            selectedConfigId     : "",
            viewMonochrome       : false,
            filterFavorites      : false,
            sortBy               : "date_created",
            sortDir              : "desc",
            selectedSourceId     : null,
            paletteCatalog       : [],
            systemConfigs        : [],
            activeLut            : null,

            inspectorRelId       : null,
            inspectorArtifact    : null,
        };
    }
    let state : VaultState = getDefaultState();

    // Modal
    async function openInspectorModal(idArtifact : number, idRel? : number) : Promise<void>
    {
        try
        {
            const apiUrl : string = artifactDetailUrl.replace("/artifact/0", `/artifact/${idArtifact}`);
            const res : APIResponse<SynthesisArtifact> = await apiFetch<SynthesisArtifact>(apiUrl);

            if(!res.success || !res.data) return;

            const art : SynthesisArtifact = res.data;
            state.inspectorArtifact       = art;
            state.inspectorRelId          = idRel || (art as any).manifestations?.[0]?.id_rel || null;

            if(inspAliasHeading) inspAliasHeading.textContent = art.alias;
            if(inspFavIcon)
            {
                inspFavIcon.className = art.is_favorite ? "fa-solid fa-star text-vespera-crimson" : "fa-regular fa-star";
            }

            if(inspFeedRate)     inspFeedRate.textContent     = art.config ? art.config.feed_rate.toFixed(4) : "-";
            if(inspKillRate)     inspKillRate.textContent     = art.config ? art.config.kill_rate.toFixed(4) : "-";
            if(inspDUDV)         inspDUDV.textContent         = art.config ? `${art.config.diff_u.toFixed(3)} • ${art.config.diff_v.toFixed(3)}` : "- • -"
            if(inspIterDt)       inspIterDt.textContent       = art.config ? `${art.config.iterations} • ${art.config.dt.toFixed(2)}` : "- • -";
            if(inspExecTime)     inspExecTime.textContent     = `${art.execution_time.toFixed(6)} s`;
            if(inspCreatedDate)  inspCreatedDate.textContent  = art.created_at ? new Date(art.created_at).toLocaleString() : "-";
            if(inspArtifactHash)
            {
                inspArtifactHash.textContent = art.artifact_hash;
                inspArtifactHash.title       = art.artifact_hash;
            }
            if(inspNotesTextArea) inspNotesTextArea.value     = art.user_notes || "";
            if(inspPresetCont && inspPresetBadge)
            {
                if(art.config && art.config.display_name)
                {
                    inspPresetBadge.textContent = art.config.display_name;
                    inspPresetCont.classList.remove("hidden");
                    inspPresetCont.classList.add("flex");
                }
                else
                {
                    inspPresetCont.classList.add("hidden");
                    inspPresetCont.classList.remove("flex");
                }
            }

            const manifestPalette : ColorPalette | null = (
                (art.manifestations?.find((m : RelArtifactPalette) => m.id_rel === idRel)?.palette) ||
                (art.manifestations?.[0]?.palette)                                                  ||
                null
            );

            if(inspPaletteBadge)
            {
                inspPaletteBadge.textContent = (state.viewMonochrome ? "Monochrome" :
                    (manifestPalette?.display_name || "Monochrome")
                );
            }

            if(!state.viewMonochrome && manifestPalette && manifestPalette.stops)
            {
                state.activeLut = buildPaletteLut(manifestPalette.stops);
            }
            else
            {
                state.activeLut = null;
            }

            mirror.setPaletteLut(state.activeLut);

            const hasActiveManifestation : boolean = Boolean(state.inspectorRelId && state.inspectorRelId > 0);
            if(inspDelBtn)
            {
                if(hasActiveManifestation)
                {
                    inspDelBtn.innerHTML = `<i class="fa-solid fa-droplet-slash mr-1.5"></i> Purge Manifestation`;
                    inspDelBtn.title     = "Grayscale Artifact will be preserved.";
                }
                else
                {
                    inspDelBtn.innerHTML = `<i class="fa-solid fa-trash-can mr-1.5"></i> Purge Artifact`;
                    inspDelBtn.title     = "Purge physical grayscale Artifact and its morph frames.";
                }
            }

            if(inspDownloadBtn)
            {
                const downloadFilename : string = (
                    art.alias.match(/\.(png|jpg|jpeg|webp)$/i)
                        ? art.alias : `${art.alias}.png`
                );

                const isColoredDownload : boolean = (
                    !state.viewMonochrome &&
                    Boolean(state.inspectorRelId && state.inspectorRelId > 0 && dwnldManifestUrl)
                );

                if(isColoredDownload)
                {
                    inspDownloadBtn.href = dwnldManifestUrl.replace(
                        "/relationship/0", `/relationship/${state.inspectorRelId}`);
                }
                else
                {
                    inspDownloadBtn.href = streamArtifactUrl.replace(
                        "/hash/PLACEHOLDER", `/hash/${art.artifact_hash}`);
                }

                inspDownloadBtn.download = downloadFilename;
            }

            if(art.source_image)
            {
                const srcUrl : string = streamSourceUrl.replace(
                    "/hash/PLACEHOLDER", `/hash/${art.source_image.sha256_hash}`);
                mirror.setCatalyst(srcUrl);
            }

            const frameUrls : string[] = (art.frames || []).map((frame : SynthesisFrame) =>
            {
               return streamFrameUrl
                   .replace("/hash/PLACEHOLDER", `/hash/${art.artifact_hash}`)
                   .replace("/frame/0", `/frame/${frame.frame_index}`);
            });

            const frameIters : number[] = (art.frames || []).map((frame : SynthesisFrame) =>
            {
               return frame.iteration;
            });

            (window as any).openModalWithTransition(inspectorModal);

            await mirror.loadFrames(frameUrls, frameIters);
            mirror.play();
        }
        catch(error)
        {
            (window as any).showAlertModal?.({
                title   : "Poisoned Vault",
                message : `The seal for Artifact #${idArtifact} persists...`,
                type    : "danger"
            });
        }
    }

    function closeInspectorModal() : void
    {
        mirror.reset();
        (window as any).closeModalWithTransition(inspectorModal, () : void =>
        {
            state.inspectorArtifact    = null;
            state.inspectorRelId       = null;
        });
    }

    // Polymorphic
    function updatePagination(target : VaultTab, totalItems : number, currentCount : number) : void
    {
        const isReliquary : boolean = target === "artifacts";

        const page       : number = isReliquary ? state.reliquaryPage       : state.catalystsPage;
        const perPage    : number = isReliquary ? state.reliquaryPerPage    : state.catalystsPerPage;
        const totalPages : number = isReliquary ? state.reliquaryTotalPages : state.catalystsTotalPages;

        const infoEl     : HTMLElement       | null = isReliquary ? reliquaryPageInfo : catalystsPageInfo;
        const pageInp    : HTMLInputElement  | null = isReliquary ? reliquaryPageInp  : catalystsPageInp;
        const totalEl    : HTMLElement       | null = isReliquary ? reliquaryTotalP   : catalystsTotalP;
        const prevBtn    : HTMLButtonElement | null = isReliquary ? reliquaryPrevBtn  : catalystsPrevBtn;
        const nextBtn    : HTMLButtonElement | null = isReliquary ? reliquaryNextBtn  : catalystsNextBtn;

        const start : number = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
        const end   : number = (page - 1) * perPage + currentCount;

        if(infoEl)  infoEl.textContent  = `Showing ${start} to ${end} of ${totalItems} ${target}`;
        if(totalEl) totalEl.textContent = totalPages.toString();
        if(prevBtn) prevBtn.disabled = page <= 1;
        if(nextBtn) nextBtn.disabled = page >= totalPages;
        if(pageInp)
        {
            pageInp.value = page.toString();
            pageInp.max   = totalPages.toString();
        }
    }

    function switchToTab(tab : VaultTab) : void
    {
        if(state.activeTab === tab) return;

        state.activeTab = tab;
        const isReliquary : boolean = tab === "artifacts";

        tabReliquaryBtn?.classList.toggle("active", isReliquary);
        tabCatalystsBtn?.classList.toggle("active", !isReliquary);

        viewReliquary?.classList.toggle("hidden", !isReliquary);
        viewCatalysts?.classList.toggle("hidden", isReliquary);


        const filterWrapper : HTMLElement | null = document.getElementById("filter-palette-wrapper");
        if(filterWrapper) filterWrapper.classList.toggle("hidden", !isReliquary);
        if(filterFavBtn)  filterFavBtn.classList.toggle("hidden", !isReliquary);

        if(isReliquary) loadArtifacts().then();
        else            loadCatalysts().then();
    }

    // Artifacts
    function recolorThumbnailCanvas(
        canvas  : HTMLCanvasElement,
        srcUrl  : string,
        palette : ColorPalette | null
    ) : void
    {
        const img : HTMLImageElement = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () : void =>
        {
            canvas.width  = img.width  || 256;
            canvas.height = img.height || 256;
            const ctx : CanvasRenderingContext2D | null = canvas.getContext("2d", { willReadFrequently: true });
            if(!ctx) return;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if(!palette || !palette.stops || palette.stops.length === 0) return;

            const imgData : ImageData         = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data    : Uint8ClampedArray = imgData.data;
            const lut     : Uint8ClampedArray = buildPaletteLut(palette.stops);

            applyPalette(data, lut);
            ctx.putImageData(imgData, 0, 0);
        };
        img.src = srcUrl;
    }

    function renderReliquaryGrid(manifestations : ArtifactManifestation[]) : void
    {
        if(!artifactsGrid) return;
        artifactsGrid.innerHTML = "";

        if(manifestations.length === 0)
        {
            reliquaryEmpty?.classList.remove("hidden");
            return;
        }

        reliquaryEmpty?.classList.add("hidden");

        const bufferHTML : string[] = [];
        manifestations.forEach((item : ArtifactManifestation) =>
        {
            const thumbUrl : string  = streamThumbUrl.replace(
                "/hash/PLACEHOLDER", `/hash/${item.artifact_hash}`);
            const dateStr  : string  = item.created_at ? new Date(item.created_at).toLocaleString() : "-";
            const isFav    : boolean = item.is_favorite;

            const downloadFilename : string = (
                item.alias.match(/\.(png|jpg|jpeg|webp)$/i)
                ? item.alias : `${item.alias}.png`
            );

            const isColoredDownload : boolean = (
                !state.viewMonochrome &&
                Boolean(item.id_rel && item.id_rel > 0 && dwnldManifestUrl)
            );

            const cardDownloadUrl : string = (isColoredDownload ?
                dwnldManifestUrl.replace("/relationship/0", `/relationship/${item.id_rel}`) :
                streamArtifactUrl.replace("/hash/PLACEHOLDER", `/hash/${item.artifact_hash}`)
            );

            const configBadgeHTML : string = (item.config && item.config.is_system && item.config.display_name ? `
                <span class="vamp-badge vamp-badge-silver text-[0.6rem] px-1.5 py-0.5 truncate max-w-[130px]"
                      title="${item.config.display_name}">
                    ${item.config.display_name}
                </span>
            ` : "");

            bufferHTML.push(`
                <div class="vault-artifact-card"
                     data-rel-id="${item.id_rel}"
                     data-artifact-id="${item.id_artifact}">
                     <div class="vault-fav-pin ${isFav ? "active" : ""}"
                          data-artifact-id="${item.id_artifact}"
                          title="${isFav ? "Favorited" : "Mark as Favorite"}">
                        <i class="fa-solid fa-star"></i>     
                    </div>
                    <div class="vault-thumb-wrapper"
                         data-rel-id="${item.id_rel}"
                         data-artifact-id="${item.id_artifact}">
                        <canvas class="vault-thumb-img w-full h-full object-cover"
                                 data-thumb-src="${thumbUrl}"
                                 data-rel-id="${item.id_rel}"></canvas>
                        <div class="vault-thumb-overlay">
                            <button type="button"
                                    data-rel-id="${item.id_rel}"
                                    data-artifact-id="${item.id_artifact}"
                                    class="vault-quick-action-btn action-inspect"
                                    title="Inspect Pattern">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <a href="${cardDownloadUrl}"
                               download="${downloadFilename}"
                               class="vault-quick-action-btn action-download-manifest no-underline"
                               title="Download Manifestation">
                                <i class="fa-solid fa-download"></i>   
                            </a> 
                            <button type="button"
                                    data-rel-id="${item.id_rel}" 
                                    data-artifact-id="${item.id_artifact}"
                                    class="vault-quick-action-btn action-branch"
                                    title="Branch Formula in Studio">
                                <i class="fa-solid fa-code-branch"></i>        
                            </button>
                        </div>     
                    </div>
                    
                    <div class="p-2.5 flex flex-col gap-1.5 flex-grow justify-between bg-vespera-charcoal/80"
                         data-rel-id="${item.id_rel}"
                         data-artifact-id="${item.id_artifact}">
                        <div class="flex flex-col pointer-events-none">
                            <span class="font-cinzel text-xs text-vespera-parchment font-bold truncate"
                                  title="${item.alias}">
                                ${item.alias}      
                            </span>
                            <span class="font-mono text-[0.65rem] text-vespera-silver truncate"
                                  title="${item.artifact_hash}">
                                #${item.id_artifact} • ${truncateHash(item.artifact_hash, 5)}
                            </span>
                        </div>
                        
                        <div class="flex items-center justify-between gap-1 flex-wrap pt-1 border-t
                                    border-vespera-obsidian font-mono text[0.65rem] pointer-events-none">
                            <span class="vamp-badge vamp-badge-silver text-[0.6rem] px-1.5 py-0.5">
                                ${state.viewMonochrome ? 'Monochrome' : (item.palette?.display_name || "Monochrome")}
                            </span>
                            ${configBadgeHTML}
                            
                        </div>
                        <div class="vault-card-footer-timestamp pointer-events-none"
                              title="Sealed on: ${dateStr}">
                              <i class="fa-regular fa-clock mr-1 text-vespera-silver"></i>
                              <span>${dateStr}</span>
                        </div>
                    </div>     
                 </div>`);
        });
        artifactsGrid.innerHTML = bufferHTML.join("");

        manifestations.forEach((item : ArtifactManifestation) =>
        {
            const canvas : HTMLCanvasElement | null = artifactsGrid.querySelector(
                `canvas[data-rel-id="${item.id_rel}"]`
            );
            if(canvas)
            {
                const thumbUrl : string = streamThumbUrl.replace(
                    "/hash/PLACEHOLDER", `/hash/${item.artifact_hash}`);
                const activePalette : ColorPalette | null = state.viewMonochrome ? null : item.palette;
                recolorThumbnailCanvas(canvas, thumbUrl, activePalette);
            }
        });

        // Listeners
        const cards : NodeListOf<HTMLElement> = artifactsGrid.querySelectorAll(".vault-artifact-card");
        cards.forEach((card : HTMLElement) =>
        {
            const artId : number = parseInt(card.dataset.artifactId || "0");
            const relId : number = parseInt(card.dataset.relId      || "0");
            if(artId === 0) return;

            card.addEventListener("click", () => openInspectorModal(artId, relId));

            const favPin : HTMLElement | null = card.querySelector(".vault-fav-pin");
            favPin?.addEventListener("click", async (event : MouseEvent) =>
            {
                event.stopPropagation();
                await toggleArtifactFavorite(artId, favPin);
            });

            const inspectBtn : HTMLElement | null = card.querySelector(".action-inspect");
            inspectBtn?.addEventListener("click", async (event : MouseEvent) =>
            {
                event.stopPropagation();
                await openInspectorModal(artId, relId);
            });

            const downloadBtn : HTMLElement | null = card.querySelector(".action-download-manifest");
            downloadBtn?.addEventListener("click", (event : MouseEvent) => event.stopPropagation());

            const branchBtn : HTMLElement | null = card.querySelector(".action-branch");
            branchBtn?.addEventListener("click", (event : MouseEvent) =>
            {
                event.stopPropagation();
                branchInStudio(artId);
            });
        });
    }

    async function fetchArtifactsData(page : number) : Promise<VaultGalleryData | null>
    {
        try
        {
            const rawConfig : string = state.selectedConfigId;
            const parsedConfig : number | "custom" | null = (
                rawConfig === "custom" ? "custom" :
                rawConfig !== "" ? parseInt(rawConfig) : null
            );

            const payload : VaultGalleryPayload = {
                id_palette      : state.selectedPaletteId ? parseInt(state.selectedPaletteId) : null,
                id_config       : parsedConfig,
                id_source_image : state.selectedSourceId,
                favorites       : state.filterFavorites,
                search          : state.searchQuery,
                sort_by         : state.sortBy,
                sort_dir        : state.sortDir,
                page            : page,
                per_page        : state.reliquaryPerPage,
            };

            const res : APIResponse<VaultGalleryData> = await apiFetch<VaultGalleryData>(galleryApiUrl, {
                method  : "POST",
                headers : { "Content-Type" : "application/json" },
                body    : JSON.stringify(payload)
            });

            if(!res.success) throw new Error(res.error || "Unknown error fetching reliquary data");
            return res.data ? res.data : null;
        }
        catch(error)
        {
            console.error(error);
            (window as any).showAlertModal?.({
                title   : "Poisoned Vault",
                message : "An unwarranted hex has befallen The Vault.",
                type    : "danger"
            });
            return null;
        }
    }

    async function loadArtifacts() : Promise<void>
    {
        if(!artifactsGrid) return;

        const data : VaultGalleryData | null = await fetchArtifactsData(state.reliquaryPage);
        if(!data)
        {
            artifactsGrid.innerHTML = "";
            reliquaryEmpty?.classList.remove("hidden");
            return;
        }

        state.reliquaryTotalPages = Math.max(1, data.total_pages);
        if(badgeTotalArt) badgeTotalArt.textContent = `(${data.total_items})`;

        if(badgeTotalSrc)
        {
            const uniqueSourceIds : Set<number> = new Set(
                data.items.map((a : ArtifactManifestation) => a.id_source_image));
            badgeTotalSrc.textContent = `(${uniqueSourceIds.size})`;
        }

        renderReliquaryGrid(data.items);
        updatePagination("artifacts", data.total_items, data.items.length);
    }

    // Catalysts
    async function executeCatalystDeletion(idSource : number, sourceAlias : string)
    {
        const apiUrl : string = deleteSourceUrl.replace(
            "/source/0", `/source/${idSource}`);

        const res : APIResponse<void> = await apiFetch<void>(apiUrl, { method : "DELETE" });
        if(!res.success) return;
        await loadCatalysts();

        (window as any).showAlertModal({
            title   : "Catalyst Purged",
            message : `The Catalyst ${sourceAlias} has been banished for eternity.`,
            type    : "success"
        });
    }

    function deleteCatalystSource(idSource : number, alias : string, artifactCount : number) : void
    {
        if(artifactCount > 0)
        {
            (window as any).showAlertModal?.({
                title   : "Bound Catalyst",
                message : `Cannot purge ${alias} because it has been alchemically bound to ${artifactCount} artifacts. To get rid of this catalyst, first purge its derived artifacts, love.`,
                type    : "warning"
            });

            return;
        }

        (window as any).showAlertModal({
            title       : "Purge Catalyst",
            message     : `Are you certain you wish to purge ${alias} from The Catalyst Archive? A purged catalyst will be banished from reality for eternity.`,
            type        : "info",
            icon        : "fa-skull-crossbones",
            confirmText : "Purge",
            cancelText  : "Cancel",
            onConfirm   : async () : Promise<void> => await executeCatalystDeletion(idSource, alias)
        })
    }

    function renderCatalystGrid(sources : SourceCatalogItem[]) : void
    {
        if(!sourcesGrid) return;

        if(sources.length === 0)
        {
            sourcesGrid.innerHTML = "";
            catalystsEmpty?.classList.remove("hidden");
            return;
        }

        catalystsEmpty?.classList.add("hidden");

        const bufferHTML : string[] = [];
        sources.forEach((src : SourceCatalogItem) =>
        {
            const dateStr : string = src.created_at ? new Date(src.created_at).toLocaleDateString() : "-";
            const sizeStr : string = formatBytes(src.file_size_bytes);

            const downloadFilename : string = src.alias.match(/\.(png|jpg|jpeg|webp)$/i) ?
                src.alias : `${src.alias}.png`;

            bufferHTML.push(`
            <div class="vault-source-card"
                 data-source-id="${src.id_source_image}">
                <div class="vault-source-thumb-wrapper">
                    <img src="${src.source_stream_url}" alt="${src.alias}"
                         class="vault-source-thumb-img" loading="lazy">
                    <div class="vault-source-thumb-overlay">
                        <button type="button" data-source-id="${src.id_source_image}"
                                class="vault-quick-action-btn action-view-lineage"
                                title="View Derived Artifacts (${src.artifact_count})">
                            <i class="fa-solid fa-gem"></i>        
                        </button>
                        <a href="${src.source_stream_url}" download="${downloadFilename}"
                           class="vault-quick-action-btn action-download-src no-underline"
                           title="Download Catalyst Image">
                            <i class="fa-solid fa-download"></i>   
                        </a>
                        <button type="button" title="Purge Catalyst"
                                class="vault-quick-action-btn action-purge-src hover:!bg-vespera-crimson"
                                data-source-id="${src.id_source_image}"
                                data-source-count="${src.artifact_count}"
                                data-source-alias="${src.alias}">
                            <i class="fa-solid fa-trash-can"></i>        
                        </button>
                    </div>
                </div>
                <div class="p-3 flex flex-col gap-2 flex-grow justify-between bg-vespera-charcoal/80">
                    <div class="flex flex-col">
                        <div class="flex items-center justify-between">
                            <span class="source-alias-label font-cinzel text-xs text-vespera-parchment font-bold 
                                         truncate max-w-[170px]"
                                  title="${src.alias}">
                                ${src.alias}      
                            </span>
                            <button type="button"
                                    class="action-rename-src text-vespera-silver hover:text-vespera-parchment
                                           text-xs transition-colors"
                                    data-source-id="${src.id_source_image}" data-source-alias="${src.alias}">
                                <i class="fa-solid fa-feather"></i>
                            </button>
                        </div>
                        <span class="font-mono text-[0.65rem]">
                            ${src.width} × ${src.height} px • ${sizeStr}
                        </span>
                    </div>
                
                    <div class="flex items-center justify-between pt-2 border-t border-vespera-obsidian 
                                font-mono text-[0.65rem]">
                        <span>${src.artifact_count} ${src.artifact_count === 1 ? "Pattern" : "Patterns"}</span>
                        <span class="gothic-divider"></span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>`);
        });

        sourcesGrid.innerHTML = bufferHTML.join("");

        const cards : NodeListOf<HTMLElement> = sourcesGrid.querySelectorAll(".vault-source-card");
        cards.forEach((card : HTMLElement) =>
        {
            const srcId : number = parseInt(card.dataset.sourceId || "0");
            if(srcId === 0) return;

            const thumbWrapper : HTMLElement | null = card.querySelector(".vault-source-thumb-wrapper");
            thumbWrapper?.addEventListener("click", () : void =>
            {
                state.selectedSourceId = srcId;
                switchToTab("artifacts");
            });

            const renameBtn : HTMLButtonElement | null = card.querySelector(".action-rename-src");
            const titleEl   : HTMLElement       | null = card.querySelector(".source-alias-label");
            renameBtn?.addEventListener("click", (event : MouseEvent) =>
            {
                event.stopPropagation();
                if(titleEl) enableInlineSourceRename(titleEl, srcId, renameBtn.dataset.sourceAlias || "");
            });

            const lineageBtn : HTMLButtonElement | null = card.querySelector(".action-view-lineage");
            lineageBtn?.addEventListener("click", (event : MouseEvent) =>
            {
                event.stopPropagation();
                state.selectedSourceId = srcId;
                switchToTab("artifacts");
            });

            const downloadBtn : HTMLElement | null = card.querySelector(".action-download-src");
            downloadBtn?.addEventListener("click", (event : MouseEvent) => event.stopPropagation());

            const purgeBtn : HTMLButtonElement | null = card.querySelector(".action-purge-src");
            purgeBtn?.addEventListener("click", (event : MouseEvent) =>
            {
                event.stopPropagation();
                const count : number = parseInt(purgeBtn.dataset.sourceCount || "0");
                const alias : string = purgeBtn.dataset.sourceAlias || "Catalyst";
                deleteCatalystSource(srcId, alias, count);
            });
        });
    }

    async function fetchCatalystsData(page : number) : Promise<SourceCatalogData | null>
    {
        try
        {
            const payload : SourceCatalogPayload = {
                search   : state.searchQuery,
                page     : page,
                per_page : state.catalystsPerPage
            };

            const res : APIResponse<SourceCatalogData> = await apiFetch<SourceCatalogData>(sourcesApiUrl, {
                method  : "POST",
                headers : { "Content-Type" : "application/json" },
                body    : JSON.stringify(payload)
            });

            if(!res.success) throw new Error(res.error || "Error fetching source images");
            return res.data ? res.data : null;
        }
        catch(error)
        {
            console.error(error);
            (window as any).showAlertModal?.({
                title   : "Poisoned Catalyst Archive",
                message : "An unwarranted hex has befallen The Archive.",
                type    : "danger"
            });
            return null;
        }
    }

    async function loadCatalysts() : Promise<void>
    {
        if(!sourcesGrid) return;

        const data : SourceCatalogData | null = await fetchCatalystsData(state.catalystsPage);
        if(!data)
        {
            sourcesGrid.innerHTML = "";
            catalystsEmpty?.classList.remove("hidden");
            return;
        }

        state.catalystsTotalPages = Math.max(1, data.total_pages);
        if(badgeTotalSrc) badgeTotalSrc.textContent = `(${data.total_items})`;

        renderCatalystGrid(data.items);
        updatePagination("catalysts", data.total_items, data.items.length);
    }

    // API Handlers
    async function saveEntityAlias(target : VaultTab, targetId : number, newAlias : string) : Promise<boolean>
    {
        const trimmed : string = newAlias.trim();
        if(!trimmed) return false;

        const isArtifact = target === "artifacts";
        const baseEndpoint : string = isArtifact ?  updateArtAliasUrl : updateSrcAliasUrl;
        const replaceToken : string = isArtifact ? "artifact" : "source";
        const apiUrl       : string = baseEndpoint.replace(
            `/${replaceToken}/0`, `/${replaceToken}/${targetId}`);

        const payload : AliasUpdatePayload = { alias : trimmed };

        const res : APIResponse<AliasUpdateData> = await apiFetch<AliasUpdateData>(apiUrl,
        {
            method  : "POST",
            headers : { "Content-Type" : "application/json" },
            body    : JSON.stringify(payload)
        });

        return res.success;
    }

    function enableInlineArtifactRename() : void
    {
        if(!inspAliasHeading || !state.inspectorArtifact) return;

        const currentAlias : string = state.inspectorArtifact.alias;
        const artId        : number = state.inspectorArtifact.id_artifact;

        const input : HTMLInputElement = document.createElement("input");
        input.type      = "text";
        input.value     = currentAlias;
        input.className = "vamp-input text-sm py-1 px-2 font-cinzel font-bold text-vespera-parchment w-64 border-vespera-silver";

        let isSaving : boolean = false;

        const commitEdit = async () : Promise<void> =>
        {
            if(isSaving) return;
            isSaving = true;

            const val : string = input.value.trim();
            if(val && val !== currentAlias && state.inspectorArtifact)
            {
                const success : boolean = await saveEntityAlias("artifacts", artId, val);
                if(success)
                {
                    state.inspectorArtifact.alias = val;
                    inspAliasHeading.textContent  = val;
                    await loadArtifacts();
                }
                else
                {
                    inspAliasHeading.textContent = currentAlias;
                }
            }
            else
            {
                inspAliasHeading.textContent = currentAlias;
            }

            inspAliasHeading.classList.remove("hidden");
            input.remove();
        };

        input.addEventListener("keydown", (event : KeyboardEvent) : void =>
        {
            if(event.key === "Enter")
            {
                event.preventDefault();
                input.blur();
            }
            else if(event.key === "Escape")
            {
                inspAliasHeading.textContent = currentAlias;
                inspAliasHeading.classList.remove("hidden");
                input.remove();
            }
        });

        input.addEventListener("blur", commitEdit);

        inspAliasHeading.classList.add("hidden");
        inspAliasHeading.parentElement?.insertBefore(input, inspAliasHeading);
        input.focus();
        input.select();
    }

    function enableInlineSourceRename(titleEl : HTMLElement, idSource : number, currentAlias : string) : void
    {
        const input : HTMLInputElement = document.createElement("input");
        input.type = "text";
        input.value = currentAlias;
        input.className = "vamp-input text-xs py-0.5 px-1.5 font-cinzel font-bold text-vespera-parchment w-full border-vespera-silver";

        let isSaving : boolean = false;

        const commitEdit = async () : Promise <void> =>
        {
            if(isSaving) return;
            isSaving = true;

            const val : string = input.value.trim();
            if(val && val !== currentAlias)
            {
                const success : boolean = await saveEntityAlias("catalysts", idSource, val);
                if(success)
                {
                    titleEl.textContent = val;
                    titleEl.title       = val;
                    await loadArtifacts();
                }
                else
                {
                    titleEl.textContent = currentAlias;
                }
            }
            else
            {
                titleEl.textContent = currentAlias;
            }

            titleEl.classList.remove("hidden");
            input.remove();
        };

        input.addEventListener("keydown", (event : KeyboardEvent) : void =>
        {
            if(event.key === "Enter")
            {
                event.preventDefault();
                input.blur();
            }
            else if(event.key === "Escape")
            {
                titleEl.textContent = currentAlias;
                titleEl.classList.remove("hidden");
                input.remove();
            }
        });

        input.addEventListener("blur", commitEdit);

        titleEl.classList.add("hidden");
        titleEl.parentElement?.insertBefore(input, titleEl);
        input.focus();
        input.select();
    }

    async function toggleArtifactFavorite(idArtifact : number, pinEl? : HTMLElement) : Promise<void>
    {
        try
        {
            const apiUrl : string = toggleFavoriteUrl.replace(
                "/artifact/0", `/artifact/${idArtifact}`);

            const res : APIResponse<FavoriteToggleData> = await apiFetch<FavoriteToggleData>(apiUrl, { method : "POST" });

            if(!res.success || !res.data) throw new Error(res.error || "Error changing favorite status");

            const isFav : boolean = res.data.is_favorite;
            if(pinEl) pinEl.classList.toggle("active", isFav);

            if(state.inspectorArtifact && state.inspectorArtifact.id_artifact === idArtifact)
            {
                state.inspectorArtifact.is_favorite = isFav;
                if(inspFavIcon)
                {
                    inspFavIcon.className = isFav ? "fa-solid fa-star text-vespera-crimson" : "fa-regular fa-star";
                }
            }
        }
        catch(error)
        {
            console.error(error);
            (window as any).showAlertModal?.({
                title   : "Disruption in the Ether",
                message : "Marking this artifact is not possible for the time being...",
                type    : "error"
            });
        }
    }

    async function saveInspectorNotes() : Promise<void>
    {
        try
        {
            if(!state.inspectorArtifact || !inspNotesTextArea) return;
            const newNotes : string = inspNotesTextArea.value.trim();
            const apiUrl  : string = updateNotesUrl.replace(
                "/artifact/0", `/artifact/${state.inspectorArtifact.id_artifact}`);

            const payload : NotesUpdatePayload = { user_notes : newNotes };

            const res : APIResponse<NotesUpdateData> = await apiFetch<NotesUpdateData>(apiUrl, {
               method  : "POST",
               headers : { "Content-Type" : "application/json" },
               body    : JSON.stringify(payload)
            });

            if(!res.success || !res.data) throw new Error(res.error || "Unknown error");
            state.inspectorArtifact.user_notes = res.data.user_notes || "";

            (window as any).showAlertModal?.({
                title   : "Inscription Saved",
                message : "Your observations have been preserved in The Grimoire.",
                type    : "success"
            });
        }
        catch(error)
        {
            console.error(error);
            (window as any).showAlertModal?.({
                title   : "Error Saving Inscription",
                message : "The Grimoire has rejected your entry.",
                type    : "danger"
            });
        }
    }

    function navigateToCatalystInspection(sourceAlias : string) : void
    {
        state.selectedSourceId = null;
        state.searchQuery      = sourceAlias;
        state.catalystsPage    = 1;

        if(searchInput)
        {
            searchInput.value = sourceAlias;
            clearSearchBtn?.classList.remove("hidden");
        }

        switchToTab("catalysts");
    }

    async function executeArtifactDeletion(idArtifact : number, artifactAlias : string) : Promise<void>
    {
        closeInspectorModal();

        const apiUrl : string = deleteArtifactUrl.replace(
            "/artifact/0", `/artifact/${idArtifact}`);

        const res : APIResponse<DeleteArtifactData> = await apiFetch<DeleteArtifactData>(apiUrl, { method : "DELETE" });

        if(!res.success || !res.data) return;

        const remainingSiblings : number = res.data.remaining_artifacts;
        const sourceAlias       : string = res.data.source_alias;

        if(remainingSiblings === 0)
        {
            (window as any).showAlertModal({
                title       : "Artifact Purged",
                message     : `Artifact "${artifactAlias}" has been banished. Catalyst "${sourceAlias}" has no remaining derived artifacts. Would you like to inspect it in the Catalyst archive to see if you want to delete it, love?`,
                type        : "info",
                icon        : "fa-images",
                confirmText : "Inspect Catalyst",
                cancelText  : "Return to Reliquary",
                onConfirm   : async () : Promise<void> => navigateToCatalystInspection(sourceAlias),
                onCancel    : async () : Promise<void> => await loadArtifacts()
            });
        }
        else
        {
            (window as any).showAlertModal({
                title     : "Artifact Purged",
                message   : `The Artifact "${artifactAlias}" has been banished for eternity`,
                type      : "success",
                onCancel  : async () : Promise<void> => await loadArtifacts()
            });
        }
    }

    function deleteCurrentArtifact() : void
    {
        if(!state.inspectorArtifact) return;
        const name : string = state.inspectorArtifact.alias;
        const id   : number = state.inspectorArtifact.id_artifact;

        (window as any).showAlertModal({
            title       : "Purge Artifact",
            message     : `Are you certain you wish to purge ${name}? This action cannot be undone.`,
            type        : "info",
            icon        : "fa-skull-crossbones",
            confirmText : "Purge",
            cancelText  : "Cancel",
            onConfirm   : async () : Promise<void> => await executeArtifactDeletion(id, name)
        });
    }

    async function executeManifestationDeletion(idRel : number, idArtifact : number, artifactAlias : string) : Promise<void>
    {
        closeInspectorModal();

        const apiUrl : string = deleteRelApiUrl.replace(
            "/relationship/0", `/relationship/${idRel}`);
        const res : APIResponse<DeleteManifestationData> = await apiFetch<DeleteManifestationData>(apiUrl, { method : "DELETE" });

        if(!res.success || !res.data) return;

        const remaining : number = res.data.remaining_manifestations;

        if(remaining === 0)
        {
            (window as any).showAlertModal({
                title       : "Purge Artifact",
                message     : `This was the last chromatic manifestation of artifact "${artifactAlias}". Would you also like to purge the physical artifact and its morph frames from The Reliquary, love?`,
                type        : "warning",
                icon        : "fa-triangle-exclamation",
                confirmText : "Purge Artifact",
                cancelText  : "Preserve Monochrome",
                onConfirm   : async () : Promise<void> => await executeArtifactDeletion(idArtifact, artifactAlias),
                onCancel    : async () : Promise<void> => await loadArtifacts()
            });
        }
        else
        {
            (window as any).showAlertModal({
                title     : "Manifestation Purged",
                message   : `${remaining} other ${remaining === 1 ? "manifestation remains" : "manifestations remain"} for artifact "${artifactAlias}".`,
                type      : "success",
                onCancel  : async () : Promise<void> => await loadArtifacts()
            });
        }
    }

    function deleteCurrentManifestation() : void
    {
        if(!state.inspectorArtifact || !state.inspectorRelId || state.inspectorRelId <= 0) return;

        const idRel         : number = state.inspectorRelId;
        const idArtifact    : number = state.inspectorArtifact.id_artifact;
        const artifactAlias : string = state.inspectorArtifact.alias;

        (window as any).showAlertModal({
            title       : "Purge Manifestation",
            message     : `Are you certain you wish to purge this chromatic manifestation of "${artifactAlias}"? The physical grayscale Artifact will be preserved in The Reliquary.`,
            type        : "info",
            icon        : "fa-skull-crossbones",
            confirmText : "Purge",
            cancelText  : "Cancel",
            onConfirm   : async () : Promise<void> => await executeManifestationDeletion(idRel, idArtifact, artifactAlias),
            onCancel    : async () : Promise<void> => await loadArtifacts()
        });
    }

    function handleInspectorDelete() : void
    {
        if(state.inspectorRelId && state.inspectorRelId > 0) deleteCurrentManifestation();
        else                                                 deleteCurrentArtifact();
    }

    function branchInStudio(idArtifact : number)
    {
        window.location.href = `${studioTemplateUrl}?load=${idArtifact}`;
    }

    // --- LISTENERS ---
    function bindListeners() : void
    {
        // Tabs
        tabReliquaryBtn?.addEventListener("click", () =>
        {
            state.selectedSourceId = null;
            switchToTab("artifacts");
        });
        tabCatalystsBtn?.addEventListener("click", () => switchToTab("catalysts"));

        // Search
        searchInput?.addEventListener("input", () =>
        {
            const q : string = searchInput.value.trim();
            if(q.length === 1 || q === state.searchQuery) return;

            state.searchQuery = q;
            if(clearSearchBtn) clearSearchBtn.classList.toggle("hidden", !state.searchQuery);

            if(searchDebounceTimer) clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() =>
            {
                state.reliquaryPage = 1;
                state.catalystsPage = 1;
                if(state.activeTab === "artifacts") loadArtifacts().then();
                else                                loadCatalysts().then();
            }, 300);
        });
        clearSearchBtn?.addEventListener("click", () =>
        {
            if(!searchInput || !searchInput.value) return;
            state.searchQuery = "";
            clearSearchBtn.classList.add("hidden");
            state.reliquaryPage = 1;
            state.catalystsPage = 1;
            if(state.activeTab === "artifacts") loadArtifacts().then();
            else                                loadCatalysts().then();
        });

        // Filters
        filterPaletteSel?.addEventListener("change", () =>
        {
            state.selectedPaletteId = filterPaletteSel.value;
            state.reliquaryPage     = 1;
            loadArtifacts().then();
        });

        filterConfigSel?.addEventListener("change", () =>
        {
            state.selectedConfigId = filterConfigSel.value;
            state.reliquaryPage    = 1;
            loadArtifacts().then();
        });

        toggleMonoBtn?.addEventListener("click", () =>
        {
            state.viewMonochrome = !state.viewMonochrome;
            toggleMonoBtn.classList.toggle("active", state.viewMonochrome);
            loadArtifacts().then();
        });

        filterFavBtn?.addEventListener("click", () =>
        {
            state.filterFavorites = !state.filterFavorites;
            filterFavBtn.classList.toggle("active", state.filterFavorites);
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });

        // Sorting
        sortBySel?.addEventListener("change", () =>
        {
            state.sortBy        = sortBySel.value;
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });
        sortDirBtn?.addEventListener("click", () =>
        {
            state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            if(sortDirIcon)
            {
                sortDirIcon.className = state.sortDir === "asc" ?
                    "fa-solid fa-arrow-up-wide-short" :
                    "fa-solid fa-arrow-down-wide-short";
            }
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });

        // Reset
        resetFiltersBtn?.addEventListener("click", () =>
        {
            state = getDefaultState();

            if(searchInput)      searchInput.value      = "";
            if(clearSearchBtn)   clearSearchBtn.classList.add("hidden");
            if(filterPaletteSel) filterPaletteSel.value = "";
            if(filterConfigSel)  filterConfigSel.value  = "";
            if(toggleMonoBtn)    toggleMonoBtn.classList.remove("active");
            if(filterFavBtn)     filterFavBtn.classList.remove("bg-vespera-crimson/20", "text-vespera-crimsonBright", "border-vespera-crimson");
            if(sortBySel)        sortBySel.value        = "date_created";
            if(sortDirIcon)      sortDirIcon.className  = "fa-solid fa-arrow-down-wide-short";

            if(state.activeTab === "artifacts") loadArtifacts().then();
            else                                loadCatalysts().then();
        });

        // Pagination
        reliquaryPrevBtn?.addEventListener("click", () =>
        {
            if(state.reliquaryPage > 1)
            {
                --state.reliquaryPage;
                loadArtifacts().then();
            }
        });
        reliquaryNextBtn?.addEventListener("click", () =>
        {
            if(state.reliquaryPage < state.reliquaryTotalPages)
            {
                ++state.reliquaryPage;
                loadArtifacts().then();
            }
        });
        reliquaryPageInp?.addEventListener("change", () =>
        {
            const targetPage : number = parseInt(reliquaryPageInp.value);
            if(!isNaN(targetPage) && targetPage >= 1 && targetPage <= state.reliquaryTotalPages)
            {
                state.reliquaryPage = targetPage;
                loadArtifacts().then();
            }
            else
            {
                reliquaryPageInp.value = state.reliquaryPage.toString();
            }
        });

        catalystsPrevBtn?.addEventListener("click", () =>
        {
            if(state.catalystsPage > 1)
            {
                --state.catalystsPage;
                loadCatalysts().then();
            }
        });
        catalystsNextBtn?.addEventListener("click", () =>
        {
            if(state.catalystsPage < state.catalystsTotalPages)
            {
                ++state.catalystsPage;
                loadCatalysts().then();
            }
        });
        catalystsPageInp?.addEventListener("change", () =>
        {
            const targetPage : number = parseInt(catalystsPageInp.value);
            if(!isNaN(targetPage) && targetPage >= 1 && targetPage <= state.catalystsTotalPages)
            {
                state.catalystsPage = targetPage;
                loadArtifacts().then();
            }
            else
            {
                catalystsPageInp.value = state.catalystsPage.toString();
            }
        });

        // Modal
        inspectorCloseBtn?.addEventListener("click", closeInspectorModal);
        inspFavToggleBtn?.addEventListener("click", () =>
        {
            if(state.inspectorArtifact)
            {
                toggleArtifactFavorite(state.inspectorArtifact.id_artifact, undefined).then();
            }
        });
        inspRenameBtn?.addEventListener("click", enableInlineArtifactRename);
        inspAliasHeading?.addEventListener("dblclick", enableInlineArtifactRename);
        inspSaveNotesBtn?.addEventListener("click", saveInspectorNotes);
        inspDelBtn?.addEventListener("click", handleInspectorDelete);
        inspBranchBtn?.addEventListener("click", () =>
        {
            if(state.inspectorArtifact) branchInStudio(state.inspectorArtifact.id_artifact);
        });
        inspectorModal?.addEventListener("click", (event : MouseEvent) =>
        {
            if(event.target === inspectorModal) closeInspectorModal();
        });
        document.addEventListener("keydown", (event : KeyboardEvent) =>
        {
            if(event.key === "Escape" && inspectorModal && !inspectorModal.classList.contains("hidden"))
            {
                closeInspectorModal();
            }
        });

    }

    // --- INITIALIZATION ---
    async function initVault() : Promise<void>
    {
        await Promise.all([loadPaletteCatalog(), loadSystemConfigs()]);
        bindListeners();
        await loadArtifacts();
    }

    initVault().then();
});