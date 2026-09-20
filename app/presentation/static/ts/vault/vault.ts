// Vespera/app/presentation/static/ts/vault/vault.ts

import {
    APIResponse,
    SynthesisArtifact, SynthesisFrame,
    ColorPalette,
    VaultGalleryData,
    SourceCatalogItem, SourceCatalogData
} from "../types.js";
import {
    apiFetch,
    truncateHash,
    formatBytes,
    buildPaletteLut
} from "../base.js";

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
    filterFavorites      : boolean;
    sortBy               : string;
    sortDir              : "asc"             | "desc";
    selectedSourceId     : number            | null;
    paletteCatalog       : ColorPalette[];
    activeLut            : Uint8ClampedArray | null;

    // Modal
    inspectorArtifact    : SynthesisArtifact | null;
    inspectorFrames      : HTMLImageElement[];
    inspectorSourceImg   : HTMLImageElement  | null;
    inspectorFrameIndex  : number;
    inspectorIsPlaying   : boolean;
    inspectorTimer       : number            | null;
    inspectorIsComparing : boolean;
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
    const galleryApiUrl     : string = mainContainer.dataset.galleryApiUrl             || "";
    const sourcesApiUrl     : string = mainContainer.dataset.sourcesApiUrl             || "";
    const artifactDetailUrl : string = mainContainer.dataset.artifactDetailApiUrl      || "";
    const updateArtAliasUrl : string = mainContainer.dataset.updateArtifactAliasApiUrl || "";
    const updateSrcAliasUrl : string = mainContainer.dataset.updateSourceAliasApiUrl   || "";
    const toggleFavoriteUrl : string = mainContainer.dataset.toggleFavoriteApiUrl      || "";
    const updateNotesUrl    : string = mainContainer.dataset.updateNotesApiUrl         || "";
    const deleteArtifactUrl : string = mainContainer.dataset.deleteArtifactApiUrl      || "";
    const deleteSourceUrl   : string = mainContainer.dataset.deleteSourceApiUrl        || "";
    const streamArtifactUrl : string = mainContainer.dataset.streamArtifactApiUrl      || "";
    const streamThumbUrl    : string = mainContainer.dataset.streamThumbApiUrl         || "";
    const streamSourceUrl   : string = mainContainer.dataset.streamSourceApiUrl        || "";
    const streamFrameUrl    : string = mainContainer.dataset.streamFrameApiUrl         || "";

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
    const inspFrameLabel    : HTMLElement         | null = document.getElementById("inspector-frame-label");
    const inspPlayPauseBtn  : HTMLButtonElement   | null = document.getElementById("inspector-play-pause-btn")      as HTMLButtonElement;
    const inspPlayIcon      : HTMLElement         | null = document.getElementById("inspector-play-icon");
    const inspScrubber      : HTMLInputElement    | null = document.getElementById("inspector-timeline-scrubber")   as HTMLInputElement;
    const inspCompareBtn    : HTMLButtonElement   | null = document.getElementById("inspector-compare-btn")         as HTMLButtonElement;
    const inspectorCanvas   : HTMLCanvasElement   | null = document.getElementById("inspector-canvas")              as HTMLCanvasElement;
    const offscreenCanvas   : HTMLCanvasElement          = document.createElement("canvas");

    // Modal Metadata
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

    // Canvas Context for Preview & Offscreen Recoloring
    const inspectorCanvasCtx : CanvasRenderingContext2D | null = inspectorCanvas ? inspectorCanvas.getContext("2d", { willReadFrequently: true }) : null;
    const offscreenCtx       : CanvasRenderingContext2D | null = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    let searchDebounceTimer : number | null = null;

    // --- FUNCTIONS ---
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
            filterFavorites      : false,
            sortBy               : "date_created",
            sortDir              : "desc",
            selectedSourceId     : null,
            paletteCatalog       : [],
            activeLut            : null,

            inspectorArtifact    : null,
            inspectorFrames      : [],
            inspectorSourceImg   : null,
            inspectorFrameIndex  : 0,
            inspectorIsPlaying   : false,
            inspectorTimer       : null,
            inspectorIsComparing : false
        };
    }
    let state : VaultState = getDefaultState();

    // Palette
    async function loadPaletteCatalog() : Promise<void>
    {
        const res : APIResponse<ColorPalette[]> = await apiFetch<ColorPalette[]>(palettesApiUrl);
        if(!res.success || !Array.isArray(res.data)) return;

        state.paletteCatalog = res.data;
        if(!filterPaletteSel) return;

        const bufferHTML : string[] = [`<option value="">Omnichromatic</options>`];
        res.data.forEach((pal : ColorPalette) =>
        {
            bufferHTML.push(`<option value="${pal.id_palette.toString()}">${pal.display_name}</option>`);
        });
        filterPaletteSel.innerHTML = bufferHTML.join("");
    }

    // Modal
    function renderInspectorFrame(index : number) : void
    {
        if(!inspectorCanvas || !inspectorCanvasCtx || state.inspectorFrames.length === 0) return;
        if(index < 0 || index >= state.inspectorFrames.length) return;

        const img : HTMLImageElement = state.inspectorFrames[index];

        if(offscreenCanvas.width !== inspectorCanvas.width || offscreenCanvas.height !== inspectorCanvas.height)
        {
            offscreenCanvas.width  = inspectorCanvas.width;
            offscreenCanvas.height = inspectorCanvas.height;
        }

        if(!state.activeLut)
        {
            inspectorCanvasCtx.clearRect(0, 0, inspectorCanvas.width, inspectorCanvas.height);
            inspectorCanvasCtx.drawImage(img, 0, 0, inspectorCanvas.width, inspectorCanvas.height);
            return
        }

        offscreenCtx?.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx?.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const imgData : ImageData | undefined = offscreenCtx?.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        if(!imgData) return;

        const data : Uint8ClampedArray = imgData.data;
        const lut  : Uint8ClampedArray = state.activeLut;

        for(let p : number = 0; p < data.length; p += 4)
        {
            const gray : number = data[p];
            data[p]     = lut[gray * 3];
            data[p + 1] = lut[gray * 3 + 1];
            data[p + 2] = lut[gray * 3 + 2];
        }

        inspectorCanvasCtx.putImageData(imgData, 0, 0);
        state.inspectorFrameIndex = index;
        if(inspScrubber)   inspScrubber.value         = index.toString();
        if(inspFrameLabel) inspFrameLabel.textContent = `Frame ${index + 1} / ${state.inspectorFrames.length}`;
    }

    function pauseInspectorAnimation() : void
    {
        state.inspectorIsPlaying = false;
        if(state.inspectorTimer !== null)
        {
            clearInterval(state.inspectorTimer);
            state.inspectorTimer = null;
        }
        if(inspPlayIcon) inspPlayIcon.className = "fa-solid fa-play mr-1.5";
    }

    function playInspectorAnimation() : void
    {
        if(state.inspectorFrames.length <= 1) return;
        state.inspectorIsPlaying = true;
        if(inspPlayIcon) inspPlayIcon.className = "fa-solid fa-pause mr-1.5 text-vespera-silverBright"

        if(state.inspectorFrameIndex >= state.inspectorFrames.length - 1) renderInspectorFrame(0);

        state.inspectorTimer = window.setInterval(() : void =>
        {
            const nextIdx : number = state.inspectorFrameIndex + 1;
            if(nextIdx >= state.inspectorFrames.length) pauseInspectorAnimation();
            else                                        renderInspectorFrame(nextIdx);
        }, 120);
    }

    function toggleInspectorPlayPause() : void
    {
        if(state.inspectorIsPlaying) pauseInspectorAnimation();
        else                         playInspectorAnimation();
    }

    function toggleInspectorComparison() : void
    {
        if(!inspectorCanvasCtx || !inspectorCanvas) return;
        state.inspectorIsComparing = !state.inspectorIsComparing;

        if(state.inspectorIsComparing)
        {
            pauseInspectorAnimation();
            if(state.inspectorSourceImg)
            {
                inspectorCanvasCtx.clearRect(0, 0, inspectorCanvas.width, inspectorCanvas.height);
                inspectorCanvasCtx.drawImage(state.inspectorSourceImg, 0, 0, inspectorCanvas.width, inspectorCanvas.height);
                inspCompareBtn?.classList.add("bg-vespera-crimson", "text-vespera-parchment");
            }
        }
        else
        {
            renderInspectorFrame(state.inspectorFrameIndex);
            inspCompareBtn?.classList.remove("bg-vespera-crimson", "text-vespera-parchment");
        }
    }

    async function openInspectorModal(idArtifact : number) : Promise<void>
    {
        try
        {
            const apiUrl : string = artifactDetailUrl.replace("/artifact/0", `/artifact/${idArtifact}`);
            const res : APIResponse<SynthesisArtifact> = await apiFetch<SynthesisArtifact>(apiUrl);

            if(!res.success || !res.data) return;

            const art : SynthesisArtifact = res.data;
            state.inspectorArtifact       = art;

            if(inspAliasHeading) inspAliasHeading.textContent = art.alias;
            if(inspFavIcon)
            {
                inspFavIcon.className = art.is_favorite ? "fa-solid fa-star text-vespera-crimson" : "fa-regular fa-star";
            }

            if(inspFeedRate)     inspFeedRate.textContent     = art.config ? art.config.feed_rate.toFixed(4) : "-";
            if(inspKillRate)     inspKillRate.textContent     = art.config ? art.config.kill_rate.toFixed(4) : "-";
            if(inspDUDV)         inspDUDV.textContent         = art.config ? `${art.config.diff_u.toFixed(3)} • ${art.config.diff_v.toFixed(3)}` : "- • -"
            if(inspIterDt)       inspIterDt.textContent       = art.config ? `${art.config.iterations} • ${art.config.dt.toFixed(2)}` : "- • -";
            if(inspPaletteBadge) inspPaletteBadge.textContent = art.config?.palette?.display_name || "CryptoChroma";
            if(inspExecTime)     inspExecTime.textContent     = `${art.execution_time.toFixed(6)} s`;
            if(inspCreatedDate)  inspCreatedDate.textContent  = art.created_at ? new Date(art.created_at).toLocaleString() : "-";
            if(inspArtifactHash)
            {
                inspArtifactHash.textContent = art.artifact_hash;
                inspArtifactHash.title       = art.artifact_hash;
            }
            if(inspNotesTextArea) inspNotesTextArea.value      = art.user_notes || "";

            if(inspDownloadBtn)
            {
                inspDownloadBtn.href     = streamArtifactUrl.replace("PLACEHOLDER", art.artifact_hash);
                inspDownloadBtn.download = `${art.alias}.png`;
            }

            if(art.config?.palette) state.activeLut = buildPaletteLut(art.config.palette.stops);
            else                    state.activeLut = null;

            if(art.source_image)
            {
                const srcUrl : string = streamSourceUrl.replace("PLACEHOLDER", art.source_image.sha256_hash);
                state.inspectorSourceImg             = new Image();
                state.inspectorSourceImg.crossOrigin = "anonymous";
                state.inspectorSourceImg.src         = srcUrl;
            }

            const frameUrls : string[] = (art.frames || []).map((frame : SynthesisFrame) =>
            {
               return streamFrameUrl
                   .replace("/PLACEHOLDER", `/${art.artifact_hash}`)
                   .replace("/0", `/${frame.frame_index}`);
            });

            state.inspectorFrames = await Promise.all(
                frameUrls.map((url : string) : Promise<HTMLImageElement> =>
                {
                    return new Promise((resolve : (value : HTMLImageElement) => void) : void =>
                    {
                        const img : HTMLImageElement = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload      = () : void => resolve(img);
                        img.src         = url;
                    });
                })
            );

            if(inspScrubber)
            {
                inspScrubber.max   = Math.max(0, state.inspectorFrames.length - 1).toString();
                inspScrubber.value = "0";
            }

            (window as any).openModalWithTransition(inspectorModal);

            renderInspectorFrame(0);
            playInspectorAnimation();
        }
        catch(error)
        {
            (window as any).showAlertModal?.({
                title   : "Poisoned Vault",
                message : "The seal for Artifact #${idArtifact} persists...",
                type    : "danger"
            });
        }
    }

    function closeInspectorModal() : void
    {
        pauseInspectorAnimation();
        (window as any).closeModalWithTransition(inspectorModal, () : void =>
        {
            state.inspectorArtifact    = null;
            state.inspectorFrames      = [];
            state.inspectorSourceImg   = null;
            state.inspectorIsComparing = false;
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
    function renderReliquaryGrid(artifacts : SynthesisArtifact[]) : void
    {
        if(!artifactsGrid) return;
        artifactsGrid.innerHTML = "";

        if(artifacts.length === 0)
        {
            reliquaryEmpty?.classList.remove("hidden");
            return;
        }

        reliquaryEmpty?.classList.add("hidden");

        const bufferHTML : string[] = [];
        artifacts.forEach((art : SynthesisArtifact) =>
        {
            const thumbUrl : string  = streamThumbUrl.replace("/PLACEHOLDER", `/${art.artifact_hash}`);
            const hdUrl    : string  = streamArtifactUrl.replace("/PLACEHOLDER", `/${art.artifact_hash}`);
            const dateStr  : string  = art.created_at ? new Date(art.created_at).toLocaleString() : "-";
            const isFav    : boolean = art.is_favorite;

            bufferHTML.push(`
                <div class="vault-artifact-card"
                     data-artifact-id="${art.id_artifact}">
                    <div class="vault-fav-pin ${isFav ? "active" : ""}"
                         data-artifact-id="${art.id_artifact}"
                         title="${isFav ? "Favorited" : "Mark as Favorite"}">
                        <i class="fa-solid fa-star"></i>     
                    </div>
                    <div class="vault-thumb-wrapper"
                         data-artifact-id="${art.id_artifact}">
                        <img src="${thumbUrl}" alt="${art.alias}"
                             class="vault-thumb-img" loading="lazy">
                        <div class="vault-thumb-overlay">
                            <button type="button" data-artifact-id="${art.id_artifact}"
                                    class="vault-quick-action-btn action-inspect"
                                    title="Inspect Pattern">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button type="button" data-artifact-id="${art.id_artifact}"
                                    class="vault-quick-action-btn action-branch"
                                    title="Branch Formula in Studio">
                                <i class="fa-solid fa-code-branch"></i>        
                            </button>
                            <a href="${hdUrl}" download="${art.alias}.png"
                               class="vault-quick-action-btn action-download no-underline"
                               title="Download Pattern">
                               <i class="fa-solid fa-download"></i>
                            </a>
                        </div>     
                    </div>
                    
                    <div class="p-2.5 flex flex-col gap-1.5 flex-grow justify-between bg-vespera-charcoal/80"
                         data-artifact-id="${art.id_artifact}">
                         <div class="flex flex-col pointer-events-none">
                            <span class="font-cinzel text-xs text-vespera-parchment font-bold truncate"
                                  title="${art.alias}">
                                ${art.alias}      
                            </span>
                            <span class="font-mono text-[0.65rem] text-vespera-silver truncate"
                                  title="${art.artifact_hash}">
                                #${art.id_artifact} • ${truncateHash(art.artifact_hash, 5)}
                            </span>
                         </div>
                         
                         <div class="flex items-center justify-between pt-1 border-t border-vespera-obsidian 
                                     font-mono text-[0.65rem] pointer-events-none">
                            <span class="text-vespera-silver">
                                ${dateStr}
                            </span>
                        </div>
                    </div>     
                 </div>`);
        });
        artifactsGrid.innerHTML = bufferHTML.join("");

        const cards : NodeListOf<HTMLElement> = artifactsGrid.querySelectorAll(".vault-artifact-card");
        cards.forEach((card : HTMLElement) =>
        {
            const artId : number = parseInt(card.dataset.artifactId || "0");
            if(artId === 0) return;

            card.addEventListener("click", () => openInspectorModal(artId));

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
                await openInspectorModal(artId);
            });

            const branchBtn : HTMLElement | null = card.querySelector(".action-branch");
            branchBtn?.addEventListener("click", (event : MouseEvent) =>
            {
                event.stopPropagation();
                branchInStudio(artId);
            });

            const downloadBtn : HTMLElement | null = card.querySelector(".action-download");
            downloadBtn?.addEventListener("click", (event : MouseEvent) => event.stopPropagation());
        });
    }

    async function fetchArtifactsData(page : number) : Promise<VaultGalleryData | null>
    {
        try
        {
            const payload = {
                id_palette      : state.selectedPaletteId ? parseInt(state.selectedPaletteId) : null,
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
                data.items.map((a : SynthesisArtifact) => a.id_source_image));
            badgeTotalSrc.textContent = `(${uniqueSourceIds.size})`;
        }

        renderReliquaryGrid(data.items);
        updatePagination("artifacts", data.total_items, data.items.length);
    }

    // Catalysts
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
            onConfirm   : async () : Promise<void> =>
            {
                const apiUrl : string = deleteSourceUrl.replace("/source/0", `/source/${idSource}`);
                const res : APIResponse = await apiFetch(apiUrl, { method : "DELETE" });
                if(!res.success) return;
                await loadArtifacts();
            }
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
            const payload = {
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
        const apiUrl       : string = baseEndpoint.replace(`/${replaceToken}/0`, `/${replaceToken}/${targetId}`);

        const res : APIResponse = await apiFetch(apiUrl,
        {
            method  : "POST",
            headers : { "Content-Type" : "application/json" },
            body    : JSON.stringify({ alias : trimmed })
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
            const apiUrl : string = toggleFavoriteUrl.replace("/artifact/0",
                `/artifact/${idArtifact}`);

            const res : APIResponse = await apiFetch(apiUrl, { method : "POST" });

            if(!res.success && !res.data) throw new Error(res.error || "Error changing favorite status");

            const isFav : boolean = !!res.data.is_favorite;
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
            const apiUrl  : string = updateNotesUrl.replace("/artifact/0",
                `/artifact/${state.inspectorArtifact.id_artifact}`);

            const res : APIResponse = await apiFetch(apiUrl, {
               method  : "POST",
               headers : { "Content-Type" : "application/json" },
               body    : JSON.stringify({ notes : newNotes })
            });

            if(!res.success) throw new Error(res.error || "Unknown error");

            state.inspectorArtifact.user_notes = newNotes;
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

    async function deleteCurrentArtifact() : Promise<void>
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
            onConfirm   : async () : Promise<void> =>
            {
                const apiUrl : string = deleteArtifactUrl.replace("/artifact/0", `/artifact/${id}`);
                const res : APIResponse = await apiFetch(apiUrl, {
                    method  : "DELETE",
                    headers : { "Content-Type" : "application/json" },
                    body    : JSON.stringify({ delete_orphaned_source : true })
                });

                if(!res.success) return;

                closeInspectorModal();
                await loadArtifacts();
            }
        });
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
        filterFavBtn?.addEventListener("click", () =>
        {
            state.filterFavorites = !state.filterFavorites;
            filterFavBtn.classList.toggle("bg-vespera-crimson/20",      state.filterFavorites);
            filterFavBtn.classList.toggle("text-vespera-crimsonBright", state.filterFavorites);
            filterFavBtn.classList.toggle("border-vespera-crimson",     state.filterFavorites);
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
            if(sortBySel)        sortBySel.value        = "date_created";
            if(sortDirIcon)      sortDirIcon.className  = "fa-solid fa-arrow-up-wide-short";
            if(filterFavBtn)     filterFavBtn.classList.remove("bg-vespera-crimson/20", "text-vespera-crimsonBright", "border-vespera-crimson");

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
        inspPlayPauseBtn?.addEventListener("click", toggleInspectorPlayPause);
        inspScrubber?.addEventListener("input", () =>
        {
            pauseInspectorAnimation();
            renderInspectorFrame(parseInt(inspScrubber.value));
        });
        inspCompareBtn?.addEventListener("click", toggleInspectorComparison);
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
        inspDelBtn?.addEventListener("click", deleteCurrentArtifact);
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
        await loadPaletteCatalog();
        bindListeners();
        await loadArtifacts();
    }

    initVault().then();
});