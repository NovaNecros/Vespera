import { apiFetch, buildPaletteLut, hexToRgb, rgbToHex } from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("compendium-main-container");
    if (!mainContainer)
        return;
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
    const createPaletteApiUrl = mainContainer.dataset.createPaletteApiUrl || "";
    const updatePaletteApiUrl = mainContainer.dataset.updatePaletteApiUrl || "";
    const deletePaletteApiUrl = mainContainer.dataset.deletePaletteApiUrl || "";
    const toggleFavApiUrl = mainContainer.dataset.toggleFavoriteApiUrl || "";
    const sampleApiUrl = mainContainer.dataset.sampleApiUrl || "";
    const mirror = new ScryingMirror();
    const altarModeBadge = document.getElementById("altar-mode-badge");
    const ribbonTrack = document.getElementById("gradient-ribbon-track");
    const deleteStopBtn = document.getElementById("delete-stop-btn");
    const stopColorPicker = document.getElementById("stop-color-picker");
    const stopHexInput = document.getElementById("stop-hex-input");
    const stopPosInput = document.getElementById("stop-position-input");
    const stopPosSlider = document.getElementById("stop-position-slider");
    const stopRGBLabel = document.getElementById("stop-rgb-label");
    const modInvertBtn = document.getElementById("mod-invert-btn");
    const modDistributeBtn = document.getElementById("mod-distribute-btn");
    const modShiftBtn = document.getElementById("mod-shift-btn");
    const displayNameInput = document.getElementById("spectrum-display-name-input");
    const userNotesInput = document.getElementById("spectrum-notes-input");
    const saveSpectrumBtn = document.getElementById("save-spectrum-btn");
    const branchSpectrumBtn = document.getElementById("branch-spectrum-btn");
    const newSpectrumBtn = document.getElementById("new-spectrum-btn");
    const resetAltarBtn = document.getElementById("reset-altar-btn");
    const spectraTotalBadge = document.getElementById("spectra-total-badge");
    const spectraSearchInput = document.getElementById("spectra-search-input");
    const filterFavSpectraBtn = document.getElementById("filter-fav-spectra-btn");
    const sortSpectraSelect = document.getElementById("sort-spectra-select");
    const sortDirBtn = document.getElementById("sort-direction-btn");
    const sortDirIcon = document.getElementById("sort-direction-icon");
    const spectraContainer = document.getElementById("spectra-cards-container");
    const spectraEmptyState = document.getElementById("spectra-empty-state");
    let searchDebounceTimer = null;
    function getDefaultState() {
        return {
            paletteCatalog: [],
            activePaletteId: null,
            activeName: "",
            activeDisplayName: "New Chromatic Spectrum",
            activeUserNotes: "",
            isSystem: false,
            isFavorite: false,
            stops: [
                { stop_position: 0.00, r: 10, g: 10, b: 12, hex: "#0A0A0C" },
                { stop_position: 0.50, r: 160, g: 0, b: 16, hex: "#A00010" },
                { stop_position: 1.00, r: 245, g: 210, b: 150, hex: "#F5D296" }
            ],
            selectedStopIndex: 1,
            searchQuery: "",
            filterFavorites: false,
            sortBy: "id",
            sortDir: "asc",
            isDragging: false,
            activeLut: null
        };
    }
    const state = getDefaultState();
    function generateCSSGradient(stops) {
        if (stops.length === 0)
            return "linear-gradient(90deg, #000000 0%, #FFFFFF 100%)";
        const sorted = [...stops].sort((a, b) => a.stop_position - b.stop_position);
        const stopsStr = (sorted
            .map((s) => `${s.hex} ${(s.stop_position * 100).toFixed(1)}%`)
            .join(", "));
        return `linear-gradient(90deg, ${stopsStr})`;
    }
    function interpolateColorAt(position, stops) {
        if (stops.length === 0)
            return { r: 255, g: 255, b: 255, hex: "#FFFFFF" };
        const sorted = [...stops].sort((a, b) => a.stop_position - b.stop_position);
        if (position <= sorted[0].stop_position) {
            const first = sorted[0];
            return { r: first.r, g: first.g, b: first.b, hex: first.hex };
        }
        if (position >= sorted[sorted.length - 1].stop_position) {
            const last = sorted[sorted.length - 1];
            return { r: last.r, g: last.g, b: last.b, hex: last.hex };
        }
        let lower = sorted[0];
        let upper = sorted[sorted.length - 1];
        for (let i = 0; i < sorted.length - 1; ++i) {
            if (position >= sorted[i].stop_position && position <= sorted[i + 1].stop_position) {
                lower = sorted[i];
                upper = sorted[i + 1];
                break;
            }
        }
        const range = upper.stop_position - lower.stop_position;
        const factor = range === 0 ? 0 : (position - lower.stop_position) / range;
        const color = {
            r: Math.round(lower.r + (upper.r - lower.r) * factor),
            g: Math.round(lower.g + (upper.g - lower.g) * factor),
            b: Math.round(lower.b + (upper.b - lower.b) * factor)
        };
        return { ...color, hex: rgbToHex(color) };
    }
    function updateAltarPreview() {
        if (ribbonTrack)
            ribbonTrack.style.background = generateCSSGradient(state.stops);
        state.activeLut = buildPaletteLut(state.stops);
        mirror.setPaletteLut(state.activeLut);
    }
    function updateActiveStopUI() {
        const activeStop = state.stops[state.selectedStopIndex];
        if (!activeStop)
            return;
        if (stopColorPicker)
            stopColorPicker.value = activeStop.hex;
        if (stopHexInput)
            stopHexInput.value = activeStop.hex.toUpperCase();
        if (stopPosInput)
            stopPosInput.value = activeStop.stop_position.toFixed(4);
        if (stopPosSlider)
            stopPosSlider.value = activeStop.stop_position.toFixed(4);
        if (stopRGBLabel)
            stopRGBLabel.textContent = `rgb(${activeStop.r}, ${activeStop.g}, ${activeStop.b})`;
        if (deleteStopBtn)
            deleteStopBtn.disabled = (state.stops.length <= 2);
    }
    function renderRibbonMarkers() {
        if (!ribbonTrack)
            return;
        const bufferHTML = [];
        state.stops.forEach((stop, idx) => {
            const isActive = idx === state.selectedStopIndex;
            bufferHTML.push(`
                <div class="gradient-stop-marker ${isActive ? 'active' : ''}"
                     style="left : ${(stop.stop_position * 100).toFixed(2)}%"
                     data-index="${idx}"
                     title="Stop #${idx + 1}: ${stop.hex} (${(stop.stop_position * 100).toFixed(1)}%)">
                    <div class="marker-head" style="--stop-color : ${stop.hex};"></div>
                    <div class="marker-needle"></div>
                </div>
            `);
        });
        ribbonTrack.innerHTML = bufferHTML.join("");
        ribbonTrack.querySelectorAll(".gradient-stop-marker").forEach((markerEl) => {
            const idx = parseInt(markerEl.dataset.index || "0");
            markerEl.addEventListener("mousedown", (event) => {
                event.stopPropagation();
                selectStop(idx);
                startMarkerDrag(idx);
            });
        });
    }
    function selectStop(index) {
        if (index < 0 || index >= state.stops.length)
            return;
        state.selectedStopIndex = index;
        renderRibbonMarkers();
        updateActiveStopUI();
    }
    function startMarkerDrag(stopIdx) {
        if (!ribbonTrack)
            return;
        state.isDragging = true;
        const trackRect = ribbonTrack.getBoundingClientRect();
        const onMouseMove = (moveEvent) => {
            if (!state.isDragging)
                return;
            const currentX = moveEvent.clientX - trackRect.left;
            const normalized = Math.max(0, Math.min(1, currentX / trackRect.width));
            state.stops[stopIdx].stop_position = parseFloat(normalized.toFixed(4));
            renderRibbonMarkers();
            updateAltarPreview();
            updateActiveStopUI();
        };
        const onMouseUp = () => {
            state.isDragging = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }
    function addStopAtTrackPosition(clientX) {
        if (!ribbonTrack)
            return;
        const trackRect = ribbonTrack.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
        const color = interpolateColorAt(pos, state.stops);
        const newStop = {
            stop_position: parseFloat(pos.toFixed(4)),
            r: color.r,
            g: color.g,
            b: color.b,
            hex: color.hex,
        };
        state.stops.push(newStop);
        state.stops.sort((a, b) => a.stop_position - b.stop_position);
        state.selectedStopIndex = state.stops.findIndex((s) => s === newStop);
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
    }
    function deleteActiveStop() {
        if (state.stops.length <= 2)
            return;
        state.stops.splice(state.selectedStopIndex, 1);
        state.selectedStopIndex = Math.max(0, state.selectedStopIndex - 1);
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
    }
    function updateActiveStopColor(hexValue) {
        const activeStop = state.stops[state.selectedStopIndex];
        if (!activeStop)
            return;
        const rgb = hexToRgb(hexValue);
        activeStop.r = rgb.r;
        activeStop.g = rgb.g;
        activeStop.b = rgb.b;
        activeStop.hex = hexValue;
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
    }
    function invertSpectrum() {
        state.stops.forEach((s) => {
            s.stop_position = parseFloat((1.0 - s.stop_position).toFixed(4));
        });
        state.stops.sort((a, b) => a.stop_position - b.stop_position);
        selectStop(0);
        updateAltarPreview();
    }
    function distributeStopsEvenly() {
        if (state.stops.length <= 1)
            return;
        state.stops.sort((a, b) => a.stop_position - b.stop_position);
        const step = 1.0 / (state.stops.length - 1);
        state.stops.forEach((s, i) => {
            s.stop_position = parseFloat((i * step).toFixed(4));
        });
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
    }
    function cycleColorsForward() {
        if (state.stops.length <= 1)
            return;
        const lastColor = { ...state.stops[state.stops.length - 1] };
        for (let i = state.stops.length - 1; i > 0; --i) {
            state.stops[i].r = state.stops[i - 1].r;
            state.stops[i].g = state.stops[i - 1].g;
            state.stops[i].b = state.stops[i - 1].b;
            state.stops[i].hex = state.stops[i - 1].hex;
        }
        state.stops[0].r = lastColor.r;
        state.stops[0].g = lastColor.g;
        state.stops[0].b = lastColor.b;
        state.stops[0].hex = lastColor.hex;
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
    }
    function renderSpectraGrid() {
        if (!spectraContainer)
            return;
        spectraContainer.innerHTML = "";
        let items = [...state.paletteCatalog];
        if (state.filterFavorites)
            items = items.filter((p) => p.is_favorite);
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            items = items.filter((p) => p.display_name.toLowerCase().includes(q) ||
                p.name.toLowerCase().includes(q));
        }
        const isAsc = state.sortDir === "asc";
        if (state.sortBy === "id")
            items.sort((a, b) => isAsc ? a.id_palette - b.id_palette : b.id_palette - a.id_palette);
        if (state.sortBy === "name")
            items.sort((a, b) => isAsc ? a.display_name.localeCompare(b.display_name) : b.display_name.localeCompare(a.display_name));
        if (state.sortBy === "stops")
            items.sort((a, b) => isAsc ? a.stops.length - b.stops.length : b.stops.length - a.stops.length);
        if (spectraTotalBadge) {
            spectraTotalBadge.textContent = `(${items.length} / ${state.paletteCatalog.length})`;
        }
        if (items.length === 0) {
            spectraEmptyState?.classList.remove("hidden");
            return;
        }
        spectraEmptyState?.classList.add("hidden");
        const bufferHTML = [];
        items.forEach((pal) => {
            const gradientCSS = generateCSSGradient(pal.stops);
            const isFav = pal.is_favorite;
            const isSys = pal.is_system;
            const isSelected = pal.id_palette === state.activePaletteId;
            bufferHTML.push(`
                <div class="spectrum-card ${isSelected ? 'active-editor' : ''}"
                     data-palette-id="${pal.id_palette}">
                    <div class="spectrum-ribbon-preview" style="background : ${gradientCSS};"></div>
                    <div class="spectrum-card-header">
                        <div class="flex flex-col truncate">
                            <span class="font-cinzel text-xs text-vespera-parchment font-bold truncate"
                                  title="${pal.display_name}">
                                ${pal.display_name}
                            </span>
                            <span class="font-mono text-[0.65rem] text-vespera-silver truncate">
                                #${pal.id_palette} • ${pal.stops.length} Nodes
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="vamp-badge ${isSys ? 'vamp-badge-silver' : 'vamp-badge-crimson-bright'}
                                         text-[0.6rem] px-1.5 py-0.5">
                                ${isSys ? 'Sacred' : 'Inscribed'}
                            </span>
                            <button type="button" 
                                    class="action-fav-spectrum text-xs transition-colors p-1
                                           ${isFav ? 'text-vespera-crimson' : 'text-vespera-silver'} 
                                           hover:text-vespera-crimson"
                                    data-palette-id="${pal.id_palette}"
                                    title="Toggle Favorite">
                                <i class="${isFav ? 'fa-solid fa-star' : 'fa-regular fa-star'}"></i>         
                            </button>
                        </div>
                    </div>
                    <div class="px-3 pb-2.5 pt-1 flex items-center justify-between border-t border-vespera-obsidian">
                        <button type="button"
                                class="vamp-btn vamp-btn-ghost text-[0.65rem] py-0.5 px-2 action-load-altar"
                                data-palette-id="${pal.id_palette}">
                            <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>
                            Load to Altar        
                        </button>
                        <div class="flex items-center gap-1">
                            <button type="button"
                                    class="vamp-btn vamp-btn-ghost text-[0.65rem] py-0.5 px-2 action-branch-spectrum"
                                    data-palette-id="${pal.id_palette}"
                                    title="Branch variant of this spectrum">
                                <i class="fa-solid fa-code-branch"></i>        
                            </button>
                            ${!isSys ? `
                                <button type="button"
                                        class="text-xs text-vespera-crimson hover:text-vespera-crimsonBright 
                                               p-1 action-purge-spectrum"
                                        data-palette-id="${pal.id_palette}"
                                        data-palette-name="${pal.display_name}"
                                        title="Purge ${pal.display_name}">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ""}            
                        </div>
                    </div>
                </div>
            `);
        });
        spectraContainer.innerHTML = bufferHTML.join("");
        spectraContainer.querySelectorAll(".action-load-altar").forEach((btn) => {
            btn.addEventListener("click", () => {
                loadPaletteIntoAltar(parseInt(btn.dataset.paletteId || "0"));
            });
        });
        spectraContainer.querySelectorAll(".action-branch-spectrum").forEach((btn) => {
            btn.addEventListener("click", () => {
                branchFromCatalog(parseInt(btn.dataset.paletteId || "0"));
            });
        });
        spectraContainer.querySelectorAll(".action-fav-spectrum").forEach((btn) => {
            btn.addEventListener("click", async () => {
                await togglePaletteFavorite(parseInt(btn.dataset.paletteId || "0"));
            });
        });
        spectraContainer.querySelectorAll(".action-purge-spectrum").forEach((btn) => {
            btn.addEventListener("click", () => {
                const palId = parseInt(btn.dataset.paletteId || "0");
                const name = btn.dataset.paletteName || "Spectrum";
                purgeCustomSpectrum(palId, name);
            });
        });
    }
    function loadPaletteIntoAltar(idPalette) {
        const pal = state.paletteCatalog.find((p) => p.id_palette === idPalette);
        if (!pal)
            return;
        state.activePaletteId = pal.id_palette;
        state.activeName = pal.name;
        state.activeDisplayName = pal.display_name;
        state.isSystem = pal.is_system;
        state.isFavorite = pal.is_favorite;
        state.activeUserNotes = pal.user_notes || "";
        state.stops = pal.stops.map((s) => ({
            id_stop: s.id_stop,
            stop_position: parseFloat(s.stop_position.toString()),
            r: s.r,
            g: s.g,
            b: s.b,
            hex: s.hex || rgbToHex(s)
        }));
        state.selectedStopIndex = 0;
        if (displayNameInput)
            displayNameInput.value = pal.display_name;
        if (userNotesInput)
            userNotesInput.value = state.activeUserNotes;
        if (altarModeBadge) {
            altarModeBadge.textContent = pal.is_system ? "Sacred Formula" : `Inscribed #${pal.id_palette}`;
            altarModeBadge.className = `vamp-badge ${pal.is_system ? "vamp-badge-silver" : "vamp-badge-crimson-bright"} text-[0.65rem]`;
        }
        if (branchSpectrumBtn)
            branchSpectrumBtn.disabled = false;
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
        renderSpectraGrid();
    }
    function branchFromCatalog(idPalette) {
        loadPaletteIntoAltar(idPalette);
        state.activePaletteId = null;
        state.activeName = "";
        state.isSystem = false;
        state.activeDisplayName = `${state.activeDisplayName} (Variant)`;
        if (displayNameInput) {
            displayNameInput.value = state.activeDisplayName;
            displayNameInput.focus();
        }
        if (altarModeBadge) {
            altarModeBadge.textContent = "Branch Variant";
            altarModeBadge.className = "vamp-badge vamp-badge-silver text-[0.65rem]";
        }
        if (branchSpectrumBtn)
            branchSpectrumBtn.disabled = true;
        renderSpectraGrid();
    }
    function resetAltarToDefault() {
        const def = getDefaultState();
        state.activePaletteId = null;
        state.activeName = "";
        state.activeDisplayName = "New Chromatic Spectrum";
        state.isSystem = false;
        state.isFavorite = false;
        state.stops = def.stops;
        state.selectedStopIndex = 1;
        if (displayNameInput)
            displayNameInput.value = state.activeDisplayName;
        if (userNotesInput)
            userNotesInput.value = "";
        if (altarModeBadge) {
            altarModeBadge.textContent = "Custom Inscription";
            altarModeBadge.className = "vamp-badge vamp-badge-silver text-[0.65rem]";
        }
        if (branchSpectrumBtn)
            branchSpectrumBtn.disabled = true;
        renderRibbonMarkers();
        updateAltarPreview();
        updateActiveStopUI();
        renderSpectraGrid();
    }
    async function loadCatalog() {
        const res = await apiFetch(palettesApiUrl);
        if (!res.success || !Array.isArray(res.data))
            return;
        state.paletteCatalog = res.data;
        renderSpectraGrid();
        if (state.activePaletteId === null && res.data.length > 0) {
            loadPaletteIntoAltar(res.data[0].id_palette);
        }
    }
    async function inscribeSpectrum() {
        const title = displayNameInput?.value.trim() || "";
        if (!title) {
            window.showAlertModal?.({
                title: "Criptochroma",
                message: "A chromatic formula requires a name.",
                type: "warning"
            });
            return;
        }
        if (state.stops.length < 2) {
            window.showAlertModal?.({
                title: "Degenerate Lattice",
                message: "A chromatic spectrum must employ at least two nodes to interpolate",
                type: "warning"
            });
            return;
        }
        const sortedStops = [...state.stops].sort((a, b) => a.stop_position - b.stop_position);
        const payload = {
            display_name: title,
            user_notes: userNotesInput?.value.trim() || "",
            stops: sortedStops.map((s) => ({
                stop_position: s.stop_position,
                r: s.r,
                g: s.g,
                b: s.b
            }))
        };
        const isUpdate = state.activePaletteId !== null && !state.isSystem;
        const apiUrl = (isUpdate ?
            updatePaletteApiUrl.replace("/palette/0", `/palette/${state.activePaletteId}`) :
            createPaletteApiUrl);
        const res = await apiFetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.success || !res.data)
            return;
        window.showAlertModal?.({
            title: isUpdate ? "Spectrum Inscribed" : "Formula Sealed",
            message: `${res.data.display_name} has been inscribed into The Spectra Compendium`,
            type: "success"
        });
        await loadCatalog();
        loadPaletteIntoAltar(res.data.id_palette);
    }
    async function togglePaletteFavorite(idPalette) {
        const apiUrl = toggleFavApiUrl.replace("/palette/0", `/palette/${idPalette}`);
        const res = await apiFetch(apiUrl, { method: "POST" });
        if (!res.success)
            return;
        const pal = state.paletteCatalog.find((p) => p.id_palette === idPalette);
        if (pal)
            pal.is_favorite = !pal.is_favorite;
        if (state.activePaletteId === idPalette)
            state.isFavorite = !state.isFavorite;
        renderSpectraGrid();
    }
    function purgeCustomSpectrum(idPalette, name) {
        window.showAlertModal({
            title: "Purge Spectrum",
            message: `Are you certain you wish to banish ${name}? All bound artifacts will be preserved in grayscale.`,
            type: "info",
            icon: "fa-skull-crossbones",
            confirmText: "Purge",
            cancelText: "Cancel",
            onConfirm: async () => {
                const apiUrl = deletePaletteApiUrl.replace("/palette/0", `/palette/${idPalette}`);
                const res = await apiFetch(apiUrl, { method: "DELETE" });
                if (!res.success)
                    return;
                if (state.activePaletteId === idPalette)
                    resetAltarToDefault();
                await loadCatalog();
            }
        });
    }
    function bindListeners() {
        ribbonTrack?.addEventListener("click", (event) => {
            if (event.target.closest(".gradient-stop-marker"))
                return;
            addStopAtTrackPosition(event.clientX);
        });
        deleteStopBtn?.addEventListener("click", deleteActiveStop);
        stopColorPicker?.addEventListener("input", () => {
            if (stopColorPicker)
                updateActiveStopColor(stopColorPicker.value);
        });
        stopHexInput?.addEventListener("change", () => {
            if (!stopHexInput)
                return;
            let val = stopHexInput.value.trim().toUpperCase();
            if (!val.startsWith("#"))
                val = `#${val}`;
            if (/^#[0-9A-F]{6}$/.test(val))
                updateActiveStopColor(val);
            else
                updateActiveStopUI();
        });
        stopPosSlider?.addEventListener("input", () => {
            if (!stopPosSlider)
                return;
            state.stops[state.selectedStopIndex].stop_position = parseFloat(stopPosSlider.value);
            renderRibbonMarkers();
            updateAltarPreview();
            updateActiveStopUI();
        });
        stopPosInput?.addEventListener("change", () => {
            if (!stopPosInput)
                return;
            state.stops[state.selectedStopIndex].stop_position = Math.max(0, Math.min(1, parseFloat(stopPosInput.value) || 0));
            renderRibbonMarkers();
            updateAltarPreview();
            updateActiveStopUI();
        });
        modInvertBtn?.addEventListener("click", invertSpectrum);
        modDistributeBtn?.addEventListener("click", distributeStopsEvenly);
        modShiftBtn?.addEventListener("click", cycleColorsForward);
        saveSpectrumBtn?.addEventListener("click", inscribeSpectrum);
        branchSpectrumBtn?.addEventListener("click", () => {
            if (state.activePaletteId)
                branchFromCatalog(state.activePaletteId);
        });
        newSpectrumBtn?.addEventListener("click", resetAltarToDefault);
        resetAltarBtn?.addEventListener("click", resetAltarToDefault);
        spectraSearchInput?.addEventListener("input", () => {
            if (searchDebounceTimer)
                clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                state.searchQuery = spectraSearchInput.value.trim();
                renderSpectraGrid();
            }, 250);
        });
        filterFavSpectraBtn?.addEventListener("click", () => {
            state.filterFavorites = !state.filterFavorites;
            filterFavSpectraBtn.classList.toggle("bg-vespera-crimson/20", state.filterFavorites);
            filterFavSpectraBtn.classList.toggle("text-vespera-crimsonBright", state.filterFavorites);
            renderSpectraGrid();
        });
        sortSpectraSelect?.addEventListener("change", () => {
            state.sortBy = sortSpectraSelect.value;
            renderSpectraGrid();
        });
        sortDirBtn?.addEventListener("click", () => {
            state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            if (sortDirIcon) {
                sortDirIcon.className = (state.sortDir === "asc" ?
                    "fa-solid fa-arrow-up-wide-short" :
                    "fa-solid fa-arrow-down-wide-short");
            }
            renderSpectraGrid();
        });
    }
    async function initCompendium() {
        try {
            await mirror.loadFrames([sampleApiUrl]);
        }
        catch (error) {
            console.warn("Sample Pattern could not be preloaded into the Scrying Mirror:", error);
        }
        bindListeners();
        await loadCatalog();
        updateAltarPreview();
        updateActiveStopUI();
        renderRibbonMarkers();
    }
    initCompendium().then();
});
