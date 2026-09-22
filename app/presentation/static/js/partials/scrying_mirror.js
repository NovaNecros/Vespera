import { applyPalette } from "../base.js";
export class ScryingMirror {
    root;
    stageWrapper = null;
    canvas = null;
    canvasCtx = null;
    emptyState = null;
    playbackBadge = null;
    frameLabel = null;
    controlsPanel = null;
    playPauseBtn = null;
    playPauseIcon = null;
    scrubber = null;
    compareBtn = null;
    offscreenCanvas = document.createElement("canvas");
    offscreenCtx = null;
    frames = [];
    catalystImg = null;
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
            return;
        }
        if (typeof catalyst === "string") {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => { this.catalystImg = img; };
            img.src = catalyst;
        }
        else {
            this.catalystImg = catalyst;
        }
    }
    async loadFrames(frameSources) {
        this.pause();
        this.frames = [];
        if (frameSources.length === 0) {
            this.reset();
            return;
        }
        this.frames = await Promise.all(frameSources.map((source) => {
            if (typeof source !== "string")
                return Promise.resolve(source);
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.src = source;
            });
        }));
        if (this.scrubber) {
            this.scrubber.max = Math.max(0, this.frames.length - 1).toString();
            this.scrubber.value = "0";
        }
        this.emptyState?.classList.add("hidden");
        this.playbackBadge?.classList.remove("hidden");
        this.controlsPanel?.classList.remove("disabled");
        this.renderFrame(0);
    }
    renderFrame(index) {
        if (!this.canvas || !this.canvasCtx || this.frames.length === 0)
            return;
        if (index < 0 || index >= this.frames.length)
            return;
        const img = this.frames[index];
        if (this.offscreenCanvas.width !== this.canvas.width || this.offscreenCanvas.height !== this.canvas.height) {
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
        }
        if (!this.activeLut) {
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
            this.frameLabel.textContent = `Frame ${index + 1} / ${this.frames.length}`;
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
            if (this.catalystImg) {
                this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.canvasCtx.drawImage(this.catalystImg, 0, 0, this.canvas.width, this.canvas.height);
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
        this.pause();
        this.frames = [];
        this.catalystImg = null;
        this.currentFrame = 0;
        this.isComparing = false;
        if (this.canvas && this.canvasCtx) {
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.emptyState?.classList.remove("hidden");
        this.playbackBadge?.classList.add("hidden");
        this.controlsPanel?.classList.add("disabled");
        this.compareBtn?.classList.remove("active");
    }
}
