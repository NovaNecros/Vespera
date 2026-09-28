// Vespera/app/presentation/static/ts/partials/_smoke.ts

import { RGBColor } from "../types.js";

// I fell in love with the way you twirl the wisps when you smoke, por eso se me ocurrió esto
// La cantidad de cálculos de dinámica de fluidos que tuve que hacer es digna de estudio
// God I'm so smart :b
interface SmokePlume
{
    anchorX    : number;        // Resting ember position, normalized [0, 1]
    slotX      : number;        // Left edge of the plume's horizontal slot, normalized
    swayAmp    : number;        // px
    swayFreq   : number;        // rad / s
    swayPhase  : number;
    calm       : number;        // s of laminar thread before it starts to curl
    lift       : number;        // Rise multiplier (hotter / cooler ember)
    emitClock  : number;        // s accumulated towards the next node
    dragClock  : number;        // s left in current drag
    isDragging : boolean;
    breakNext  : boolean;       // Next node opens a new filament
    xs         : Float32Array;  // Ring buffer
    ys         : Float32Array;
    born       : Float64Array;  // Emission timestamps
    starts     : Uint8Array;
    head       : number;        // Next write slot
    count      : number;
}

interface SmokeVortex
{
    x        : number;
    y        : number;
    spin     : number;          // rad / s
    invCore2 : number;          // 1 / core²
    reach2   : number;          // Squared cull radius
    strength : number;          // spin * lifetime refreshed every frame
    age      : number;
    life     : number;
}

