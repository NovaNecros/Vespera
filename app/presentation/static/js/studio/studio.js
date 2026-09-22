import { apiFetch, hideLoadingOverlay, showLoadingOverlay, truncateHash, buildPaletteLut } from "../base.js";
import { ScryingMirror } from "../partials/scrying_mirror.js";
document.addEventListener("DOMContentLoaded", () => {
    const mainContainer = document.getElementById("studio-main-container");
    if (!mainContainer)
        return;
    const generateApiUrl = mainContainer.dataset.generateApiUrl || "";
    const commitApiUrl = mainContainer.dataset.commitApiUrl || "";
    const palettesApiUrl = mainContainer.dataset.palettesApiUrl || "";
    const hydrateApiUrl = mainContainer.dataset.hydrateApiUrl || "";
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
    const mirror = new ScryingMirror();
    const modeBadge = document.getElementById("canvas-mode-badge");
    const metricId = document.getElementById("metric-id");
    const metricTime = document.getElementById("metric-time");
    const metricHash = document.getElementById("metric-hash");
    const synthesizeBtn = document.getElementById("synthesize-btn");
    const commitContainer = document.getElementById("commit-container");
    const commitBtn = document.getElementById("commit-btn");
    const resetParamsBtn = document.getElementById("reset-params-btn");
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
        if (paletteSelect) {
            const defaultPal = state.paletteCatalog.find((p) => p.name === defaultPalette);
            paletteSelect.value = defaultPal ? defaultPal.id_palette.toString() : "1";
            if (defaultPal)
                state.activeLut = buildPaletteLut(defaultPal.stops);
            mirror.setPaletteLut(state.activeLut);
        }
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
            const pal = state.paletteCatalog.find((p) => p.id_palette === selectedId);
            if (pal) {
                state.activeLut = buildPaletteLut(pal.stops);
                mirror.setPaletteLut(state.activeLut);
            }
        });
    }
    async function checkUrlHydrationTarget() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const loadId = urlParams.get("load");
            if (!loadId)
                return;
            showLoadingOverlay({
                title: "Summoning Ancient Formula from The Vault",
                subtitle: `Reconstructing alchemical conditions for Artifact #${loadId}`
            });
            const apiUrl = hydrateApiUrl.replace("/artifact/0", `/artifact/${loadId}`);
            const res = await apiFetch(apiUrl);
            if (!res.success || !res.data)
                return;
            const bundle = res.data;
            const cfg = bundle.config;
            if (cfg) {
                if (feedSlider)
                    feedSlider.value = cfg.feed_rate.toFixed(4);
                if (killSlider)
                    killSlider.value = cfg.kill_rate.toFixed(4);
                if (diffUSlider)
                    diffUSlider.value = cfg.diff_u.toFixed(3);
                if (diffVSlider)
                    diffVSlider.value = cfg.diff_v.toFixed(3);
                if (iterSlider)
                    iterSlider.value = cfg.iterations.toString();
                if (dtSlider)
                    dtSlider.value = cfg.dt.toFixed(2);
                if (feedInput)
                    feedInput.value = cfg.feed_rate.toFixed(4);
                if (killInput)
                    killInput.value = cfg.kill_rate.toFixed(4);
                if (diffUInput)
                    diffUInput.value = cfg.diff_u.toFixed(3);
                if (diffVInput)
                    diffVInput.value = cfg.diff_v.toFixed(3);
                if (iterInput)
                    iterInput.value = cfg.iterations.toString();
                if (dtInput)
                    dtInput.value = cfg.dt.toFixed(2);
                const targetPaletteId = bundle.selected_palette?.id_palette || cfg.id_palette;
                if (paletteSelect && targetPaletteId) {
                    paletteSelect.value = targetPaletteId.toString();
                    const pal = state.paletteCatalog.find((p) => p.id_palette === targetPaletteId);
                    if (pal)
                        state.activeLut = buildPaletteLut(pal.stops);
                }
            }
            if (parentIdInput)
                parentIdInput.value = bundle.id_artifact.toString();
            if (userNotesInput)
                userNotesInput.value = bundle.user_notes || "";
            const srcImg = bundle.source_image;
            if (srcImg) {
                if (sourceIdInput)
                    sourceIdInput.value = srcImg.id_source_image.toString();
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    state.sourceImageElement = img;
                    if (previewImg)
                        previewImg.src = img.src;
                    dropzonePrompt?.classList.add("hidden");
                    previewCont?.classList.remove("hidden");
                    previewCont?.classList.add("flex");
                    if (filenameLabel)
                        filenameLabel.textContent = srcImg.alias;
                    if (sourceStatusEl) {
                        sourceStatusEl.textContent = `Branched from Catalyst #${srcImg.id_source_image}`;
                        sourceStatusEl.className = "font-mono text-[0.7rem] text-vespera-silverBright";
                    }
                    synthesizeBtn?.classList.remove("hidden");
                };
                img.src = srcImg.stream_url;
            }
            if (bundle.frames && bundle.frames.length > 0) {
                if (modeBadge) {
                    modeBadge.textContent = "Rehydrated";
                    modeBadge.className = "vamp-badge vamp-badge-silver";
                }
                state.currentArtifactHash = bundle.artifact_hash;
                await mirror.loadFrames(bundle.frames);
                mirror.play();
            }
        }
        catch (error) {
            return console.error(error);
        }
        finally {
            hideLoadingOverlay();
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
            img.onload = () => {
                state.sourceImageElement = img;
                mirror.setCatalyst(img);
            };
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
            synthesizeBtn?.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }
    function purgeSourceImage() {
        state.sourceImageFile = null;
        state.sourceImageDataUrl = null;
        state.sourceImageElement = null;
        mirror.setCatalyst(null);
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
            sourceStatusEl.className = "font-mono text-[0.7rem] text-vespera-boneSilent";
        }
        synthesizeBtn?.classList.add("hidden");
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
            mirror.pause();
            mirror.setSynthesizing(true);
            showLoadingOverlay({
                title: "Integrating Reaction-Diffusion Lattice",
                subtitle: "Evaluating 2D Laplacian field and non-linear morphogen kinetics..."
            });
            const res = await apiFetch(generateApiUrl, {
                method: "POST",
                body: formData
            });
            mirror.setSynthesizing(false);
            hideLoadingOverlay();
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
                if (modeBadge) {
                    modeBadge.textContent = "Simulated";
                    modeBadge.className = "vamp-badge vamp-badge-silver";
                }
                commitContainer?.classList.remove("hidden");
                await mirror.loadFrames(res.data.keyframes);
                mirror.play();
            }
        }
        catch (error) {
            hideLoadingOverlay();
            mirror.setSynthesizing(false);
            window.showAlertModal?.({
                title: "Synthesis Ruptured",
                message: "An unexpected alchemical disruption collapsed the morphogenesis.",
                type: "danger"
            });
        }
    }
    async function commitArtifact(alias) {
        if (!state.currentArtifactHash)
            return;
        showLoadingOverlay({
            title: "Sealing Pattern into The Vault",
            subtitle: "Persisting morphogentic artifact, parameters and animation frames..."
        });
        const payload = {
            artifact_hash: state.currentArtifactHash,
            alias: alias,
            parent_artifact_id: parentIdInput?.value ? parseInt(parentIdInput.value) : null,
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
            modeBadge.className = "vamp-badge vamp-badge-crimson-dark";
        }
        commitContainer?.classList.add("hidden");
        window.showAlertModal?.({
            title: "Artifact Bound",
            message: `The pattern has been sealed into The Vault under the inscription ${res.data.alias}.`,
            type: "success"
        });
    }
    function promptArtifactAlias() {
        window.showAlertModal({
            title: "Seal into The Vault",
            message: "Inscribe a sacred alias for your creation if you so desire.",
            type: "info",
            icon: "fa-feather",
            showInput: true,
            inputLabel: "Pattern Alias",
            inputPlaceholder: "If left empty, a default alias will be generated. You can change it later, love.",
            inputValue: "",
            confirmText: "Seal Artifact",
            cancelText: "Cancel",
            onConfirm: (chosenAlias) => { commitArtifact(chosenAlias || "").then(); }
        });
    }
    function bindListeners() {
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
        synthesizeBtn?.addEventListener("click", executeSynthesis);
        commitBtn?.addEventListener("click", promptArtifactAlias);
    }
    async function initStudio() {
        await loadPaletteCatalog();
        bindListeners();
        await checkUrlHydrationTarget();
    }
    initStudio().then();
});
