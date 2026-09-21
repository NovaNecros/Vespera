// Vespera/app/presentation/static/ts/studio/studio.ts

import {
    APIResponse,
    SynthesisArtifact, ColorPalette,
    HydrationBundle, HydrationConfig, HydrationSourceImage
} from "../types.js";
import {
    apiFetch,
    hideLoadingOverlay,
    showLoadingOverlay,
    truncateHash,
    buildPaletteLut
} from "../base.js";

// Interfaces
interface StudioState
{
    currentArtifactHash  : string            | null;
    currentExecutionTime : number;
    sourceImageFile      : File              | null;
    sourceImageDataUrl   : string            | null;
    sourceImageElement   : HTMLImageElement  | null;
    grayScaleFrames      : HTMLImageElement[];
    rawKeyframeBuffers   : ImageData[];
    currentFrameIndex    : number;
    isPlaying            : boolean;
    animationTimer       : number            | null;
    isComparing          : boolean;
    paletteCatalog       : ColorPalette[];
    activeLut            : Uint8ClampedArray | null;
}

document.addEventListener("DOMContentLoaded", () : void =>
{
    // --- VARIABLES ---
    const mainContainer : HTMLElement | null = document.getElementById("studio-main-container");
    if(!mainContainer) return;

    // URLs
    const generateApiUrl       : string = mainContainer.dataset.generateApiUrl       || "";
    const commitApiUrl         : string = mainContainer.dataset.commitApiUrl         || "";
    const palettesApiUrl       : string = mainContainer.dataset.palettesApiUrl       || "";
    const hydrateApiUrl        : string = mainContainer.dataset.hydrateApiUrl        || "";

    // FORM
    const dropzoneEl      : HTMLElement       | null = document.getElementById("dropzone-container");
    const fileInput       : HTMLInputElement  | null = document.getElementById("source-file-input")        as HTMLInputElement;
    const sourceIdInput   : HTMLInputElement  | null = document.getElementById("source-image-id-input")    as HTMLInputElement;
    const parentIdInput   : HTMLInputElement  | null = document.getElementById("parent-artifact-id-input") as HTMLInputElement;
    const dropzonePrompt  : HTMLElement       | null = document.getElementById("dropzone-prompt");
    const previewCont     : HTMLElement       | null = document.getElementById("dropzone-preview-container");
    const previewImg      : HTMLImageElement  | null = document.getElementById("source-preview-img")       as HTMLImageElement;
    const filenameLabel   : HTMLElement       | null = document.getElementById("source-filename-label");
    const removeSourceBtn : HTMLButtonElement | null = document.getElementById("remove-source-btn")        as HTMLButtonElement;
    const sourceStatusEl  : HTMLElement       | null = document.getElementById("source-image-status");

    // PARAMETERS
    const feedSlider      : HTMLInputElement  | null = document.getElementById("feed-rate-slider")         as HTMLInputElement;
    const feedInput       : HTMLInputElement  | null = document.getElementById("feed-rate-input")          as HTMLInputElement;
    const killSlider      : HTMLInputElement  | null = document.getElementById("kill-rate-slider")         as HTMLInputElement;
    const killInput       : HTMLInputElement  | null = document.getElementById("kill-rate-input")          as HTMLInputElement;
    const diffUSlider     : HTMLInputElement  | null = document.getElementById("diff-u-slider")            as HTMLInputElement;
    const diffUInput      : HTMLInputElement  | null = document.getElementById("diff-u-input")             as HTMLInputElement;
    const diffVSlider     : HTMLInputElement  | null = document.getElementById("diff-v-slider")            as HTMLInputElement;
    const diffVInput      : HTMLInputElement  | null = document.getElementById("diff-v-input")             as HTMLInputElement;
    const iterSlider      : HTMLInputElement  | null = document.getElementById("iterations-slider")        as HTMLInputElement;
    const iterInput       : HTMLInputElement  | null = document.getElementById("iterations-input")         as HTMLInputElement;
    const dtSlider        : HTMLInputElement  | null = document.getElementById("dt-slider")                as HTMLInputElement;
    const dtInput         : HTMLInputElement  | null = document.getElementById("dt-input")                 as HTMLInputElement;
    const paletteSelect   : HTMLSelectElement | null = document.getElementById("palette-select")           as HTMLSelectElement;
    const userNotesInput  : HTMLTextAreaElement | null = document.getElementById("user-notes-input")       as HTMLTextAreaElement;

    // CANVAS
    const canvasStageWrap : HTMLElement       | null = document.getElementById("canvas-stage-wrapper");
    const canvas          : HTMLCanvasElement | null = document.getElementById("synthesis-canvas")         as HTMLCanvasElement;
    const emptyState      : HTMLElement       | null = document.getElementById("canvas-empty-state");
    const modeBadge       : HTMLElement       | null = document.getElementById("canvas-mode-badge");
    const playbackBadge   : HTMLElement       | null = document.getElementById("canvas-playback-badge");
    const frameLabel      : HTMLElement       | null = document.getElementById("playback-frame-label");
    const playbackPanel   : HTMLElement       | null = document.getElementById("playback-controls-panel");
    const playPauseButton : HTMLButtonElement | null = document.getElementById("play-pause-btn")           as HTMLButtonElement;
    const playPauseIcon   : HTMLElement       | null = document.getElementById("play-pause-icon");
    const scrubber        : HTMLInputElement  | null = document.getElementById("timeline-scrubber")        as HTMLInputElement;
    const compareBtn      : HTMLButtonElement | null = document.getElementById("toggle-view-original-btn") as HTMLButtonElement;
    const canvasContext   : CanvasRenderingContext2D | null = canvas ? canvas.getContext("2d") : null;

    // METRICS
    const metricId        : HTMLElement       | null = document.getElementById("metric-id");
    const metricTime      : HTMLElement       | null = document.getElementById("metric-time");
    const metricHash      : HTMLElement       | null = document.getElementById("metric-hash");

    // ACTIONS
    const synthesizeBtn   : HTMLButtonElement | null = document.getElementById("synthesize-btn")           as HTMLButtonElement;
    const commitContainer : HTMLElement       | null = document.getElementById("commit-container");
    const commitBtn       : HTMLButtonElement | null = document.getElementById("commit-btn")               as HTMLButtonElement;
    const resetParamsBtn  : HTMLButtonElement | null = document.getElementById("reset-params-btn")         as HTMLButtonElement;

    // HIDDEN CANVAS FOR PALETTE SWITCHING
    const offscreenCanvas : HTMLCanvasElement = document.createElement("canvas");
    const offscreenCtx    : CanvasRenderingContext2D | null = offscreenCanvas.getContext("2d", { willReadFrequently : true});

    // DEFAULT PARAMETERS
    const defaultF       = "0.0545";
    const defaultK       = "0.0620";
    const defaultDu      = "1.000";
    const defaultDv      = "0.500";
    const defaultIter    = "12000";
    const defaultDt      = "1.00";
    const defaultPalette = "crimson_eclipse";


    // --- FUNCTIONS ---
    // APPLICATION STATE
    function setDefaultState() : StudioState
    {
        return {
            currentArtifactHash  : null,
            currentExecutionTime : 0,
            sourceImageFile      : null,
            sourceImageDataUrl   : null,
            sourceImageElement   : null,
            grayScaleFrames      : [],
            rawKeyframeBuffers   : [],
            currentFrameIndex    : 0,
            isPlaying            : false,
            animationTimer       : null,
            isComparing          : false,
            paletteCatalog       : [],
            activeLut            : null,
        };
    }
    const state : StudioState = setDefaultState();

    function syncControlPair(
        slider     : HTMLInputElement | null,
        numInput   : HTMLInputElement | null,
        precision  : number
    ) : void
    {
        if(!slider || !numInput) return;

        // Slider -> Input
        slider.addEventListener("input", () =>
        {
            numInput.value = parseFloat(slider.value).toFixed(precision);
        });

        // Input -> Slider
        numInput.addEventListener("input", () =>
        {
            const parsed : number = parseFloat(numInput.value);
            if(!isNaN(parsed))
            {
                const minVal  : number = parseFloat(slider.min);
                const maxVal  : number = parseFloat(slider.max);
                const clamped : number = Math.max(minVal, Math.min(maxVal, parsed));
                slider.value           = clamped.toString();
            }
        });

        numInput.addEventListener("blur", () =>
        {
            const parsed : number = parseFloat(numInput.value);
            if(isNaN(parsed))
            {
                numInput.value = parseFloat(slider.value).toFixed(precision);
            }
            else
            {
                const minVal  : number = parseFloat(slider.min);
                const maxVal  : number = parseFloat(slider.max);
                const clamped : number = Math.max(minVal, Math.min(maxVal, parsed));
                numInput.value = clamped.toFixed(precision);
                slider.value   = clamped.toString();
            }
        });
    }

    function resetFormula() : void
    {
        if(feedSlider)     feedSlider.value         = defaultF;
        if(killSlider)     killSlider.value         = defaultK;
        if(diffUSlider)    diffUSlider.value        = defaultDu;
        if(diffVSlider)    diffVSlider.value        = defaultDv;
        if(iterSlider)     iterSlider.value         = defaultIter;
        if(dtSlider)       dtSlider.value           = defaultDt;
        if(userNotesInput) userNotesInput.value     = "";

        if(feedInput)      feedInput.value          = defaultF;
        if(killInput)      killInput.value          = defaultK;
        if(diffUInput)     diffUInput.value         = defaultDu;
        if(diffVInput)     diffVInput.value         = defaultDv;
        if(iterInput)      iterInput.value          = defaultIter;
        if(dtInput)        dtInput.value            = defaultDt;

        if(paletteSelect)
        {
            const defaultPal : ColorPalette | undefined = state.paletteCatalog.find((p : ColorPalette) => p.name === defaultPalette);
            paletteSelect.value = defaultPal ? defaultPal.id_palette.toString() : "1";
            if(defaultPal) state.activeLut = buildPaletteLut(defaultPal.stops);
        }
    }

    // Coloring
    function applyShaderToFrame(index : number) : void
    {
        if(!canvas || !canvasContext || !offscreenCtx || state.grayScaleFrames.length === 0) return;
        if(index < 0 || index >= state.grayScaleFrames.length) return;

        const img : HTMLImageElement = state.grayScaleFrames[index];

        if(offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height)
        {
            offscreenCanvas.width  = canvas.width;
            offscreenCanvas.height = canvas.height;
        }

        if(!state.activeLut)
        {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            canvasContext.drawImage(img, 0, 0, canvas.width, canvas.height);
            return;
        }

        offscreenCtx.clearRect(0, 0, canvas.width, canvas.height);
        offscreenCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData : ImageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data    : Uint8ClampedArray = imgData.data;
        const lut     : Uint8ClampedArray = state.activeLut;

        for(let p : number = 0; p < data.length; p += 4)
        {
            const gray : number = data[p];
            data[p]     = lut[gray*3];
            data[p + 1] = lut[gray*3 + 1];
            data[p + 2] = lut[gray*3 + 2];
        }

        canvasContext.putImageData(imgData, 0, 0);
        state.currentFrameIndex = index;
        if(scrubber) scrubber.value = index.toString();
        if(frameLabel) frameLabel.textContent = `Frame ${index + 1} / ${state.grayScaleFrames.length}`;
    }

    async function loadPaletteCatalog() : Promise<void>
    {
        if(!paletteSelect) return;

        const res : APIResponse<ColorPalette[]> = await apiFetch<ColorPalette[]>(palettesApiUrl);
        if(!res.success || !Array.isArray(res.data)) return;

        state.paletteCatalog    = res.data;
        paletteSelect.innerHTML = "";

        res.data.forEach((pal : ColorPalette) =>
        {
            const opt : HTMLOptionElement = document.createElement("option");
            opt.value       = pal.id_palette.toString();
            opt.textContent = pal.display_name;
            if(pal.name === "crimson_eclipse")
            {
                opt.selected    = true;
                state.activeLut = buildPaletteLut(pal.stops);
            }
            paletteSelect.appendChild(opt);
        });

        paletteSelect.addEventListener("change", () : void =>
        {
            const selectedId : number = parseInt(paletteSelect.value);
            const pal : ColorPalette | undefined = state.paletteCatalog.find((p : ColorPalette) => p.id_palette === selectedId);
            if(pal)
            {
                state.activeLut = buildPaletteLut(pal.stops);
                if(state.grayScaleFrames.length > 0 && !state.isComparing)
                {
                    applyShaderToFrame(state.currentFrameIndex);
                }
            }
        });
    }

    // POPULATE STUDIO
    async function checkUrlHydrationTarget() : Promise<void>
    {
        try
        {
            const urlParams : URLSearchParams = new URLSearchParams(window.location.search);
            const loadId    : string | null   = urlParams.get("load");

            if(!loadId) return;

            showLoadingOverlay({
                title    : "Summoning Ancient Formula from The Vault",
                subtitle : `Reconstructing alchemical conditions for Artifact #${loadId}`
            });

            const apiUrl : string      = hydrateApiUrl.replace("/artifact/0", `/artifact/${loadId}`);
            const res    : APIResponse<HydrationBundle> = await apiFetch<HydrationBundle>(apiUrl);

            if(!res.success || !res.data) return;

            const bundle : HydrationBundle | null = res.data;

            const cfg : HydrationConfig | null = bundle.config;
            if(cfg)
            {
                if(feedSlider)  feedSlider.value  = cfg.feed_rate.toFixed(4);
                if(killSlider)  killSlider.value  = cfg.kill_rate.toFixed(4);
                if(diffUSlider) diffUSlider.value = cfg.diff_u.toFixed(3);
                if(diffVSlider) diffVSlider.value = cfg.diff_v.toFixed(3);
                if(iterSlider)  iterSlider.value  = cfg.iterations.toString();
                if(dtSlider)    dtSlider.value    = cfg.dt.toFixed(2);

                if(feedInput)   feedInput.value   = cfg.feed_rate.toFixed(4);
                if(killInput)   killInput.value   = cfg.kill_rate.toFixed(4);
                if(diffUInput)  diffUInput.value  = cfg.diff_u.toFixed(3);
                if(diffVInput)  diffVInput.value  = cfg.diff_v.toFixed(3);
                if(iterInput)   iterInput.value   = cfg.iterations.toString();
                if(dtInput)     dtInput.value     = cfg.dt.toFixed(2);

                const targetPaletteId : number | undefined = bundle.selected_palette?.id_palette || cfg.id_palette;
                if(paletteSelect && targetPaletteId)
                {
                    paletteSelect.value = targetPaletteId.toString();
                    const pal : ColorPalette | undefined = state.paletteCatalog.find(
                        (p : ColorPalette) => p.id_palette === targetPaletteId);
                    if(pal) state.activeLut = buildPaletteLut(pal.stops);
                }
            }

            if(parentIdInput)  parentIdInput.value  = bundle.id_artifact.toString();
            if(userNotesInput) userNotesInput.value = bundle.user_notes || "";

            const srcImg : HydrationSourceImage | null = bundle.source_image;
            if(srcImg)
            {
                if(sourceIdInput) sourceIdInput.value = srcImg.id_source_image.toString();

                const img : HTMLImageElement = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () : void =>
                {
                    state.sourceImageElement      = img;
                    if(previewImg) previewImg.src = img.src;
                    dropzonePrompt?.classList.add("hidden");
                    previewCont?.classList.remove("hidden");
                    previewCont?.classList.add("flex");
                    if(filenameLabel) filenameLabel.textContent = srcImg.alias;
                    if(sourceStatusEl)
                    {
                        sourceStatusEl.textContent = `Branched from Catalyst #${srcImg.id_source_image}`;
                        sourceStatusEl.className   = "font-mono text-[0.7rem] text-vespera-silverBright";
                    }
                    synthesizeBtn?.classList.remove("hidden");
                };
                img.src = srcImg.stream_url;
            }

            if(bundle.frames && bundle.frames.length > 0)
            {
                emptyState?.classList.add("hidden");
                if(modeBadge)
                {
                    modeBadge.textContent = "Rehydrated";
                    modeBadge.className   = "vamp-badge vamp-badge-silver";
                }

                state.currentArtifactHash = bundle.artifact_hash;

                state.grayScaleFrames = await Promise.all(
                    bundle.frames.map((url : string) : Promise<HTMLImageElement> =>
                    {
                        return new Promise((resolve) : void =>
                        {
                           const frameImg : HTMLImageElement = new Image();
                           frameImg.crossOrigin = "anonymous";
                           frameImg.onload      = () : void => resolve(frameImg);
                           frameImg.src         = url;
                        });
                    })
                );

                if(scrubber)
                {
                    scrubber.max    = (state.grayScaleFrames.length - 1).toString();
                    scrubber.value  = "0";
                }

                playbackPanel?.classList.remove("opacity-40", "pointer-events-none");
                playbackBadge?.classList.remove("hidden");

                applyShaderToFrame(0);
                playAnimation();
            }
        }
        catch(error)
        {
            return console.error(error);
        }
        finally
        {
            hideLoadingOverlay();
        }
    }

    // VISUALIZATION
    function pauseAnimation() : void
    {
        state.isPlaying = false;
        if(state.animationTimer !== null)
        {
            clearInterval(state.animationTimer);
            state.animationTimer = null;
        }
        if(playPauseIcon) playPauseIcon.className = "fa-solid fa-play mr-1";
    }

    function playAnimation() : void
    {
        if(state.grayScaleFrames.length <= 1) return;
        state.isPlaying = true;

        if(playPauseIcon) playPauseIcon.className = "fa-solid fa-pause mr-1 text-vespera-silverBright";

        if(state.currentFrameIndex >= state.grayScaleFrames.length - 1) applyShaderToFrame(0);

        state.animationTimer = window.setInterval(() =>
        {
           const nextIdx : number = state.currentFrameIndex + 1;
           if(nextIdx >= state.grayScaleFrames.length) pauseAnimation();
           else applyShaderToFrame(nextIdx);
        }, 120);
    }

    function togglePlayPause() : void
    {
        if(state.isPlaying) pauseAnimation();
        else                playAnimation();
    }

    function toggleComparison() : void
    {
        if(!canvasContext || !canvas) return;
        state.isComparing = !state.isComparing;

        if(state.isComparing)
        {
            pauseAnimation();
            if(state.sourceImageElement)
            {
                canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                canvasContext.drawImage(state.sourceImageElement, 0, 0, canvas.width, canvas.height);
                if(compareBtn) compareBtn.classList.add("bg-vespera-crimson", "text-vespera-parchment");
            }
        }
        else
        {
            applyShaderToFrame(state.currentFrameIndex);
            if(compareBtn) compareBtn.classList.remove("bg-vespera-crimson", "text-vespera-parchment");
        }
    }

    // INPUT FILE
    function handleFileSelection(file : File) : void
    {
        if(!file.type.match(/image\/(png|jpeg|webp)$/))
        {
            (window as any).showAlertModal?.({
                title   : "Impure Vessel",
                message : "Only pristine pictograms may seed the morphogenetic reaction (PNG, JPEG, WebP).",
                type    : "danger"
            });
            return;
        }

        state.sourceImageFile = file;
        const reader : FileReader = new FileReader();

        reader.onload = (event : ProgressEvent<FileReader>) =>
        {
            const dataUrl : string = event.target?.result as string;
            state.sourceImageDataUrl = dataUrl;

            const img : HTMLImageElement = new Image();
            img.onload = () => { state.sourceImageElement = img; };
            img.src    = dataUrl;

            if(previewImg)    previewImg.src = dataUrl;
            if(filenameLabel) filenameLabel.textContent = file.name;

            dropzonePrompt?.classList.add("hidden");
            previewCont?.classList.remove("hidden");
            previewCont?.classList.add("flex");

            if(sourceStatusEl)
            {
                sourceStatusEl.textContent = "Catalyst Seeded";
                sourceStatusEl.className   = "font-mono text-[0.7rem] text-vespera-silverBright";
            }

            synthesizeBtn?.classList.remove("hidden");
        };

        reader.readAsDataURL(file);
    }

    function purgeSourceImage() : void
    {
        state.sourceImageFile    = null;
        state.sourceImageDataUrl = null;
        state.sourceImageElement = null;

        if(fileInput)     fileInput.value     = "";
        if(sourceIdInput) sourceIdInput.value = "";
        if(previewImg)    previewImg.src      = "";

        previewCont?.classList.add("hidden");
        previewCont?.classList.remove("flex");
        dropzonePrompt?.classList.remove("hidden");

        if(sourceStatusEl)
        {
            sourceStatusEl.textContent = "No pictogram seeded";
            sourceStatusEl.className   = "font-mono text-[0.7rem] text-vespera-boneSilent";
        }

        synthesizeBtn?.classList.add("hidden");
    }

    // SYNTHESIS & SAVE
    async function executeSynthesis() : Promise<void>
    {
        const hasFile : boolean = !!state.sourceImageFile;
        const hasId   : boolean = !!sourceIdInput?.value;

        if(!hasFile && !hasId)
        {
            (window as any).showAlertModal({
                title   : "Void Pictogram",
                message : "Supply a catalyst before invoking morphogenesis.",
                type    : "warning"
            });
            return;
        }

        const formData : FormData = new FormData();
        if(state.sourceImageFile) formData.append("file",             state.sourceImageFile);
        if(sourceIdInput?.value)  formData.append("source_image_id",    sourceIdInput.value);
        if(parentIdInput?.value)  formData.append("parent_artifact_id", parentIdInput.value);

        formData.append("feed_rate",   feedSlider?.value     ||    defaultF);
        formData.append("kill_rate",   killSlider?.value     ||    defaultK);
        formData.append("diff_u",      diffUSlider?.value    ||   defaultDu);
        formData.append("diff_v",      diffVSlider?.value    ||   defaultDv);
        formData.append("iterations",  iterSlider?.value     || defaultIter);
        formData.append("dt",          dtSlider?.value       ||   defaultDt);
        formData.append("id_palette",  paletteSelect?.value  ||         "1");
        formData.append("user_notes",  userNotesInput?.value ||          "");
        formData.append("capture_timeline", "true");

        try
        {
            pauseAnimation();
            canvasStageWrap?.classList.add("synthesizing");
            showLoadingOverlay({
                title     : "Integrating Reaction-Diffusion Lattice",
                subtitle  : "Evaluating 2D Laplacian field and non-linear morphogen kinetics..."
            });

            const res : APIResponse = await apiFetch(generateApiUrl,
            {
                method : "POST",
                body   : formData
            });

            hideLoadingOverlay();
            canvasStageWrap?.classList.remove("synthesizing");

            if(!res.success || !res.data) return;

            state.currentArtifactHash  = res.data.artifact_hash;
            state.currentExecutionTime = res.data.execution_time;

            if(metricTime) metricTime.textContent = `${res.data.execution_time.toFixed(6)} s`;
            if(metricHash)
            {
                metricHash.textContent = truncateHash(res.data.artifact_hash, 6);
                metricHash.title       = res.data.artifact_hash;
            }

            if(res.data.keyframes && res.data.keyframes.length > 0)
            {
                emptyState?.classList.add("hidden");
                if(modeBadge)
                {
                    modeBadge.textContent = "Simulated";
                    modeBadge.className   = "vamp-badge vamp-badge-silver";
                }

                state.grayScaleFrames = await Promise.all(
                    res.data.keyframes.map((b64 : string) : Promise<HTMLImageElement> =>
                    {
                        return new Promise((resolve) : void =>
                        {
                            const img : HTMLImageElement = new Image();
                            img.onload = () : void => resolve(img);
                            img.src    = b64;
                        });
                    })
                );

                if(scrubber)
                {
                    scrubber.max   = (state.grayScaleFrames.length - 1).toString();
                    scrubber.value = "0";
                }

                playbackPanel?.classList.remove("opacity-40", "pointer-events-none");
                playbackBadge?.classList.remove("hidden");
                commitContainer?.classList.remove("hidden");

                applyShaderToFrame(0);
                playAnimation();
            }
        }
        catch(error : any)
        {
            hideLoadingOverlay();
            canvasStageWrap?.classList.remove("synthesizing");
            (window as any).showAlertModal?.({
                title    : "Synthesis Ruptured",
                message  : "An unexpected alchemical disruption collapsed the morphogenesis.",
                type     : "danger"
            });
        }
    }

    async function commitArtifact(alias : string) : Promise<void>
    {
        if(!state.currentArtifactHash) return;

        showLoadingOverlay({
            title    : "Sealing Pattern into The Vault",
            subtitle : "Persisting morphogentic artifact, parameters and animation frames..."
        });

        const payload = {
            artifact_hash      : state.currentArtifactHash,
            alias              : alias,
            parent_artifact_id : parentIdInput?.value ? parseInt(parentIdInput.value) : null,
            id_palette         : paletteSelect?.value ? parseInt(paletteSelect.value) : 1,
            user_notes         : userNotesInput?.value || ""
        };

        const res : APIResponse<SynthesisArtifact> = await apiFetch<SynthesisArtifact>(commitApiUrl, {
            method  : "POST",
            headers : { "Content-Type" : "application/json" },
            body    : JSON.stringify(payload)
        });

        hideLoadingOverlay();

        if(!res.success || !res.data)
        {
            (window as any).showAlertModal?.({
                title    : "Commit Failed",
                message  : "An unexpected alchemical disruption prevented the pattern from being sealed.",
                type     : "danger"
            });
            return;
        }

        if(metricId) metricId.textContent = `#${res.data.id_artifact}`;
        if(modeBadge)
        {
            modeBadge.textContent = "Sealed";
            modeBadge.className   = "vamp-badge vamp-badge-crimson-dark";
        }

        commitContainer?.classList.add("hidden");

        (window as any).showAlertModal?.({
            title    : "Artifact Bound",
            message  : `The pattern has been sealed into The Vault under the inscription ${res.data.alias}.`,
            type     : "success"
        });
    }

    function promptArtifactAlias() : void
    {
        (window as any).showAlertModal({
            title            : "Seal into The Vault",
            message          : "Inscribe a sacred alias for your creation if you so desire.",
            type             : "info",
            icon             : "fa-feather",
            showInput        : true,
            inputLabel       : "Pattern Alias",
            inputPlaceholder : "If left empty, a default alias will be generated. You can change it later, love.",
            inputValue       : "",
            confirmText      : "Seal Artifact",
            cancelText       : "Cancel",
            onConfirm        : (chosenAlias : string) : void =>  { commitArtifact(chosenAlias || "").then(); }
        });
    }

    // LISTENERS
    function bindListeners() : void
    {
        // Parameters
        syncControlPair(feedSlider,   feedInput,  4);
        syncControlPair(killSlider,   killInput,  4);
        syncControlPair(diffUSlider,  diffUInput, 3);
        syncControlPair(diffVSlider,  diffVInput, 3);
        syncControlPair(iterSlider,   iterInput,  0);
        syncControlPair(dtSlider,     dtInput,    2);
        resetParamsBtn?.addEventListener("click", resetFormula);

        // Input Image
        dropzoneEl?.addEventListener("click", () : void => fileInput?.click());
        fileInput?.addEventListener("change", (event : Event) : void =>
        {
            const target : HTMLInputElement = event.target as HTMLInputElement;
            if(target.files && target.files.length > 0) handleFileSelection(target.files[0]);
        });

        dropzoneEl?.addEventListener("dragover", (event : DragEvent) : void =>
        {
            event.preventDefault();
            dropzoneEl.classList.add("drag-over");
        });
        dropzoneEl?.addEventListener("dragleave", () : void => dropzoneEl.classList.remove("drag-over"));
        dropzoneEl?.addEventListener("drop", (event : DragEvent) : void =>
        {
            event.preventDefault();
            dropzoneEl.classList.remove("drag-over");
            if(event.dataTransfer?.files && event.dataTransfer.files.length > 0)
            {
                handleFileSelection(event.dataTransfer.files[0]);
            }
        });

        removeSourceBtn?.addEventListener("click", (event : MouseEvent) : void =>
        {
            event.stopPropagation();
            purgeSourceImage();
        });

        // Canvas Controls
        playPauseButton?.addEventListener("click", togglePlayPause);
        scrubber?.addEventListener("input", () : void =>
        {
            pauseAnimation();
            applyShaderToFrame(parseInt(scrubber.value));
        });
        compareBtn?.addEventListener("click", toggleComparison);

        // Synthesis
        synthesizeBtn?.addEventListener("click", executeSynthesis);
        commitBtn?.addEventListener("click", promptArtifactAlias);
    }

    async function initStudio()
    {
        await loadPaletteCatalog();
        bindListeners();
        await checkUrlHydrationTarget();
    }

    // --- INITIALIZATION ---
    initStudio().then();
});