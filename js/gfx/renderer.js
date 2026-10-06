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
      this.hatch = [0, 1, 2, 3].map((f) => S.drawHatch(document, f));
      this.gate = [0, 1, 2, 3, 4, 5].map((f) => S.drawGate(document, f));
      this.zoom = 3;
      this.cam = { x: 0, y: 0 };
      this.particles = [];
      this.frame = 0;
      this.hover = null;
      this.debug = { materials: false, labels: false, zones: false };
      this.mouse = null;
    }

    /* ------------------------------------------------------------ setup */
    attach(sim) {
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
        g.fillStyle = d.color || "#1b2b29";
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
    burst(x, y, n, colors, speed, up, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.3 + Math.random()) * speed;
        this.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (up || 0),
          life: (life || 30) * (0.6 + Math.random() * 0.6),
          c: colors[(Math.random() * colors.length) | 0],
        });
      }
    }

    onEvents(events) {
      for (const e of events) {
        switch (e.type) {
          case "dig": this.burst(e.x, e.y, 3, ["#7b5036", "#a07650", "#5b3a28"], 0.9, 0.6); break;
          case "bash": this.burst(e.x, e.y, 3, ["#7b5036", "#a07650", "#575d74"], 1.0, 0.4); break;
          case "mine": this.burst(e.x, e.y, 4, ["#7b5036", "#a07650", "#ffe27a"], 1.0, 0.5); break;
          case "brick": this.burst(e.x, e.y, 2, ["#f3b765", "#d4883a"], 0.5, 0.3, 14); break;
          case "clink": this.burst(e.x, e.y, 8, ["#ffe27a", "#ffffff", "#22d3ee"], 1.6, 0.4, 16); break;
          case "boom": this.burst(e.x, e.y, 46, ["#ffe27a", "#ff6a2b", "#ff3b4e", "#7b5036", "#3fd46c", "#9a86f0"], 2.6, 0.8, 50); break;
          case "die":
            if (e.cause === "burn") this.burst(e.x, e.y - 4, 14, ["#ffe27a", "#ff6a2b", "#2b2a3a"], 1.0, 1.4, 40);
            else if (e.cause === "drown") this.burst(e.x, e.y, 12, ["#c8fbff", "#6fe3ff", "#2fb3e8"], 1.2, 1.6, 30);
            else if (e.cause === "splat") this.burst(e.x, e.y, 10, ["#3fd46c", "#9a86f0", "#3c5ee0"], 1.4, 0.8, 26);
            break;
          case "exit": this.burst(e.x, e.y - 10, 12, ["#b9ffe0", "#2ee59d", "#22d3ee"], 0.7, 1.2, 40); break;
          case "assign": this.burst(e.x, e.y, 6, ["#2ee59d", "#b9ffe0"], 0.9, 0.2, 14); break;
        }
      }
    }

    stepParticles() {
      const t = this.sim && this.sim.terrain;
      for (const p of this.particles) {
        p.vy += 0.08; p.x += p.vx; p.y += p.vy; p.life--;
        if (t && p.vy > 0 && t.solid(p.x | 0, p.y | 0)) { p.vy *= -0.3; p.vx *= 0.6; p.y -= 1; }
      }
      if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
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
      ctx.fillStyle = "#030507";
      ctx.fillRect(0, 0, this.cv.width, this.cv.height);
      if (!sim) return;
      this.tr.update();

      const cx = this.cam.x, cy = this.cam.y;
      const W = sim.W, H = sim.H;
      // world -> screen: s = (w - cam) * z
      const vx = Math.round(-cx * z), vy = Math.round(-cy * z);

      /* above the world's ceiling: solid dark rock band */
      if (vy > 0) { ctx.fillStyle = "#0c0e14"; ctx.fillRect(0, 0, this.cv.width, vy); ctx.fillStyle = "#1a8f63"; ctx.fillRect(0, vy - 2, this.cv.width, 1); }

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
        ctx.drawImage(this.hatch[sim.tick < C.OPEN_DELAY - 16 ? 0 : openF], e.x - S.HATCH.AX, e.y - S.HATCH.AY);
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
          ctx.fillStyle = on === 0 ? "#b9ffe0" : on === 1 ? "#2ee59d" : "#0f3b2a";
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

      /* hover bracket */
      const h = opts.hover;
      if (h && h.state !== ST.OUT) {
        const col = opts.hoverOk ? "#2ee59d" : "#7c8c86";
        this.bracket(ctx, h.x - 7, h.y - 18, 15, 20, col);
      }

      /* particles */
      for (const p of this.particles) {
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }

      /* debug overlays */
      if (this.debug.zones) this.drawZones(ctx);
      ctx.restore();
      if (this.debug.labels) this.drawLabels(ctx, vx, vy, z);
      if (opts.paused) this.drawPaused(ctx);
      this.drawMinimap();
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
      ctx.strokeStyle = "rgba(46,229,157,0.5)";
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
        ctx.strokeStyle = "#2ee59d";
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
        ctx.fillStyle = "#a6ffd8";
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
      g.fillStyle = "#b9ffe0";
      for (const l of sim.lems) if (l.state !== ST.OUT) g.fillRect(Math.floor(l.x * sx), Math.floor((l.y - 4) * sy), 1, 2);
      g.fillStyle = "#2ee59d";
      for (const e of sim.exits) g.fillRect(Math.floor(e.x * sx) - 1, Math.floor((e.y - 8) * sy), 3, 3);
      g.strokeStyle = "rgba(46,229,157,0.9)";
      g.lineWidth = 1;
      g.strokeRect(Math.floor(this.cam.x * sx) + 0.5, Math.max(0, Math.floor(this.cam.y * sy)) + 0.5,
        Math.min(W - 1, Math.floor(this.viewW() * sx)), Math.min(H - 1, Math.floor(this.viewH() * sy)));
    }
  }

  OL.Renderer = Renderer;
})();
