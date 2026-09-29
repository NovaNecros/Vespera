(function () {
    const canvas = document.getElementById("vespera-smoke-canvas");
    if (!canvas)
        return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx)
        return;
    const atlas = document.createElement("canvas");
    const atlasCtx = atlas.getContext("2d");
    if (!atlasCtx)
        return;
    const SOOT_RGB = { r: 4, g: 5, b: 8 };
    const RENDER_SCALE = 0.5;
    const MAX_DT = 1 / 20;
    const VEIL_FADE = 0.30;
    const WARMUP_TIME = 16;
    const WARMUP_STEP = 1 / 8;
    const NODE_LIFE = 18;
    const EMIT_STEP = 1 / 30;
    const NODE_CAPACITY = Math.ceil(NODE_LIFE / EMIT_STEP) + 2;
    const EMBER_DEPTH = 30;
    const PLUME_SPACING = 500;
    const PLUME_MIN = 3;
    const PLUME_MAX = 8;
    const DRAG_MIN = 3.0;
    const DRAG_RANGE = 5.0;
    const REST_MIN = 0.4;
    const REST_RANGE = 1.2;
    const RELOCATE_CHANCE = 0.3;
    const RISE_RATIO = 0.088;
    const RISE_DECAY = 0.08;
    const DRAFT_SPEED = 4;
    const CALM_MIN = 0.2;
    const CALM_RANGE = 1.8;
    const TURB_RAMP = 3.8;
    const LIFT_MIN = 0.85;
    const LIFT_RANGE = 0.30;
    const FIELD_FREQ = 1 / 300;
    const FIELD_EPS = 0.01;
    const FIELD_FORCE = 27;
    const FIELD_EVOLVE = 0.07;
    const FIELD_LIFT = 40;
    const VORTEX_AREA = 320000;
    const VORTEX_SPIN_MIN = 0.5;
    const VORTEX_SPIN_RANGE = 0.8;
    const VORTEX_CORE_MIN = 70;
    const VORTEX_CORE_RANGE = 90;
    const VORTEX_LIFE_MIN = 7;
    const VORTEX_LIFE_RANGE = 7;
    const VORTEX_LIFT = 0.45;
    const BAND_COUNT = 24;
    const BAND_SPAN = NODE_LIFE / BAND_COUNT;
    const WISP_LIFE = 10;
    const WISP_BANDS = Math.ceil(WISP_LIFE / BAND_SPAN);
    const WISP_BIRTH = 1.4;
    const WISP_DEATH = 3.2;
    const WISP_ALPHA = 0.3;
    const CORE_LIFE = 2.4;
    const CORE_BANDS = Math.ceil(CORE_LIFE / BAND_SPAN);
    const CORE_ALPHA = 0.2;
    const PUFF_FIRST_BAND = 1;
    const PUFF_BIRTH = 6;
    const PUFF_DEATH = 130;
    const PUFF_GROWTH = 0.8;
    const PUFF_OPACITY = 0.40;
    const PUFF_FALLOFF = 0.6;
    const PUFF_FADE_IN = 3.5;
    const PUFF_STEP = 0.28;
    const LEVEL_RATIO = new Float32Array([1.50, 0.70, 0.35, 0.15, 0.04]);
    const LEVEL_GAIN = new Float32Array([1.35, 1.00, 0.62, 0.38, 0.20]);
    const PUFF_LEVELS = LEVEL_RATIO.length;
    let width = 0;
    let height = 0;
    let riseSpeed = 0;
    let simTime = 0;
    let lastNow = 0;
    let frameHandle = 0;
    let pendingResize = true;
    let veilAlpha = 0;
    let veilTarget = 1;
    let flowX = 0;
    let flowY = 0;
    let atlasRowH = 0;
    let plumes = [];
    let vortices = [];
    let bandCuts = new Int32Array(0);
    const wispWidth = new Float32Array(BAND_COUNT);
    const wispStyle = [];
    const coreStyle = [];
    const puffCellX = new Float32Array(BAND_COUNT);
    const puffCellW = new Float32Array(BAND_COUNT);
    const puffDrawW = new Float32Array(BAND_COUNT);
    const puffDrawA = new Float32Array(BAND_COUNT);
    const puffStep = new Float32Array(BAND_COUNT);
    const puffLimit = new Float32Array(BAND_COUNT * PUFF_LEVELS);
    const F3 = 1 / 3;
    const G3 = 1 / 6;
    const GRAD3 = new Int8Array([
        1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
        1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
        0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
    ]);
    const PERM = new Uint8Array(512);
    const PERM_GRAD = new Uint8Array(512);
    const veils = Array.from(document.querySelectorAll(".vespera-modal, .vespera-overlay"));
    function seedNoise() {
        const source = new Uint8Array(256);
        for (let i = 0; i < 256; ++i)
            source[i] = i;
        for (let i = 255; i > 0; --i) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = source[i];
            source[i] = source[j];
            source[j] = tmp;
        }
        for (let i = 0; i < 512; ++i) {
            PERM[i] = source[i & 255];
            PERM_GRAD[i] = (PERM[i] % 12) * 3;
        }
    }
    function simplex3(x, y, z) {
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const k = Math.floor(z + s);
        const t = (i + j + k) * G3;
        const x0 = x - i + t;
        const y0 = y - j + t;
        const z0 = z - k + t;
        const rx = (x0 >= y0 ? 1 : 0) + (x0 >= z0 ? 1 : 0);
        const ry = (y0 > x0 ? 1 : 0) + (y0 >= z0 ? 1 : 0);
        const rz = (z0 > x0 ? 1 : 0) + (z0 > y0 ? 1 : 0);
        const i1 = rx >= 2 ? 1 : 0;
        const j1 = ry >= 2 ? 1 : 0;
        const k1 = rz >= 2 ? 1 : 0;
        const i2 = rx >= 1 ? 1 : 0;
        const j2 = ry >= 1 ? 1 : 0;
        const k2 = rz >= 1 ? 1 : 0;
        const x1 = x0 - i1 + G3;
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2 * G3;
        const y2 = y0 - j2 + 2 * G3;
        const z2 = z0 - k2 + 2 * G3;
        const x3 = x0 - 0.5;
        const y3 = y0 - 0.5;
        const z3 = z0 - 0.5;
        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;
        const g0 = PERM_GRAD[ii + PERM[jj + PERM[kk]]];
        const g1 = PERM_GRAD[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]];
        const g2 = PERM_GRAD[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]];
        const g3 = PERM_GRAD[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]];
        const t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        const t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        const t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        const t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        let n = 0;
        if (t0 > 0)
            n += t0 * t0 * t0 * t0 * (GRAD3[g0] * x0 + GRAD3[g0 + 1] * y0 + GRAD3[g0 + 2] * z0);
        if (t1 > 0)
            n += t1 * t1 * t1 * t1 * (GRAD3[g1] * x1 + GRAD3[g1 + 1] * y1 + GRAD3[g1 + 2] * z1);
        if (t2 > 0)
            n += t2 * t2 * t2 * t2 * (GRAD3[g2] * x2 + GRAD3[g2 + 1] * y2 + GRAD3[g2 + 2] * z2);
        if (t3 > 0)
            n += t3 * t3 * t3 * t3 * (GRAD3[g3] * x3 + GRAD3[g3 + 1] * y3 + GRAD3[g3 + 2] * z3);
        return 32 * n;
    }
    function sampleFlow(x, y, age, plume) {
        flowX = DRAFT_SPEED;
        flowY = -riseSpeed * plume.lift / (1 + age * RISE_DECAY);
        if (age <= plume.calm)
            return;
        const ramp = Math.min(1, (age - plume.calm) / TURB_RAMP);
        const turb = ramp * ramp * (3 - 2 * ramp);
        const nx = x * FIELD_FREQ;
        const ny = (y + simTime * FIELD_LIFT) * FIELD_FREQ;
        const nz = simTime * FIELD_EVOLVE;
        const p0 = simplex3(nx, ny, nz);
        const px = simplex3(nx + FIELD_EPS, ny, nz);
        const py = simplex3(nx, ny + FIELD_EPS, nz);
        const gain = FIELD_FORCE * turb / FIELD_EPS;
        flowX += (py - p0) * gain;
        flowY -= (px - p0) * gain;
        for (let v = 0; v < vortices.length; ++v) {
            const vortex = vortices[v];
            const dx = x - vortex.x;
            const dy = y - vortex.y;
            const r2 = dx * dx + dy * dy;
            if (r2 > vortex.reach2)
                continue;
            const swirl = vortex.strength * turb * Math.exp(-r2 * vortex.invCore2);
            flowX -= swirl * dy;
            flowY += swirl * dx;
        }
    }
    function createPlume(slot, total) {
        const plume = {
            anchorX: 0,
            slotX: slot / total,
            swayAmp: Math.random() * 14 + 6,
            swayFreq: Math.random() * 0.35 + 0.25,
            swayPhase: Math.random() * Math.PI * 2,
            calm: 0,
            lift: 1,
            emitClock: 0,
            dragClock: Math.random() * DRAG_RANGE,
            isDragging: Math.random() > 0.2,
            breakNext: true,
            xs: new Float32Array(NODE_CAPACITY),
            ys: new Float32Array(NODE_CAPACITY),
            born: new Float64Array(NODE_CAPACITY),
            starts: new Uint8Array(NODE_CAPACITY),
            head: 0,
            count: 0
        };
        relocatePlume(plume, total);
        return plume;
    }
    function relocatePlume(plume, total) {
        plume.anchorX = plume.slotX + (0.15 + Math.random() * 0.7) / total;
        plume.calm = CALM_MIN + Math.random() * CALM_RANGE;
        plume.lift = LIFT_MIN + Math.random() * LIFT_RANGE;
    }
    function emberX(plume, time) {
        return (plume.anchorX * width +
            Math.sin(time * plume.swayFreq + plume.swayPhase) * plume.swayAmp +
            Math.sin(time * plume.swayFreq * 2.3 + plume.swayPhase * 1.7) * plume.swayAmp * 0.35);
    }
    function updateDrag(plume, dt) {
        plume.dragClock -= dt;
        if (plume.dragClock > 0)
            return;
        plume.isDragging = !plume.isDragging;
        if (plume.isDragging) {
            plume.dragClock = DRAG_MIN + Math.random() * DRAG_RANGE;
            plume.breakNext = true;
        }
        else {
            plume.dragClock = REST_MIN + Math.random() * REST_RANGE;
            if (Math.random() < RELOCATE_CHANCE) {
                plume.dragClock += REST_RANGE * 2;
                relocatePlume(plume, plumes.length);
            }
        }
    }
    function emitNodes(plume, dt) {
        if (!plume.isDragging)
            return;
        plume.emitClock += dt;
        while (plume.emitClock >= EMIT_STEP) {
            plume.emitClock -= EMIT_STEP;
            const lag = plume.emitClock;
            const slot = plume.head;
            plume.xs[slot] = emberX(plume, simTime - lag);
            plume.ys[slot] = height + EMBER_DEPTH - riseSpeed * plume.lift * lag;
            plume.born[slot] = simTime - lag;
            plume.starts[slot] = plume.breakNext ? 1 : 0;
            plume.breakNext = false;
            plume.head = slot + 1 === NODE_CAPACITY ? 0 : slot + 1;
            if (plume.count < NODE_CAPACITY)
                plume.count++;
        }
    }
    function createVortex(lifeFraction) {
        const vortex = {
            x: 0,
            y: 0,
            spin: 0,
            invCore2: 0,
            reach2: 0,
            strength: 0,
            age: 0,
            life: 1
        };
        spawnVortex(vortex, lifeFraction);
        return vortex;
    }
    function spawnVortex(vortex, lifeFraction) {
        const core = VORTEX_CORE_MIN + Math.random() * VORTEX_CORE_RANGE;
        vortex.x = Math.random() * width;
        vortex.y = height * (0.2 + Math.random() * 0.8);
        vortex.spin = (Math.random() < 0.5 ? -1 : 1) * (VORTEX_SPIN_MIN + Math.random() * VORTEX_SPIN_RANGE);
        vortex.invCore2 = 1 / (core * core);
        vortex.reach2 = (core * 2.5) * (core * 2.5);
        vortex.life = VORTEX_LIFE_MIN + Math.random() * VORTEX_LIFE_RANGE;
        vortex.age = vortex.life * lifeFraction;
        vortex.strength = 0;
    }
    function updateVortices(dt) {
        for (let v = 0; v < vortices.length; ++v) {
            const vortex = vortices[v];
            vortex.age += dt;
            vortex.y -= riseSpeed * VORTEX_LIFT * dt;
            if (vortex.age >= vortex.life)
                spawnVortex(vortex, 0);
            vortex.strength = vortex.spin * Math.sin(Math.PI * vortex.age / vortex.life);
        }
    }
    function stepSmoke(dt) {
        simTime += dt;
        updateVortices(dt);
        for (let p = 0; p < plumes.length; ++p) {
            const plume = plumes[p];
            const xs = plume.xs;
            const ys = plume.ys;
            const born = plume.born;
            let tail = plume.head - plume.count;
            if (tail < 0)
                tail += NODE_CAPACITY;
            while (plume.count > 0 && simTime - born[tail] >= NODE_LIFE) {
                --plume.count;
                tail = tail + 1 === NODE_CAPACITY ? 0 : tail + 1;
            }
            let i = tail;
            for (let n = 0; n < plume.count; ++n) {
                sampleFlow(xs[i], ys[i], simTime - born[i], plume);
                xs[i] += flowX * dt;
                ys[i] += flowY * dt;
                i = i + 1 === NODE_CAPACITY ? 0 : i + 1;
            }
            updateDrag(plume, dt);
            emitNodes(plume, dt);
        }
    }
    function buildLook() {
        const r = SOOT_RGB.r;
        const g = SOOT_RGB.g;
        const b = SOOT_RGB.b;
        let cursor = 0;
        let tallest = 0;
        for (let k = 0; k < BAND_COUNT; ++k) {
            const ageT = (k + 0.5) / BAND_COUNT;
            const age = ageT * NODE_LIFE;
            const wispT = Math.min(1, age / WISP_LIFE);
            const coreT = Math.min(1, age / CORE_LIFE);
            const wispA = WISP_ALPHA * (1 - wispT) * (1 - wispT);
            const coreA = CORE_ALPHA * (1 - coreT);
            wispWidth[k] = WISP_BIRTH + (WISP_DEATH - WISP_BIRTH) * wispT;
            wispStyle[k] = `rgba(${r}, ${g}, ${b}, ${wispA.toFixed(4)})`;
            coreStyle[k] = `rgba(${r}, ${g}, ${b}, ${coreA.toFixed(4)})`;
            const size = PUFF_BIRTH + (PUFF_DEATH - PUFF_BIRTH) * Math.pow(ageT, PUFF_GROWTH);
            const rampIn = Math.min(1, age / PUFF_FADE_IN);
            const fadeIn = rampIn * rampIn * (3 - 2 * rampIn);
            const target = PUFF_OPACITY * fadeIn * Math.pow(1 - ageT, PUFF_FALLOFF);
            const overlap = 0.84 / (2 * PUFF_STEP);
            const cell = Math.ceil(size * RENDER_SCALE) + 2;
            const nominal = EMIT_STEP * riseSpeed / (1 + age * RISE_DECAY);
            for (let l = 0; l < PUFF_LEVELS; ++l)
                puffLimit[k * PUFF_LEVELS + l] = nominal / LEVEL_RATIO[l];
            puffCellX[k] = cursor;
            puffCellW[k] = cell;
            puffDrawW[k] = cell / RENDER_SCALE;
            puffDrawA[k] = 1 - Math.pow(1 - target, 1 / overlap);
            puffStep[k] = size * PUFF_STEP;
            cursor += cell;
            tallest = Math.max(tallest, cell);
        }
        if (!atlasCtx)
            return;
        atlasRowH = tallest;
        atlas.width = cursor;
        atlas.height = tallest * PUFF_LEVELS;
        for (let l = 0; l < PUFF_LEVELS; ++l) {
            for (let k = 0; k < BAND_COUNT; ++k) {
                const radius = (puffCellW[k] - 2) * 0.5;
                const cx = puffCellX[k] + puffCellW[k] * 0.5;
                const cy = l * atlasRowH + puffCellW[k] * 0.5;
                const a = Math.min(1, puffDrawA[k] * LEVEL_GAIN[l]);
                const grad = atlasCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
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
    function computeBandCuts() {
        const stride = BAND_COUNT + 1;
        if (bandCuts.length !== plumes.length * stride)
            bandCuts = new Int32Array(plumes.length * stride);
        for (let p = 0; p < plumes.length; ++p) {
            const plume = plumes[p];
            const born = plume.born;
            const base = p * stride;
            let band = 0;
            let i = plume.head === 0 ? NODE_CAPACITY - 1 : plume.head - 1;
            for (let o = 0; o < plume.count; ++o) {
                const nodeBand = Math.min(BAND_COUNT - 1, Math.floor((simTime - born[i]) / BAND_SPAN));
                while (band <= nodeBand)
                    bandCuts[base + band++] = o;
                i = i === 0 ? NODE_CAPACITY - 1 : i - 1;
            }
            while (band <= BAND_COUNT)
                bandCuts[base + band++] = plume.count;
        }
    }
    function stampPlume(c, plume) {
        if (plume.count < 2)
            return;
        const xs = plume.xs;
        const ys = plume.ys;
        const born = plume.born;
        const starts = plume.starts;
        let i = plume.head === 0 ? NODE_CAPACITY - 1 : plume.head - 1;
        let prevX = xs[i];
        let prevY = ys[i];
        let backX = prevX;
        let backY = prevY;
        let carry = 0;
        for (let o = 1; o < plume.count; ++o) {
            const band = Math.min(BAND_COUNT - 1, Math.floor((simTime - born[i]) / BAND_SPAN));
            const wasEnd = starts[i] === 1;
            i = i === 0 ? NODE_CAPACITY - 1 : i - 1;
            const x = xs[i];
            const y = ys[i];
            const dx = x - prevX;
            const dy = y - prevY;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (wasEnd) {
                carry = 0;
                backX = x;
                backY = y;
                prevX = x;
                prevY = y;
                continue;
            }
            if (band >= PUFF_FIRST_BAND && len > 0) {
                const step = puffStep[band];
                const limit = band * PUFF_LEVELS;
                let level = 0;
                while (level < PUFF_LEVELS && len > puffLimit[limit + level])
                    level++;
                if (level < PUFF_LEVELS && carry <= len) {
                    const srcX = puffCellX[band];
                    const srcY = level * atlasRowH;
                    const srcW = puffCellW[band];
                    const size = puffDrawW[band];
                    const half = size * 0.5;
                    const next = i === 0 ? NODE_CAPACITY - 1 : i - 1;
                    const ahead = o + 1 < plume.count && starts[i] === 0;
                    const fwdX = ahead ? xs[next] : x;
                    const fwdY = ahead ? ys[next] : y;
                    const bx = x - backX;
                    const by = y - backY;
                    const cx = 2 * backX - 5 * prevX + 4 * x - fwdX;
                    const cy = 2 * backY - 5 * prevY + 4 * y - fwdY;
                    const ex = 3 * (prevX - x) + fwdX - backX;
                    const ey = 3 * (prevY - y) + fwdY - backY;
                    for (let d = carry; d <= len; d += step) {
                        const t = d / len;
                        const sx = prevX + 0.5 * t * (bx + t * (cx + t * ex));
                        const sy = prevY + 0.5 * t * (by + t * (cy + t * ey));
                        if (sy > -half && sy < height + half && sx > -half && sx < width + half) {
                            c.drawImage(atlas, srcX, srcY, srcW, srcW, sx - half, sy - half, size, size);
                        }
                    }
                }
                if (carry > len)
                    carry -= len;
                else
                    carry = step - ((len - carry) % step);
            }
            backX = prevX;
            backY = prevY;
            prevX = x;
            prevY = y;
        }
    }
    function traceBand(c, band) {
        const stride = BAND_COUNT + 1;
        let hasPath = false;
        for (let p = 0; p < plumes.length; ++p) {
            const plume = plumes[p];
            const first = bandCuts[p * stride + band];
            const last = Math.min(plume.count - 1, bandCuts[p * stride + band + 1]);
            if (last - first < 1)
                continue;
            const xs = plume.xs;
            const ys = plume.ys;
            const starts = plume.starts;
            let i = plume.head - 1 - first;
            let lift = true;
            let prevX = 0;
            let prevY = 0;
            if (i < 0)
                i += NODE_CAPACITY;
            for (let o = first; o <= last; ++o) {
                const x = xs[i];
                const y = ys[i];
                if (lift) {
                    c.moveTo(x, y);
                    lift = false;
                }
                else {
                    c.quadraticCurveTo(prevX, prevY, (prevX + x) * 0.5, (prevY + y) * 0.5);
                }
                prevX = x;
                prevY = y;
                if (starts[i] === 1) {
                    c.lineTo(x, y);
                    lift = true;
                }
                i = i === 0 ? NODE_CAPACITY - 1 : i - 1;
            }
            if (!lift)
                c.lineTo(prevX, prevY);
            hasPath = true;
        }
        return hasPath;
    }
    function drawSmoke(c) {
        c.clearRect(0, 0, width, height);
        c.globalAlpha = veilAlpha;
        computeBandCuts();
        for (let p = 0; p < plumes.length; ++p)
            stampPlume(c, plumes[p]);
        for (let k = WISP_BANDS - 1; k >= 0; --k) {
            c.beginPath();
            if (!traceBand(c, k))
                continue;
            c.lineWidth = wispWidth[k];
            c.strokeStyle = wispStyle[k];
            c.stroke();
            if (k >= CORE_BANDS)
                continue;
            c.lineWidth = wispWidth[k] * 0.5;
            c.strokeStyle = coreStyle[k];
            c.stroke();
        }
    }
    function applyResize(c) {
        pendingResize = false;
        const backW = Math.ceil(window.innerWidth * RENDER_SCALE);
        const backH = Math.ceil(window.innerHeight * RENDER_SCALE);
        if (!canvas || (canvas.width === backW && canvas.height === backH && width > 0))
            return;
        width = window.innerWidth;
        height = window.innerHeight;
        riseSpeed = height * RISE_RATIO;
        canvas.width = backW;
        canvas.height = backH;
        c.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
        c.lineCap = "butt";
        c.lineJoin = "round";
        buildLook();
    }
    function initSmoke(c) {
        seedNoise();
        applyResize(c);
        const plumeCount = Math.max(PLUME_MIN, Math.min(PLUME_MAX, Math.round(width / PLUME_SPACING)));
        const vortexCount = Math.max(2, Math.round((width * height) / VORTEX_AREA));
        plumes = [];
        vortices = [];
        for (let p = 0; p < plumeCount; ++p)
            plumes.push(createPlume(p, plumeCount));
        for (let v = 0; v < vortexCount; ++v)
            vortices.push(createVortex(Math.random()));
        for (let t = 0; t < WARMUP_TIME; t += WARMUP_STEP)
            stepSmoke(WARMUP_STEP);
    }
    function isVeilOpen(veil) {
        return veil.classList.contains("active") ||
            (veil.classList.contains("vespera-overlay") && !veil.classList.contains("hidden"));
    }
    function syncVeils() {
        let covered = false;
        for (let v = 0; v < veils.length && !covered; ++v)
            covered = isVeilOpen(veils[v]);
        veilTarget = covered ? 0 : 1;
        if (!covered)
            wakeSmoke();
    }
    let isSmokeDisabled = localStorage.getItem("vespera_smoke_paused") === "true";
    function toggleSmoke(forcedState) {
        isSmokeDisabled = forcedState !== undefined ? forcedState : !isSmokeDisabled;
        localStorage.setItem("vespera_smoke_paused", isSmokeDisabled ? "true" : "false");
        if (isSmokeDisabled) {
            if (frameHandle !== 0) {
                cancelAnimationFrame(frameHandle);
                frameHandle = 0;
            }
            if (ctx)
                ctx.clearRect(0, 0, width, height);
        }
        else {
            wakeSmoke();
        }
        return isSmokeDisabled;
    }
    function wakeSmoke() {
        if (isSmokeDisabled || frameHandle !== 0)
            return;
        lastNow = 0;
        frameHandle = requestAnimationFrame(renderSmoke);
    }
    function renderSmoke(now) {
        frameHandle = 0;
        if (isSmokeDisabled || !ctx)
            return;
        if (pendingResize)
            applyResize(ctx);
        const elapsed = lastNow === 0 ? 0 : (now - lastNow) * 0.001;
        const dt = Math.min(MAX_DT, elapsed);
        lastNow = now;
        const fade = elapsed / VEIL_FADE;
        veilAlpha = (veilTarget > veilAlpha ? Math.min(veilTarget, veilAlpha + fade) :
            Math.max(veilTarget, veilAlpha - fade));
        if (veilTarget === 0 && veilAlpha === 0) {
            ctx.clearRect(0, 0, width, height);
            return;
        }
        stepSmoke(dt);
        drawSmoke(ctx);
        frameHandle = requestAnimationFrame(renderSmoke);
    }
    window.addEventListener("resize", () => {
        pendingResize = true;
    });
    const veilObserver = new MutationObserver(syncVeils);
    for (let v = 0; v < veils.length; ++v) {
        veilObserver.observe(veils[v], { attributes: true, attributeFilter: ["class"] });
    }
    document.addEventListener("DOMContentLoaded", () => {
        if (!ctx)
            return;
        initSmoke(ctx);
        syncVeils();
        wakeSmoke();
    });
    window.vesperaToggleSmoke = toggleSmoke;
    window.vesperaIsSmokePaused = () => isSmokeDisabled;
})();
export {};
