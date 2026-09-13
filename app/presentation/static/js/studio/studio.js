import { apiFetch, hideLoadingOverlay, showLoadingOverlay, truncateHash } from "../base.js";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("studio-main-container");
    if (!mainContainer)
        return;
    const generateApiUrl = mainContainer.dataset.generateApiUrl || "";
    const commitApiUrl = mainContainer.dataset.commitApiUrl || "";
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
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
    const feedInput = document.getElementById("feed-rate-input");
    const killSlider = document.getElementById("kill-rate-slider");
    const killInput = document.getElementById("kill-rate-input");
    const diffUSlider = document.getElementById("diff-u-slider");
    const diffUInput = document.getElementById("diff-u-input");
    const diffVSlider = document.getElementById("diff-v-slider");
    const diffVInput = document.getElementById("diff-v-input");
    const iterSlider = document.getElementById("iterations-slider");
    const iterInput = document.getElementById("iterations-input");
    const dtSlider = document.getElementById("dt-slider");
    const dtInput = document.getElementById("dt-input");
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
    const commitContainer = document.getElementById("commit-container");
    const commitBtn = document.getElementById("commit-btn");
    const resetParamsBtn = document.getElementById("reset-params-btn");
    const downloadLink = document.getElementById("download-artifact-link");
    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
    const defaultF = "0.0545";
    const defaultK = "0.0620";
    const defaultDu = "1.000";
    const defaultDv = "0.500";
    const defaultIter = "12000";
    const defaultDt = "1.00";
    const defaultPalette = "crimson_eclipse";
    function setDefaultState() {
        return {
            currentArtifactHash: null,
            currentExecutionTime: 0,
            sourceImageFile: null,
            sourceImageDataUrl: null,
            sourceImageElement: null,
            grayScaleFrames: [],
            rawKeyframeBuffers: [],
            currentFrameIndex: 0,
            isPlaying: false,
            animationTimer: null,
            isComparing: false,
            paletteCatalog: [],
            activeLut: null,
        };
    }
    const state = setDefaultState();
    function syncControlPair(slider, numInput, precision) {
        if (!slider || !numInput)
            return;
        slider.addEventListener("input", () => {
            numInput.value = parseFloat(slider.value).toFixed(precision);
        });
        numInput.addEventListener("input", () => {
            const parsed = parseFloat(numInput.value);
            if (!isNaN(parsed)) {
                const minVal = parseFloat(slider.min);
                const maxVal = parseFloat(slider.max);
                const clamped = Math.max(minVal, Math.min(maxVal, parsed));
                slider.value = clamped.toString();
            }
        });
        numInput.addEventListener("blur", () => {
            const parsed = parseFloat(numInput.value);
            if (isNaN(parsed)) {
                numInput.value = parseFloat(slider.value).toFixed(precision);
            }
            else {
                const minVal = parseFloat(slider.min);
                const maxVal = parseFloat(slider.max);
                const clamped = Math.max(minVal, Math.min(maxVal, parsed));
                numInput.value = clamped.toFixed(precision);
                slider.value = clamped.toString();
            }
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
        if (feedInput)
            feedInput.value = defaultF;
        if (killInput)
            killInput.value = defaultK;
        if (diffUInput)
            diffUInput.value = defaultDu;
        if (diffVInput)
            diffVInput.value = defaultDv;
        if (iterInput)
            iterInput.value = defaultIter;
        if (dtInput)
            dtInput.value = defaultDt;
    }
    function buildPaletteLut(stops) {
        const lut = new Uint8ClampedArray(256 * 3);
        const sortedStops = [...stops].sort((a, b) => a.stop_position - b.stop_position);
        for (let i = 0; i < 256; ++i) {
            const t = i / 255.0;
            let lower = sortedStops[0];
            let upper = sortedStops[sortedStops.length - 1];
            for (let s = 0; s < sortedStops.length - 1; ++s) {
                if (t >= sortedStops[s].stop_position && t <= sortedStops[s + 1].stop_position) {
                    lower = sortedStops[s];
                    upper = sortedStops[s + 1];
                    break;
                }
            }
            const range = upper.stop_position - lower.stop_position;
            const factor = range === 0 ? 0 : (t - lower.stop_position) / range;
            lut[i * 3] = Math.round(lower.r + (upper.r - lower.r) * factor);
            lut[i * 3 + 1] = Math.round(lower.g + (upper.g - lower.g) * factor);
            lut[i * 3 + 2] = Math.round(lower.b + (upper.b - lower.b) * factor);
        }
        return lut;
    }
    function applyShaderToFrame(index) {
        if (!canvas || !canvasContext || !offscreenCtx || state.grayScaleFrames.length === 0)
            return;
        if (index < 0 || index >= state.grayScaleFrames.length)
            return;
        const img = state.grayScaleFrames[index];
        if (offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
            offscreenCanvas.width = canvas.width;
            offscreenCanvas.height = canvas.height;
        }
        if (!state.activeLut) {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            canvasContext.drawImage(img, 0, 0, canvas.width, canvas.height);
            return;
        }
        offscreenCtx.clearRect(0, 0, canvas.width, canvas.height);
        offscreenCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const lut = state.activeLut;
        for (let p = 0; p < data.length; p += 4) {
            const gray = data[p];
            data[p] = lut[gray * 3];
            data[p + 1] = lut[gray * 3 + 1];
            data[p + 2] = lut[gray * 3 + 2];
        }
        canvasContext.putImageData(imgData, 0, 0);
        state.currentFrameIndex = index;
        if (scrubber)
            scrubber.value = index.toString();
        if (frameLabel)
            frameLabel.textContent = `Frame ${index + 1} / ${state.grayScaleFrames.length}`;
    }
    async function loadPaletteCatalog() {
        if (!paletteSelect)
            return;
        const res = await apiFetch(palettesApiUrl);
        if (!res.success || !Array.isArray(res.data))
            return;
        state.paletteCatalog = res.data;
        paletteSelect.innerHTML = "";
        res.data.forEach((pal) => {
            const opt = document.createElement("option");
            opt.value = pal.id_palette.toString();
            opt.textContent = pal.display_name;
            if (pal.name === "crimson_eclipse") {
                opt.selected = true;
                state.activeLut = buildPaletteLut(pal.stops);
            }
            paletteSelect.appendChild(opt);
        });
        paletteSelect.addEventListener("change", () => {
            const selectedId = parseInt(paletteSelect.value);
            const pal = state.paletteCatalog.find(p => p.id_palette === selectedId);
            if (pal) {
                state.activeLut = buildPaletteLut(pal.stops);
                if (state.grayScaleFrames.length > 0 && !state.isComparing) {
                    applyShaderToFrame(state.currentFrameIndex);
                }
            }
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
        if (state.grayScaleFrames.length <= 1)
            return;
        state.isPlaying = true;
        if (playPauseIcon)
            playPauseIcon.className = "fa-solid fa-pause mr-1 text-vespera-silverBright";
        if (state.currentFrameIndex >= state.grayScaleFrames.length - 1)
            applyShaderToFrame(0);
        state.animationTimer = window.setInterval(() => {
            const nextIdx = state.currentFrameIndex + 1;
            if (nextIdx >= state.grayScaleFrames.length)
                pauseAnimation();
            else
                applyShaderToFrame(nextIdx);
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
            applyShaderToFrame(state.currentFrameIndex);
            if (compareBtn)
                compareBtn.classList.remove("bg-vespera-crimson", "text-vespera-parchment");
        }
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
                sourceStatusEl.className = "font-mono text-[0.7rem] text-vespera-silverBright";
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
        formData.append("id_palette", paletteSelect?.value || "1");
        formData.append("user_notes", userNotesInput?.value || "");
        formData.append("capture_timeline", "true");
        try {
            pauseAnimation();
            canvasStageWrap?.classList.add("synthesizing");
            showLoadingOverlay({
                title: "Integrating Reaction-Diffusion Lattice",
                subtitle: "Evaluating 2D Laplacian field and non-linear morphogen kinetics..."
            });
            const res = await apiFetch(generateApiUrl, {
                method: "POST",
                body: formData
            });
            hideLoadingOverlay();
            canvasStageWrap?.classList.remove("synthesizing");
            if (!res.success || !res.data)
                return;
            state.currentArtifactHash = res.data.artifact_hash;
            state.currentExecutionTime = res.data.execution_time;
            if (metricTime)
                metricTime.textContent = `${res.data.execution_time.toFixed(6)} s`;
            if (metricHash) {
                metricHash.textContent = truncateHash(res.data.artifact_hash, 6);
                metricHash.title = res.data.artifact_hash;
            }
            if (res.data.keyframes && res.data.keyframes.length > 0) {
                emptyState?.classList.add("hidden");
                if (modeBadge) {
                    modeBadge.textContent = "Simulated";
                    modeBadge.className = "vamp-badge vamp-badge-silver";
                }
                state.grayScaleFrames = await Promise.all(res.data.keyframes.map((b64) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = b64;
                    });
                }));
                if (scrubber) {
                    scrubber.max = (state.grayScaleFrames.length - 1).toString();
                    scrubber.value = "0";
                }
                playbackPanel?.classList.remove("opacity-40", "pointer-events-none");
                playbackBadge?.classList.remove("hidden");
                commitContainer?.classList.remove("hidden");
                applyShaderToFrame(0);
                playAnimation();
            }
        }
        catch (error) {
            hideLoadingOverlay();
            canvasStageWrap?.classList.remove("synthesizing");
            window.showAlertModal?.({
                title: "Synthesis Ruptured",
                message: "An unexpected alchemical disruption collapsed the morphogenesis.",
                type: "danger"
            });
        }
    }
    synthesizeBtn?.addEventListener("click", executeSynthesis);
    async function commitArtifact() {
        if (!state.currentArtifactHash)
            return;
        showLoadingOverlay({
            title: "Sealing Pattern into The Vault",
            subtitle: "Persisting morphogentic artifact, parameters and animation frames..."
        });
        const payload = {
            artifact_hash: state.currentArtifactHash,
            id_palette: paletteSelect?.value ? parseInt(paletteSelect.value) : 1,
            user_notes: userNotesInput?.value || ""
        };
        const res = await apiFetch(commitApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        hideLoadingOverlay();
        if (!res.success || !res.data) {
            window.showAlertModal?.({
                title: "Commit Failed",
                message: "An unexpected alchemical disruption prevented the pattern from being sealed.",
                type: "danger"
            });
            return;
        }
        if (metricId)
            metricId.textContent = `#${res.data.id_artifact}`;
        if (modeBadge) {
            modeBadge.textContent = "Sealed";
            modeBadge.className = "vamp-badge vamp-badge-crimson";
        }
        if (downloadLink) {
            downloadLink.href = downloadApiUrl.replace("/hash/PLACEHOLDER", `/hash/${res.data.artifact_hash}`);
            downloadLink.download = `vespera_artifact_${res.data.artifact_hash.substring(0, 8)}.png`;
        }
        commitContainer?.classList.add("hidden");
        window.showAlertModal?.({
            title: "Artifact Bound",
            message: `The pattern has been sealed into The Vault under Rune #${res.data.id_artifact}.`,
            type: "success"
        });
    }
    function bindEvents() {
        syncControlPair(feedSlider, feedInput, 4);
        syncControlPair(killSlider, killInput, 4);
        syncControlPair(diffUSlider, diffUInput, 3);
        syncControlPair(diffVSlider, diffVInput, 3);
        syncControlPair(iterSlider, iterInput, 0);
        syncControlPair(dtSlider, dtInput, 2);
        resetParamsBtn?.addEventListener("click", resetFormula);
        dropzoneEl?.addEventListener("click", () => fileInput?.click());
        fileInput?.addEventListener("change", (event) => {
            const target = event.target;
            if (target.files && target.files.length > 0)
                handleFileSelection(target.files[0]);
        });
        dropzoneEl?.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropzoneEl.classList.add("drag-over");
        });
        dropzoneEl?.addEventListener("dragleave", () => dropzoneEl.classList.remove("drag-over"));
        dropzoneEl?.addEventListener("drop", (event) => {
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
        playPauseButton?.addEventListener("click", togglePlayPause);
        scrubber?.addEventListener("input", () => {
            pauseAnimation();
            applyShaderToFrame(parseInt(scrubber.value));
        });
        compareBtn?.addEventListener("click", toggleComparison);
        synthesizeBtn?.addEventListener("click", executeSynthesis);
        commitBtn?.addEventListener("click", commitArtifact);
    }
    async function initStudio() {
        await loadPaletteCatalog();
        bindEvents();
    }
    initStudio().then();
});
