"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_js_1 = require("../base.js");
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("studio-main-container");
    if (!mainContainer)
        return;
    const generateApiUrl = mainContainer.dataset.generateApiUrl || "";
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
    const renderStaticApiUrl = mainContainer.dataset.renderStaticApiUrl || "";
    const toggleFavoriteApiUrl = mainContainer.dataset.toggleFavoriteApiUrl || "";
    const downloadApiUrl = mainContainer.dataset.downloadApiUrl || "";
    const dropzoneEl = document.getElementById("dropzone-container");
    const fileInput = document.getElementById("source-file-input");
    const sourceIdInput = document.getElementById("source-image-id-input");
    const parentIdInput = document.getElementById("parent-artifact-id-input");
    const dropzonePrompt = document.getElementById("dropzone-prompt");
    const previewCont = document.getElementById("dropzone-preview-container");
    const previewImg = document.getElementById("source-preview-img");
    const filenameLabel = document.getElementById("source-filename-label");
    const removeSourceBtn = document.getElementById("remove-source-btn");
    const sourceStatusEl = document.getElementById("source-image-status");
    const feedSlider = document.getElementById("feed-rate-slider");
    const feedDisplay = document.getElementById("feed-rate-display");
    const killSlider = document.getElementById("kill-rate-slider");
    const killDisplay = document.getElementById("kill-rate-display");
    const diffUSlider = document.getElementById("diff-u-slider");
    const diffUDisplay = document.getElementById("diff-u-display");
    const diffVSlider = document.getElementById("diff-v-slider");
    const diffVDisplay = document.getElementById("diff-v-display");
    const iterSlider = document.getElementById("iterations-slider");
    const iterDisplay = document.getElementById("iterations-display");
    const dtSlider = document.getElementById("dt-slider");
    const dtDisplay = document.getElementById("dt-display");
    const paletteSelect = document.getElementById("palette-select");
    const userNotesInput = document.getElementById("user-notes-input");
    const canvasStageWrap = document.getElementById("canvas-stage-wrapper");
    const canvas = document.getElementById("synthesis-canvas");
    const emptyState = document.getElementById("canvas-empty-state");
    const modeBadge = document.getElementById("canvas-mode-badge");
    const playbackBadge = document.getElementById("canvas-playback-badge");
    const frameLabel = document.getElementById("playback-frame-label");
    const playbackPanel = document.getElementById("playback-controls-panel");
    const playPauseButton = document.getElementById("play-pause-btn");
    const playPauseIcon = document.getElementById("play-pause-icon");
    const scrubber = document.getElementById("timeline-scrubber");
    const compareBtn = document.getElementById("toggle-view-original-btn");
    const canvasContext = canvas ? canvas.getContext("2d") : null;
    const metricId = document.getElementById("metric-id");
    const metricTime = document.getElementById("metric-time");
    const metricHash = document.getElementById("metric-hash");
    const synthesizeBtn = document.getElementById("synthesize-btn");
    const resetParamsBtn = document.getElementById("reset-params-btn");
    const favoriteBtn = document.getElementById("save-favorite-btn");
    const downloadLink = document.getElementById("download-artifact-link");
    const defaultF = "0.0545";
    const defaultK = "0.0620";
    const defaultDu = "1.000";
    const defaultDv = "0.500";
    const defaultIter = "4000";
    const defaultDt = "1.00";
    const defaultPalette = "crimson_eclipse";
    function setDefaultState() {
        return {
            currentArtifact: null,
            sourceImageFile: null,
            sourceImageDataUrl: null,
            sourceImageElement: null,
            keyframes: [],
            currentFrameIndex: 0,
            isPlaying: false,
            animationTimer: null,
            isComparing: false
        };
    }
    const state = setDefaultState();
    async function loadPaletteCatalog() {
        if (!paletteSelect)
            return;
        const res = await (0, base_js_1.apiFetch)(palettesApiUrl);
        if (!res.success || !Array.isArray(res.data))
            return;
        paletteSelect.innerHTML = "";
        res.data.forEach((palName) => {
            const opt = document.createElement("option");
            opt.value = palName;
            opt.textContent = palName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            if (palName === "crimson_eclipse")
                opt.selected = true;
            paletteSelect.appendChild(opt);
        });
    }
    function resetFormula() {
        if (feedSlider)
            feedSlider.value = defaultF;
        if (killSlider)
            killSlider.value = defaultK;
        if (diffUSlider)
            diffUSlider.value = defaultDu;
        if (diffVSlider)
            diffVSlider.value = defaultDv;
        if (iterSlider)
            iterSlider.value = defaultIter;
        if (dtSlider)
            dtSlider.value = defaultDt;
        if (paletteSelect)
            paletteSelect.value = defaultPalette;
        if (userNotesInput)
            userNotesInput.value = "";
        if (feedDisplay)
            feedDisplay.textContent = defaultF;
        if (killDisplay)
            killDisplay.textContent = defaultK;
        if (diffUDisplay)
            diffUDisplay.textContent = defaultDu;
        if (diffVDisplay)
            diffVDisplay.textContent = defaultDv;
        if (iterDisplay)
            iterDisplay.textContent = defaultIter;
        if (dtDisplay)
            dtDisplay.textContent = defaultDt;
    }
    function bindSliderDisplays() {
        feedSlider?.addEventListener("input", () => { if (feedDisplay)
            feedDisplay.textContent = parseFloat(feedSlider.value).toFixed(4); });
        killSlider?.addEventListener("input", () => { if (killDisplay)
            killDisplay.textContent = parseFloat(killSlider.value).toFixed(4); });
        diffUSlider?.addEventListener("input", () => { if (diffUDisplay)
            diffUDisplay.textContent = parseFloat(diffUSlider.value).toFixed(3); });
        diffVSlider?.addEventListener("input", () => { if (diffVDisplay)
            diffVDisplay.textContent = parseFloat(diffVSlider.value).toFixed(3); });
        iterSlider?.addEventListener("input", () => { if (iterDisplay)
            iterDisplay.textContent = parseInt(iterSlider.value, 10).toString(); });
        dtSlider?.addEventListener("input", () => { if (dtDisplay)
            dtDisplay.textContent = parseFloat(dtSlider.value).toFixed(2); });
        resetParamsBtn?.addEventListener("click", resetFormula);
    }
    function handleFileSelection(file) {
        if (!file.type.match(/image\/(png|jpeg|webp)$/)) {
            window.showAlertModal?.({
                title: "Impure Vessel",
                message: "Only pristine pictograms may seed the morphogenetic reaction (PNG, JPEG, WebP).",
                type: "danger"
            });
            return;
        }
        state.sourceImageFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result;
            state.sourceImageDataUrl = dataUrl;
            const img = new Image();
            img.onload = () => { state.sourceImageElement = img; };
            img.src = dataUrl;
            if (previewImg)
                previewImg.src = dataUrl;
            if (filenameLabel)
                filenameLabel.textContent = file.name;
            dropzonePrompt?.classList.add("hidden");
            previewCont?.classList.remove("hidden");
            previewCont?.classList.add("flex");
            if (sourceStatusEl) {
                sourceStatusEl.textContent = "Catalyst Seeded";
                sourceStatusEl.className = "font-mono text-[0.7rem] text-vespera-goldbright";
            }
        };
        reader.readAsDataURL(file);
    }
    function purgeSourceImage() {
        state.sourceImageFile = null;
        state.sourceImageDataUrl = null;
        state.sourceImageElement = null;
        if (fileInput)
            fileInput.value = "";
        if (sourceIdInput)
            sourceIdInput.value = "";
        if (previewImg)
            previewImg.src = "";
        previewCont?.classList.add("hidden");
        previewCont?.classList.remove("flex");
        dropzonePrompt?.classList.remove("hidden");
        if (sourceStatusEl) {
            sourceStatusEl.textContent = "No pictogram seeded";
            sourceStatusEl.className = "font-mono text-[0.7rem] text-vespera-silent";
        }
    }
    function bindDropzoneListeners() {
        if (!dropzoneEl || !fileInput)
            return;
        dropzoneEl.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (event) => {
            const target = event.target;
            if (target.files && target.files.length > 0)
                handleFileSelection(target.files[0]);
        });
        dropzoneEl.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropzoneEl.classList.add("drag-over");
        });
        dropzoneEl.addEventListener("dragleave", () => dropzoneEl.classList.remove("drag-over"));
        dropzoneEl.addEventListener("drop", (event) => {
            event.preventDefault();
            dropzoneEl.classList.remove("drag-over");
            if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
                handleFileSelection(event.dataTransfer.files[0]);
            }
        });
        removeSourceBtn?.addEventListener("click", (event) => {
            event.stopPropagation();
            purgeSourceImage();
        });
    }
    function pauseAnimation() {
        state.isPlaying = false;
        if (state.animationTimer !== null) {
            clearInterval(state.animationTimer);
            state.animationTimer = null;
        }
        if (playPauseIcon)
            playPauseIcon.className = "fa-solid fa-play mr-1";
    }
    function playAnimation() {
        if (state.keyframes.length <= 1)
            return;
        state.isPlaying = true;
        if (playPauseIcon)
            playPauseIcon.className = "fa-solid fa-pause mr-1 text-vespera-goldbright";
        if (state.currentFrameIndex >= state.keyframes.length - 1)
            renderCanvasFrame(0);
        state.animationTimer = window.setInterval(() => {
            const nextIdx = state.currentFrameIndex + 1;
            if (nextIdx >= state.keyframes.length)
                pauseAnimation();
            else
                renderCanvasFrame(nextIdx);
        }, 120);
    }
    function togglePlayPause() {
        if (state.isPlaying)
            pauseAnimation();
        else
            playAnimation();
    }
    function toggleComparison() {
        if (!canvasContext || !canvas)
            return;
        state.isComparing = !state.isComparing;
        if (state.isComparing) {
            pauseAnimation();
            if (state.sourceImageElement) {
                canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                canvasContext.drawImage(state.sourceImageElement, 0, 0, canvas.width, canvas.height);
                if (compareBtn)
                    compareBtn.classList.add("bg-vespera-crimson", "text-vespera-parchment");
            }
        }
        else {
            renderCanvasFrame(state.currentFrameIndex);
            if (compareBtn)
                compareBtn.classList.remove("bg-vespera-crimson", "text-vespera-parchment");
        }
    }
    async function toggleFavoriteStatus() {
        if (!state.currentArtifact)
            return;
        const artifactId = state.currentArtifact.id_artifact;
        const apiUrl = toggleFavoriteApiUrl.replace("/artifact/0", `/artifact/${artifactId}`);
        const res = await (0, base_js_1.apiFetch)(apiUrl, { method: "POST" });
        if (res.success && res.data) {
            state.currentArtifact.is_favorite = res.data.is_favorite;
            if (favoriteBtn) {
                const starIcon = favoriteBtn.querySelector("i");
                if (starIcon) {
                    starIcon.className = (res.data.is_favorite ?
                        "fa-solid fa-star text-vespera-goldbright" :
                        "fa-regular fa-star");
                }
            }
        }
    }
    function bindCanvasControls() {
        playPauseButton?.addEventListener("click", togglePlayPause);
        scrubber?.addEventListener("input", () => {
            pauseAnimation();
            const frameIdx = parseInt(scrubber.value);
            renderCanvasFrame(frameIdx);
        });
        compareBtn?.addEventListener("click", toggleComparison);
        favoriteBtn?.addEventListener("click", toggleFavoriteStatus);
    }
    function renderCanvasFrame(index) {
        if (!canvas || !canvasContext || state.keyframes.length === 0)
            return;
        if (index < 0 || index >= state.keyframes.length)
            return;
        const frameImg = state.keyframes[index];
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        state.currentFrameIndex = index;
        if (scrubber)
            scrubber.value = index.toString();
        if (frameLabel)
            frameLabel.textContent = `Frame ${index + 1} / ${state.keyframes.length}`;
    }
    async function prepareKeyframePlayback(keyframesBase64) {
        emptyState?.classList.add("hidden");
        if (modeBadge) {
            modeBadge.textContent = "Synthesized";
            modeBadge.className = "vamp-badge vamp-badge-gold";
        }
        const loadedFrames = await Promise.all(keyframesBase64.map((src) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = src;
            });
        }));
        state.keyframes = loadedFrames;
        state.currentFrameIndex = 0;
        if (scrubber) {
            scrubber.max = (loadedFrames.length - 1).toString();
            scrubber.value = "0";
        }
        playbackPanel?.classList.remove("opacity-40", "pointer-events-none");
        playbackBadge?.classList.remove("hidden");
        renderCanvasFrame(0);
        playAnimation();
    }
    async function renderStaticArtifact(artifactHash) {
        emptyState?.classList.add("hidden");
        const img = new Image();
        img.onload = () => {
            if (!canvas || !canvasContext)
                return;
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            canvasContext.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = renderStaticApiUrl.replace("/hash/PLACEHOLDER", `/hash/${artifactHash}`);
    }
    function updateArtifactMetrics(artifact) {
        if (metricId)
            metricId.textContent = `#${artifact.id_artifact}`;
        if (metricTime)
            metricTime.textContent = `${artifact.execution_time_ms.toFixed(1)} ms`;
        if (metricHash) {
            metricHash.textContent = (0, base_js_1.truncateHash)(artifact.artifact_hash, 6);
            metricHash.title = artifact.artifact_hash;
        }
        if (downloadLink) {
            downloadLink.href = downloadApiUrl.replace("/hash/PLACEHOLDER", `/hash/${artifact.artifact_hash}`);
            downloadLink.download = `turing_pattern_${artifact.artifact_hash.substring(0, 8)}.png`;
        }
        if (favoriteBtn) {
            const starIcon = favoriteBtn.querySelector("i");
            if (starIcon) {
                starIcon.className = (artifact.is_favorite ?
                    "fa-solid fa-star text-vespera-goldbright" :
                    "fa-regular fa-star");
            }
        }
    }
    async function executeSynthesis() {
        const hasFile = !!state.sourceImageFile;
        const hasId = !!sourceIdInput?.value;
        if (!hasFile && !hasId) {
            window.showAlertModal({
                title: "Void Pictogram",
                message: "Supply a catalyst before invoking morphogenesis.",
                type: "warning"
            });
            return;
        }
        const formData = new FormData();
        if (state.sourceImageFile)
            formData.append("file", state.sourceImageFile);
        if (sourceIdInput?.value)
            formData.append("source_image_id", sourceIdInput.value);
        if (parentIdInput?.value)
            formData.append("parent_artifact_id", parentIdInput.value);
        formData.append("feed_rate", feedSlider?.value || defaultF);
        formData.append("kill_rate", killSlider?.value || defaultK);
        formData.append("diff_u", diffUSlider?.value || defaultDu);
        formData.append("diff_v", diffVSlider?.value || defaultDv);
        formData.append("iterations", iterSlider?.value || defaultIter);
        formData.append("dt", dtSlider?.value || defaultDt);
        formData.append("color_palette", paletteSelect?.value || defaultPalette);
        formData.append("user_notes", userNotesInput?.value || "");
        formData.append("capture_timeline", "true");
        try {
            pauseAnimation();
            canvasStageWrap?.classList.add("synthesizing");
            (0, base_js_1.showLoadingOverlay)({
                title: "Integrating Reaction-Diffusion Lattice",
                subtitle: "Evaluating 2D Laplacian field and non-linear morphogen kinetics..."
            });
            const res = await (0, base_js_1.apiFetch)(generateApiUrl, {
                method: "POST",
                body: formData
            });
            (0, base_js_1.hideLoadingOverlay)();
            canvasStageWrap?.classList.remove("synthesizing");
            if (!res.success || !res.data)
                return;
            state.currentArtifact = res.data;
            updateArtifactMetrics(res.data);
            if (res.data.keyframes && res.data.keyframes.length > 0) {
                await prepareKeyframePlayback(res.data.keyframes);
            }
            else {
                await renderStaticArtifact(res.data.artifact_hash);
            }
        }
        catch (error) {
            (0, base_js_1.hideLoadingOverlay)();
            canvasStageWrap?.classList.remove("synthesizing");
            window.showAlertModal?.({
                title: "Synthesis Ruptured",
                message: error?.message || "An unexpected alchemical disruption collapsed the morphogenesis.",
                type: "danger"
            });
        }
    }
    synthesizeBtn?.addEventListener("click", executeSynthesis);
    async function initStudio() {
        await loadPaletteCatalog();
        bindSliderDisplays();
        bindDropzoneListeners();
        bindCanvasControls();
    }
    initStudio().then();
});
