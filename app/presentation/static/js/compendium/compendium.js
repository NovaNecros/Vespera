import { rgbToHex } from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("compendium-main-container");
    if (!mainContainer)
        return;
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
    const createPaletteApiUrl = mainContainer.dataset.createPaletteApiUrl || "";
    const updatePaletteApiUrl = mainContainer.dataset.updatePaletteApiUrl || "";
    const deletePaletteApiUrl = mainContainer.dataset.deletePaletteApiUrl || "";
    const toggleFavApiUrl = mainContainer.dataset.toggleFavoriteApiUrl || "";
    const samplePaletteApiUrl = mainContainer.dataset.samplePaletteApiUrl || "";
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
            sortBy: "id_asc",
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
        const r = Math.round(lower.r + (upper.r - lower.r) * factor);
        const g = Math.round(lower.g + (upper.g - lower.g) * factor);
        const b = Math.round(lower.b + (upper.b - lower.b) * factor);
        return { r, g, b, hex: rgbToHex(r, g, b) };
    }
    function updateAltarPreview() {
    }
    function updateActiveStopUI() {
    }
    function renderRibbonMarkers() {
    }
    function selectStop(index) {
    }
    function startMarkerDrag(startEvent, stopIdx) {
    }
    function addStopAtTrackPosition(clientX) {
    }
    function deleteActiveStop() {
    }
    function updateActiveStopColor(hexValue) {
    }
    function invertSpectrum() {
    }
    function distributeStopsEvenly() {
    }
    function cycleColorsForward() {
    }
    function renderSpectraGrid() {
    }
    function loadPaletteIntoAltar(idPalette) {
    }
    function branchFromCatalog(idPalette) {
    }
    function resetAltarToDefault() {
    }
    async function loadCatalog() {
    }
    async function inscribeSpectrum() {
    }
    async function togglePaletteFavorite(idPalette) {
    }
    function purgeCustomSpectrum(idPalette, name) {
    }
    function bindListeners() {
        ribbonTrack?.addEventListener("click", (e));
    }
    async function initCompendium() {
        try {
            await mirror.loadFrames([samplePaletteApiUrl]);
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
