// Vespera/app/presentation/static/ts/partials/_smoke.ts

// I fell in love with the way you twirl the wisps when you smoke, por eso se me ocurrió esto
interface SmokeWisp
{
    x          : number;
    y          : number;
    radiusX    : number;
    radiusY    : number;
    rotation   : number;
    rotSpeed   : number;
    vx         : number;
    vy         : number;
    curlFreq   : number;
    curlAmp    : number;
    phase      : number;
    alpha      : number;
    baseAlpha  : number;
    fadeFactor : number;
}

(function() : void
{
    // --- VARIABLES ---
    const canvas : HTMLCanvasElement | null = document.getElementById("vespera-smoke-canvas") as HTMLCanvasElement;
    if(!canvas) return;

    const ctx : CanvasRenderingContext2D | null = canvas.getContext("2d", { alpha : true });
    if(!ctx) return;

    let width  : number      = 0;
    let height : number      = 0;
    let wisps  : SmokeWisp[] = [];

    const WISP_COUNT : number = 28;

    const SOOT_RGB = { r : 4, g : 5, b : 8 };

    // --- FUNCTIONS ---
    function createWisp(initialY? : number) : SmokeWisp
    {
        const rY : number = Math.random() * 170 + 100;
        const spawnY : number = (
            initialY !== undefined ? initialY :
            height + rY * 1.6 + Math.random() * 260
        );

        const bAlpha : number = Math.random() * 0.35 + 0.18;
        return {
                x          :   Math.random() * width,
                y          :   spawnY,
                radiusX    :   Math.random() * 45      + 25,
                radiusY    :   Math.random() * 180     + 100,
                rotation   :  (Math.random() - 0.50)   * 0.15,
                rotSpeed   :  (Math.random() - 0.50)   * 0.006,
                vx         :  (Math.random() - 0.50)   * 0.05,
                vy         : -(Math.random() * 0.15    + 0.30),
                curlFreq   :   Math.random() * 0.014   + 0.004,
                curlAmp    :   Math.random() * 35      + 15,
                phase      :   Math.random() * Math.PI * 2,
                alpha      :   initialY === undefined ? bAlpha : 0,
                baseAlpha  :   bAlpha,
                fadeFactor :   Math.random() * 0.0025 + 0.0012
        }
    }

    function initWisps() : void
    {
        wisps = [];
        for(let i : number = 0; i < WISP_COUNT; ++i)
        {
            wisps.push(createWisp(Math.random() * (height + 250) - 50));
        }
    }

    function resizeCanvas() : void
    {
        if(!canvas) return;
        width  = window.innerWidth;
        height = window.innerHeight;
        canvas.width  = width;
        canvas.height = height;
        initWisps();
    }

    function renderSmoke() : void
    {
        if(!ctx) return;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";

        const r : number = SOOT_RGB.r;
        const g : number = SOOT_RGB.g;
        const b : number = SOOT_RGB.b;

        for(let i : number = 0; i < wisps.length; ++i)
        {
            const w : SmokeWisp = wisps[i];

            // Upward Flow + Curls
            w.phase    += w.curlFreq;
            w.rotation += w.rotSpeed;
            w.y        += w.vy;

            // Smooth fade window
            const bottomFadeDistance : number = height * 0.28;
            const bottomFade         : number = Math.max(0, Math.min(1, (height + 40 - w.y) / bottomFadeDistance));
            const topFadeDistance    : number = height * 0.35;
            const topFade            : number = Math.max(0, Math.min(1, (w.y - w.radiusY) / topFadeDistance));

            // Hermite S-Curve
            const smoothFade : number = (
                (bottomFade * bottomFade * (3 - 2 * bottomFade)) *
                (topFade    * topFade    * (3 - 2 * topFade))
            );

            const activeAlpha : number = w.baseAlpha * smoothFade;

            if(w.y < -w.radiusY * 2)
            {
                wisps[i] = createWisp();
                continue;
            }

            if(activeAlpha <= 0.002) continue;

            // Elliptical Gradients for Wisp Density
            const curlX : number = w.x + Math.sin(w.phase) * w.curlAmp + Math.cos(w.phase * 0.5) * w.curlFreq * 0.35;
            if(curlX < -w.radiusX * 2)             w.x = width + w.radiusX;
            else if(curlX > width + w.radiusX * 2) w.x = -w.radiusX;

            const grad  : CanvasGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w.radiusY);
            grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${activeAlpha*1.35})`);
            grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${activeAlpha*0.95})`);
            grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${activeAlpha*0.45})`);
            grad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${activeAlpha*0.10})`);
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

    // --- LISTENERS ---
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("DOMContentLoaded", () : void =>
    {
        resizeCanvas();
        requestAnimationFrame(renderSmoke);
    });
})();