import { applyPalette } from "../base.js";
export class ScryingMirror {
    root;
    stageWrapper = null;
    canvas = null;
    canvasCtx = null;
    emptyState = null;
    playbackBadge = null;
    frameLabel = null;
    iterationBadge = null;
    iterationLabel = null;
    controlsPanel = null;
    playPauseBtn = null;
    playPauseIcon = null;
    scrubber = null;
    compareBtn = null;
    offscreenCanvas = document.createElement("canvas");
    offscreenCtx = null;
    frames = [];
    iterations = [];
    catalystImg = null;
    enigmaImg = null;
    enigmaLut = null;
    activeLut = null;
    currentFrame = 0;
    isPlaying = false;
    isComparing = false;
    animationTimer = null;
    tickIntervalMs = 120;
    onFrameRender = null;
    constructor(options) {
        this.root = options?.rootElement || document;
        this.tickIntervalMs = options?.tickIntervalMs || 120;
        this.bindDomElements();
        this.bindInternalListeners();
    }
    bindDomElements() {
        this.stageWrapper = this.root.querySelector("#scrying-mirror-stage-wrapper");
        this.canvas = this.root.querySelector("#scrying-mirror-canvas");
        this.emptyState = this.root.querySelector("#scrying-mirror-empty-state");
        this.playbackBadge = this.root.querySelector("#scrying-mirror-playback-badge");
        this.frameLabel = this.root.querySelector("#scrying-mirror-frame-label");
        this.iterationBadge = this.root.querySelector("#scrying-mirror-iteration-badge");
        this.iterationLabel = this.root.querySelector("#scrying-mirror-iteration-label");
        this.controlsPanel = this.root.querySelector("#scrying-mirror-controls-panel");
        this.playPauseBtn = this.root.querySelector("#scrying-mirror-play-pause-btn");
        this.playPauseIcon = this.root.querySelector("#scrying-mirror-play-pause-icon");
        this.scrubber = this.root.querySelector("#scrying-mirror-scrubber");
        this.compareBtn = this.root.querySelector("#scrying-mirror-compare-btn");
        if (this.canvas)
            this.canvasCtx = this.canvas.getContext("2d", { willReadFrequently: true });
        this.offscreenCtx = this.offscreenCanvas.getContext("2d", { willReadFrequently: true });
    }
    bindInternalListeners() {
        this.playPauseBtn?.addEventListener("click", () => this.togglePlay());
        this.compareBtn?.addEventListener("click", () => this.toggleComparison());
        this.scrubber?.addEventListener("input", () => {
            this.pause();
            if (this.scrubber)
                this.renderFrame(parseInt(this.scrubber.value));
        });
    }
    setPaletteLut(lut) {
        this.activeLut = lut;
        if (this.frames.length > 0 && !this.isComparing)
            this.renderFrame(this.currentFrame);
    }
    setCatalyst(catalyst) {
        if (!catalyst) {
            this.catalystImg = null;
            if (this.frames.length > 0 && this.iterations[0] === 0) {
                this.frames.shift();
                this.iterations.shift();
                if (this.scrubber)
                    this.scrubber.max = Math.max(0, this.frames.length - 1).toString();
                this.renderFrame(0);
            }
            return;
        }
        if (typeof catalyst === "string") {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                this.catalystImg = img;
                this.injectCatalystAsFrameZero(img);
            };
            img.src = catalyst;
        }
        else {
            this.catalystImg = catalyst;
            this.injectCatalystAsFrameZero(catalyst);
        }
    }
    injectCatalystAsFrameZero(img) {
        if (this.frames.length === 0)
            return;
        if (this.iterations[0] === 0) {
            this.frames[0] = img;
        }
        else {
            this.frames.unshift(img);
            this.iterations.unshift(0);
            if (this.scrubber)
                this.scrubber.max = Math.max(0, this.frames.length - 1).toString();
        }
        this.renderFrame(this.currentFrame);
    }
    setEnigmaTarget(target, lut = null) {
        this.enigmaLut = lut;
        if (!target) {
            this.enigmaImg = null;
            return;
        }
        if (typeof target === "string") {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => { this.enigmaImg = img; };
            img.src = target;
        }
        else {
            this.enigmaImg = target;
        }
    }
    async loadFrames(frameSources, iterations) {
        this.pause();
        this.frames = [];
        this.iterations = [];
        if (frameSources.length === 0 && !this.catalystImg) {
            this.reset();
            return;
        }
        const loadedFrames = await Promise.all(frameSources.map((source) => {
            if (typeof source !== "string")
                return Promise.resolve(source);
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.src = source;
            });
        }));
        if (this.catalystImg) {
            this.frames = [this.catalystImg, ...loadedFrames];
            this.iterations = [0, ...iterations];
        }
        else {
            this.frames = [...loadedFrames];
            this.iterations = [...iterations];
        }
        if (this.scrubber) {
            this.scrubber.max = Math.max(0, this.frames.length - 1).toString();
            this.scrubber.value = "0";
        }
        this.emptyState?.classList.add("hidden");
        this.playbackBadge?.classList.remove("hidden");
        if (this.iterations.length > 0)
            this.iterationBadge?.classList.remove("hidden");
        else
            this.iterationBadge?.classList.add("hidden");
        this.controlsPanel?.classList.remove("disabled");
        this.renderFrame(0);
    }
    renderFrame(index) {
        if (!this.canvas || !this.canvasCtx || this.frames.length === 0)
            return;
        if (index < 0 || index >= this.frames.length)
            return;
        const img = this.frames[index];
        const isFrameZero = (index === 0 && this.iterations[0] == 0 && this.catalystImg !== null);
        if (this.offscreenCanvas.width !== this.canvas.width || this.offscreenCanvas.height !== this.canvas.height) {
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
        }
        if (isFrameZero || !this.activeLut) {
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.canvasCtx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        }
        else if (this.offscreenCtx) {
            this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.offscreenCtx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            const imgData = this.offscreenCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imgData.data;
            const lut = this.activeLut;
            applyPalette(data, lut);
            this.canvasCtx.putImageData(imgData, 0, 0);
        }
        this.currentFrame = index;
        if (this.scrubber)
            this.scrubber.value = index.toString();
        if (this.frameLabel)
            this.frameLabel.textContent = `Frame ${index} / ${this.frames.length - 1}`;
        const iterStep = this.iterations[index];
        if (this.iterationLabel && iterStep !== undefined && iterStep !== null) {
            this.iterationLabel.textContent = `Step ${iterStep.toLocaleString()}`;
        }
        else {
            this.iterationLabel?.classList.add("hidden");
        }
        if (this.onFrameRender)
            this.onFrameRender(index, this.frames.length);
    }
    play() {
        if (this.frames.length <= 1)
            return;
        this.isPlaying = true;
        if (this.playPauseIcon)
            this.playPauseIcon.className = "fa-solid fa-pause mr-1 text-vespera-silverBright";
        if (this.currentFrame >= this.frames.length - 1)
            this.renderFrame(0);
        this.animationTimer = window.setInterval(() => {
            const nextIdx = this.currentFrame + 1;
            if (nextIdx >= this.frames.length)
                this.pause();
            else
                this.renderFrame(nextIdx);
        }, this.tickIntervalMs);
    }
    pause() {
        this.isPlaying = false;
        if (this.animationTimer !== null) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        if (this.playPauseIcon)
            this.playPauseIcon.className = "fa-solid fa-play mr-1";
    }
    togglePlay() {
        if (this.isPlaying)
            this.pause();
        else
            this.play();
    }
    toggleComparison() {
        if (!this.canvasCtx || !this.canvas)
            return;
        this.isComparing = !this.isComparing;
        if (this.isComparing) {
            this.pause();
            this.iterationBadge?.classList.add("hidden");
            if (this.enigmaImg) {
                if (!this.enigmaLut) {
                    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.canvasCtx.drawImage(this.enigmaImg, 0, 0, this.canvas.width, this.canvas.height);
                }
                else if (this.offscreenCtx) {
                    this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.offscreenCtx.drawImage(this.enigmaImg, 0, 0, this.canvas.width, this.canvas.height);
                    const imgData = this.offscreenCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    applyPalette(imgData.data, this.enigmaLut);
                    this.canvasCtx.putImageData(imgData, 0, 0);
                }
                this.compareBtn?.classList.add("active");
            }
        }
        else {
            this.renderFrame(this.currentFrame);
            this.compareBtn?.classList.remove("active");
        }
    }
    setSynthesizing(active) {
        this.stageWrapper?.classList.toggle("synthesizing", active);
    }
    reset() {
        this.emptyState?.classList.remove("hidden");
        this.playbackBadge?.classList.add("hidden");
        this.iterationBadge?.classList.add("hidden");
        this.controlsPanel?.classList.add("disabled");
        this.compareBtn?.classList.remove("active");
        if (this.canvas && this.canvasCtx) {
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.pause();
        this.frames = [];
        this.iterations = [];
        this.catalystImg = null;
        this.currentFrame = 0;
        this.isComparing = false;
    }
}
