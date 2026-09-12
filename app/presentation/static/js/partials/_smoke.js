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
    let puffs = [];
    const PUFF_COUNT = 28;
    const SOOT_COLOR = { r: 6, g: 7, b: 9 };
    function initPuffs() {
        puffs = [];
        for (let i = 0; i < PUFF_COUNT; ++i) {
            puffs.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 260 + 220,
                vx: (Math.random() - 0.5) * 0.18,
                vy: (Math.random() - 0.5) * 0.14 - 0.04,
                alpha: Math.random() * 0.12 + 0.06,
                baseAlpha: Math.random() * 0.12 + 0.06,
                pulseSpeed: Math.random() * 0.007 + 0.003,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
    function resizeCanvas() {
        if (!canvas)
            return;
        width = Math.ceil(window.innerWidth * 0.65);
        height = Math.ceil(window.innerHeight * 0.65);
        canvas.width = width;
        canvas.height = height;
        initPuffs();
    }
    function renderSmoke() {
        if (!ctx)
            return;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
        const r = SOOT_COLOR.r;
        const g = SOOT_COLOR.g;
        const b = SOOT_COLOR.b;
        for (let i = 0; i < puffs.length; ++i) {
            const p = puffs[i];
            p.x += p.vx;
            p.y += p.vy;
            p.phase += p.pulseSpeed;
            p.alpha = p.baseAlpha + Math.sin(p.phase) * (p.baseAlpha * 0.40);
            const margin = p.radius * 1.3;
            if (p.x < -margin)
                p.x = width + margin;
            else if (p.x > width + margin)
                p.x = -margin;
            if (p.y < -margin)
                p.y = height + margin;
            else if (p.y > height + margin)
                p.y = -margin;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${p.alpha * 1.40})`);
            grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.85})`);
            grad.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.35})`);
            grad.addColorStop(1.00, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        requestAnimationFrame(renderSmoke);
    }
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("DOMContentLoaded", () => {
        resizeCanvas();
        requestAnimationFrame(renderSmoke);
    });
})();
