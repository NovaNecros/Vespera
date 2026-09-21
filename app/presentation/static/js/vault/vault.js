import { apiFetch, truncateHash, formatBytes, buildPaletteLut } from "../base.js";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("vault-main-container");
    if (!mainContainer)
        return;
    const studioTemplateUrl = mainContainer.dataset.studioTemplateUrl || "";
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
    const galleryApiUrl = mainContainer.dataset.galleryApiUrl || "";
    const sourcesApiUrl = mainContainer.dataset.sourcesApiUrl || "";
    const artifactDetailUrl = mainContainer.dataset.artifactDetailApiUrl || "";
    const updateArtAliasUrl = mainContainer.dataset.updateArtifactAliasApiUrl || "";
    const updateSrcAliasUrl = mainContainer.dataset.updateSourceAliasApiUrl || "";
    const toggleFavoriteUrl = mainContainer.dataset.toggleFavoriteApiUrl || "";
    const updateNotesUrl = mainContainer.dataset.updateNotesApiUrl || "";
    const deleteArtifactUrl = mainContainer.dataset.deleteArtifactApiUrl || "";
    const dwnldManifestUrl = mainContainer.dataset.downloadManifestApiUrl || "";
    const deleteSourceUrl = mainContainer.dataset.deleteSourceApiUrl || "";
    const streamArtifactUrl = mainContainer.dataset.streamArtifactApiUrl || "";
    const streamThumbUrl = mainContainer.dataset.streamThumbApiUrl || "";
    const streamSourceUrl = mainContainer.dataset.streamSourceApiUrl || "";
    const streamFrameUrl = mainContainer.dataset.streamFrameApiUrl || "";
    const tabReliquaryBtn = document.getElementById("tab-reliquary-button");
    const tabCatalystsBtn = document.getElementById("tab-catalysts-btn");
    const badgeTotalArt = document.getElementById("badge-total-artifacts");
    const badgeTotalSrc = document.getElementById("badge-total-sources");
    const viewReliquary = document.getElementById("view-reliquary");
    const viewCatalysts = document.getElementById("view-catalysts");
    const searchInput = document.getElementById("vault-search-input");
    const clearSearchBtn = document.getElementById("clear-search-btn");
    const filterPaletteSel = document.getElementById("filter-palette-select");
    const filterFavBtn = document.getElementById("filter-favorites-btn");
    const sortBySel = document.getElementById("sort-by-select");
    const sortDirBtn = document.getElementById("sort-direction-btn");
    const sortDirIcon = document.getElementById("sort-direction-icon");
    const resetFiltersBtn = document.getElementById("reset-filters-btn");
    const artifactsGrid = document.getElementById("vault-artifacts-grid");
    const reliquaryEmpty = document.getElementById("reliquary-empty-state");
    const reliquaryPageInfo = document.getElementById("reliquary-page-info");
    const reliquaryPrevBtn = document.getElementById("reliquary-prev-page-btn");
    const reliquaryNextBtn = document.getElementById("reliquary-next-page-btn");
    const reliquaryPageInp = document.getElementById("reliquary-page-input");
    const reliquaryTotalP = document.getElementById("reliquary-total-pages");
    const sourcesGrid = document.getElementById("vault-sources-grid");
    const catalystsEmpty = document.getElementById("catalysts-empty-state");
    const catalystsPageInfo = document.getElementById("catalysts-page-info");
    const catalystsPrevBtn = document.getElementById("catalysts-prev-page-btn");
    const catalystsNextBtn = document.getElementById("catalysts-next-page-btn");
    const catalystsPageInp = document.getElementById("catalysts-page-input");
    const catalystsTotalP = document.getElementById("catalysts-total-pages");
    const inspectorModal = document.getElementById("artifact-inspector-modal");
    const inspectorCloseBtn = document.getElementById("inspector-close-btn");
    const inspFavToggleBtn = document.getElementById("inspector-favorite-toggle-btn");
    const inspFavIcon = document.getElementById("inspector-favorite-icon");
    const inspAliasHeading = document.getElementById("inspector-artifact-alias");
    const inspRenameBtn = document.getElementById("inspector-rename-alias-btn");
    const inspFrameLabel = document.getElementById("inspector-frame-label");
    const inspPlayPauseBtn = document.getElementById("inspector-play-pause-btn");
    const inspPlayIcon = document.getElementById("inspector-play-icon");
    const inspScrubber = document.getElementById("inspector-timeline-scrubber");
    const inspCompareBtn = document.getElementById("inspector-compare-btn");
    const inspectorCanvas = document.getElementById("inspector-canvas");
    const offscreenCanvas = document.createElement("canvas");
    const inspFeedRate = document.getElementById("inspector-feed-rate");
    const inspKillRate = document.getElementById("inspector-kill-rate");
    const inspDUDV = document.getElementById("inspector-du-dv");
    const inspIterDt = document.getElementById("inspector-iter-dt");
    const inspPaletteBadge = document.getElementById("inspector-palette-badge");
    const inspExecTime = document.getElementById("inspector-execution-time");
    const inspCreatedDate = document.getElementById("inspector-created-date");
    const inspArtifactHash = document.getElementById("inspector-artifact-hash");
    const inspNotesTextArea = document.getElementById("inspector-notes-textarea");
    const inspSaveNotesBtn = document.getElementById("inspector-save-notes-btn");
    const inspBranchBtn = document.getElementById("inspector-branch-studio-btn");
    const inspDownloadBtn = document.getElementById("inspector-download-btn");
    const inspDelBtn = document.getElementById("inspector-delete-btn");
    const inspectorCanvasCtx = inspectorCanvas ? inspectorCanvas.getContext("2d", { willReadFrequently: true }) : null;
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
    let searchDebounceTimer = null;
    function getDefaultState() {
        return {
            activeTab: "artifacts",
            reliquaryPage: 1,
            reliquaryPerPage: 24,
            reliquaryTotalPages: 1,
            catalystsPage: 1,
            catalystsPerPage: 16,
            catalystsTotalPages: 1,
            searchQuery: "",
            selectedPaletteId: "",
            filterFavorites: false,
            sortBy: "date_created",
            sortDir: "desc",
            selectedSourceId: null,
            paletteCatalog: [],
            activeLut: null,
            inspectorRelId: null,
            inspectorArtifact: null,
            inspectorFrames: [],
            inspectorSourceImg: null,
            inspectorFrameIndex: 0,
            inspectorIsPlaying: false,
            inspectorTimer: null,
            inspectorIsComparing: false
        };
    }
    let state = getDefaultState();
    async function loadPaletteCatalog() {
        const res = await apiFetch(palettesApiUrl);
        if (!res.success || !Array.isArray(res.data))
            return;
        state.paletteCatalog = res.data;
        if (!filterPaletteSel)
            return;
        const bufferHTML = [`<option value="">Omnichromatic</options>`];
        res.data.forEach((pal) => {
            bufferHTML.push(`<option value="${pal.id_palette.toString()}">${pal.display_name}</option>`);
        });
        filterPaletteSel.innerHTML = bufferHTML.join("");
    }
    function renderInspectorFrame(index) {
        if (!inspectorCanvas || !inspectorCanvasCtx || state.inspectorFrames.length === 0)
            return;
        if (index < 0 || index >= state.inspectorFrames.length)
            return;
        const img = state.inspectorFrames[index];
        if (offscreenCanvas.width !== inspectorCanvas.width || offscreenCanvas.height !== inspectorCanvas.height) {
            offscreenCanvas.width = inspectorCanvas.width;
            offscreenCanvas.height = inspectorCanvas.height;
        }
        if (!state.activeLut) {
            inspectorCanvasCtx.clearRect(0, 0, inspectorCanvas.width, inspectorCanvas.height);
            inspectorCanvasCtx.drawImage(img, 0, 0, inspectorCanvas.width, inspectorCanvas.height);
            return;
        }
        offscreenCtx?.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx?.drawImage(img, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const imgData = offscreenCtx?.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        if (!imgData)
            return;
        const data = imgData.data;
        const lut = state.activeLut;
        for (let p = 0; p < data.length; p += 4) {
            const gray = data[p];
            data[p] = lut[gray * 3];
            data[p + 1] = lut[gray * 3 + 1];
            data[p + 2] = lut[gray * 3 + 2];
        }
        inspectorCanvasCtx.putImageData(imgData, 0, 0);
        state.inspectorFrameIndex = index;
        if (inspScrubber)
            inspScrubber.value = index.toString();
        if (inspFrameLabel)
            inspFrameLabel.textContent = `Frame ${index + 1} / ${state.inspectorFrames.length}`;
    }
    function pauseInspectorAnimation() {
        state.inspectorIsPlaying = false;
        if (state.inspectorTimer !== null) {
            clearInterval(state.inspectorTimer);
            state.inspectorTimer = null;
        }
        if (inspPlayIcon)
            inspPlayIcon.className = "fa-solid fa-play mr-1.5";
    }
    function playInspectorAnimation() {
        if (state.inspectorFrames.length <= 1)
            return;
        state.inspectorIsPlaying = true;
        if (inspPlayIcon)
            inspPlayIcon.className = "fa-solid fa-pause mr-1.5 text-vespera-silverBright";
        if (state.inspectorFrameIndex >= state.inspectorFrames.length - 1)
            renderInspectorFrame(0);
        state.inspectorTimer = window.setInterval(() => {
            const nextIdx = state.inspectorFrameIndex + 1;
            if (nextIdx >= state.inspectorFrames.length)
                pauseInspectorAnimation();
            else
                renderInspectorFrame(nextIdx);
        }, 120);
    }
    function toggleInspectorPlayPause() {
        if (state.inspectorIsPlaying)
            pauseInspectorAnimation();
        else
            playInspectorAnimation();
    }
    function toggleInspectorComparison() {
        if (!inspectorCanvasCtx || !inspectorCanvas)
            return;
        state.inspectorIsComparing = !state.inspectorIsComparing;
        if (state.inspectorIsComparing) {
            pauseInspectorAnimation();
            if (state.inspectorSourceImg) {
                inspectorCanvasCtx.clearRect(0, 0, inspectorCanvas.width, inspectorCanvas.height);
                inspectorCanvasCtx.drawImage(state.inspectorSourceImg, 0, 0, inspectorCanvas.width, inspectorCanvas.height);
                inspCompareBtn?.classList.add("bg-vespera-crimson", "text-vespera-parchment");
            }
        }
        else {
            renderInspectorFrame(state.inspectorFrameIndex);
            inspCompareBtn?.classList.remove("bg-vespera-crimson", "text-vespera-parchment");
        }
    }
    async function openInspectorModal(idArtifact, idRel) {
        try {
            const apiUrl = artifactDetailUrl.replace("/artifact/0", `/artifact/${idArtifact}`);
            const res = await apiFetch(apiUrl);
            if (!res.success || !res.data)
                return;
            const art = res.data;
            state.inspectorArtifact = art;
            state.inspectorRelId = idRel || art.manifestations?.[0]?.id_rel || null;
            if (inspAliasHeading)
                inspAliasHeading.textContent = art.alias;
            if (inspFavIcon) {
                inspFavIcon.className = art.is_favorite ? "fa-solid fa-star text-vespera-crimson" : "fa-regular fa-star";
            }
            if (inspFeedRate)
                inspFeedRate.textContent = art.config ? art.config.feed_rate.toFixed(4) : "-";
            if (inspKillRate)
                inspKillRate.textContent = art.config ? art.config.kill_rate.toFixed(4) : "-";
            if (inspDUDV)
                inspDUDV.textContent = art.config ? `${art.config.diff_u.toFixed(3)} • ${art.config.diff_v.toFixed(3)}` : "- • -";
            if (inspIterDt)
                inspIterDt.textContent = art.config ? `${art.config.iterations} • ${art.config.dt.toFixed(2)}` : "- • -";
            if (inspExecTime)
                inspExecTime.textContent = `${art.execution_time.toFixed(6)} s`;
            if (inspCreatedDate)
                inspCreatedDate.textContent = art.created_at ? new Date(art.created_at).toLocaleString() : "-";
            if (inspArtifactHash) {
                inspArtifactHash.textContent = art.artifact_hash;
                inspArtifactHash.title = art.artifact_hash;
            }
            if (inspNotesTextArea)
                inspNotesTextArea.value = art.user_notes || "";
            const manifestPalette = (art.manifestations?.[0]?.palette ||
                art.palette ||
                null);
            if (inspPaletteBadge)
                inspPaletteBadge.textContent = manifestPalette?.display_name || "Criptochroma";
            if (manifestPalette && manifestPalette.stops)
                state.activeLut = buildPaletteLut(manifestPalette.stops);
            else
                state.activeLut = null;
            if (inspDownloadBtn) {
                const downloadFilename = (art.alias.match(/\.(png|jpg|jpeg|webp)$/i)
                    ? art.alias : `${art.alias}.png`);
                if (state.inspectorRelId && dwnldManifestUrl) {
                    inspDownloadBtn.href = dwnldManifestUrl.replace("/relationship/0", `/relationship/${state.inspectorRelId}`);
                }
                else {
                    inspDownloadBtn.href = streamArtifactUrl.replace("/hash/PLACEHOLDER", `/hash/${art.artifact_hash}`);
                }
                inspDownloadBtn.download = downloadFilename;
            }
            if (art.source_image) {
                const srcUrl = streamSourceUrl.replace("/PLACEHOLDER", `/${art.source_image.sha256_hash}`);
                state.inspectorSourceImg = new Image();
                state.inspectorSourceImg.crossOrigin = "anonymous";
                state.inspectorSourceImg.src = srcUrl;
            }
            const frameUrls = (art.frames || []).map((frame) => {
                return streamFrameUrl
                    .replace("/PLACEHOLDER", `/${art.artifact_hash}`)
                    .replace("/0", `/${frame.frame_index}`);
            });
            state.inspectorFrames = await Promise.all(frameUrls.map((url) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolve(img);
                    img.src = url;
                });
            }));
            if (inspScrubber) {
                inspScrubber.max = Math.max(0, state.inspectorFrames.length - 1).toString();
                inspScrubber.value = "0";
            }
            window.openModalWithTransition(inspectorModal);
            renderInspectorFrame(0);
            playInspectorAnimation();
        }
        catch (error) {
            window.showAlertModal?.({
                title: "Poisoned Vault",
                message: "The seal for Artifact #${idArtifact} persists...",
                type: "danger"
            });
        }
    }
    function closeInspectorModal() {
        pauseInspectorAnimation();
        window.closeModalWithTransition(inspectorModal, () => {
            state.inspectorArtifact = null;
            state.inspectorFrames = [];
            state.inspectorSourceImg = null;
            state.inspectorIsComparing = false;
        });
    }
    function updatePagination(target, totalItems, currentCount) {
        const isReliquary = target === "artifacts";
        const page = isReliquary ? state.reliquaryPage : state.catalystsPage;
        const perPage = isReliquary ? state.reliquaryPerPage : state.catalystsPerPage;
        const totalPages = isReliquary ? state.reliquaryTotalPages : state.catalystsTotalPages;
        const infoEl = isReliquary ? reliquaryPageInfo : catalystsPageInfo;
        const pageInp = isReliquary ? reliquaryPageInp : catalystsPageInp;
        const totalEl = isReliquary ? reliquaryTotalP : catalystsTotalP;
        const prevBtn = isReliquary ? reliquaryPrevBtn : catalystsPrevBtn;
        const nextBtn = isReliquary ? reliquaryNextBtn : catalystsNextBtn;
        const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
        const end = (page - 1) * perPage + currentCount;
        if (infoEl)
            infoEl.textContent = `Showing ${start} to ${end} of ${totalItems} ${target}`;
        if (totalEl)
            totalEl.textContent = totalPages.toString();
        if (prevBtn)
            prevBtn.disabled = page <= 1;
        if (nextBtn)
            nextBtn.disabled = page >= totalPages;
        if (pageInp) {
            pageInp.value = page.toString();
            pageInp.max = totalPages.toString();
        }
    }
    function switchToTab(tab) {
        if (state.activeTab === tab)
            return;
        state.activeTab = tab;
        const isReliquary = tab === "artifacts";
        tabReliquaryBtn?.classList.toggle("active", isReliquary);
        tabCatalystsBtn?.classList.toggle("active", !isReliquary);
        viewReliquary?.classList.toggle("hidden", !isReliquary);
        viewCatalysts?.classList.toggle("hidden", isReliquary);
        const filterWrapper = document.getElementById("filter-palette-wrapper");
        if (filterWrapper)
            filterWrapper.classList.toggle("hidden", !isReliquary);
        if (filterFavBtn)
            filterFavBtn.classList.toggle("hidden", !isReliquary);
        if (isReliquary)
            loadArtifacts().then();
        else
            loadCatalysts().then();
    }
    function recolorThumbnailCanvas(canvas, srcUrl, palette) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            canvas.width = img.width || 256;
            canvas.height = img.height || 256;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx)
                return;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (!palette || !palette.stops || palette.stops.length === 0)
                return;
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const lut = buildPaletteLut(palette.stops);
            for (let p = 0; p < data.length; p += 4) {
                const gray = data[p];
                data[p] = lut[gray * 3];
                data[p + 1] = lut[gray * 3 + 1];
                data[p + 2] = lut[gray * 3 + 2];
            }
            ctx.putImageData(imgData, 0, 0);
        };
        img.src = srcUrl;
    }
    function renderReliquaryGrid(manifestations) {
        if (!artifactsGrid)
            return;
        artifactsGrid.innerHTML = "";
        if (manifestations.length === 0) {
            reliquaryEmpty?.classList.remove("hidden");
            return;
        }
        reliquaryEmpty?.classList.add("hidden");
        const bufferHTML = [];
        manifestations.forEach((item) => {
            const thumbUrl = streamThumbUrl.replace("/PLACEHOLDER", `/${item.artifact_hash}`);
            const dateStr = item.created_at ? new Date(item.created_at).toLocaleString() : "-";
            const isFav = item.is_favorite;
            const downloadFilename = (item.alias.match(/\.(png|jpg|jpeg|webp)$/i)
                ? item.alias : `${item.alias}.png`);
            const cardDownloadUrl = dwnldManifestUrl.replace("/relationship/0", `/relationship/${item.id_rel}`);
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
                         
                         <div class="flex items-center justify-between pt-1 border-t border-vespera-obsidian 
                                     font-mono text-[0.65rem] pointer-events-none">
                            <span class="vamp-badge vamp-badge-silver text-[0.6rem] px-1.5 py-0.5">
                                ${item.palette?.display_name || "Raw"}
                            </span>
                            <span class="text-vespera-silver">
                                ${dateStr}
                            </span>
                        </div>
                    </div>     
                 </div>`);
        });
        artifactsGrid.innerHTML = bufferHTML.join("");
        manifestations.forEach((item) => {
            const canvas = artifactsGrid.querySelector(`canvas[data-rel-id="${item.id_rel}"]`);
            if (canvas) {
                const thumbUrl = streamThumbUrl.replace("/hash/PLACEHOLDER", `/hash/${item.artifact_hash}`);
                recolorThumbnailCanvas(canvas, thumbUrl, item.palette);
            }
        });
        const cards = artifactsGrid.querySelectorAll(".vault-artifact-card");
        cards.forEach((card) => {
            const artId = parseInt(card.dataset.artifactId || "0");
            const relId = parseInt(card.dataset.relId || "0");
            if (artId === 0)
                return;
            card.addEventListener("click", () => openInspectorModal(artId, relId));
            const favPin = card.querySelector(".vault-fav-pin");
            favPin?.addEventListener("click", async (event) => {
                event.stopPropagation();
                await toggleArtifactFavorite(artId, favPin);
            });
            const inspectBtn = card.querySelector(".action-inspect");
            inspectBtn?.addEventListener("click", async (event) => {
                event.stopPropagation();
                await openInspectorModal(artId, relId);
            });
            const downloadBtn = card.querySelector(".action-download-manifest");
            downloadBtn?.addEventListener("click", (event) => event.stopPropagation());
            const branchBtn = card.querySelector(".action-branch");
            branchBtn?.addEventListener("click", (event) => {
                event.stopPropagation();
                branchInStudio(artId);
            });
        });
    }
    async function fetchArtifactsData(page) {
        try {
            const payload = {
                id_palette: state.selectedPaletteId ? parseInt(state.selectedPaletteId) : null,
                id_source_image: state.selectedSourceId,
                favorites: state.filterFavorites,
                search: state.searchQuery,
                sort_by: state.sortBy,
                sort_dir: state.sortDir,
                page: page,
                per_page: state.reliquaryPerPage,
            };
            const res = await apiFetch(galleryApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.success)
                throw new Error(res.error || "Unknown error fetching reliquary data");
            return res.data ? res.data : null;
        }
        catch (error) {
            console.error(error);
            window.showAlertModal?.({
                title: "Poisoned Vault",
                message: "An unwarranted hex has befallen The Vault.",
                type: "danger"
            });
            return null;
        }
    }
    async function loadArtifacts() {
        if (!artifactsGrid)
            return;
        const data = await fetchArtifactsData(state.reliquaryPage);
        if (!data) {
            artifactsGrid.innerHTML = "";
            reliquaryEmpty?.classList.remove("hidden");
            return;
        }
        state.reliquaryTotalPages = Math.max(1, data.total_pages);
        if (badgeTotalArt)
            badgeTotalArt.textContent = `(${data.total_items})`;
        if (badgeTotalSrc) {
            const uniqueSourceIds = new Set(data.items.map((a) => a.id_source_image));
            badgeTotalSrc.textContent = `(${uniqueSourceIds.size})`;
        }
        renderReliquaryGrid(data.items);
        updatePagination("artifacts", data.total_items, data.items.length);
    }
    function deleteCatalystSource(idSource, alias, artifactCount) {
        if (artifactCount > 0) {
            window.showAlertModal?.({
                title: "Bound Catalyst",
                message: `Cannot purge ${alias} because it has been alchemically bound to ${artifactCount} artifacts. To get rid of this catalyst, first purge its derived artifacts, love.`,
                type: "warning"
            });
            return;
        }
        window.showAlertModal({
            title: "Purge Catalyst",
            message: `Are you certain you wish to purge ${alias} from The Catalyst Archive? A purged catalyst will be banished from reality for eternity.`,
            type: "info",
            icon: "fa-skull-crossbones",
            confirmText: "Purge",
            cancelText: "Cancel",
            onConfirm: async () => {
                const apiUrl = deleteSourceUrl.replace("/source/0", `/source/${idSource}`);
                const res = await apiFetch(apiUrl, { method: "DELETE" });
                if (!res.success)
                    return;
                await loadCatalysts();
                window.showAlertModal({
                    title: "Catalyst Purged",
                    message: "The Catalyst has been banished for eternity.",
                    type: "success"
                });
            }
        });
    }
    function renderCatalystGrid(sources) {
        if (!sourcesGrid)
            return;
        if (sources.length === 0) {
            sourcesGrid.innerHTML = "";
            catalystsEmpty?.classList.remove("hidden");
            return;
        }
        catalystsEmpty?.classList.add("hidden");
        const bufferHTML = [];
        sources.forEach((src) => {
            const dateStr = src.created_at ? new Date(src.created_at).toLocaleDateString() : "-";
            const sizeStr = formatBytes(src.file_size_bytes);
            const downloadFilename = src.alias.match(/\.(png|jpg|jpeg|webp)$/i) ?
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
        const cards = sourcesGrid.querySelectorAll(".vault-source-card");
        cards.forEach((card) => {
            const srcId = parseInt(card.dataset.sourceId || "0");
            if (srcId === 0)
                return;
            const thumbWrapper = card.querySelector(".vault-source-thumb-wrapper");
            thumbWrapper?.addEventListener("click", () => {
                state.selectedSourceId = srcId;
                switchToTab("artifacts");
            });
            const renameBtn = card.querySelector(".action-rename-src");
            const titleEl = card.querySelector(".source-alias-label");
            renameBtn?.addEventListener("click", (event) => {
                event.stopPropagation();
                if (titleEl)
                    enableInlineSourceRename(titleEl, srcId, renameBtn.dataset.sourceAlias || "");
            });
            const lineageBtn = card.querySelector(".action-view-lineage");
            lineageBtn?.addEventListener("click", (event) => {
                event.stopPropagation();
                state.selectedSourceId = srcId;
                switchToTab("artifacts");
            });
            const downloadBtn = card.querySelector(".action-download-src");
            downloadBtn?.addEventListener("click", (event) => event.stopPropagation());
            const purgeBtn = card.querySelector(".action-purge-src");
            purgeBtn?.addEventListener("click", (event) => {
                event.stopPropagation();
                const count = parseInt(purgeBtn.dataset.sourceCount || "0");
                const alias = purgeBtn.dataset.sourceAlias || "Catalyst";
                deleteCatalystSource(srcId, alias, count);
            });
        });
    }
    async function fetchCatalystsData(page) {
        try {
            const payload = {
                search: state.searchQuery,
                page: page,
                per_page: state.catalystsPerPage
            };
            const res = await apiFetch(sourcesApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.success)
                throw new Error(res.error || "Error fetching source images");
            return res.data ? res.data : null;
        }
        catch (error) {
            console.error(error);
            window.showAlertModal?.({
                title: "Poisoned Catalyst Archive",
                message: "An unwarranted hex has befallen The Archive.",
                type: "danger"
            });
            return null;
        }
    }
    async function loadCatalysts() {
        if (!sourcesGrid)
            return;
        const data = await fetchCatalystsData(state.catalystsPage);
        if (!data) {
            sourcesGrid.innerHTML = "";
            catalystsEmpty?.classList.remove("hidden");
            return;
        }
        state.catalystsTotalPages = Math.max(1, data.total_pages);
        if (badgeTotalSrc)
            badgeTotalSrc.textContent = `(${data.total_items})`;
        renderCatalystGrid(data.items);
        updatePagination("catalysts", data.total_items, data.items.length);
    }
    async function saveEntityAlias(target, targetId, newAlias) {
        const trimmed = newAlias.trim();
        if (!trimmed)
            return false;
        const isArtifact = target === "artifacts";
        const baseEndpoint = isArtifact ? updateArtAliasUrl : updateSrcAliasUrl;
        const replaceToken = isArtifact ? "artifact" : "source";
        const apiUrl = baseEndpoint.replace(`/${replaceToken}/0`, `/${replaceToken}/${targetId}`);
        const res = await apiFetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias: trimmed })
        });
        return res.success;
    }
    function enableInlineArtifactRename() {
        if (!inspAliasHeading || !state.inspectorArtifact)
            return;
        const currentAlias = state.inspectorArtifact.alias;
        const artId = state.inspectorArtifact.id_artifact;
        const input = document.createElement("input");
        input.type = "text";
        input.value = currentAlias;
        input.className = "vamp-input text-sm py-1 px-2 font-cinzel font-bold text-vespera-parchment w-64 border-vespera-silver";
        let isSaving = false;
        const commitEdit = async () => {
            if (isSaving)
                return;
            isSaving = true;
            const val = input.value.trim();
            if (val && val !== currentAlias && state.inspectorArtifact) {
                const success = await saveEntityAlias("artifacts", artId, val);
                if (success) {
                    state.inspectorArtifact.alias = val;
                    inspAliasHeading.textContent = val;
                    await loadArtifacts();
                }
                else {
                    inspAliasHeading.textContent = currentAlias;
                }
            }
            else {
                inspAliasHeading.textContent = currentAlias;
            }
            inspAliasHeading.classList.remove("hidden");
            input.remove();
        };
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                input.blur();
            }
            else if (event.key === "Escape") {
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
    function enableInlineSourceRename(titleEl, idSource, currentAlias) {
        const input = document.createElement("input");
        input.type = "text";
        input.value = currentAlias;
        input.className = "vamp-input text-xs py-0.5 px-1.5 font-cinzel font-bold text-vespera-parchment w-full border-vespera-silver";
        let isSaving = false;
        const commitEdit = async () => {
            if (isSaving)
                return;
            isSaving = true;
            const val = input.value.trim();
            if (val && val !== currentAlias) {
                const success = await saveEntityAlias("catalysts", idSource, val);
                if (success) {
                    titleEl.textContent = val;
                    titleEl.title = val;
                    await loadArtifacts();
                }
                else {
                    titleEl.textContent = currentAlias;
                }
            }
            else {
                titleEl.textContent = currentAlias;
            }
            titleEl.classList.remove("hidden");
            input.remove();
        };
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                input.blur();
            }
            else if (event.key === "Escape") {
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
    async function toggleArtifactFavorite(idArtifact, pinEl) {
        try {
            const apiUrl = toggleFavoriteUrl.replace("/artifact/0", `/artifact/${idArtifact}`);
            const res = await apiFetch(apiUrl, { method: "POST" });
            if (!res.success && !res.data)
                throw new Error(res.error || "Error changing favorite status");
            const isFav = !!res.data.is_favorite;
            if (pinEl)
                pinEl.classList.toggle("active", isFav);
            if (state.inspectorArtifact && state.inspectorArtifact.id_artifact === idArtifact) {
                state.inspectorArtifact.is_favorite = isFav;
                if (inspFavIcon) {
                    inspFavIcon.className = isFav ? "fa-solid fa-star text-vespera-crimson" : "fa-regular fa-star";
                }
            }
        }
        catch (error) {
            console.error(error);
            window.showAlertModal?.({
                title: "Disruption in the Ether",
                message: "Marking this artifact is not possible for the time being...",
                type: "error"
            });
        }
    }
    async function saveInspectorNotes() {
        try {
            if (!state.inspectorArtifact || !inspNotesTextArea)
                return;
            const newNotes = inspNotesTextArea.value.trim();
            const apiUrl = updateNotesUrl.replace("/artifact/0", `/artifact/${state.inspectorArtifact.id_artifact}`);
            const res = await apiFetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: newNotes })
            });
            if (!res.success)
                throw new Error(res.error || "Unknown error");
            state.inspectorArtifact.user_notes = newNotes;
            window.showAlertModal?.({
                title: "Inscription Saved",
                message: "Your observations have been preserved in The Grimoire.",
                type: "success"
            });
        }
        catch (error) {
            console.error(error);
            window.showAlertModal?.({
                title: "Error Saving Inscription",
                message: "The Grimoire has rejected your entry.",
                type: "danger"
            });
        }
    }
    async function deleteCurrentArtifact() {
        if (!state.inspectorArtifact)
            return;
        const name = state.inspectorArtifact.alias;
        const id = state.inspectorArtifact.id_artifact;
        window.showAlertModal({
            title: "Purge Artifact",
            message: `Are you certain you wish to purge ${name}? This action cannot be undone.`,
            type: "info",
            icon: "fa-skull-crossbones",
            confirmText: "Purge",
            cancelText: "Cancel",
            onConfirm: async () => {
                const apiUrl = deleteArtifactUrl.replace("/artifact/0", `/artifact/${id}`);
                const res = await apiFetch(apiUrl, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ delete_orphaned_source: true })
                });
                if (!res.success)
                    return;
                closeInspectorModal();
                await loadArtifacts();
                window.showAlertModal({
                    title: "Artifact Purged",
                    message: "The Artifact has been banished for eternity.",
                    type: "success"
                });
            }
        });
    }
    function branchInStudio(idArtifact) {
        window.location.href = `${studioTemplateUrl}?load=${idArtifact}`;
    }
    function bindListeners() {
        tabReliquaryBtn?.addEventListener("click", () => {
            state.selectedSourceId = null;
            switchToTab("artifacts");
        });
        tabCatalystsBtn?.addEventListener("click", () => switchToTab("catalysts"));
        searchInput?.addEventListener("input", () => {
            const q = searchInput.value.trim();
            if (q.length === 1 || q === state.searchQuery)
                return;
            state.searchQuery = q;
            if (clearSearchBtn)
                clearSearchBtn.classList.toggle("hidden", !state.searchQuery);
            if (searchDebounceTimer)
                clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                state.reliquaryPage = 1;
                state.catalystsPage = 1;
                if (state.activeTab === "artifacts")
                    loadArtifacts().then();
                else
                    loadCatalysts().then();
            }, 300);
        });
        clearSearchBtn?.addEventListener("click", () => {
            if (!searchInput || !searchInput.value)
                return;
            state.searchQuery = "";
            clearSearchBtn.classList.add("hidden");
            state.reliquaryPage = 1;
            state.catalystsPage = 1;
            if (state.activeTab === "artifacts")
                loadArtifacts().then();
            else
                loadCatalysts().then();
        });
        filterPaletteSel?.addEventListener("change", () => {
            state.selectedPaletteId = filterPaletteSel.value;
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });
        filterFavBtn?.addEventListener("click", () => {
            state.filterFavorites = !state.filterFavorites;
            filterFavBtn.classList.toggle("bg-vespera-crimson/20", state.filterFavorites);
            filterFavBtn.classList.toggle("text-vespera-crimsonBright", state.filterFavorites);
            filterFavBtn.classList.toggle("border-vespera-crimson", state.filterFavorites);
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });
        sortBySel?.addEventListener("change", () => {
            state.sortBy = sortBySel.value;
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });
        sortDirBtn?.addEventListener("click", () => {
            state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            if (sortDirIcon) {
                sortDirIcon.className = state.sortDir === "asc" ?
                    "fa-solid fa-arrow-up-wide-short" :
                    "fa-solid fa-arrow-down-wide-short";
            }
            state.reliquaryPage = 1;
            loadArtifacts().then();
        });
        resetFiltersBtn?.addEventListener("click", () => {
            state = getDefaultState();
            if (searchInput)
                searchInput.value = "";
            if (clearSearchBtn)
                clearSearchBtn.classList.add("hidden");
            if (filterPaletteSel)
                filterPaletteSel.value = "";
            if (sortBySel)
                sortBySel.value = "date_created";
            if (sortDirIcon)
                sortDirIcon.className = "fa-solid fa-arrow-up-wide-short";
            if (filterFavBtn)
                filterFavBtn.classList.remove("bg-vespera-crimson/20", "text-vespera-crimsonBright", "border-vespera-crimson");
            if (state.activeTab === "artifacts")
                loadArtifacts().then();
            else
                loadCatalysts().then();
        });
        reliquaryPrevBtn?.addEventListener("click", () => {
            if (state.reliquaryPage > 1) {
                --state.reliquaryPage;
                loadArtifacts().then();
            }
        });
        reliquaryNextBtn?.addEventListener("click", () => {
            if (state.reliquaryPage < state.reliquaryTotalPages) {
                ++state.reliquaryPage;
                loadArtifacts().then();
            }
        });
        reliquaryPageInp?.addEventListener("change", () => {
            const targetPage = parseInt(reliquaryPageInp.value);
            if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= state.reliquaryTotalPages) {
                state.reliquaryPage = targetPage;
                loadArtifacts().then();
            }
            else {
                reliquaryPageInp.value = state.reliquaryPage.toString();
            }
        });
        catalystsPrevBtn?.addEventListener("click", () => {
            if (state.catalystsPage > 1) {
                --state.catalystsPage;
                loadCatalysts().then();
            }
        });
        catalystsNextBtn?.addEventListener("click", () => {
            if (state.catalystsPage < state.catalystsTotalPages) {
                ++state.catalystsPage;
                loadCatalysts().then();
            }
        });
        catalystsPageInp?.addEventListener("change", () => {
            const targetPage = parseInt(catalystsPageInp.value);
            if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= state.catalystsTotalPages) {
                state.catalystsPage = targetPage;
                loadArtifacts().then();
            }
            else {
                catalystsPageInp.value = state.catalystsPage.toString();
            }
        });
        inspectorCloseBtn?.addEventListener("click", closeInspectorModal);
        inspPlayPauseBtn?.addEventListener("click", toggleInspectorPlayPause);
        inspScrubber?.addEventListener("input", () => {
            pauseInspectorAnimation();
            renderInspectorFrame(parseInt(inspScrubber.value));
        });
        inspCompareBtn?.addEventListener("click", toggleInspectorComparison);
        inspFavToggleBtn?.addEventListener("click", () => {
            if (state.inspectorArtifact) {
                toggleArtifactFavorite(state.inspectorArtifact.id_artifact, undefined).then();
            }
        });
        inspRenameBtn?.addEventListener("click", enableInlineArtifactRename);
        inspAliasHeading?.addEventListener("dblclick", enableInlineArtifactRename);
        inspSaveNotesBtn?.addEventListener("click", saveInspectorNotes);
        inspDelBtn?.addEventListener("click", deleteCurrentArtifact);
        inspBranchBtn?.addEventListener("click", () => {
            if (state.inspectorArtifact)
                branchInStudio(state.inspectorArtifact.id_artifact);
        });
        inspectorModal?.addEventListener("click", (event) => {
            if (event.target === inspectorModal)
                closeInspectorModal();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && inspectorModal && !inspectorModal.classList.contains("hidden")) {
                closeInspectorModal();
            }
        });
    }
    async function initVault() {
        await loadPaletteCatalog();
        bindListeners();
        await loadArtifacts();
    }
    initVault().then();
});
