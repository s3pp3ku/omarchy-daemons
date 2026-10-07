/* Omarchy Lemmings — renderer.
   Smooth rendering: terrain and backdrop are pre-rendered at S sub-pixels
   per world pixel, everything else (lemmings, gates, mechanisms, particles)
   is drawn as vectors, and the zoom fits the window exactly. Owns the
   camera, particles, minimap and debug overlays. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const ST = OL.ST, C = OL.C, M = OL.M;
  const S_ = OL.Scenery;

  class Renderer {
    constructor(canvas, minimap) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.mm = minimap;
      this.mmCtx = minimap ? minimap.getContext("2d") : null;
      this.zoom = 3;
      this.S = 3;                         // terrain/backdrop render resolution (sub-pixels per world px)
      this.cam = { x: 0, y: 0 };
      this.particles = [];
      this.flashes = [];
      this.shake = 0;
      this.frame = 0;
      this.time = 0;
      this.hover = null;
      this.debug = { materials: false, labels: false, zones: false };
      this.mouse = null;
    }

    /* ------------------------------------------------------------ setup */
    attach(sim) {
      this.sim = sim;
      this.particles.length = 0;
      this.backdrop = null;
      this.mmVersion = -1;
      this.tr = null;
      this.resize();
      const lv = sim.level;
      const start = lv.camera || { x: sim.entrances[0].x - this.viewW() / 2, y: 0 };
      this.cam.x = start.x; this.cam.y = start.y !== undefined ? start.y : this.sim.H;
      this.clampCam();
    }

    /* (re)build the high-res terrain and decor when the level or S changes */
    buildTerrain() {
      this.tr = new OL.TerrainRenderer(document, this.sim.terrain, this.S);
      this.buildDecor(this.sim.level);
    }

    /* Non-colliding scenery: dim back-walls (any material, drawn faint) and
       hanging network cables with blinking node lights. */
    buildDecor(lv) {
      this.decor = null; this.leds = []; this.cables = [];
      const list = lv.decor || [];
      const walls = list.filter((d) => d.m);
      if (walls.length) {
        const t = OL.buildTerrain({ size: lv.size, terrain: walls });
        this.decor = new OL.TerrainRenderer(document, t, Math.min(2, this.S));
      }
      for (const d of list) {
        if (!d.cable) continue;
        const [a, b] = d.cable, sag = d.sag || 20;
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)]);
        }
        this.cables.push({ pts, color: d.color });
        if (d.leds) {
          const n = Math.max(1, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / d.leds));
          for (let i = 1; i < n; i++) { const p = pts[Math.round((i / n) * 40)]; this.leds.push([p[0], p[1] + 0.8, i]); }
        }
      }
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const r = this.cv.getBoundingClientRect();
      this.cv.width = Math.max(1, Math.round(r.width * dpr));
      this.cv.height = Math.max(1, Math.round(r.height * dpr));
      this.dpr = dpr;
      if (!this.sim) return;
      const fit = this.cv.height / this.sim.H;           // smooth graphics: fill the height exactly
      this.zoom = this.userZoom ? Math.max(fit * 0.5, Math.min(fit * 3, this.userZoom)) : fit;
      const S = Math.max(2, Math.min(4, Math.ceil(this.zoom - 0.15)));
      if (!this.tr || S !== this.S) { this.S = S; this.buildTerrain(); }
      this.backdrop = S_.buildBackdrop(document, this.sim.W, this.sim.H, Math.ceil(this.viewW()) + 4, this.sim.level.seed || 3, 1);
      this.clampCam();
    }

    setZoom(z) {
      const cx = this.cam.x + this.viewW() / 2, cy = this.cam.y + this.viewH() / 2;
      this.userZoom = z;
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
          size: (opt.big && Math.random() < opt.big ? 1.5 : 0.85) * (0.8 + Math.random() * 0.4),
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
    draw(opts) {
      opts = opts || {};
      const ctx = this.ctx, z = this.zoom, sim = this.sim, T = OL.T;
      this.frame++;
      this.time = performance.now() / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = T.void;
      ctx.fillRect(0, 0, this.cv.width, this.cv.height);
      if (!sim) return;
      this.tr.update();

      const cx = this.cam.x, cy = this.cam.y;
      const W = sim.W, H = sim.H;
      const sh = this.shake ? (Math.random() - 0.5) * this.shake * z * 0.5 : 0;
      const vx = -cx * z + sh, vy = -cy * z + sh * 0.6;

      if (vy > 0) { ctx.fillStyle = T.ceil; ctx.fillRect(0, 0, this.cv.width, vy); }

      /* backdrop */
      if (this.backdrop) {
        for (const L of this.backdrop.layers) ctx.drawImage(L.c, -cx * L.f * z, vy, L.w * z, H * z);
      }

      /* world */
      ctx.save();
      ctx.translate(vx, vy);
      ctx.scale(z, z);
      const now = this.time;

      // back-walls and cables
      if (this.decor && !this.debug.materials) {
        ctx.globalAlpha = 0.34;
        this.decor.draw(ctx);
        ctx.globalAlpha = 1;
      }
      if (!this.debug.materials) {
        ctx.lineWidth = 0.6; ctx.lineCap = "round";
        for (const c of this.cables) {
          ctx.strokeStyle = c.color || T.line;
          ctx.beginPath(); c.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
        }
        for (const L of this.leds) {
          const on = (Math.floor(now * 3) + L[2]) % 5;
          ctx.fillStyle = on === 0 ? T.accentHot : on === 1 ? T.accent : T.accentDeep;
          ctx.beginPath(); ctx.arc(L[0], L[1], 0.55, 0, Math.PI * 2); ctx.fill();
        }
      }

      // entrance and exit (behind lemmings)
      const open = Math.max(0, Math.min(1, (sim.tick - (C.OPEN_DELAY - 16)) / 12));
      for (const e of sim.entrances) S_.drawHatch(ctx, e.x + 0.5, e.y + 1, open, Math.floor(now * 2) % 2 === 0, now);
      for (const e of sim.exits) S_.drawGate(ctx, e.x + 0.5, e.y + 1, now);

      // terrain + fluids
      if (this.debug.materials) this.drawMaterials(ctx);
      else {
        this.tr.draw(ctx, cx - 2, cy - 2, cx + this.viewW() + 2, cy + this.viewH() + 2);
        this.tr.drawFluids(ctx, now);
      }
      ctx.restore();

      // bloom
      if (!this.debug.materials) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.5;
        ctx.drawImage(this.tr.getGlow(), vx, vy, W * z, H * z);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(vx, vy);
      ctx.scale(z, z);

      /* sliding window platforms */
      for (const p of sim.platforms) S_.drawWindowPlatform(ctx, p, now);

      /* lemmings */
      for (const l of sim.lems) {
        if (l.state === ST.OUT) continue;
        if (l.state === ST.DIE && l.cause === "void") continue;
        OL.LemmingArt.draw(ctx, l, sim.tick);
        if (l.fuse >= 0) this.drawCountdown(ctx, Math.ceil(l.fuse / C.TPS) || 1, l.x + 0.5, l.y - 20);
      }

      /* OOM killers (in front of lemmings) */
      for (const k of sim.crushers) S_.drawCrusher(ctx, k, sim.crusherPhase(k, sim.tick), now);

      /* assignment preview: a faint ghost of what the selected skill will do */
      if (opts.hover && opts.hoverOk && opts.skill) this.drawPreview(ctx, opts.hover, opts.skill);

      /* hover bracket */
      const h = opts.hover;
      if (h && h.state !== ST.OUT) this.bracket(ctx, h.x - 6.5, h.y - 18, 14, 20, opts.hoverOk ? T.accent : T.dim);

      /* particles */
      for (const p of this.particles) {
        ctx.globalAlpha = p.fade ? Math.max(0, p.life / p.max) : Math.min(1, p.life / 6);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* explosion flash rings */
      for (const f of this.flashes) {
        const r = 4 + f.t * 2.2;
        ctx.globalAlpha = 1 - f.t / 14;
        ctx.strokeStyle = f.t < 4 ? "#fff6c8" : T.warn;
        ctx.lineWidth = 1.6 - f.t * 0.08;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (this.debug.zones) this.drawZones(ctx);
      ctx.restore();
      if (this.debug.labels) this.drawLabels(ctx, vx, vy, z);
      if (opts.paused) this.drawPaused(ctx);
      this.drawMinimap();
    }

    drawPreview(ctx, l, skill) {
      const T = OL.T, d = l.dir, x = l.x + 0.5, y = l.y + 1;
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.15 * Math.sin(this.time * 6);
      ctx.strokeStyle = T.accentHot; ctx.fillStyle = OL.mix(T.accent, "#000000", 0.2);
      ctx.lineWidth = 0.5; ctx.setLineDash([1.2, 1]);
      ctx.beginPath();
      if (skill === "builder") {
        ctx.moveTo(x - d, y);
        for (let k = 1; k <= C.BRICKS; k++) { ctx.lineTo(x + d * (k * C.STEP_X - 4), y - k * C.STEP_Y); ctx.lineTo(x + d * k * C.STEP_X, y - k * C.STEP_Y); }
        ctx.stroke();
      } else if (skill === "basher") {
        ctx.rect(d > 0 ? x : x - 48, y - C.LEM_H, 48, C.LEM_H); ctx.stroke();
        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x + d * 40, y - 9); ctx.lineTo(x + d * 46, y - 7); ctx.lineTo(x + d * 40, y - 5); ctx.stroke();
      } else if (skill === "digger") {
        ctx.rect(x - C.DIG_HALF - 0.5, y, C.DIG_HALF * 2 + 1, 40); ctx.stroke();
        ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x - 2, y + 34); ctx.lineTo(x, y + 38); ctx.lineTo(x + 2, y + 34); ctx.stroke();
      } else if (skill === "miner") {
        ctx.moveTo(x, y - C.LEM_H); ctx.lineTo(x + d * 36, y - C.LEM_H + 36); ctx.lineTo(x + d * 36, y + 36); ctx.lineTo(x, y); ctx.closePath(); ctx.stroke();
      } else if (skill === "blocker") {
        ctx.rect(x - C.BLOCK_RX - 0.5, y - 15, C.BLOCK_RX * 2 + 1, 15); ctx.stroke();
        ctx.setLineDash([]); ctx.beginPath();
        ctx.moveTo(x - 10, y - 9); ctx.lineTo(x - 13, y - 7); ctx.lineTo(x - 10, y - 5);
        ctx.moveTo(x + 10, y - 9); ctx.lineTo(x + 13, y - 7); ctx.lineTo(x + 10, y - 5); ctx.stroke();
      } else if (skill === "bomber") {
        ctx.strokeStyle = T.warn; ctx.arc(x, y - 5, C.BOOM_R, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    bracket(ctx, x, y, w, h, col) {
      ctx.save();
      ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.lineCap = "round";
      ctx.shadowColor = col; ctx.shadowBlur = 3;
      const L = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h);
      ctx.moveTo(x + w - L, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - L);
      ctx.stroke();
      ctx.restore();
    }

    drawCountdown(ctx, n, x, y) {
      ctx.save();
      ctx.font = "bold 6px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(6,10,8,0.9)"; ctx.strokeText(String(n), x, y);
      ctx.fillStyle = OL.T.warn; ctx.fillText(String(n), x, y);
      ctx.restore();
    }

    /* draw a lemming pose into a small canvas (toolbar icons) */
    drawIcon(canvas, skill) { OL.LemmingArt.icon(canvas, skill); }

    drawPaused(ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = OL.T.accentDim;
      ctx.lineWidth = 2 * this.dpr;
      ctx.strokeRect(this.dpr, this.dpr, this.cv.width - 2 * this.dpr, this.cv.height - 2 * this.dpr);
      ctx.restore();
    }

    drawMaterials(ctx) {
      ctx.imageSmoothingEnabled = false;
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
      ctx.imageSmoothingEnabled = true;
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
