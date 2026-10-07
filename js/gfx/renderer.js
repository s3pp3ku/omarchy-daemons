/* Omarchy Lemmings — renderer.
   Integer-zoom pixel art: world pixels are scaled up with nearest-neighbour,
   so lemmings and terrain stay crisp. Owns the camera, particles, minimap
   and debug overlays. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const ST = OL.ST, C = OL.C, M = OL.M;
  const S = OL.Scenery;

  /* 3x5 pixel digits for bomb countdowns */
  const DIGITS = {
    1: [".#.", "##.", ".#.", ".#.", "###"], 2: ["##.", "..#", ".#.", "#..", "###"],
    3: ["##.", "..#", ".#.", "..#", "##."], 4: ["#.#", "#.#", "###", "..#", "..#"],
    5: ["###", "#..", "##.", "..#", "##."],
  };

  class Renderer {
    constructor(canvas, minimap) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.mm = minimap;
      this.mmCtx = minimap ? minimap.getContext("2d") : null;
      this.atlas = OL.Sprites.buildAtlas(document);
      this.buildThemeAssets();
      this.zoom = 3;
      this.cam = { x: 0, y: 0 };
      this.particles = [];
      this.flashes = [];
      this.shake = 0;
      this.frame = 0;
      this.hover = null;
      this.debug = { materials: false, labels: false, zones: false };
      this.mouse = null;
    }

    /* ------------------------------------------------------------ setup */
    /* hatch and gate art depend on the current theme */
    buildThemeAssets() {
      this.hatch = [0, 1, 2, 3].map((f) => S.drawHatch(document, f, false));
      this.hatchBlink = [0, 1, 2, 3].map((f) => S.drawHatch(document, f, true));
      this.gate = [0, 1, 2, 3, 4, 5].map((f) => S.drawGate(document, f));
    }

    attach(sim) {
      this.buildThemeAssets();
      this.sim = sim;
      this.tr = new OL.TerrainRenderer(document, sim.terrain);
      this.particles.length = 0;
      this.backdrop = null;
      this.mmVersion = -1;
      this.buildDecor(sim.level);
      this.resize();
      const lv = sim.level;
      const start = lv.camera || { x: sim.entrances[0].x - this.viewW() / 2, y: 0 };
      this.cam.x = start.x; this.cam.y = start.y !== undefined ? start.y : this.sim.H;
      this.clampCam();
    }

    /* Non-colliding scenery: dim back-walls (any material, drawn faint) and
       hanging network cables with blinking node lights. */
    buildDecor(lv) {
      this.decor = null; this.leds = [];
      const list = lv.decor || [];
      if (!list.length) return;
      const walls = list.filter((d) => d.m);
      let cv;
      if (walls.length) {
        const t = OL.buildTerrain({ size: lv.size, terrain: walls });
        cv = new OL.TerrainRenderer(document, t).canvas;
      } else {
        cv = document.createElement("canvas"); cv.width = lv.size[0]; cv.height = lv.size[1];
      }
      const g = cv.getContext("2d");
      for (const d of list) {
        if (!d.cable) continue;
        const [a, b] = d.cable, sag = d.sag || 20;
        const n = Math.ceil(Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]));
        g.fillStyle = d.color || OL.T.line;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t);
          g.fillRect(Math.round(x), Math.round(y), 1, 1);
          if (d.leds && i % d.leds === Math.floor(d.leds / 2)) this.leds.push([Math.round(x), Math.round(y) + 1, i]);
        }
      }
      this.decor = cv;
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const r = this.cv.getBoundingClientRect();
      this.cv.width = Math.max(1, Math.round(r.width * dpr));
      this.cv.height = Math.max(1, Math.round(r.height * dpr));
      this.dpr = dpr;
      if (!this.sim) return;
      const fit = this.cv.height / this.sim.H;
      if (this.userZoom) this.zoom = this.userZoom;
      else this.zoom = Math.max(1, Math.round(fit));
      // backdrop width depends on view width
      this.backdrop = S.buildBackdrop(document, this.sim.W, this.sim.H, Math.ceil(this.viewW()) + 4, this.sim.level.seed || 3);
      this.clampCam();
    }

    setZoom(z) {
      const cx = this.cam.x + this.viewW() / 2, cy = this.cam.y + this.viewH() / 2;
      this.userZoom = Math.max(1, Math.min(8, z));
      this.resize();
      this.cam.x = cx - this.viewW() / 2; this.cam.y = cy - this.viewH() / 2;
      this.clampCam();
    }

    viewW() { return this.cv.width / this.zoom; }
    viewH() { return this.cv.height / this.zoom; }

    clampCam() {
      if (!this.sim) return;
      const vw = this.viewW(), vh = this.viewH();
      if (vw >= this.sim.W) this.cam.x = (this.sim.W - vw) / 2;
      else this.cam.x = Math.max(0, Math.min(this.sim.W - vw, this.cam.x));
      if (vh >= this.sim.H) this.cam.y = (this.sim.H - vh);       // anchor to the bottom
      else this.cam.y = Math.max(0, Math.min(this.sim.H - vh, this.cam.y));
    }

    /* screen (css px) -> world px */
    toWorld(sx, sy) {
      return { x: (sx * this.dpr) / this.zoom + this.cam.x, y: (sy * this.dpr) / this.zoom + this.cam.y };
    }

    /* ---------------------------------------------------------- particles */
    burst(x, y, n, colors, speed, up, life, opt) {
      opt = opt || {};
      for (let i = 0; i < n; i++) {
        let a = Math.random() * Math.PI * 2;
        if (opt.cone !== undefined) a = opt.cone + (Math.random() - 0.5) * (opt.spread || 1.4);
        const s = (0.3 + Math.random()) * speed;
        const L = (life || 30) * (0.6 + Math.random() * 0.6);
        this.particles.push({
          x: x + (Math.random() - 0.5) * (opt.jitter || 0), y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - (up || 0),
          life: L, max: L, g: opt.g === undefined ? 0.08 : opt.g,
          c: colors[(Math.random() * colors.length) | 0],
          size: opt.big && Math.random() < opt.big ? 2 : 1,
          fade: !!opt.fade, glow: !!opt.glow,
        });
      }
    }

    /* debris colours per material (what is being broken) */
    debris(mat) {
      const D = {
        [M.DIRT]: ["#7b5036", "#a07650", "#5b3a28", "#8a5c3d"],
        [M.ROCK]: ["#0f4a34", "#14583f", "#b8763a", "#cdbb88", "#f0c35a"],
        [M.BRICK]: ["#0f5a3c", "#7dffd4", "#f0c35a"],
        [M.OW_L]: ["#352950", "#9b6bff", "#c9a8ff"],
        [M.OW_R]: ["#352950", "#9b6bff", "#c9a8ff"],
      };
      return D[mat] || D[M.DIRT];
    }

    /* dig / bash / mine: chunky debris + a dust puff + the odd spark */
    chips(e, n, cone, spread, speed) {
      if (!e.mat) return;                 // swung at air: nothing to throw
      const cols = this.debris(e.mat);
      this.burst(e.x, e.y, n, cols, speed, 0.6, 34, { cone, spread, big: 0.45, jitter: 6 });
      this.burst(e.x, e.y, 2, ["rgba(170,180,175,0.35)", "rgba(120,130,125,0.3)"], 0.35, 0.25, 26, { g: -0.004, fade: true, big: 1, jitter: 8 });
      if (Math.random() < 0.3) this.burst(e.x, e.y, 2, ["#ffe27a", "#ffffff"], 1.6, 0.6, 10, { cone, spread: 1, g: 0.02 });
    }

    onEvents(events) {
      for (const e of events) {
        const back = e.dir > 0 ? Math.PI : 0;          // debris flies back toward the worker
        switch (e.type) {
          case "dig": this.chips(e, 5, -Math.PI / 2, 2.2, 1.5); break;
          case "bash": this.chips(e, 8, back - (e.dir > 0 ? -0.5 : 0.5), 1.3, 1.8); break;
          case "mine": this.chips(e, 9, back - (e.dir > 0 ? -0.7 : 0.7), 1.4, 1.8); break;
          case "brick": this.burst(e.x, e.y, 3, ["#7dffd4", OL.T.accent, "#f0c35a"], 0.6, 0.4, 16, { glow: true }); break;
          case "clink": this.burst(e.x, e.y, 16, ["#ffe27a", "#ffffff", OL.T.accent2], 2.2, 0.6, 18, { glow: true, g: 0.05 }); this.shake = Math.max(this.shake || 0, 3); break;
          case "boom":
            this.burst(e.x, e.y, 70, ["#ffe27a", "#ff6a2b", "#ff3b4e", "#7b5036", "#3fd46c", "#9a86f0"], 3.2, 0.9, 60, { big: 0.5 });
            this.burst(e.x, e.y, 14, ["rgba(200,200,190,0.35)"], 0.8, 0.3, 50, { g: -0.01, fade: true, big: 1 });
            this.flashes.push({ x: e.x, y: e.y, t: 0 });
            this.shake = Math.max(this.shake || 0, 8);
            break;
          case "die":
            if (e.cause === "burn") this.burst(e.x, e.y - 4, 18, ["#ffe27a", "#ff6a2b", "#2b2a3a"], 1.0, 1.4, 40, { glow: true });
            else if (e.cause === "drown") this.burst(e.x, e.y, 16, ["#c8fbff", "#6fe3ff", "#2fb3e8"], 1.3, 1.7, 30);
            else if (e.cause === "splat") this.burst(e.x, e.y, 14, ["#3fd46c", "#9a86f0", "#3c5ee0"], 1.5, 0.9, 26, { big: 0.4 });
            break;
          case "exit": this.burst(e.x, e.y - 10, 16, [OL.T.accentHot, OL.T.accent, OL.T.accent2], 0.8, 1.3, 44, { glow: true, g: 0.01 }); break;
          case "crush": this.burst(e.x, e.y - 2, 14, ["#ffe27a", "#ffffff", OL.T.warn], 1.8, 0.4, 16, { g: 0.06 }); this.shake = Math.max(this.shake || 0, 5); break;
          case "assign": this.burst(e.x, e.y, 8, [OL.T.accent, OL.T.accentHot], 1.0, 0.2, 16, { glow: true }); break;
        }
      }
    }

    stepParticles() {
      const t = this.sim && this.sim.terrain;
      for (const p of this.particles) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life--;
        if (t && p.vy > 0 && t.solid(p.x | 0, p.y | 0)) { p.vy *= -0.3; p.vx *= 0.6; p.y -= 1; }
      }
      if (this.particles.length > 1800) this.particles.splice(0, this.particles.length - 1800);
      for (const f of this.flashes) f.t++;
      this.flashes = this.flashes.filter((f) => f.t < 14);
      if (this.shake > 0) this.shake *= 0.82;
      if (this.shake < 0.3) this.shake = 0;
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    /* --------------------------------------------------------------- draw */
    animFrame(l) {
      const tk = this.sim.tick;
      switch (l.state) {
        case ST.WALK: return ["walk", ((tk + l.id * 3) >> 1) & 3];
        case ST.FALL: return ["fall", (tk >> 2) & 1];
        case ST.BUILD: return ["build", Math.floor(((l.t % C.BUILD_PERIOD) * 6) / C.BUILD_PERIOD)];
        case ST.SHRUG: return ["shrug", (l.t >> 3) & 1];
        case ST.DIG: return ["dig", (l.t >> 1) & 3];
        case ST.BASH: return ["bash", Math.floor(((l.t % C.BASH_PERIOD) * 4) / C.BASH_PERIOD)];
        case ST.MINE: return ["mine", Math.floor(((l.t % C.MINE_PERIOD) * 4) / C.MINE_PERIOD)];
        case ST.BLOCK: return ["block", (tk >> 3) & 1];
        case ST.EXIT: return ["exit", Math.min(3, Math.floor((l.t * 4) / C.EXIT_TICKS))];
        case ST.DIE: {
          const f = Math.min(3, Math.floor((l.t * 4) / C.DIE_TICKS));
          if (l.cause === "burn") return ["burn", f];
          if (l.cause === "drown") return ["drown", f];
          if (l.cause === "splat") return ["splat", f];
          return null;
        }
      }
      return null;
    }

    draw(opts) {
      opts = opts || {};
      const ctx = this.ctx, z = this.zoom, sim = this.sim;
      this.frame++;
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = OL.T.void;
      ctx.fillRect(0, 0, this.cv.width, this.cv.height);
      if (!sim) return;
      this.tr.update();

      const cx = this.cam.x, cy = this.cam.y;
      const W = sim.W, H = sim.H;
      // world -> screen: s = (w - cam) * z
      const sh = this.shake ? (Math.random() - 0.5) * this.shake * z * 0.5 : 0;
      const vx = Math.round(-cx * z + sh), vy = Math.round(-cy * z + sh * 0.6);

      /* above the world's ceiling: solid dark rock band */
      if (vy > 0) { ctx.fillStyle = OL.T.ceil; ctx.fillRect(0, 0, this.cv.width, vy); ctx.fillStyle = OL.T.accentDim; ctx.fillRect(0, vy - 2, this.cv.width, 1); }

      /* backdrop */
      if (this.backdrop) {
        for (const L of this.backdrop.layers) {
          const ox = Math.round(-cx * L.f * z);
          ctx.drawImage(L.c, ox, vy, L.c.width * z, H * z);
        }
      }

      /* world */
      ctx.save();
      ctx.translate(vx, vy);
      ctx.scale(z, z);

      // entrance hatches (behind lemmings)
      const openF = Math.min(3, Math.max(0, Math.floor((sim.tick - (C.OPEN_DELAY - 16)) / 4)));
      for (const e of sim.entrances) {
        ctx.drawImage(((this.frame >> 4) & 1 ? this.hatchBlink : this.hatch)[sim.tick < C.OPEN_DELAY - 16 ? 0 : openF], e.x - S.HATCH.AX, e.y - S.HATCH.AY);
      }
      for (const e of sim.exits) {
        ctx.drawImage(this.gate[(this.frame >> 3) % 6], e.x - S.GATE.AX, e.y - S.GATE.AY);
      }

      // back-walls and cables
      if (this.decor && !this.debug.materials) {
        ctx.globalAlpha = 0.34;
        ctx.drawImage(this.decor, 0, 0);
        ctx.globalAlpha = 1;
        for (const L of this.leds) {
          const on = ((this.frame >> 4) + L[2]) % 5;
          ctx.fillStyle = on === 0 ? OL.T.accentHot : on === 1 ? OL.T.accent : OL.T.accentDeep;
          ctx.fillRect(L[0], L[1], 1, 1);
        }
      }

      // terrain + glow
      if (this.debug.materials) this.drawMaterials(ctx);
      else {
        ctx.drawImage(this.tr.canvas, 0, 0);
        ctx.drawImage(this.tr.fluidFrame(this.frame >> 3), 0, 0);
      }
      ctx.restore();

      // bloom (smooth scaling for a soft glow)
      if (!this.debug.materials) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.55;
        ctx.drawImage(this.tr.getGlow(), vx, vy, W * z, H * z);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(vx, vy);
      ctx.scale(z, z);
      ctx.imageSmoothingEnabled = false;

      /* sliding window platforms */
      for (const p of sim.platforms) this.drawWindowPlatform(ctx, p);

      /* lemmings */
      const A = this.atlas;
      for (const l of sim.lems) {
        if (l.state === ST.OUT) continue;
        const fr = this.animFrame(l);
        if (!fr) continue;
        const f = A.frame(fr[0], fr[1], l.dir);
        if (l.state === ST.EXIT) ctx.globalAlpha = 1 - Math.max(0, (l.t - C.EXIT_TICKS / 2) / (C.EXIT_TICKS / 2));
        ctx.drawImage(A.canvas, f.sx, f.sy, A.FW, A.FH, l.x - A.OX, l.y - A.OY, A.FW, A.FH);
        ctx.globalAlpha = 1;
        if (l.fuse >= 0) this.drawDigit(ctx, Math.ceil(l.fuse / C.TPS) || 1, l.x - 1, l.y - 25);
      }

      /* OOM killers (in front of lemmings) */
      for (const k of sim.crushers) this.drawCrusher(ctx, k, sim);

      /* hover bracket */
      const h = opts.hover;
      if (h && h.state !== ST.OUT) {
        const col = opts.hoverOk ? OL.T.accent : OL.T.dim;
        this.bracket(ctx, h.x - 7, h.y - 18, 15, 20, col);
      }

      /* particles */
      for (const p of this.particles) {
        ctx.globalAlpha = p.fade ? Math.max(0, p.life / p.max) : 1;
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
      /* explosion flash rings */
      for (const f of this.flashes) {
        const r = 4 + f.t * 2.2;
        ctx.globalAlpha = 1 - f.t / 14;
        ctx.strokeStyle = f.t < 4 ? "#fff6c8" : "#ff6a2b";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* debug overlays */
      if (this.debug.zones) this.drawZones(ctx);
      ctx.restore();
      if (this.debug.labels) this.drawLabels(ctx, vx, vy, z);
      if (opts.paused) this.drawPaused(ctx);
      this.drawMinimap();
    }

    drawWindowPlatform(ctx, p) {
      const T = OL.T, x = p.x, y = p.y, w = p.w, h = p.h;
      ctx.fillStyle = T.panel; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = T.accentDim; ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); ctx.fillRect(x, y + h - 1, w, 1);
      ctx.fillStyle = T.accent; ctx.fillRect(x, y, w, 1);
      if (h >= 5) {
        ctx.fillStyle = T.line2; ctx.fillRect(x + 1, y + 1, w - 2, 2);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 ? T.accentHot : T.accentDim; ctx.fillRect(x + w - 5 - i * 3, y + 1, 2, 2); }
      }
      // little "moving" chevrons under the window
      const t = this.frame >> 3;
      ctx.fillStyle = T.accentDim;
      if (p.axis === "x") for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + ((i * 5 + t) % Math.max(6, w - 8)), y + h, 1, 1);
    }

    drawCrusher(ctx, k, sim) {
      const T = OL.T;
      const ph = sim.crusherPhase(k, sim.tick);
      const headH = 10, topB = k.top + headH, floorB = k.y;
      let bottom;
      if (ph.slam) bottom = floorB;
      else if (ph.c < k.rise) bottom = Math.round(floorB - ((floorB - topB) * ph.c) / k.rise);
      else bottom = topB;
      if (ph.warn) bottom += (this.frame >> 1) & 1;          // shudder before the slam
      const hw = (k.w >> 1) + 3, x0 = k.x - hw, w = hw * 2 + 1, y0 = bottom - headH + 1;
      // piston
      ctx.fillStyle = "#3d444f"; ctx.fillRect(k.x - 2, k.top, 5, Math.max(0, y0 - k.top));
      ctx.fillStyle = "#6c7684"; ctx.fillRect(k.x - 1, k.top, 1, Math.max(0, y0 - k.top));
      // head
      ctx.fillStyle = "#14181d"; ctx.fillRect(x0, y0, w, headH);
      ctx.fillStyle = "#2c323a"; ctx.fillRect(x0 + 1, y0 + 1, w - 2, headH - 2);
      // hazard stripes
      for (let i = 0; i < w - 2; i++) {
        const on = ((i + 0) >> 1) & 1;
        ctx.fillStyle = on ? T.warn : "#14181d";
        ctx.fillRect(x0 + 1 + i, y0 + headH - 3, 1, 2);
      }
      // OOM label
      this.tinyText(ctx, "OOM", k.x - 5, y0 + 1, ph.slam ? T.danger : "#8592a1");
      // warning light
      const lit = ph.slam || (ph.warn && ((this.frame >> 2) & 1));
      ctx.fillStyle = lit ? T.danger : OL.mix(T.danger, "#000000", 0.6);
      ctx.fillRect(x0 + w - 3, y0 + 1, 2, 2);
      if (lit) { ctx.globalAlpha = 0.25; ctx.fillRect(x0 - 2, y0 - 2, w + 4, headH + 4); ctx.globalAlpha = 1; }
    }

    tinyText(ctx, str, x, y, col) {
      const G = { O: ["###", "#.#", "#.#", "#.#", "###"], M: ["#.#", "###", "###", "#.#", "#.#"] };
      ctx.fillStyle = col;
      for (const ch of str) {
        const g = G[ch];
        if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === "#") ctx.fillRect(x + c, y + r, 1, 1);
        x += 4;
      }
    }

    bracket(ctx, x, y, w, h, col) {
      ctx.fillStyle = col;
      const L = 3;
      ctx.fillRect(x, y, L, 1); ctx.fillRect(x, y, 1, L);
      ctx.fillRect(x + w - L, y, L, 1); ctx.fillRect(x + w - 1, y, 1, L);
      ctx.fillRect(x, y + h - 1, L, 1); ctx.fillRect(x, y + h - L, 1, L);
      ctx.fillRect(x + w - L, y + h - 1, L, 1); ctx.fillRect(x + w - 1, y + h - L, 1, L);
    }

    drawDigit(ctx, n, x, y) {
      const g = DIGITS[Math.min(5, n)];
      if (!g) return;
      ctx.fillStyle = "#0b120e";
      ctx.fillRect(x - 1, y - 1, 5, 7);
      ctx.fillStyle = "#ff6a2b";
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === "#") ctx.fillRect(x + c, y + r, 1, 1);
    }

    drawPaused(ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = OL.T.accentDim;
      ctx.lineWidth = 2 * this.dpr;
      ctx.strokeRect(this.dpr, this.dpr, this.cv.width - 2 * this.dpr, this.cv.height - 2 * this.dpr);
      ctx.restore();
    }

    drawMaterials(ctx) {
      if (!this.matCanvas || this.matVersion !== this.sim.terrain.version) {
        const t = this.sim.terrain;
        const c = this.matCanvas || (this.matCanvas = document.createElement("canvas"));
        c.width = t.w; c.height = t.h;
        const g = c.getContext("2d"), img = g.createImageData(t.w, t.h);
        const COL = {
          [M.DIRT]: [150, 100, 60], [M.ROCK]: [120, 120, 150], [M.METAL]: [200, 200, 220],
          [M.TECH]: [60, 220, 150], [M.BRICK]: [255, 170, 60], [M.LAVA]: [255, 60, 30],
          [M.WATER]: [40, 160, 255], [M.OW_L]: [180, 90, 255], [M.OW_R]: [255, 90, 200],
        };
        for (let i = 0; i < t.m.length; i++) {
          const c3 = COL[t.m[i]];
          if (!c3) continue;
          img.data[i * 4] = c3[0]; img.data[i * 4 + 1] = c3[1]; img.data[i * 4 + 2] = c3[2]; img.data[i * 4 + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        this.matVersion = t.version;
      }
      ctx.drawImage(this.matCanvas, 0, 0);
    }

    drawZones(ctx) {
      const sim = this.sim;
      ctx.lineWidth = 1 / this.zoom;
      for (const e of sim.exits) {
        ctx.strokeStyle = OL.T.accent;
        ctx.strokeRect(e.x - C.EXIT_RX, e.y - C.EXIT_RY, C.EXIT_RX * 2 + 1, C.EXIT_RY + 1);
      }
      for (const l of sim.lems) {
        if (l.state === ST.BLOCK) {
          ctx.strokeStyle = "#ff3b4e";
          ctx.strokeRect(l.x - C.BLOCK_RX, l.y - 10, C.BLOCK_RX * 2 + 1, 15);
        }
        if (l.state !== ST.OUT) { ctx.fillStyle = "#ff3b4e"; ctx.fillRect(l.x, l.y, 1, 1); }
      }
      // splat-height ruler from the cursor
      if (this.mouse) {
        const m = this.mouse;
        ctx.fillStyle = "rgba(255,106,43,0.7)";
        ctx.fillRect(Math.floor(m.x), Math.floor(m.y), 1, C.SPLAT);
        ctx.fillRect(Math.floor(m.x) - 3, Math.floor(m.y) + C.SPLAT, 7, 1);
      }
    }

    drawLabels(ctx, vx, vy, z) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `${10 * this.dpr}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      for (const l of this.sim.lems) {
        if (l.state === ST.OUT) continue;
        const sx = vx + l.x * z, sy = vy + (l.y - 22) * z;
        const s = `#${l.id} ${l.state}${l.bricks && l.state === ST.BUILD ? " " + l.bricks : ""}`;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(sx - s.length * 3.2 * this.dpr, sy - 10 * this.dpr, s.length * 6.4 * this.dpr, 12 * this.dpr);
        ctx.fillStyle = OL.T.accentHot;
        ctx.fillText(s, sx, sy);
      }
      ctx.restore();
    }

    /* ------------------------------------------------------------ minimap */
    drawMinimap() {
      if (!this.mm || !this.sim) return;
      const mm = this.mm, g = this.mmCtx, sim = this.sim, t = sim.terrain;
      const W = mm.width, H = mm.height;
      const sx = W / sim.W, sy = H / sim.H;
      if (this.mmVersion !== t.version && (this.frame % 6 === 0 || this.mmVersion < 0)) {
        this.mmVersion = t.version;
        const img = g.createImageData(W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const wx = Math.floor(x / sx), wy = Math.floor(y / sy);
          // sample a 2x2 neighbourhood so thin features survive
          let mat = t.get(wx, wy);
          if (!mat) mat = t.get(wx + 1, wy + 1);
          const c = OL.TerrainRenderer.minimapColor(mat);
          const k = (y * W + x) * 4;
          if (c) { img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255; }
          else { img.data[k] = 6; img.data[k + 1] = 12; img.data[k + 2] = 11; img.data[k + 3] = 255; }
        }
        this.mmImg = img;
      }
      if (this.mmImg) g.putImageData(this.mmImg, 0, 0);
      g.fillStyle = OL.T.accentHot;
      for (const l of sim.lems) if (l.state !== ST.OUT) g.fillRect(Math.floor(l.x * sx), Math.floor((l.y - 4) * sy), 1, 2);
      g.fillStyle = OL.T.accentDim;
      for (const p of sim.platforms) g.fillRect(Math.floor(p.x * sx), Math.floor(p.y * sy), Math.max(1, Math.floor(p.w * sx)), 1);
      g.fillStyle = OL.T.accent;
      for (const e of sim.exits) g.fillRect(Math.floor(e.x * sx) - 1, Math.floor((e.y - 8) * sy), 3, 3);
      g.strokeStyle = OL.T.accent;
      g.lineWidth = 1;
      g.strokeRect(Math.floor(this.cam.x * sx) + 0.5, Math.max(0, Math.floor(this.cam.y * sy)) + 0.5,
        Math.min(W - 1, Math.floor(this.viewW() * sx)), Math.min(H - 1, Math.floor(this.viewH() * sy)));
    }
  }

  OL.Renderer = Renderer;
})();