(function() : void
{
    // --- VARIABLES ---
    // CANVAS
    const canvas   : HTMLCanvasElement        | null = document.getElementById("vespera-smoke-canvas") as HTMLCanvasElement;
    if(!canvas) return;

    const ctx      : CanvasRenderingContext2D | null = canvas.getContext("2d", { alpha : true });
    if(!ctx) return;

    // Off-screen Canvas
    const atlas    : HTMLCanvasElement               = document.createElement("canvas");
    const atlasCtx : CanvasRenderingContext2D | null = atlas.getContext("2d");
    if(!atlasCtx) return;

    // TUNING — Scene
    const SOOT_RGB          : RGBColor = { r : 4, g : 5, b : 8 };
    const RENDER_SCALE      : number   = 0.5;       // Bilinear upscale
    const MAX_DT            : number   = 1 / 20;    // s
    const VEIL_FADE         : number   = 0.30;      // s
    const WARMUP_TIME       : number   = 16;        // s (head start para que empiece a media animación)
    const WARMUP_STEP       : number   = 1 / 8;     // s

    // TUNING — Embers & Streaklines
    const NODE_LIFE         : number   = 18;        // s
    const EMIT_STEP         : number   = 1 / 30;    // s
    const NODE_CAPACITY     : number   = Math.ceil(NODE_LIFE / EMIT_STEP) + 2;
    const EMBER_DEPTH       : number   = 30;        // px debajo del viewport
    const PLUME_SPACING     : number   = 500;       // px
    const PLUME_MIN         : number   = 3;
    const PLUME_MAX         : number   = 8;
    const DRAG_MIN          : number   = 3.0;       // s
    const DRAG_RANGE        : number   = 5.0;
    const REST_MIN          : number   = 0.4;       // s (between drags)
    const REST_RANGE        : number   = 1.2;
    const RELOCATE_CHANCE   : number   = 0.3;       // Prob next drag comes from new ember

    // TUNING — Flow
    const RISE_RATIO        : number   = 0.088;     // viewport heights / s
    const RISE_DECAY        : number   = 0.08;      // Buoyancy lost per second
    const DRAFT_SPEED       : number   = 4;         // px / s, constant sideways draft
    const CALM_MIN          : number   = 0.2;       // s (tiempo antes de que el flujo se vuelva turbulento)
    const CALM_RANGE        : number   = 1.8;
    const TURB_RAMP         : number   = 3.8;       // s (tiempo para alcanzar la turbulencia máxima)
    const LIFT_MIN          : number   = 0.85;
    const LIFT_RANGE        : number   = 0.30;
    const FIELD_FREQ        : number   = 1 / 300;   // Noise cycles per px
    const FIELD_EPS         : number   = 0.01;      // Finite difference step, noise units
    const FIELD_FORCE       : number   = 27;        // px / s per unit of curl
    const FIELD_EVOLVE      : number   = 0.07;      // Noise z per second
    const FIELD_LIFT        : number   = 40;        // px / s, eddies rise with the smoke
    const VORTEX_AREA       : number   = 320000;    // px² of viewport per vortex
    const VORTEX_SPIN_MIN   : number   = 0.5;       // rad / s
    const VORTEX_SPIN_RANGE : number   = 0.8;
    const VORTEX_CORE_MIN   : number   = 70;        // px
    const VORTEX_CORE_RANGE : number   = 90;
    const VORTEX_LIFE_MIN   : number   = 7;         // s
    const VORTEX_LIFE_RANGE : number   = 7;
    const VORTEX_LIFT       : number   = 0.45;      // Fraction of the rise speed

    // TUNING
    // Aspect
    const BAND_COUNT        : number   = 24;        // Age buckets
    const BAND_SPAN         : number   = NODE_LIFE / BAND_COUNT;
    const WISP_LIFE         : number   = 10;        // s
    const WISP_BANDS        : number   = Math.ceil(WISP_LIFE / BAND_SPAN);
    const WISP_BIRTH        : number   = 1.4;       // px
    const WISP_DEATH        : number   = 3.2;       // px
    const WISP_ALPHA        : number   = 0.3;
    const CORE_LIFE         : number   = 2.4;       // s
    const CORE_BANDS        : number   = Math.ceil(CORE_LIFE / BAND_SPAN);
    const CORE_ALPHA        : number   = 0.2;
    const PUFF_FIRST_BAND   : number   = 1;
    const PUFF_BIRTH        : number   = 6;         // px diameter
    const PUFF_DEATH        : number   = 130;       // px diameter
    const PUFF_GROWTH       : number   = 0.8;
    const PUFF_OPACITY      : number   = 0.40;
    const PUFF_FALLOFF      : number   = 0.6;
    const PUFF_FADE_IN      : number   = 3.5;       // s
    const PUFF_STEP         : number   = 0.28;      // Arc length between stamps, fraction of puff diameter
    // Stretch
    const LEVEL_RATIO : Float32Array   = new Float32Array([1.50, 0.70, 0.35, 0.15, 0.04]);  // Node spacing
    const LEVEL_GAIN  : Float32Array   = new Float32Array([1.35, 1.00, 0.62, 0.38, 0.20]);  // Opacity multiplier
    const PUFF_LEVELS : number         = LEVEL_RATIO.length;

    // STATE
    let width         : number          = 0;
    let height        : number          = 0;
    let riseSpeed     : number          = 0;
    let simTime       : number          = 0;
    let lastNow       : number          = 0;
    let frameHandle   : number          = 0;
    let pendingResize : boolean         = true;
    let veilAlpha     : number          = 0;
    let veilTarget    : number          = 1;
    let flowX         : number          = 0;
    let flowY         : number          = 0;
    let atlasRowH     : number          = 0;
    let plumes        : SmokePlume[]    = [];
    let vortices      : SmokeVortex[]   = [];
    let bandCuts      : Int32Array      = new Int32Array(0);

    // PRECOMPUTED BAND LOOK
    const wispWidth : Float32Array = new Float32Array(BAND_COUNT);
    const wispStyle : string[]     = [];
    const coreStyle : string[]     = [];
    const puffCellX : Float32Array = new Float32Array(BAND_COUNT);
    const puffCellW : Float32Array = new Float32Array(BAND_COUNT);
    const puffDrawW : Float32Array = new Float32Array(BAND_COUNT);
    const puffDrawA : Float32Array = new Float32Array(BAND_COUNT);
    const puffStep  : Float32Array = new Float32Array(BAND_COUNT);
    const puffLimit : Float32Array = new Float32Array(BAND_COUNT * PUFF_LEVELS);

    // NOISE TABLES
    const F3        : number     = 1 / 3;
    const G3        : number     = 1 / 6;
    const GRAD3     : Int8Array  = new Int8Array([
         1,  1,  0,   -1,  1,  0,    1, -1,  0,   -1, -1,  0,
         1,  0,  1,   -1,  0,  1,    1,  0, -1,   -1,  0, -1,
         0,  1,  1,    0, -1,  1,    0,  1, -1,    0, -1, -1
    ]);
    const PERM      : Uint8Array = new Uint8Array(512);
    const PERM_GRAD : Uint8Array = new Uint8Array(512);

    // Para esconder el humo cuando estés en un modal o en el overlay de carga :b
    const veils : HTMLElement[] = Array.from(document.querySelectorAll<HTMLElement>(".vespera-modal, .vespera-overlay"));

    // --- FUNCTIONS ---
    // Noise
    function seedNoise() : void
    {
        const source : Uint8Array = new Uint8Array(256);
        for(let i : number = 0; i < 256; ++i) source[i] = i;

        for(let i : number = 255; i > 0; --i)
        {
            const j   : number = Math.floor(Math.random() * (i + 1));
            const tmp : number = source[i];
            source[i] = source[j];
            source[j] = tmp;
        }

        for(let i : number = 0; i < 512; ++i)
        {
            PERM[i]      = source[i & 255];
            PERM_GRAD[i] = (PERM[i] % 12) * 3;
        }
    }

    // Simplex 3D (Gustavson's Algorithm) por ranking en vez de branching
    function simplex3(x : number, y : number, z : number) : number
    {
        const s  : number = (x + y + z) * F3;
        const i  : number = Math.floor(x + s);
        const j  : number = Math.floor(y + s);
        const k  : number = Math.floor(z + s);
        const t  : number = (i + j + k) * G3;
        const x0 : number = x - i + t;
        const y0 : number = y - j + t;
        const z0 : number = z - k + t;

        const rx : number = (x0 >= y0 ? 1 : 0) + (x0 >= z0 ? 1 : 0);
        const ry : number = (y0 >  x0 ? 1 : 0) + (y0 >= z0 ? 1 : 0);
        const rz : number = (z0 >  x0 ? 1 : 0) + (z0 >  y0 ? 1 : 0);
        const i1 : number = rx >= 2 ? 1 : 0;
        const j1 : number = ry >= 2 ? 1 : 0;
        const k1 : number = rz >= 2 ? 1 : 0;
        const i2 : number = rx >= 1 ? 1 : 0;
        const j2 : number = ry >= 1 ? 1 : 0;
        const k2 : number = rz >= 1 ? 1 : 0;

        const x1 : number = x0 - i1 + G3;
        const y1 : number = y0 - j1 + G3;
        const z1 : number = z0 - k1 + G3;
        const x2 : number = x0 - i2 + 2 * G3;
        const y2 : number = y0 - j2 + 2 * G3;
        const z2 : number = z0 - k2 + 2 * G3;
        const x3 : number = x0 - 0.5;
        const y3 : number = y0 - 0.5;
        const z3 : number = z0 - 0.5;

        const ii : number = i & 255;
        const jj : number = j & 255;
        const kk : number = k & 255;
        const g0 : number = PERM_GRAD[ii      + PERM[jj      + PERM[kk     ]]];
        const g1 : number = PERM_GRAD[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]];
        const g2 : number = PERM_GRAD[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]];
        const g3 : number = PERM_GRAD[ii + 1  + PERM[jj + 1  + PERM[kk + 1 ]]];

        const t0 : number = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        const t1 : number = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        const t2 : number = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        const t3 : number = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;

        let n : number = 0;
        if(t0 > 0) n += t0 * t0 * t0 * t0 * (GRAD3[g0] * x0 + GRAD3[g0 + 1] * y0 + GRAD3[g0 + 2] * z0);
        if(t1 > 0) n += t1 * t1 * t1 * t1 * (GRAD3[g1] * x1 + GRAD3[g1 + 1] * y1 + GRAD3[g1 + 2] * z1);
        if(t2 > 0) n += t2 * t2 * t2 * t2 * (GRAD3[g2] * x2 + GRAD3[g2 + 1] * y2 + GRAD3[g2 + 2] * z2);
        if(t3 > 0) n += t3 * t3 * t3 * t3 * (GRAD3[g3] * x3 + GRAD3[g3 + 1] * y3 + GRAD3[g3 + 2] * z3);

        return 32 * n;
    }

    // Optimizado para no escribir en memoria
    function sampleFlow(x : number, y : number, age : number, plume : SmokePlume) : void
    {
        flowX =  DRAFT_SPEED;
        flowY = -riseSpeed * plume.lift / (1 + age * RISE_DECAY);

        if(age <= plume.calm) return;

        // Hermite S-Curve (laminar -> turbulent)
        const ramp : number = Math.min(1, (age - plume.calm) / TURB_RAMP);
        const turb : number = ramp * ramp * (3 - 2 * ramp);

        const nx   : number = x * FIELD_FREQ;
        const ny   : number = (y + simTime * FIELD_LIFT) * FIELD_FREQ;
        const nz   : number = simTime * FIELD_EVOLVE;
        const p0   : number = simplex3(nx,             ny,             nz);
        const px   : number = simplex3(nx + FIELD_EPS, ny,             nz);
        const py   : number = simplex3(nx,             ny + FIELD_EPS, nz);
        const gain : number = FIELD_FORCE * turb / FIELD_EPS;

        flowX += (py - p0) * gain;
        flowY -= (px - p0) * gain;

        for(let v : number = 0; v < vortices.length; ++v)
        {
            const vortex : SmokeVortex = vortices[v];
            const dx     : number      = x - vortex.x;
            const dy     : number      = y - vortex.y;
            const r2     : number      = dx * dx + dy * dy;
            if(r2 > vortex.reach2) continue;

            // Divergence-free Gaussian swirl
            const swirl : number = vortex.strength * turb * Math.exp(-r2 * vortex.invCore2);
            flowX -= swirl * dy;
            flowY += swirl * dx;
        }
    }

    // Plumes
    function createPlume(slot : number, total : number) : SmokePlume
    {
        const plume : SmokePlume = {
            anchorX    : 0,
            slotX      : slot / total,
            swayAmp    : Math.random() * 14   + 6,
            swayFreq   : Math.random() * 0.35 + 0.25,
            swayPhase  : Math.random() * Math.PI * 2,
            calm       : 0,
            lift       : 1,
            emitClock  : 0,
            dragClock  : Math.random() * DRAG_RANGE,
            isDragging : Math.random() > 0.2,
            breakNext  : true,
            xs         : new Float32Array(NODE_CAPACITY),
            ys         : new Float32Array(NODE_CAPACITY),
            born       : new Float64Array(NODE_CAPACITY),
            starts     : new Uint8Array(NODE_CAPACITY),
            head       : 0,
            count      : 0
        };
        relocatePlume(plume, total);
        return plume;
    }

    function relocatePlume(plume : SmokePlume, total : number) : void
    {
        plume.anchorX = plume.slotX + (0.15 + Math.random() * 0.7) / total;
        plume.calm    = CALM_MIN + Math.random() * CALM_RANGE;
        plume.lift    = LIFT_MIN + Math.random() * LIFT_RANGE;
    }

    function emberX(plume : SmokePlume, time : number) : number
    {
        return (
            plume.anchorX * width +
            Math.sin(time * plume.swayFreq       + plume.swayPhase)       * plume.swayAmp +
            Math.sin(time * plume.swayFreq * 2.3 + plume.swayPhase * 1.7) * plume.swayAmp * 0.35
        );
    }

    function updateDrag(plume : SmokePlume, dt : number) : void
    {
        plume.dragClock -= dt;
        if(plume.dragClock > 0) return;

        plume.isDragging = !plume.isDragging;
        if(plume.isDragging)
        {
            plume.dragClock = DRAG_MIN + Math.random() * DRAG_RANGE;
            plume.breakNext = true;
        }
        else
        {
            plume.dragClock = REST_MIN + Math.random() * REST_RANGE;
            if(Math.random() < RELOCATE_CHANCE)
            {
                plume.dragClock += REST_RANGE * 2;
                relocatePlume(plume, plumes.length);
            }
        }
    }

    function emitNodes(plume : SmokePlume, dt : number) : void
    {
        if(!plume.isDragging) return;

        plume.emitClock += dt;
        while(plume.emitClock >= EMIT_STEP)
        {
            plume.emitClock -= EMIT_STEP;

            // Head Start
            const lag  : number = plume.emitClock;
            const slot : number = plume.head;
            plume.xs[slot]     = emberX(plume, simTime - lag);
            plume.ys[slot]     = height + EMBER_DEPTH - riseSpeed * plume.lift * lag;
            plume.born[slot]   = simTime - lag;
            plume.starts[slot] = plume.breakNext ? 1 : 0;
            plume.breakNext    = false;

            plume.head = slot + 1 === NODE_CAPACITY ? 0 : slot + 1;
            if(plume.count < NODE_CAPACITY) plume.count++;
        }
    }

    // Vortices
    function createVortex(lifeFraction : number) : SmokeVortex
    {
        const vortex : SmokeVortex = {
            x        : 0,
            y        : 0,
            spin     : 0,
            invCore2 : 0,
            reach2   : 0,
            strength : 0,
            age      : 0,
            life     : 1
        };
        spawnVortex(vortex, lifeFraction);
        return vortex;
    }

    function spawnVortex(vortex : SmokeVortex, lifeFraction : number) : void
    {
        const core : number = VORTEX_CORE_MIN + Math.random() * VORTEX_CORE_RANGE;
        vortex.x        = Math.random() * width;
        vortex.y        = height * (0.2 + Math.random() * 0.8);
        vortex.spin     = (Math.random() < 0.5 ? -1 : 1) * (VORTEX_SPIN_MIN + Math.random() * VORTEX_SPIN_RANGE);
        vortex.invCore2 = 1 / (core * core);
        vortex.reach2   = (core * 2.5) * (core * 2.5);
        vortex.life     = VORTEX_LIFE_MIN + Math.random() * VORTEX_LIFE_RANGE;
        vortex.age      = vortex.life * lifeFraction;
        vortex.strength = 0;
    }

    function updateVortices(dt : number) : void
    {
        for(let v : number = 0; v < vortices.length; ++v)
        {
            const vortex : SmokeVortex = vortices[v];
            vortex.age += dt;
            vortex.y   -= riseSpeed * VORTEX_LIFT * dt;
            if(vortex.age >= vortex.life) spawnVortex(vortex, 0);

            vortex.strength = vortex.spin * Math.sin(Math.PI * vortex.age / vortex.life);
        }
    }

    // Simulation
    function stepSmoke(dt : number) : void
    {
        simTime += dt;
        updateVortices(dt);

        for(let p : number = 0; p < plumes.length; ++p)
        {
            const plume : SmokePlume   = plumes[p];
            const xs    : Float32Array = plume.xs;
            const ys    : Float32Array = plume.ys;
            const born  : Float64Array = plume.born;

            // Oldest nodes first
            let tail : number = plume.head - plume.count;
            if(tail < 0) tail += NODE_CAPACITY;
            while(plume.count > 0 && simTime - born[tail] >= NODE_LIFE)
            {
                --plume.count;
                tail = tail + 1 === NODE_CAPACITY ? 0 : tail + 1;
            }

            // Advect
            let i : number = tail;
            for(let n : number = 0; n < plume.count; ++n)
            {
                sampleFlow(xs[i], ys[i], simTime - born[i], plume);
                xs[i] += flowX * dt;
                ys[i] += flowY * dt;
                i = i + 1 === NODE_CAPACITY ? 0 : i + 1;
            }

            updateDrag(plume, dt);
            emitNodes(plume, dt);
        }
    }

    // Cambios de tamaño de la ventana
    function buildLook() : void
    {
        const r : number = SOOT_RGB.r;
        const g : number = SOOT_RGB.g;
        const b : number = SOOT_RGB.b;

        let cursor  : number = 0;
        let tallest : number = 0;
        for(let k : number = 0; k < BAND_COUNT; ++k)
        {
            const ageT  : number = (k + 0.5) / BAND_COUNT;
            const age   : number = ageT * NODE_LIFE;
            const wispT : number = Math.min(1, age / WISP_LIFE);
            const coreT : number = Math.min(1, age / CORE_LIFE);
            const wispA : number = WISP_ALPHA * (1 - wispT) * (1 - wispT);
            const coreA : number = CORE_ALPHA * (1 - coreT);

            wispWidth[k] = WISP_BIRTH + (WISP_DEATH - WISP_BIRTH) * wispT;
            wispStyle[k] = `rgba(${r}, ${g}, ${b}, ${wispA.toFixed(4)})`;
            coreStyle[k] = `rgba(${r}, ${g}, ${b}, ${coreA.toFixed(4)})`;

            // Stamps every PUFF_STEP diameters of arc length, a gaussian row sums to ~0.84 / (2 * PUFF_STEP)
            const size    : number = PUFF_BIRTH + (PUFF_DEATH - PUFF_BIRTH) * Math.pow(ageT, PUFF_GROWTH);
            const rampIn  : number = Math.min(1, age / PUFF_FADE_IN);
            const fadeIn  : number = rampIn * rampIn * (3 - 2 * rampIn);
            const target  : number = PUFF_OPACITY * fadeIn * Math.pow(1 - ageT, PUFF_FALLOFF);
            const overlap : number = 0.84 / (2 * PUFF_STEP);
            const cell    : number = Math.ceil(size * RENDER_SCALE) + 2;

            // Longer -> thinner
            const nominal : number = EMIT_STEP * riseSpeed / (1 + age * RISE_DECAY);
            for(let l : number = 0; l < PUFF_LEVELS; ++l) puffLimit[k * PUFF_LEVELS + l] = nominal / LEVEL_RATIO[l];

            puffCellX[k] = cursor;
            puffCellW[k] = cell;
            puffDrawW[k] = cell / RENDER_SCALE;
            puffDrawA[k] = 1 - Math.pow(1 - target, 1 / overlap);
            puffStep[k]  = size * PUFF_STEP;
            cursor      += cell;
            tallest      = Math.max(tallest, cell);
        }

        if(!atlasCtx) return;
        atlasRowH    = tallest;
        atlas.width  = cursor;
        atlas.height = tallest * PUFF_LEVELS;

        // Gaussian-ish falloff optimizado para cada hacer una sola imagen por (band, level)
        for(let l : number = 0; l < PUFF_LEVELS; ++l)
        {
            for(let k : number = 0; k < BAND_COUNT; ++k)
            {
                const radius : number         = (puffCellW[k] - 2) * 0.5;
                const cx     : number         = puffCellX[k] + puffCellW[k] * 0.5;
                const cy     : number         = l * atlasRowH + puffCellW[k] * 0.5;
                const a      : number         = Math.min(1, puffDrawA[k] * LEVEL_GAIN[l]);
                const grad   : CanvasGradient = atlasCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, ${a})`);
                grad.addColorStop(0.20, `rgba(${r}, ${g}, ${b}, ${a * 0.84})`);
                grad.addColorStop(0.40, `rgba(${r}, ${g}, ${b}, ${a * 0.49})`);
                grad.addColorStop(0.60, `rgba(${r}, ${g}, ${b}, ${a * 0.20})`);
                grad.addColorStop(0.80, `rgba(${r}, ${g}, ${b}, ${a * 0.06})`);
                grad.addColorStop(1.00, `rgba(${r}, ${g}, ${b}, 0)`);

                atlasCtx.fillStyle = grad;
                atlasCtx.fillRect(puffCellX[k], l * atlasRowH, puffCellW[k], puffCellW[k]);
            }
        }
    }

    // Optimizado para una vez por plume
    function computeBandCuts() : void
    {
        const stride : number = BAND_COUNT + 1;
        if(bandCuts.length !== plumes.length * stride) bandCuts = new Int32Array(plumes.length * stride);

        for(let p : number = 0; p < plumes.length; ++p)
        {
            const plume : SmokePlume   = plumes[p];
            const born  : Float64Array = plume.born;
            const base  : number       = p * stride;

            let band : number = 0;
            let i    : number = plume.head === 0 ? NODE_CAPACITY - 1 : plume.head - 1;
            for(let o : number = 0; o < plume.count; ++o)
            {
                const nodeBand : number = Math.min(BAND_COUNT - 1, Math.floor((simTime - born[i]) / BAND_SPAN));
                while(band <= nodeBand) bandCuts[base + band++] = o;
                i = i === 0 ? NODE_CAPACITY - 1 : i - 1;
            }
            while(band <= BAND_COUNT) bandCuts[base + band++] = plume.count;
        }
    }

    // Optimizado para no hacer writes a los estados
    // I tried really hard para evitar que tu computadora se incendie
    function stampPlume(c : CanvasRenderingContext2D, plume : SmokePlume) : void
    {
        if(plume.count < 2) return;

        const xs     : Float32Array = plume.xs;
        const ys     : Float32Array = plume.ys;
        const born   : Float64Array = plume.born;
        const starts : Uint8Array   = plume.starts;

        let i     : number = plume.head === 0 ? NODE_CAPACITY - 1 : plume.head - 1;
        let prevX : number = xs[i];
        let prevY : number = ys[i];
        let backX : number = prevX;  // Node before prev (Catmull-Rom P0)
        let backY : number = prevY;
        let carry : number = 0;

        for(let o : number = 1; o < plume.count; ++o)
        {
            const band   : number  = Math.min(BAND_COUNT - 1, Math.floor((simTime - born[i]) / BAND_SPAN));
            const wasEnd : boolean = starts[i] === 1;
            i = i === 0 ? NODE_CAPACITY - 1 : i - 1;

            const x   : number = xs[i];
            const y   : number = ys[i];
            const dx  : number = x - prevX;
            const dy  : number = y - prevY;
            const len : number = Math.sqrt(dx * dx + dy * dy);

            if(wasEnd)
            {
                carry = 0;  // Never bridge filaments
                backX = x;
                backY = y;
                prevX = x;
                prevY = y;
                continue;
            }

            if(band >= PUFF_FIRST_BAND && len > 0)
            {
                const step  : number = puffStep[band];
                const limit : number = band * PUFF_LEVELS;

                let level : number = 0;
                while(level < PUFF_LEVELS && len > puffLimit[limit + level]) level++;

                if(level < PUFF_LEVELS && carry <= len)
                {
                    const srcX  : number  = puffCellX[band];
                    const srcY  : number  = level * atlasRowH;
                    const srcW  : number  = puffCellW[band];
                    const size  : number  = puffDrawW[band];
                    const half  : number  = size * 0.5;

                    // Catmull-Rom entre vecinos para que se queden redondeados y no se hagan polígonos
                    const next  : number  = i === 0 ? NODE_CAPACITY - 1 : i - 1;
                    const ahead : boolean = o + 1 < plume.count && starts[i] === 0;
                    const fwdX  : number  = ahead ? xs[next] : x;
                    const fwdY  : number  = ahead ? ys[next] : y;
                    const bx    : number  = x - backX;
                    const by    : number  = y - backY;
                    const cx    : number  = 2 * backX - 5 * prevX + 4 * x - fwdX;
                    const cy    : number  = 2 * backY - 5 * prevY + 4 * y - fwdY;
                    const ex    : number  = 3 * (prevX - x) + fwdX - backX;
                    const ey    : number  = 3 * (prevY - y) + fwdY - backY;

                    for(let d : number = carry; d <= len; d += step)
                    {
                        const t  : number = d / len;
                        const sx : number = prevX + 0.5 * t * (bx + t * (cx + t * ex));
                        const sy : number = prevY + 0.5 * t * (by + t * (cy + t * ey));
                        if(sy > -half && sy < height + half && sx > -half && sx < width + half)
                        {
                            c.drawImage(atlas, srcX, srcY, srcW, srcW, sx - half, sy - half, size, size);
                        }
                    }
                }

                if(carry > len) carry -= len;
                else            carry  = step - ((len - carry) % step);
            }

            backX = prevX;
            backY = prevY;
            prevX = x;
            prevY = y;
        }
    }

    // Midpoint quadratic smoothing
    function traceBand(c : CanvasRenderingContext2D, band : number) : boolean
    {
        const stride : number = BAND_COUNT + 1;

        let hasPath : boolean = false;
        for(let p : number = 0; p < plumes.length; ++p)
        {
            const plume : SmokePlume = plumes[p];
            const first : number     = bandCuts[p * stride + band];
            const last  : number     = Math.min(plume.count - 1, bandCuts[p * stride + band + 1]);
            if(last - first < 1) continue;

            const xs     : Float32Array = plume.xs;
            const ys     : Float32Array = plume.ys;
            const starts : Uint8Array   = plume.starts;

            let i     : number  = plume.head - 1 - first;
            let lift  : boolean = true;
            let prevX : number  = 0;
            let prevY : number  = 0;
            if(i < 0) i += NODE_CAPACITY;

            for(let o : number = first; o <= last; ++o)
            {
                const x : number = xs[i];
                const y : number = ys[i];

                if(lift)
                {
                    c.moveTo(x, y);
                    lift = false;
                }
                else
                {
                    c.quadraticCurveTo(prevX, prevY, (prevX + x) * 0.5, (prevY + y) * 0.5);
                }

                prevX = x;
                prevY = y;


                if(starts[i] === 1)
                {
                    c.lineTo(x, y);
                    lift = true;
                }
                i = i === 0 ? NODE_CAPACITY - 1 : i - 1;
            }

            if(!lift) c.lineTo(prevX, prevY);
            hasPath = true;
        }

        return hasPath;
    }

    function drawSmoke(c : CanvasRenderingContext2D) : void
    {
        c.clearRect(0, 0, width, height);
        c.globalAlpha = veilAlpha;
        computeBandCuts();

        for(let p : number = 0; p < plumes.length; ++p) stampPlume(c, plumes[p]);

        // Optimizado para una sola iteración por paso de tiempo en vez de por plume
        for(let k : number = WISP_BANDS - 1; k >= 0; --k)
        {
            c.beginPath();
            if(!traceBand(c, k)) continue;

            c.lineWidth   = wispWidth[k];
            c.strokeStyle = wispStyle[k];
            c.stroke();

            if(k >= CORE_BANDS) continue;
            c.lineWidth   = wispWidth[k] * 0.5;
            c.strokeStyle = coreStyle[k];
            c.stroke();
        }
    }

    // Un write al dom por frame a lo máximo
    function applyResize(c : CanvasRenderingContext2D) : void
    {
        pendingResize = false;

        const backW : number = Math.ceil(window.innerWidth  * RENDER_SCALE);
        const backH : number = Math.ceil(window.innerHeight * RENDER_SCALE);
        if(!canvas || (canvas.width === backW && canvas.height === backH && width > 0)) return;

        width         = window.innerWidth;
        height        = window.innerHeight;
        riseSpeed     = height * RISE_RATIO;
        canvas.width  = backW;
        canvas.height = backH;
        c.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
        c.lineCap     = "butt";   // Para que se dividan
        c.lineJoin    = "round";
        buildLook();
    }

    function initSmoke(c : CanvasRenderingContext2D) : void
    {
        seedNoise();
        applyResize(c);

        const plumeCount  : number = Math.max(PLUME_MIN, Math.min(PLUME_MAX, Math.round(width / PLUME_SPACING)));
        const vortexCount : number = Math.max(2, Math.round((width * height) / VORTEX_AREA));

        plumes   = [];
        vortices = [];
        for(let p : number = 0; p < plumeCount;  ++p) plumes.push(createPlume(p, plumeCount));
        for(let v : number = 0; v < vortexCount; ++v) vortices.push(createVortex(Math.random()));

        // Head Start
        for(let t : number = 0; t < WARMUP_TIME; t += WARMUP_STEP) stepSmoke(WARMUP_STEP);
    }

    // Pausar cuando la pantalla está oscurecida por un modal o el overlay
    function isVeilOpen(veil : HTMLElement) : boolean
    {
        return veil.classList.contains("active") ||
              (veil.classList.contains("vespera-overlay") && !veil.classList.contains("hidden"));
    }

    function syncVeils() : void
    {
        let covered : boolean = false;
        for(let v : number = 0; v < veils.length && !covered; ++v) covered = isVeilOpen(veils[v]);

        veilTarget = covered ? 0 : 1;
        if(!covered) wakeSmoke();
    }

    function wakeSmoke() : void
    {
        if(frameHandle !== 0) return;
        lastNow     = 0;
        frameHandle = requestAnimationFrame(renderSmoke);
    }

    function renderSmoke(now : number) : void
    {
        frameHandle = 0;
        if(!ctx) return;
        if(pendingResize) applyResize(ctx);

        const elapsed : number = lastNow === 0 ? 0 : (now - lastNow) * 0.001;
        const dt      : number = Math.min(MAX_DT, elapsed);
        lastNow = now;

        // Ease towards the veil target in real time; once hidden, clear and sleep until the veil lifts
        const fade : number = elapsed / VEIL_FADE;
        veilAlpha = (
            veilTarget > veilAlpha ? Math.min(veilTarget, veilAlpha + fade) :
                                     Math.max(veilTarget, veilAlpha - fade)
        );
        if(veilTarget === 0 && veilAlpha === 0)
        {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        stepSmoke(dt);
        drawSmoke(ctx);
        frameHandle = requestAnimationFrame(renderSmoke);
    }


    // --- LISTENERS ---
    window.addEventListener("resize", () : void =>
    {
        pendingResize = true;
    });

    const veilObserver : MutationObserver = new MutationObserver(syncVeils);
    for(let v : number = 0; v < veils.length; ++v)
    {
        veilObserver.observe(veils[v], { attributes : true, attributeFilter : ["class"] });
    }

    document.addEventListener("DOMContentLoaded", () : void =>
    {
        if(!ctx) return;
        initSmoke(ctx);
        syncVeils();
        wakeSmoke();
    });
})();
