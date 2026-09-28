// Vespera/app/presentation/static/ts/partials/scrying_mirror.ts

import { applyPalette } from "../base.js";

export interface ScryingMirrorOptions
{
    rootElement?    : HTMLElement | null;
    tickIntervalMs? : number;
}

export class ScryingMirror
{
    // Main Components
    private root            : HTMLElement              | Document;
    private stageWrapper    : HTMLElement              | null = null;
    private canvas          : HTMLCanvasElement        | null = null;
    private canvasCtx       : CanvasRenderingContext2D | null = null;
    private emptyState      : HTMLElement              | null = null;
    private playbackBadge   : HTMLElement              | null = null;
    private frameLabel      : HTMLElement              | null = null;
    private iterationBadge  : HTMLElement              | null = null;
    private iterationLabel  : HTMLElement              | null = null;
    private controlsPanel   : HTMLElement              | null = null;
    private playPauseBtn    : HTMLButtonElement        | null = null;
    private playPauseIcon   : HTMLElement              | null = null;
    private scrubber        : HTMLInputElement         | null = null;
    private compareBtn      : HTMLButtonElement        | null = null;

    // Offscreen Buffer
    private offscreenCanvas : HTMLCanvasElement               = document.createElement("canvas");
    private offscreenCtx    : CanvasRenderingContext2D | null = null;

    // State
    private frames          : HTMLImageElement[]              = [];
    private iterations      : number[]                        = [];
    private catalystImg     : HTMLImageElement         | null = null;
    private enigmaImg       : HTMLImageElement         | null = null;
    private enigmaLut       : Uint8ClampedArray        | null = null;
    private activeLut       : Uint8ClampedArray        | null = null;
    private currentFrame    : number                          = 0;
    private isPlaying       : boolean                         = false;
    private isComparing     : boolean                         = false;
    private animationTimer  : number                   | null = null;
    private readonly tickIntervalMs : number                  = 120;

    // Callback
    public onFrameRender : ((index : number, total : number) => void) | null = null;

    constructor(options? : ScryingMirrorOptions)
    {
        this.root           = options?.rootElement    || document;
        this.tickIntervalMs = options?.tickIntervalMs || 120;

        this.bindDomElements();
        this.bindInternalListeners();
    }

    private bindDomElements() : void
    {
        this.stageWrapper   = this.root.querySelector("#scrying-mirror-stage-wrapper");
        this.canvas         = this.root.querySelector("#scrying-mirror-canvas");
        this.emptyState     = this.root.querySelector("#scrying-mirror-empty-state");
        this.playbackBadge  = this.root.querySelector("#scrying-mirror-playback-badge");
        this.frameLabel     = this.root.querySelector("#scrying-mirror-frame-label");
        this.iterationBadge = this.root.querySelector("#scrying-mirror-iteration-badge");
        this.iterationLabel = this.root.querySelector("#scrying-mirror-iteration-label");
        this.controlsPanel  = this.root.querySelector("#scrying-mirror-controls-panel");
        this.playPauseBtn   = this.root.querySelector("#scrying-mirror-play-pause-btn");
        this.playPauseIcon  = this.root.querySelector("#scrying-mirror-play-pause-icon");
        this.scrubber       = this.root.querySelector("#scrying-mirror-scrubber");
        this.compareBtn     = this.root.querySelector("#scrying-mirror-compare-btn");

        if(this.canvas) this.canvasCtx = this.canvas.getContext("2d", { willReadFrequently : true });
        this.offscreenCtx     = this.offscreenCanvas.getContext("2d", { willReadFrequently : true });
    }

    private bindInternalListeners() : void
    {
        this.playPauseBtn?.addEventListener("click", () => this.togglePlay());
        this.compareBtn?.addEventListener("click",   () => this.toggleComparison());
        this.scrubber?.addEventListener("input",     () =>
        {
            this.pause();
            if(this.scrubber) this.renderFrame(parseInt(this.scrubber.value));
        });
    }

