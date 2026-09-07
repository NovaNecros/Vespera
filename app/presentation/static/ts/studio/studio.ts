// Vespera/app/presentation/static/ts/studio/studio.ts

import { APIResponse, SynthesisArtifact } from "../types.js";
import {
    apiFetch,
    hideLoadingOverlay,
    showLoadingOverlay,
    truncateHash
} from "../base.js";

// Interfaces
interface StudioState
{
    currentArtifact    : SynthesisArtifact | null;
    sourceImageFile    : File              | null;
    sourceImageDataUrl : string            | null;
    sourceImageElement : HTMLImageElement  | null;
    keyframes          : HTMLImageElement[];
    currentFrameIndex  : number;
    isPlaying          : boolean;
    animationTimer     : number            | null;
    isComparing        : boolean;
}

document.addEventListener("DOMContentLoaded", () : void =>
{
    // --- VARIABLES ---
    const mainContainer : HTMLElement | null = document.getElementById("studio-main-container");
    if(!mainContainer) return;

    // URLs
    const generateApiUrl       : string = mainContainer.dataset.generateApiUrl       || "";
    const palettesApiUrl       : string = mainContainer.dataset.palettesApiUrl       || "";
    const renderStaticApiUrl   : string = mainContainer.dataset.renderStaticApiUrl   || "";
    const toggleFavoriteApiUrl : string = mainContainer.dataset.toggleFavoriteApiUrl || "";
    const downloadApiUrl       : string = mainContainer.dataset.downloadApiUrl       || "";

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
    const resetParamsBtn  : HTMLButtonElement | null = document.getElementById("reset-params-btn")         as HTMLButtonElement;
    const favoriteBtn     : HTMLButtonElement | null = document.getElementById("save-favorite-btn")        as HTMLButtonElement;
    const downloadLink    : HTMLAnchorElement | null = document.getElementById("download-artifact-link")   as HTMLAnchorElement;

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
            currentArtifact    : null,
            sourceImageFile    : null,
            sourceImageDataUrl : null,
            sourceImageElement : null,
            keyframes          : [],
            currentFrameIndex  : 0,
            isPlaying          : false,
            animationTimer     : null,
            isComparing        : false
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

    // PALETTES
    async function loadPaletteCatalog() : Promise<void>
    {
        if(!paletteSelect) return;

        const res : APIResponse<string[]> = await apiFetch<string[]>(palettesApiUrl);
        if(!res.success || !Array.isArray(res.data)) return;

        paletteSelect.innerHTML = "";

        res.data.forEach((palName : string) =>
        {
            const opt : HTMLOptionElement = document.createElement("option");
            opt.value       = palName;
            opt.textContent = palName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            if(palName === "crimson_eclipse") opt.selected = true;
            paletteSelect.appendChild(opt);
        });
    }

    // SLIDERS & DISPLAYS
    function resetFormula() : void
    {
        if(feedSlider)     feedSlider.value         = defaultF;
        if(killSlider)     killSlider.value         = defaultK;
        if(diffUSlider)    diffUSlider.value        = defaultDu;
        if(diffVSlider)    diffVSlider.value        = defaultDv;
        if(iterSlider)     iterSlider.value         = defaultIter;
        if(dtSlider)       dtSlider.value           = defaultDt;
        if(paletteSelect)  paletteSelect.value      = defaultPalette;
        if(userNotesInput) userNotesInput.value     = "";

        if(feedInput)      feedInput.value          = defaultF;
        if(killInput)      killInput.value          = defaultK;
        if(diffUInput)     diffUInput.value         = defaultDu;
        if(diffVInput)     diffVInput.value         = defaultDv;
        if(iterInput)      iterInput.value          = defaultIter;
        if(dtInput)        dtInput.value            = defaultDt;
    }

    function bindSliderInputs() : void
    {
        syncControlPair(feedSlider,  feedInput,  4);
        syncControlPair(killSlider,  killInput,  4);
        syncControlPair(diffUSlider, diffUInput, 3);
        syncControlPair(diffVSlider, diffVInput, 3);
        syncControlPair(iterSlider,  iterInput,  0);
        syncControlPair(dtSlider,    dtInput,    2);
        resetParamsBtn?.addEventListener("click", resetFormula);
    }

    // DROPZONES
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
                sourceStatusEl.className   = "font-mono text-[0.7rem] text-vespera-goldbright";
            }
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
            sourceStatusEl.className   = "font-mono text-[0.7rem] text-vespera-silent";
        }
    }

    function bindDropzoneListeners() : void
    {
        if(!dropzoneEl || !fileInput) return;

        dropzoneEl.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (event : Event) =>
        {
            const target : HTMLInputElement = event.target as HTMLInputElement;
            if(target.files && target.files.length > 0) handleFileSelection(target.files[0]);
        });

        dropzoneEl.addEventListener("dragover", (event : DragEvent) =>
        {
            event.preventDefault();
            dropzoneEl.classList.add("drag-over");
        });

        dropzoneEl.addEventListener("dragleave", () => dropzoneEl.classList.remove("drag-over"));

        dropzoneEl.addEventListener("drop", (event : DragEvent) =>
        {
           event.preventDefault();
           dropzoneEl.classList.remove("drag-over");
           if(event.dataTransfer?.files && event.dataTransfer.files.length > 0)
           {
               handleFileSelection(event.dataTransfer.files[0]);
           }
        });

        removeSourceBtn?.addEventListener("click", (event : MouseEvent) =>
        {
            event.stopPropagation();
            purgeSourceImage();
        });
    }

    // SYNTHESIS & VISUALIZATION
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
        if(state.keyframes.length <= 1) return;
        state.isPlaying = true;

        if(playPauseIcon) playPauseIcon.className = "fa-solid fa-pause mr-1 text-vespera-goldbright";

        if(state.currentFrameIndex >= state.keyframes.length - 1) renderCanvasFrame(0);

        state.animationTimer = window.setInterval(() =>
        {
           const nextIdx : number = state.currentFrameIndex + 1;
           if(nextIdx >= state.keyframes.length) pauseAnimation();
           else renderCanvasFrame(nextIdx);
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
            renderCanvasFrame(state.currentFrameIndex);
            if(compareBtn) compareBtn.classList.remove("bg-vespera-crimson", "text-vespera-parchment");
        }
    }

    async function toggleFavoriteStatus() : Promise<void>
    {
        if(!state.currentArtifact) return;

        const artifactId : number     = state.currentArtifact.id_artifact;
        const apiUrl     : string     = toggleFavoriteApiUrl.replace(
            "/artifact/0",
            `/artifact/${artifactId}`
        );
        const res        : APIResponse = await apiFetch(apiUrl, { method : "POST" });

        if(res.success && res.data)
        {
            state.currentArtifact.is_favorite = res.data.is_favorite;
            if(favoriteBtn)
            {
                const starIcon : HTMLElement | null = favoriteBtn.querySelector("i");
                if(starIcon)
                {
                    starIcon.className = (
                        res.data.is_favorite                       ?
                        "fa-solid fa-star text-vespera-goldbright" :
                        "fa-regular fa-star"
                    );
                }
            }
        }
    }

    function bindCanvasControls() : void
    {
        playPauseButton?.addEventListener("click", togglePlayPause);

        scrubber?.addEventListener("input", () =>
        {
            pauseAnimation();
            const frameIdx : number = parseInt(scrubber.value);
            renderCanvasFrame(frameIdx);
        });

        compareBtn?.addEventListener("click", toggleComparison);
        favoriteBtn?.addEventListener("click", toggleFavoriteStatus);
    }

    function renderCanvasFrame(index : number) : void
    {
        if(!canvas || !canvasContext || state.keyframes.length === 0) return;
        if(index < 0 || index >= state.keyframes.length)              return;

        const frameImg : HTMLImageElement = state.keyframes[index];
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

        state.currentFrameIndex = index;
        if(scrubber) scrubber.value = index.toString();
        if(frameLabel) frameLabel.textContent = `Frame ${index + 1} / ${state.keyframes.length}`;
    }

    async function prepareKeyframePlayback(keyframesBase64 : string[]) : Promise<void>
    {
        emptyState?.classList.add("hidden");

        if(modeBadge)
        {
            modeBadge.textContent = "Synthesized";
            modeBadge.className   = "vamp-badge vamp-badge-gold";
        }

        const loadedFrames : HTMLImageElement[] = await Promise.all(
            keyframesBase64.map((src : string)=>
            {
                return new Promise <HTMLImageElement>((resolve) =>
                {
                    const img : HTMLImageElement = new Image();
                    img.onload                   = () => resolve(img);
                    img.src                      = src;
                });
            }));

        state.keyframes         = loadedFrames;
        state.currentFrameIndex = 0;

        if(scrubber)
        {
            scrubber.max   = (loadedFrames.length - 1).toString();
            scrubber.value = "0";
        }

        playbackPanel?.classList.remove("opacity-40", "pointer-events-none");
        playbackBadge?.classList.remove("hidden");

        // Autoplay
        renderCanvasFrame(0);
        playAnimation();
    }

    async function renderStaticArtifact(artifactHash : string) : Promise<void>
    {
        emptyState?.classList.add("hidden");
        const img : HTMLImageElement = new Image();
        img.onload = () =>
        {
            if(!canvas || !canvasContext) return;
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            canvasContext.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = renderStaticApiUrl.replace("/hash/PLACEHOLDER", `/hash/${artifactHash}`);
    }

    function updateArtifactMetrics(artifact : SynthesisArtifact) : void
    {
        if(metricId)   metricId.textContent   = `#${artifact.id_artifact}`;
        if(metricTime) metricTime.textContent = `${artifact.execution_time_ms.toFixed(1)} ms`;
        if(metricHash)
        {
            metricHash.textContent = truncateHash(artifact.artifact_hash, 6);
            metricHash.title       = artifact.artifact_hash;
        }

        if(downloadLink)
        {
            downloadLink.href    = downloadApiUrl.replace(
                "/hash/PLACEHOLDER",
                `/hash/${artifact.artifact_hash}`
            );
            downloadLink.download = `turing_pattern_${artifact.artifact_hash.substring(0,8)}.png`;
        }

        if(favoriteBtn)
        {
            const starIcon : HTMLElement | null = favoriteBtn.querySelector("i");
            if(starIcon)
            {
                starIcon.className = (
                    artifact.is_favorite                       ?
                    "fa-solid fa-star text-vespera-goldbright" :
                    "fa-regular fa-star"
                );
            }
        }
    }

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

        formData.append("feed_rate",               feedSlider?.value     ||       defaultF);
        formData.append("kill_rate",               killSlider?.value     ||       defaultK);
        formData.append("diff_u",                  diffUSlider?.value    ||      defaultDu);
        formData.append("diff_v",                  diffVSlider?.value    ||      defaultDv);
        formData.append("iterations",              iterSlider?.value     ||    defaultIter);
        formData.append("dt",                      dtSlider?.value       ||      defaultDt);
        formData.append("color_palette",           paletteSelect?.value  || defaultPalette);
        formData.append("user_notes",              userNotesInput?.value ||             "");
        formData.append("capture_timeline", "true");

        try
        {
            pauseAnimation();
            canvasStageWrap?.classList.add("synthesizing");
            showLoadingOverlay({
                title     : "Integrating Reaction-Diffusion Lattice",
                subtitle  : "Evaluating 2D Laplacian field and non-linear morphogen kinetics..."
            });

            const res : APIResponse<SynthesisArtifact> = await apiFetch<SynthesisArtifact>(generateApiUrl,
            {
                method : "POST",
                body   : formData
            });

            hideLoadingOverlay();
            canvasStageWrap?.classList.remove("synthesizing");

            if(!res.success || !res.data) return;

            state.currentArtifact = res.data;
            updateArtifactMetrics(res.data);

            if(res.data.keyframes && res.data.keyframes.length > 0)
            {
                await prepareKeyframePlayback(res.data.keyframes);
            }
            else
            {
                await renderStaticArtifact(res.data.artifact_hash);
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
    synthesizeBtn?.addEventListener("click", executeSynthesis);


    async function initStudio()
    {
        await loadPaletteCatalog();
        bindSliderInputs();
        bindDropzoneListeners();
        bindCanvasControls();
    }

    // --- INITIALIZATION ---
    initStudio().then();
});