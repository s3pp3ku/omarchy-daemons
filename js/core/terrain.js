/* Omarchy Daemons — terrain.
   Pixel-level material map. Every world pixel holds one material id.
   Runs in the browser and in node (no DOM). */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  /* Material ids. Keep in sync with gfx/terrain-render.js palettes. */
  const M = {
    AIR: 0,
    DIRT: 1,    // destructible, grassy soil
    ROCK: 2,    // destructible, stone-brick ruins (heavier look, same rules)
    METAL: 3,   // indestructible system plating
    TECH: 4,    // indestructible Omarchy architecture
    BRICK: 5,   // builder steps (destructible)
    LAVA: 6,    // lethal fluid (not solid)
    WATER: 7,   // lethal coolant (not solid)
    OW_L: 8,    // one-way dirt: can only be bashed/mined while moving LEFT
    OW_R: 9,    // one-way dirt: can only be bashed/mined while moving RIGHT
    PLAT: 10,   // moving "window" platform (not stored in the map; see Terrain.dyn)
    ICE: 11,    // slippery: daemons walk twice as fast on it; breakable like dirt
  };
  const NAMES = {
    air: M.AIR, dirt: M.DIRT, rock: M.ROCK, metal: M.METAL, tech: M.TECH,
    brick: M.BRICK, lava: M.LAVA, water: M.WATER, coolant: M.WATER,
    "oneway-left": M.OW_L, "oneway-right": M.OW_R, ice: M.ICE,
  };
  const SOLID = new Uint8Array(16);
  const LETHAL = new Uint8Array(16);
  const HARD = new Uint8Array(16);      // indestructible
  [M.DIRT, M.ROCK, M.METAL, M.TECH, M.BRICK, M.OW_L, M.OW_R, M.PLAT, M.ICE].forEach((m) => (SOLID[m] = 1));
  [M.LAVA, M.WATER].forEach((m) => (LETHAL[m] = 1));
  [M.METAL, M.TECH, M.PLAT].forEach((m) => (HARD[m] = 1));

  class Terrain {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.m = new Uint8Array(w * h);
      this.version = 0;
      this.dirty = [];   // rects [x0,y0,x1,y1] changed since last render
      this.dyn = null;   // moving platforms: [{x,y,w,h}] treated as solid PLAT
    }

    get(x, y) {
      if (x < 0 || x >= this.w) return M.METAL;   // side walls
      if (y < 0 || y >= this.h) return M.AIR;     // open sky / bottomless
      const v = this.m[y * this.w + x];
      if (v === M.AIR && this.dyn) {
        for (const p of this.dyn) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return M.PLAT;
      }
      return v;
    }
    solid(x, y) { return SOLID[this.get(x, y)] === 1; }
    lethal(x, y) { return LETHAL[this.get(x, y)] === 1; }

    setRaw(x, y, v) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.m[y * this.w + x] = v;
    }

    mark(x0, y0, x1, y1) {
      this.dirty.push([x0, y0, x1, y1]);
      this.version++;
    }

    /* Can a tool moving in `dir` (-1, 0 for vertical, +1) remove material m? */
    static removable(m, dir) {
      if (m === M.DIRT || m === M.ROCK || m === M.BRICK || m === M.ICE) return true;
      if (m === M.OW_L) return dir <= 0;
      if (m === M.OW_R) return dir >= 0;
      return false;
    }
    /* Material that stops a tool: indestructible, or one-way against dir. */
    static blocks(m, dir) {
      if (HARD[m]) return true;
      if (m === M.OW_L) return dir > 0;
      if (m === M.OW_R) return dir < 0;
      return false;
    }

    /* Does any pixel in the list of [x,y] stop a tool? Out-of-range x counts
       as metal (the side walls). */
    anyBlocking(pixels, dir) {
      for (let i = 0; i < pixels.length; i += 2) {
        if (Terrain.blocks(this.get(pixels[i], pixels[i + 1]), dir)) return true;
      }
      return false;
    }
    anyRemovable(pixels, dir) {
      for (let i = 0; i < pixels.length; i += 2) {
        if (Terrain.removable(this.get(pixels[i], pixels[i + 1]), dir)) return true;
      }
      return false;
    }
    /* Remove all removable pixels in list; returns count removed. */
    removePixels(pixels, dir) {
      let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let i = 0; i < pixels.length; i += 2) {
        const x = pixels[i], y = pixels[i + 1];
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const k = y * this.w + x;
        if (Terrain.removable(this.m[k], dir)) {
          this.m[k] = M.AIR; n++;
          if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
        }
      }
      if (n) this.mark(x0, y0, x1, y1);
      return n;
    }
    /* Fill air/fluid pixels in a rect with material (builder bricks). */
    fillRect(x0, y0, x1, y1, mat) {
      if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
      let n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const k = y * this.w + x, c = this.m[k];
        if (c === M.AIR || LETHAL[c]) { this.m[k] = mat; n++; }
      }
      if (n) this.mark(x0, y0, x1, y1);
      return n;
    }

    clone() {
      const t = new Terrain(this.w, this.h);
      t.m.set(this.m);
      return t;
    }
  }

  /* ---------------------------------------------------------- level shapes
     Level terrain is a list of drawing ops applied in order:
       { m:"dirt", rect:[x,y,w,h] }
       { m:"rock", poly:[[x,y],[x,y],...] }
       { m:"air",  circle:[cx,cy,r] }        // m:"air" carves
       { m:"metal", rect:[...], only:"dirt" } // only replace this material
     Coordinates are world pixels. */
  function fillPoly(t, pts, set) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    minY = Math.max(0, Math.floor(minY)); maxY = Math.min(t.h - 1, Math.ceil(maxY));
    const xs = [];
    for (let y = minY; y <= maxY; y++) {
      const cy = y + 0.5;
      xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] > cy) !== (b[1] > cy)) {
          xs.push(a[0] + ((cy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5));
        const xb = Math.min(t.w - 1, Math.floor(xs[k + 1] - 0.5));
        for (let x = xa; x <= xb; x++) set(x, y);
      }
    }
  }

  function buildTerrain(def) {
    const t = new Terrain(def.size[0], def.size[1]);
    for (const op of def.terrain || []) {
      const mat = NAMES[op.m];
      if (mat === undefined) throw new Error(`unknown material "${op.m}"`);
      const only = op.only !== undefined ? NAMES[op.only] : -1;
      const set = (x, y) => {
        const k = y * t.w + x;
        if (only >= 0 && t.m[k] !== only) return;
        t.m[k] = mat;
      };
      if (op.rect) {
        const [x, y, w, h] = op.rect;
        for (let yy = Math.max(0, y); yy < Math.min(t.h, y + h); yy++)
          for (let xx = Math.max(0, x); xx < Math.min(t.w, x + w); xx++) set(xx, yy);
      } else if (op.poly) {
        fillPoly(t, op.poly, set);
      } else if (op.circle) {
        const [cx, cy, r] = op.circle;
        for (let yy = Math.max(0, cy - r); yy <= Math.min(t.h - 1, cy + r); yy++)
          for (let xx = Math.max(0, cx - r); xx <= Math.min(t.w - 1, cx + r); xx++)
            if ((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) <= r * r) set(xx, yy);
      } else {
        throw new Error("terrain op needs rect, poly or circle: " + JSON.stringify(op));
      }
    }
    t.dirty.length = 0;
    return t;
  }

  OL.M = M;
  OL.MAT_NAMES = NAMES;
  OL.SOLID = SOLID;
  OL.LETHAL = LETHAL;
  OL.HARD = HARD;
  OL.Terrain = Terrain;
  OL.buildTerrain = buildTerrain;
})();