    // Palette
    public setPaletteLut(lut : Uint8ClampedArray | null) : void
    {
        this.activeLut = lut;
        if(this.frames.length > 0 && !this.isComparing) this.renderFrame(this.currentFrame);
    }

    // Catalyst
    public setCatalyst(catalyst : HTMLImageElement | string | null) : void
    {
        if(!catalyst)
        {
            this.catalystImg = null;
            if(this.frames.length > 0 && this.iterations[0] === 0)
            {
                this.frames.shift();
                this.iterations.shift();
                if(this.scrubber) this.scrubber.max = Math.max(0, this.frames.length-1).toString();
                this.renderFrame(0);
            }
            return;
        }

        if(typeof catalyst === "string")
        {
            const img : HTMLImageElement = new Image();
            img.crossOrigin              = "anonymous";
            img.onload                   = () : void =>
            {
                this.catalystImg = img;
                this.injectCatalystAsFrameZero(img);
            };
            img.src                      = catalyst;
        }
        else
        {
            this.catalystImg = catalyst;
            this.injectCatalystAsFrameZero(catalyst);
        }
    }

    private injectCatalystAsFrameZero(img : HTMLImageElement) : void
    {
        if(this.frames.length === 0) return;

        if(this.iterations[0] === 0)
        {
            this.frames[0] = img;
        }
        else
        {
            this.frames.unshift(img);
            this.iterations.unshift(0);
            if(this.scrubber) this.scrubber.max = Math.max(0, this.frames.length - 1).toString();
        }
        this.renderFrame(this.currentFrame);
    }

    // Enigma
    public setEnigmaTarget(target : HTMLImageElement | string | null, lut : Uint8ClampedArray | null = null) : void
    {
        this.enigmaLut = lut;
        if(!target)
        {
            this.enigmaImg = null;
            return;
        }

        if(typeof target === "string")
        {
            const img : HTMLImageElement = new Image();
            img.crossOrigin              = "anonymous";
            img.onload                   = () : void => { this.enigmaImg = img; };
            img.src                      = target;
        }
        else
        {
            this.enigmaImg = target;
        }
    }

    // Animation
    public async loadFrames(
        frameSources : (string | HTMLImageElement)[],
        iterations   : number[]
    ) : Promise<void>
    {
        this.pause();
        this.frames     = [];
        this.iterations = [];

        if(frameSources.length === 0 && !this.catalystImg)
        {
            this.reset();
            return;
        }

        const loadedFrames = await Promise.all(
            frameSources.map((source : string | HTMLImageElement) : Promise<HTMLImageElement> =>
            {
                if(typeof source !== "string") return Promise.resolve(source);
                return new Promise((resolve : (val : HTMLImageElement) => void) : void =>
                {
                    const img : HTMLImageElement = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload      = () : void => resolve(img);
                    img.src         = source;
                });
            })
        );

        if(this.catalystImg)
        {
            this.frames     = [this.catalystImg, ...loadedFrames];
            this.iterations = [0, ...iterations];
        }
        else
        {
            this.frames     = [...loadedFrames];
            this.iterations = [...iterations];
        }

        if(this.scrubber)
        {
            this.scrubber.max   = Math.max(0, this.frames.length - 1).toString();
            this.scrubber.value = "0";
        }

        this.emptyState?.classList.add("hidden");
        this.playbackBadge?.classList.remove("hidden");
        if(this.iterations.length > 0) this.iterationBadge?.classList.remove("hidden");
        else                           this.iterationBadge?.classList.add("hidden");
        this.controlsPanel?.classList.remove("disabled");

        this.renderFrame(0);
    }

