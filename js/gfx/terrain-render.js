/* Omarchy Lemmings — terrain renderer.
   Turns the material map into pixel art: grassy dirt, stone-brick ruins,
   riveted metal with neon edges, circuit-panel tech, builder planks,
   one-way chevrons and animated lava/coolant. Only dirty rectangles are
   repainted when lemmings change the terrain. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const M = OL.M;
  const rgb = OL.rgb;

  const C = {
    dirt: ["#5b3a28", "#6c4530", "#7b5036", "#8a5c3d"].map(rgb),
    dirtDark: rgb("#3a2519"),
    dirtPebble: rgb("#a07650"),
    grass: ["#a4f59a", "#3fd46c", "#2aa552", "#1d7a3e"].map(rgb),
    rockMortar: rgb("#16161f"),
    rock: ["#454a5e", "#4e5469", "#575d74", "#3f4356"].map(rgb),
    rockHi: rgb("#6e7592"),
    rockLo: rgb("#2c2f3d"),
    moss: rgb("#2c9c55"),
    metalBorder: rgb("#14181d"),
    metal: rgb("#2c323a"),
    metal2: rgb("#30373f"),
    metalHi: rgb("#4a5461"),
    metalLo: rgb("#1f242a"),
    rivet: rgb("#8592a1"),
    techBase: rgb("#0e161a"),
    techBorder: rgb("#1a2b2b"),
    techLine: rgb("#14583f"),
    techNode: rgb("#2ee59d"),
    neon: rgb("#2ee59d"),
    neonHot: rgb("#b9ffe0"),
    neonSide: rgb("#1a8f63"),
    cyan: rgb("#22d3ee"),
    plank: rgb("#d4883a"),
    plankHi: rgb("#f3b765"),
    plankLo: rgb("#8a4f1c"),
    plankJoint: rgb("#a8652a"),
    owBase: rgb("#2e2340"),
    owBase2: rgb("#352950"),
    owArrow: rgb("#9b6bff"),
    owArrowHi: rgb("#c9a8ff"),
    lava: ["#ffe08a", "#ffb347", "#ff6a2b", "#e0441f", "#b02a17", "#7d1a12"].map(rgb),
    water: ["#c8fbff", "#6fe3ff", "#2fb3e8", "#1c86c9", "#115e9e", "#0b3f78"].map(rgb),
  };

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) & 255;
  }
  /* blocky value noise for clumpy dirt */
  function clump(x, y, s) {
    const cx = Math.floor(x / s), cy = Math.floor(y / s);
    const fx = (x % s) / s, fy = (y % s) / s;
    const a = hash(cx, cy), b = hash(cx + 1, cy), c = hash(cx, cy + 1), d = hash(cx + 1, cy + 1);
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }

  class TerrainRenderer {
    constructor(doc, terrain) {
      this.t = terrain;
      const W = terrain.w, H = terrain.h;
      this.W = W; this.H = H;
      const mk = () => { const c = doc.createElement("canvas"); c.width = W; c.height = H; return c; };
      this.canvas = mk();
      this.ctx = this.canvas.getContext("2d");
      this.img = this.ctx.createImageData(W, H);
      this.emit = mk();                          // emissive pixels (neon) for glow
      this.emitCtx = this.emit.getContext("2d");
      this.emitImg = this.emitCtx.createImageData(W, H);
      this.glow = mk();
      this.glowCtx = this.glow.getContext("2d");
      this.FLUID_FRAMES = 6;
      this.fluid = [];
      for (let i = 0; i < this.FLUID_FRAMES; i++) {
        const c = mk();
        this.fluid.push({ c, ctx: c.getContext("2d"), img: c.getContext("2d").createImageData(W, H) });
      }
      this.glowDirty = true;
      this.renderRect(0, 0, W - 1, H - 1);
    }

    /* repaint changed areas (call once per frame) */
    update() {
      const d = this.t.dirty;
      if (!d.length) return false;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const r of d) { x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); }
      d.length = 0;
      this.renderRect(x0, y0, x1, y1);
      return true;
    }

    renderRect(x0, y0, x1, y1) {
      const t = this.t, W = this.W, H = this.H, m = t.m;
      x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 6); x1 = Math.min(W - 1, x1 + 4); y1 = Math.min(H - 1, y1 + 6);
      const D = this.img.data, E = this.emitImg.data;
      const F = this.fluid.map((f) => f.img.data);
      const at = (x, y) => (x < 0 || x >= W ? M.METAL : y < 0 || y >= H ? M.AIR : m[y * W + x]);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = (y * W + x) * 4;
          const mat = m[y * W + x];
          let c = null, e = null, a = 255;
          for (let f = 0; f < F.length; f++) F[f][k + 3] = 0;

          if (mat === M.AIR || mat === M.LAVA || mat === M.WATER) {
            if (mat === M.AIR) {
              /* grass blades growing from dirt tops into the air */
              const b1 = at(x, y + 1), b2 = at(x, y + 2);
              const hx = hash(x, 7);
              if (b1 === M.DIRT && hx % 3 === 0) c = C.grass[1 + (hx % 2)];
              else if (b1 === M.AIR && b2 === M.DIRT && hx % 7 === 0) c = C.grass[2];
              else if (b1 === M.ROCK && hx % 9 === 0) c = C.moss;
            } else {
              this.paintFluid(F, k, x, y, mat, at);
            }
            if (c) { D[k] = c[0]; D[k + 1] = c[1]; D[k + 2] = c[2]; D[k + 3] = 255; }
            else D[k + 3] = 0;
            E[k + 3] = 0;
            if (mat !== M.AIR && at(x, y - 2) !== mat) {
              /* fluid surfaces glow */
              const gcol = mat === M.LAVA ? C.lava[1] : C.water[2];
              E[k] = gcol[0]; E[k + 1] = gcol[1]; E[k + 2] = gcol[2]; E[k + 3] = 255;
            }
            continue;
          }

          const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
          const open = (v) => v === M.AIR || v === M.LAVA || v === M.WATER;
          const oUp = open(up), oDn = open(dn), oL = open(lf), oR = open(rt);
          const h = hash(x, y);

          switch (mat) {
            case M.DIRT: {
              let depth = 0;
              for (let d = 1; d <= 5; d++) { if (open(at(x, y - d))) { depth = d; break; } }
              const gd = 2 + (hash(x, 3) % 3);
              if (depth && depth <= gd) c = C.grass[Math.min(3, depth - 1)];
              else {
                const n = clump(x, y, 5) * 0.6 + h * 0.4;
                c = C.dirt[Math.min(3, Math.floor(n / 64))];
                if (h > 248) c = C.dirtPebble;
                else if (h < 6) c = C.dirtDark;
                if (oL || oR || oDn) c = C.dirtDark;
              }
              break;
            }
            case M.ROCK: {
              const row = Math.floor(y / 9), off = (row & 1) * 9;
              const bx = (x + off) % 18, by = y % 9;
              const col = Math.floor((x + off) / 18);
              if (bx === 0 || by === 0) c = C.rockMortar;
              else {
                c = C.rock[hash(col, row) & 3];
                if (by === 1 || bx === 1) c = C.rockHi;
                else if (by === 8 || bx === 17) c = C.rockLo;
                else if (h > 250) c = C.rockLo;
              }
              if (oUp) c = (hash(x, 11) % 4 === 0) ? C.moss : C.rockHi;
              else if (oL || oR || oDn) c = C.rockLo;
              break;
            }
            case M.METAL: {
              const bx = x % 16, by = y % 16;
              c = (Math.floor(x / 16) + Math.floor(y / 16)) & 1 ? C.metal : C.metal2;
              if (bx === 0 || by === 0) c = C.metalBorder;
              else if (bx === 1 || by === 1) c = C.metalHi;
              else if (bx === 15 || by === 15) c = C.metalLo;
              else if ((bx === 4 || bx === 12) && (by === 4 || by === 12)) c = C.rivet;
              else if ((bx === 4 || bx === 12) && (by === 5 || by === 13)) c = C.metalLo;
              if (oUp) { c = C.neon; e = C.neon; }
              else if (oL || oR) { c = C.neonSide; e = C.neonSide; }
              else if (oDn) c = C.metalBorder;
              break;
            }
            case M.TECH: {
              const bx = x % 24, by = y % 12;
              c = C.techBase;
              if (bx === 0 || by === 0) c = C.techBorder;
              else if (by === 6 && bx > 2 && bx < 21) c = C.techLine;
              else if (bx === 12 && by > 2 && by < 6) c = C.techLine;
              if ((bx === 3 || bx === 20) && by === 6) { c = C.techNode; e = C.techNode; }
              if (oUp) { c = C.neonHot; e = C.neon; }
              else if (oL || oR) { c = C.cyan; e = C.cyan; }
              break;
            }
            case M.BRICK: {
              c = C.plank;
              if (oUp) c = C.plankHi;
              else if (oDn) c = C.plankLo;
              else if (x % 8 === 0) c = C.plankJoint;
              break;
            }
            case M.OW_L: case M.OW_R: {
              const u = ((x % 12) + 12) % 12, v = y % 12;
              c = (h & 1) ? C.owBase : C.owBase2;
              const uu = mat === M.OW_R ? u : 11 - u;
              const dv = Math.abs(v - 6);
              if (uu >= 3 && uu <= 8 && (dv === uu - 3 || dv === uu - 4) && dv <= 3) c = C.owArrow;
              if (oUp) { c = C.owArrowHi; e = C.owArrow; }
              else if (oL || oR || oDn) c = C.owArrow;
              break;
            }
          }
          D[k] = c[0]; D[k + 1] = c[1]; D[k + 2] = c[2]; D[k + 3] = a;
          if (e) { E[k] = e[0]; E[k + 1] = e[1]; E[k + 2] = e[2]; E[k + 3] = 255; } else E[k + 3] = 0;
        }
      }
      const w = x1 - x0 + 1, hh = y1 - y0 + 1;
      this.ctx.putImageData(this.img, 0, 0, x0, y0, w, hh);
      this.emitCtx.putImageData(this.emitImg, 0, 0, x0, y0, w, hh);
      for (const f of this.fluid) f.ctx.putImageData(f.img, 0, 0, x0, y0, w, hh);
      this.glowDirty = true;
    }

    paintFluid(F, k, x, y, mat, at) {
      const pal = mat === M.LAVA ? C.lava : C.water;
      let depth = 0;
      for (let d = 1; d <= 6; d++) { const v = at(x, y - d); if (v !== mat) { depth = d; break; } }
      if (!depth) depth = 7;
      for (let f = 0; f < F.length; f++) {
        const ph = f * 2;
        let i;
        if (depth === 1) i = (hash(x + ph * 3, 1) % 5 === 0) ? 0 : 1;
        else if (depth === 2) i = 2;
        else {
          const n = (hash((x + ph) >> 1, (y >> 1) + f) + hash(x >> 2, y >> 2)) >> 1;
          i = depth <= 3 ? 2 + (n > 200 ? 0 : 1) : 3 + (n > 170 ? 0 : n > 80 ? 1 : 2);
        }
        /* lava bubbles */
        if (mat === M.LAVA && depth > 2 && hash(x, y + f * 31) > 252) i = 1;
        const c = pal[Math.min(pal.length - 1, i)];
        const d = F[f];
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2];
        d[k + 3] = mat === M.WATER ? (depth === 1 ? 255 : 225) : 255;
      }
    }

    /* soft neon bloom: blurred copy of the emissive layer, rebuilt lazily */
    getGlow() {
      if (this.glowDirty) {
        const g = this.glowCtx;
        g.clearRect(0, 0, this.W, this.H);
        g.filter = "blur(2px)";
        g.drawImage(this.emit, 0, 0);
        g.drawImage(this.emit, 0, 0);
        g.filter = "none";
        this.glowDirty = false;
      }
      return this.glow;
    }

    fluidFrame(i) { return this.fluid[i % this.FLUID_FRAMES].c; }

    /* tiny colour map for the minimap */
    static minimapColor(mat) {
      switch (mat) {
        case M.DIRT: return [122, 80, 54];
        case M.ROCK: return [84, 90, 112];
        case M.METAL: return [70, 80, 92];
        case M.TECH: return [30, 120, 90];
        case M.BRICK: return [212, 136, 58];
        case M.LAVA: return [255, 106, 43];
        case M.WATER: return [47, 179, 232];
        case M.OW_L: case M.OW_R: return [120, 80, 200];
      }
      return null;
    }
  }

  OL.TerrainRenderer = TerrainRenderer;
})();
