"use strict";
(function () {
    const canvas = document.getElementById("vespera-smoke-canvas");
    if (!canvas)
        return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx)
        return;
    let width = 0;
    let height = 0;
    let wisps = [];
    const WISP_COUNT = 30;
    const SOOT_RGB = { r: 4, g: 5, b: 8 };
    function createWisp(initialY) {
        const rY = Math.random() * 170 + 100;
        const spawnY = (initialY !== undefined ? initialY :
            height + rY * 1.6 + Math.random() * 260);
        const bAlpha = Math.random() * 0.35 + 0.18;
        return {
            x: Math.random() * width,
            y: spawnY,
            radiusX: Math.random() * 45 + 25,
            radiusY: Math.random() * 180 + 100,
            rotation: (Math.random() - 0.50) * 0.15,
            rotSpeed: (Math.random() - 0.50) * 0.006,
            vx: (Math.random() - 0.50) * 0.05,
            vy: -(Math.random() * 0.15 + 0.30),
            curlFreq: Math.random() * 0.014 + 0.004,
            curlAmp: Math.random() * 35 + 15,
            phase: Math.random() * Math.PI * 2,
            alpha: initialY === undefined ? bAlpha : 0,
            baseAlpha: bAlpha,
            fadeFactor: Math.random() * 0.0025 + 0.0012
        };
    }
    function initWisps() {
        wisps = [];
        for (let i = 0; i < WISP_COUNT; ++i) {
            wisps.push(createWisp(Math.random() * (height + 250) - 50));
        }
    }
    function resizeCanvas() {
        if (!canvas)
            return;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initWisps();
    }
    function renderSmoke() {
        if (!ctx)
            return;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
        const r = SOOT_RGB.r;
        const g = SOOT_RGB.g;
        const b = SOOT_RGB.b;
        for (let i = 0; i < wisps.length; ++i) {
            const w = wisps[i];
            w.phase += w.curlFreq;
            w.rotation += w.rotSpeed;
            w.y += w.vy;
            const bottomFadeDistance = height * 0.28;
            const bottomFade = Math.max(0, Math.min(1, (height + 40 - w.y) / bottomFadeDistance));
            const topFadeDistance = height * 0.35;
            const topFade = Math.max(0, Math.min(1, (w.y - w.radiusY) / topFadeDistance));
            const smoothFade = ((bottomFade * bottomFade * (3 - 2 * bottomFade)) *
                (topFade * topFade * (3 - 2 * topFade)));
            const activeAlpha = w.baseAlpha * smoothFade;
            if (w.y < -w.radiusY * 2) {
                wisps[i] = createWisp();
                continue;
            }
            if (activeAlpha <= 0.002)
                continue;
            const curlX = w.x + Math.sin(w.phase) * w.curlAmp + Math.cos(w.phase * 0.5) * w.curlFreq * 0.35;
            if (curlX < -w.radiusX * 2)
                w.x = width + w.radiusX;
            else if (curlX > width + w.radiusX * 2)
                w.x = -w.radiusX;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w.radiusY);
            grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${activeAlpha * 1.35})`);
            grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${activeAlpha * 0.95})`);
            grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${activeAlpha * 0.45})`);
            grad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${activeAlpha * 0.10})`);
            grad.addColorStop(1.00, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.save();
            ctx.translate(curlX, w.y);
            ctx.rotate(w.rotation);
            ctx.scale(w.radiusX / w.radiusY, 1.45);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, w.radiusY, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        requestAnimationFrame(renderSmoke);
    }
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("DOMContentLoaded", () => {
        resizeCanvas();
        requestAnimationFrame(renderSmoke);
    });
})();