    public renderFrame(index : number) : void
    {
        if(!this.canvas || !this.canvasCtx || this.frames.length === 0) return;
        if(index < 0 || index >= this.frames.length) return;

        const img         : HTMLImageElement = this.frames[index];
        const isFrameZero : boolean          = (index === 0 && this.iterations[0] == 0 && this.catalystImg !== null);

        if(this.offscreenCanvas.width !== this.canvas.width || this.offscreenCanvas.height !== this.canvas.height)
        {
            this.offscreenCanvas.width  = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
        }

        if(isFrameZero || !this.activeLut)
        {
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.canvasCtx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        }
        else if(this.offscreenCtx)
        {
            this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.offscreenCtx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

            const imgData : ImageData         = this.offscreenCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data    : Uint8ClampedArray = imgData.data;
            const lut     : Uint8ClampedArray = this.activeLut;

            applyPalette(data, lut);
            this.canvasCtx.putImageData(imgData, 0, 0);
        }

        this.currentFrame                               = index;
        if(this.scrubber)   this.scrubber.value         = index.toString();
        if(this.frameLabel) this.frameLabel.textContent = `Frame ${index} / ${this.frames.length}`;

        const iterStep : number | undefined = this.iterations[index];
        if(this.iterationLabel && iterStep !== undefined && iterStep !== null)
        {
            this.iterationLabel.textContent = `Step ${iterStep.toLocaleString()}`;
        }
        else
        {
            this.iterationLabel?.classList.add("hidden");
        }

        if(this.onFrameRender)  this.onFrameRender(index, this.frames.length);
    }

    public play() : void
    {
        if(this.frames.length <= 1) return;
        this.isPlaying = true;

        if(this.playPauseIcon) this.playPauseIcon.className = "fa-solid fa-pause mr-1 text-vespera-silverBright";

        if(this.currentFrame >= this.frames.length - 1) this.renderFrame(0);

        this.animationTimer = window.setInterval(() : void =>
        {
            const nextIdx : number = this.currentFrame + 1;
            if(nextIdx >= this.frames.length) this.pause();
            else                              this.renderFrame(nextIdx);
        }, this.tickIntervalMs);
    }

    public pause() : void
    {
        this.isPlaying = false;
        if(this.animationTimer !== null)
        {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        if(this.playPauseIcon) this.playPauseIcon.className = "fa-solid fa-play mr-1";
    }

    public togglePlay() : void
    {
        if(this.isPlaying) this.pause();
        else                this.play();
    }

    // Source vs. Pattern Comparison
    public toggleComparison() : void
    {
        if(!this.canvasCtx || !this.canvas) return;
        this.isComparing = !this.isComparing;

        if(this.isComparing)
        {
            this.pause();
            this.iterationBadge?.classList.add("hidden");
            if(this.enigmaImg)
            {
                if(!this.enigmaLut)
                {
                    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.canvasCtx.drawImage(this.enigmaImg, 0, 0, this.canvas.width, this.canvas.height);
                }
                else if(this.offscreenCtx)
                {
                    this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.offscreenCtx.drawImage(this.enigmaImg, 0, 0, this.canvas.width, this.canvas.height);

                    const imgData : ImageData = this.offscreenCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);

                    applyPalette(imgData.data, this.enigmaLut);
                    this.canvasCtx.putImageData(imgData, 0, 0);
                }
                this.compareBtn?.classList.add("active");
            }
        }
        else
        {
            this.renderFrame(this.currentFrame);
            this.compareBtn?.classList.remove("active");
        }
    }

    // State Modifiers
    public setSynthesizing(active : boolean) : void
    {
        this.stageWrapper?.classList.toggle("synthesizing", active);
    }

    public reset() : void
    {
        this.emptyState?.classList.remove("hidden");
        this.playbackBadge?.classList.add("hidden");
        this.iterationBadge?.classList.add("hidden");
        this.controlsPanel?.classList.add("disabled");
        this.compareBtn?.classList.remove("active");

        if(this.canvas && this.canvasCtx)
        {
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.pause();
        this.frames       = [];
        this.iterations   = [];
        this.catalystImg  = null;
        this.currentFrame = 0;
        this.isComparing  = false;
    }
}