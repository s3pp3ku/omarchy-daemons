/* Omarchy Daemons — high-resolution terrain renderer.

   Physics stays on the 1-pixel material map, but the picture is rendered
   at S sub-pixels per world pixel (S = 2..4, picked from the zoom):
     - edges are anti-aliased along a smooth contour (bilinear field +
       signed-distance estimate), so dug holes and slopes look round;
     - textures are evaluated per sub-pixel, so traces, rivets, pebbles
       and grass are finer than one world pixel;
     - fluids are drawn live by the renderer (see drawFluids), with moving
       surfaces, from runs collected here.
   Only dirty rectangles are re-rendered while daemons change the map. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const M = OL.M;
  const rgb = OL.rgb;
  let C = null;

  const BASE_C = {
    dirt: ["#4e3122", "#5f3c29", "#704732", "#82543b", "#93633f"].map(rgb),
    dirtDark: rgb("#2f1d13"),
    pebble: rgb("#a98058"), pebbleLo: rgb("#6f4b30"),
    grass: ["#b6f7a6", "#57de78", "#36b45c", "#228246", "#1a5f35"].map(rgb),
    silt: rgb("#24383a"), siltDark: rgb("#18282a"),
    scorch: rgb("#2a1512"), scorchDark: rgb("#1a0c0a"), ember: rgb("#ff6a2b"),
    rivet: rgb("#8f9cab"), rivetHi: rgb("#c5ced8"),
    lava: ["#ffe9a6", "#ffb347", "#ff6a2b", "#d63c1c", "#9a2414", "#5e140d"],
    water: ["#d4fdff", "#7fe7ff", "#36b8ec", "#1c86c9", "#115e9e", "#0a3a70"],
  };

  function makeColors(T) {
    const mix = OL.mix, k = (h) => rgb(h);
    const c = Object.assign({}, BASE_C);
    c.metal = k(T.metal); c.metalHi = k(mix(T.metal, "#ffffff", 0.16)); c.metalLo = k(mix(T.metal, "#000000", 0.35));
    c.metalEdge = k(mix(T.metal, "#000000", 0.6));
    c.tech = k(T.tech); c.techLine = k(mix(T.tech, T.accent, 0.35)); c.techBorder = k(mix(T.tech, T.accent, 0.14));
    c.node = k(T.accent); c.neon = k(T.accent); c.neonHot = k(T.accentHot); c.neonSide = k(T.accentDim); c.cyan = k(T.accent2);
    c.pcb = k(mix(T.accent, "#000000", 0.62)); c.pcbDark = k(mix(T.accent, "#000000", 0.82));
    c.pcbLine = k(mix(T.accent, "#000000", 0.5)); c.pcbTrace = k(T.accentHot);
    c.board = k(mix("#0f4a34", T.bg, 0.3)); c.board2 = k(mix("#16603f", T.bg, 0.3));
    c.copper = k("#b8763a"); c.copperHi = k("#d99a4e"); c.gold = k("#f0c35a"); c.viaHole = k("#0a1410");
    c.chip = k("#16181c"); c.chipHi = k("#2a2e35"); c.pin = k("#a7b0ba");
    c.fibre = k("#a8946a"); c.fibreHi = k("#d3c18e"); c.fibreLo = k("#6e5f40");
    c.ow = k(mix(T.special, "#000000", 0.76)); c.ow2 = k(mix(T.special, "#000000", 0.68));
    c.owArrow = k(T.special); c.owHi = k(mix(T.special, "#ffffff", 0.45));
    c.ice = k("#7fc4e6"); c.ice2 = k("#a8dcf2"); c.iceDeep = k("#3a7fa8"); c.iceHi = k("#e8f8ff");
    return c;
  }

  /* ---- noise helpers (deterministic) ---- */
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) & 255;
  }
  function vnoise(x, y) {                       // smooth value noise, 0..1
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy) / 255;
  }
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const ramp = (pal, t) => {                    // t 0..1 across a palette
    t = Math.max(0, Math.min(0.9999, t)) * (pal.length - 1);
    const i = Math.floor(t);
    return lerp3(pal[i], pal[i + 1], t - i);
  };

  const SOLIDISH = OL.SOLID;

  class TerrainRenderer {
    constructor(doc, terrain, S) {
      C = makeColors(OL.T);
      this.t = terrain;
      this.S = S = Math.max(1, Math.min(4, S | 0));
      const W = terrain.w, H = terrain.h;
      this.W = W; this.H = H;
      const mk = (w, h) => { const c = doc.createElement("canvas"); c.width = w; c.height = h; return c; };
      /* tiles, so a small change only re-uploads a small texture */
      this.TS = 128;
      this.tiles = [];
      for (let ty = 0; ty < H; ty += this.TS) for (let tx = 0; tx < W; tx += this.TS) {
        const w = Math.min(this.TS, W - tx), h = Math.min(this.TS, H - ty);
        const c = mk(w * S, h * S);
        this.tiles.push({ x: tx, y: ty, w, h, c, ctx: c.getContext("2d") });
      }
      this.ctx = this.tiles[0].ctx;
      this.emit = mk(W, H);
      this.emitCtx = this.emit.getContext("2d");
      this.emitImg = this.emitCtx.createImageData(W, H);
      /* glow = emissive pixels averaged down 4x (cheap blur), scaled back up when drawn */
      this.glowHalf = mk(Math.ceil(W / 2), Math.ceil(H / 2));
      this.glow = mk(Math.ceil(W / 4), Math.ceil(H / 4));
      this.glowCtx = this.glow.getContext("2d");
      this.depth = new Uint8Array(W * H);       // distance (px) to the first different material above
      this.above = new Uint8Array(W * H);       // that material
      this.glowDirty = true;
      /* grass only grows on the level's original surfaces, not on fresh digs */
      if (!terrain.grassy) {
        terrain.grassy = new Uint8Array(W * H);
        for (let x = 0; x < W; x++) {
          for (let y = 1; y < H; y++) {
            if (terrain.m[y * W + x] === M.DIRT && terrain.m[(y - 1) * W + x] === M.AIR) {
              for (let d = 0; d < 6 && y + d < H; d++) terrain.grassy[(y + d) * W + x] = 1;
              for (let d = 1; d <= 3 && y - d >= 0; d++) terrain.grassy[(y - d) * W + x] = 1;
            }
          }
        }
      }
      this.fluids = [];
      this.board = OL.buildBoard(doc, terrain, S, OL.T);
      this.renderRect(0, 0, W - 1, H - 1);
      this.collectFluids();
    }

    update() {
      const d = this.t.dirty;
      if (!d.length) return false;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const r of d) { x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); }
      d.length = 0;
      this.renderRect(x0, y0, x1, y1);
      /* fluids only change when something is built over / into them */
      if (this.fluids.some((r) => r.x1 >= x0 - 2 && r.x0 <= x1 + 2 && r.y1 >= y0 - 2 && r.y0 <= y1 + 2)) this.collectFluids();
      return true;
    }

    /* ------------------------------------------------------------ pass */
    renderRect(x0, y0, x1, y1) {
      const t = this.t, W = this.W, H = this.H, m = t.m, S = this.S;
      x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 6); x1 = Math.min(W - 1, x1 + 3); y1 = Math.min(H - 1, y1 + 8);
      const at = (x, y) => (x < 0 || x >= W ? M.METAL : y < 0 || y >= H ? M.AIR : m[y * W + x]);
      const sol = (x, y) => (SOLIDISH[at(x, y)] ? 1 : 0);

      /* per-pixel depth below the surface (for grass bands, rims) */
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const v = at(x, y);
          let d = 1, a = at(x, y - 1);
          while (d < 8 && a === v) { d++; a = at(x, y - d); }
          this.depth[y * W + x] = d; this.above[y * W + x] = a;
        }
      }

      /* render into a buffer the size of the rectangle only */
      const RW = (x1 - x0 + 1) * S, RH = (y1 - y0 + 1) * S;
      const img = this.ctx.createImageData(RW, RH);
      const D = img.data, E = this.emitImg.data;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = (y * W + x) * 4; E[k + 3] = 0; }

      const out = [0, 0, 0];
      for (let py = y0; py <= y1; py++) {
        for (let px = x0; px <= x1; px++) {
          const mat = at(px, py);
          const s00 = sol(px - 1, py - 1), s10 = sol(px, py - 1), s20 = sol(px + 1, py - 1);
          const s01 = sol(px - 1, py), s11 = SOLIDISH[mat] ? 1 : 0, s21 = sol(px + 1, py);
          const s02 = sol(px - 1, py + 1), s12 = sol(px, py + 1), s22 = sol(px + 1, py + 1);
          const allSame = s00 === s11 && s10 === s11 && s20 === s11 && s01 === s11 && s21 === s11 && s02 === s11 && s12 === s11 && s22 === s11;
          const pIdx = py * W + px;
          const depth = this.depth[pIdx], above = this.above[pIdx];

          for (let sy = 0; sy < S; sy++) {
            for (let sx = 0; sx < S; sx++) {
              const fx = px + (sx + 0.5) / S, fy = py + (sy + 0.5) / S;
              const k = ((((py - y0) * S + sy) * RW) + (px - x0) * S + sx) * 4;
              let alpha = 1, dist = 99, nx = 0, ny = 0, smat = mat;

              if (!allSame) {
                /* bilinear solid field over the 4 pixel centres around this sub-pixel */
                const gx = fx - 0.5, gy = fy - 0.5;
                const i0 = Math.floor(gx), j0 = Math.floor(gy), tx = gx - i0, ty = gy - j0;
                const a = sol(i0, j0), b = sol(i0 + 1, j0), c = sol(i0, j0 + 1), d = sol(i0 + 1, j0 + 1);
                const v = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
                const dvx = (b - a) * (1 - ty) + (d - c) * ty, dvy = (c - a) * (1 - tx) + (d - b) * tx;
                const g = Math.sqrt(dvx * dvx + dvy * dvy);
                dist = (v - 0.5) / Math.max(g, 0.5);
                if (g > 0) { nx = -dvx / g; ny = -dvy / g; }     // outward normal (toward air)
                alpha = Math.max(0, Math.min(1, dist * S + 0.5));
                if (alpha > 0 && !s11) {
                  /* air pixel covered by a neighbour's smooth edge: take the heaviest solid corner */
                  const w = [(1 - tx) * (1 - ty) * a, tx * (1 - ty) * b, (1 - tx) * ty * c, tx * ty * d];
                  let bi = 0; for (let q = 1; q < 4; q++) if (w[q] > w[bi]) bi = q;
                  smat = at(i0 + (bi & 1), j0 + (bi >> 1));
                } else if (alpha > 0 && s11 === 0) smat = M.AIR;
              } else if (!s11) alpha = 0;

              if (alpha <= 0) {
                /* open air: grass blades and builder-step undersides only */
                const ad = this.airDecor(px, py, fx, fy, at, out);
                if (ad > 0) { D[k] = out[0]; D[k + 1] = out[1]; D[k + 2] = out[2]; D[k + 3] = ad; }
                else D[k + 3] = 0;
                continue;
              }
              const em = this.shade(smat, fx, fy, px, py, dist, nx, ny, depth, above, out);
              D[k] = out[0]; D[k + 1] = out[1]; D[k + 2] = out[2]; D[k + 3] = Math.round(alpha * 255);
              if (em) {
                const e = (pIdx) * 4;
                E[e] = out[0]; E[e + 1] = out[1]; E[e + 2] = out[2]; E[e + 3] = 255;
              }
            }
          }
        }
      }
      for (const t of this.tiles) {
        if (t.x > x1 || t.x + t.w <= x0 || t.y > y1 || t.y + t.h <= y0) continue;
        const ix0 = Math.max(x0, t.x), iy0 = Math.max(y0, t.y), ix1 = Math.min(x1 + 1, t.x + t.w), iy1 = Math.min(y1 + 1, t.y + t.h);
        t.ctx.putImageData(img, (x0 - t.x) * S, (y0 - t.y) * S, (ix0 - x0) * S, (iy0 - y0) * S, (ix1 - ix0) * S, (iy1 - iy0) * S);
      }
      this.emitCtx.putImageData(this.emitImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      this.glowDirty = true;
    }

    /* things painted into air pixels; returns alpha 0..255 */
    airDecor(px, py, fx, fy, at, out) {
      const b1 = at(px, py + 1), b2 = at(px, py + 2), b3 = at(px, py + 3);
      /* grass blades: thin, slightly leaning strokes on top of soil */
      let base = -1;
      if (b1 === M.DIRT) base = py + 1; else if (b2 === M.DIRT && b1 === M.AIR) base = py + 2; else if (b3 === M.DIRT && b2 === M.AIR && b1 === M.AIR) base = py + 3;
      if (base > 0 && at(px, base - 1) === M.AIR && this.t.grassy[py * this.W + px]) {
        for (let q = 0; q < 2; q++) {
          const h = hash(px * 2 + q, 7);
          if (h % 3) continue;
          const len = 1.2 + (h & 15) / 6, ox = px + 0.25 + q * 0.5 + ((h >> 4) & 3) * 0.08, lean = ((h >> 2) & 3) - 1.5;
          const up = base - fy;                                   // height above the soil
          if (up < 0 || up > len) continue;
          const cx = ox + lean * 0.22 * up;
          const w = 0.22 * (1 - up / (len + 0.4));
          if (Math.abs(fx - cx) < w + 0.06) {
            const c = ramp(C.grass, 0.15 + (up / len) * -0.1 + 0.25 * (1 - up / len));
            out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
            return 255;
          }
        }
      }
      /* builder steps: a visual board underside so the stairs read bolder (not solid) */
      if (at(px, py - 1) === M.BRICK) { const c = ((fx | 0) & 3) === 0 && (fy - py) < 0.45 ? C.gold : C.pcb; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return 235; }
      if (at(px, py - 2) === M.BRICK && at(px, py - 1) === M.AIR) { out[0] = C.pcbDark[0]; out[1] = C.pcbDark[1]; out[2] = C.pcbDark[2]; return 200; }
      return 0;
    }

    /* texture for one sub-pixel of solid material; returns true if emissive */
    shade(mat, fx, fy, px, py, dist, nx, ny, depth, above, out) {
      const set = (c) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; };
      const top = ny < -0.6, bottom = ny > 0.6;
      const edge = dist < 99;
      switch (mat) {
        case M.DIRT: {
          const sub = depth - 1 + (fy - py);                      // distance below the surface above (px)
          const gd = 2.2 + (hash(px, 3) % 3) * 0.6;
          if (above === M.AIR && sub < gd && this.t.grassy[py * this.W + px]) {
            set(ramp(C.grass, 0.05 + (sub / gd) * 0.95));
            if (sub < 0.45) set(lerp3(C.grass[0], C.grass[1], sub / 0.45));
            return false;
          }
          if (above === M.WATER && sub < 2.2) { set(sub < 1 ? C.silt : C.siltDark); return false; }
          if (above === M.LAVA && sub < 2.4) { set(hash(fx * 3 | 0, fy * 3 | 0) > 235 ? C.ember : sub < 1 ? C.scorch : C.scorchDark); return false; }
          const n = vnoise(fx * 0.32, fy * 0.32) * 0.65 + vnoise(fx * 1.3, fy * 1.3) * 0.35;
          let c = ramp(C.dirt, n);
          /* pebbles: small round stones */
          const cx = Math.floor(fx / 3), cy = Math.floor(fy / 3), hp = hash(cx + 911, cy);
          if (hp > 214) {
            const px0 = cx * 3 + 0.8 + (hp & 3) * 0.35, py0 = cy * 3 + 0.8 + ((hp >> 2) & 3) * 0.35, r = 0.55 + ((hp >> 4) & 3) * 0.12;
            const dx = fx - px0, dy = fy - py0, dd = dx * dx + dy * dy;
            if (dd < r * r) c = dy < -0.1 ? C.pebble : lerp3(C.pebble, C.pebbleLo, 0.6);
          }
          if (edge && dist < 1.1 && !top) c = lerp3(C.dirtDark, c, Math.max(0, dist / 1.1) * 0.7);
          set(c);
          return false;
        }
        case M.ROCK: {
          /* circuit board: sampled from the routed board artwork (js/gfx/board.js) */
          const bd = this.board, S = this.S;
          const ix = Math.min(bd.w - 1, Math.floor(fx * S)), iy = Math.min(bd.h - 1, Math.floor(fy * S)), bk = (iy * bd.w + ix) * 4;
          let c = [bd.data[bk], bd.data[bk + 1], bd.data[bk + 2]];
          if (edge && dist < 0.95) c = top ? C.fibreHi : bottom ? C.fibreLo : C.fibre;
          if (above === M.WATER && depth <= 2) c = C.silt;
          if (above === M.LAVA && depth <= 2) c = C.scorch;
          set(c);
          return false;
        }
        case M.METAL: {
          const lx = fx - Math.floor(fx / 16) * 16, ly = fy - Math.floor(fy / 16) * 16;
          const e = Math.min(lx, ly, 16 - lx, 16 - ly);
          let c = lerp3(C.metal, C.metalHi, 0.08 + 0.06 * Math.sin(fy * 9 + hash(Math.floor(fx / 16), 3)));
          if (e < 0.35) c = C.metalEdge;
          else if (e < 1.1) c = (lx < 1.1 || ly < 1.1) ? C.metalHi : C.metalLo;
          for (const [rx, ry] of [[4, 4], [12, 4], [4, 12], [12, 12]]) {
            const r = Math.hypot(lx - rx, ly - ry);
            if (r < 1.05) { c = r < 0.45 && ly < ry ? C.rivetHi : C.rivet; break; }
            if (r < 1.4 && ly > ry) { c = C.metalLo; break; }
          }
          if (edge && dist < 0.75) {
            if (top) { set(C.neon); return true; }
            if (!bottom) { set(C.neonSide); return true; }
            c = C.metalEdge;
          }
          set(c);
          return false;
        }
        case M.TECH: {
          const lx = fx - Math.floor(fx / 24) * 24, ly = fy - Math.floor(fy / 12) * 12;
          let c = C.tech;
          if (lx < 0.4 || ly < 0.4) c = C.techBorder;
          else if (Math.abs(ly - 6) < 0.3 && lx > 3 && lx < 21) c = C.techLine;
          else if (Math.abs(lx - 12) < 0.3 && ly > 2.5 && ly < 6) c = C.techLine;
          for (const nxp of [3, 20]) {
            const r = Math.hypot(lx - nxp, ly - 6);
            if (r < 0.95) { set(C.node); return true; }
          }
          if (edge && dist < 0.75) {
            if (top) { set(C.neonHot); return true; }
            if (!bottom) { set(C.cyan); return true; }
          }
          set(c);
          return false;
        }
        case M.BRICK: {
          const sub = depth - 1 + (fy - py);
          if (above !== M.BRICK && sub < 0.75) { set(C.pcbTrace); return true; }
          if (sub < 1.5) { set(((fx | 0) & 3) === 0 ? C.gold : C.copperHi); return false; }
          set(bottom && edge && dist < 0.6 ? C.pcbDark : ((fx * 2 | 0) & 7) === 3 ? C.pcbLine : C.pcb);
          return false;
        }
        case M.ICE: {
          /* glassy ice: cool gradient, faint fracture lines, bright crust on top */
          const sub = depth - 1 + (fy - py);
          if (above === M.AIR && sub < 1.2) { set(sub < 0.5 ? C.iceHi : C.ice2); return false; }
          const n = vnoise(fx * 0.18, fy * 0.3) * 0.6 + vnoise(fx * 0.9, fy * 0.5) * 0.4;
          let c = lerp3(C.iceDeep, C.ice, Math.min(1, n * 1.3));
          const crack = Math.abs(vnoise(fx * 0.12 + 7, fy * 0.12) - 0.5);
          if (crack < 0.018) c = C.ice2;
          if (hash(fx * 2 | 0, fy * 2 | 0) > 250) c = C.iceHi;
          if (edge && dist < 0.9) c = top ? C.iceHi : bottom ? C.iceDeep : C.ice2;
          set(c);
          return false;
        }
        case M.OW_L: case M.OW_R: {
          const u = ((fx % 12) + 12) % 12, v = fy % 12;
          const uu = mat === M.OW_R ? 12 - u : u;     // chevrons point the way you may bash
          let c = vnoise(fx * 0.6, fy * 0.6) > 0.5 ? C.ow : C.ow2;
          const dv = Math.abs(v - 6);
          if (uu > 2.5 && uu < 9.5 && dv < 3.6 && Math.abs(dv - (uu - 3)) < 0.75) c = C.owArrow;
          if (edge && dist < 0.8) { set(top ? C.owHi : C.owArrow); return top; }
          set(c);
          return false;
        }
      }
      set([255, 0, 255]);
      return false;
    }

    /* draw the terrain in world space (ctx already scaled to world px) */
    draw(ctx, vx0, vy0, vx1, vy1) {
      for (const t of this.tiles) {
        if (vx1 !== undefined && (t.x > vx1 || t.x + t.w < vx0 || t.y > vy1 || t.y + t.h < vy0)) continue;
        ctx.drawImage(t.c, t.x, t.y, t.w, t.h);
      }
    }

    /* ------------------------------------------------------------ fluids
       Collect fluid as rectangles (column runs merged sideways); the
       renderer draws them every frame with moving surfaces. */
    collectFluids() {
      const t = this.t, W = this.W, H = this.H, m = t.m;
      const cols = [];
      for (let x = 0; x < W; x++) {
        let y = 0;
        while (y < H) {
          const v = m[y * W + x];
          if (v === M.LAVA || v === M.WATER) {
            const y0 = y;
            while (y < H && m[y * W + x] === v) y++;
            cols.push({ x, y0, y1: y, mat: v });
          } else y++;
        }
      }
      const rects = [];
      const open = new Map();
      for (const c of cols) {
        const key = c.y0 + ":" + c.y1 + ":" + c.mat;
        const r = open.get(key);
        if (r && r.x1 === c.x) { r.x1 = c.x + 1; }
        else { const nr = { x0: c.x, x1: c.x + 1, y0: c.y0, y1: c.y1, mat: c.mat }; rects.push(nr); open.set(key, nr); }
      }
      this.fluids = rects;
      /* fluid surfaces glow */
      const E = this.emitImg.data;
      let any = false;
      for (const r of rects) {
        const col = rgb(r.mat === M.LAVA ? C.lava[1] : C.water[2]);
        for (let x = r.x0; x < r.x1; x++) for (let y = r.y0; y < Math.min(r.y1, r.y0 + 2); y++) {
          const k = (y * W + x) * 4; E[k] = col[0]; E[k + 1] = col[1]; E[k + 2] = col[2]; E[k + 3] = 255; any = true;
        }
      }
      if (any) { this.emitCtx.putImageData(this.emitImg, 0, 0); this.glowDirty = true; }
    }

    drawFluids(ctx, time) {
      for (const r of this.fluids) {
        const pal = r.mat === M.LAVA ? C.lava : C.water;
        const g = ctx.createLinearGradient(0, r.y0, 0, r.y1);
        g.addColorStop(0, pal[1]); g.addColorStop(Math.min(1, 2.5 / (r.y1 - r.y0)), pal[2]);
        g.addColorStop(Math.min(1, 6 / (r.y1 - r.y0)), pal[3]); g.addColorStop(1, pal[5]);
        ctx.fillStyle = g;
        ctx.globalAlpha = r.mat === M.WATER ? 0.92 : 1;
        // body with a gently moving surface
        ctx.beginPath();
        ctx.moveTo(r.x0, r.y1);
        for (let x = r.x0; x <= r.x1; x += 0.5) {
          const w = Math.sin(x * 0.55 + time * (r.mat === M.LAVA ? 1.3 : 2.4)) * 0.28 + Math.sin(x * 1.7 - time * 1.9) * 0.12;
          ctx.lineTo(x, r.y0 + 0.35 + w);
        }
        ctx.lineTo(r.x1, r.y1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // highlight line on the surface
        ctx.strokeStyle = pal[0];
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        for (let x = r.x0; x <= r.x1; x += 0.5) {
          const w = Math.sin(x * 0.55 + time * (r.mat === M.LAVA ? 1.3 : 2.4)) * 0.28 + Math.sin(x * 1.7 - time * 1.9) * 0.12;
          if (x === r.x0) ctx.moveTo(x, r.y0 + 0.4 + w); else ctx.lineTo(x, r.y0 + 0.4 + w);
        }
        ctx.stroke();
        // lava bubbles / coolant shimmer
        const n = Math.max(1, Math.floor((r.x1 - r.x0) / 9));
        for (let i = 0; i < n; i++) {
          const h = hash(r.x0 + i * 13, r.y0);
          const per = 2.2 + (h & 7) * 0.3, ph = ((time + (h >> 3) * 0.17) % per) / per;
          const bx = r.x0 + 1.5 + ((h * 7) % Math.max(1, r.x1 - r.x0 - 3));
          if (r.mat === M.LAVA) {
            const by = r.y0 + 1 + (1 - ph) * Math.min(6, r.y1 - r.y0 - 1.5);
            ctx.fillStyle = pal[ph > 0.85 ? 0 : 1];
            ctx.beginPath(); ctx.arc(bx, by, 0.35 + ph * 0.55, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = "rgba(212,253,255," + (0.5 * Math.sin(ph * Math.PI)).toFixed(3) + ")";
            ctx.fillRect(bx, r.y0 + 2 + ((h >> 2) & 7) * 0.7, 2.5, 0.3);
          }
        }
      }
    }

    getGlow() {
      const now = Date.now();
      if (this.glowDirty && (!this.glowAt || now - this.glowAt > 120)) {
        this.glowAt = now;
        const h = this.glowHalf.getContext("2d"), g = this.glowCtx;
        h.imageSmoothingEnabled = true; g.imageSmoothingEnabled = true;
        h.clearRect(0, 0, this.glowHalf.width, this.glowHalf.height);
        h.drawImage(this.emit, 0, 0, this.glowHalf.width, this.glowHalf.height);
        g.clearRect(0, 0, this.glow.width, this.glow.height);
        g.globalCompositeOperation = "lighter";
        g.drawImage(this.glowHalf, 0, 0, this.glow.width, this.glow.height);
        g.drawImage(this.glowHalf, 0, 0, this.glow.width, this.glow.height);
        g.globalCompositeOperation = "source-over";
        this.glowDirty = false;
      }
      return this.glow;
    }

    static minimapColor(mat) {
      switch (mat) {
        case M.DIRT: return [122, 80, 54];
        case M.ROCK: return [24, 92, 64];
        case M.METAL: return [70, 80, 92];
        case M.TECH: return [30, 120, 90];
        case M.BRICK: return [125, 255, 212];
        case M.LAVA: return [255, 106, 43];
        case M.WATER: return [47, 179, 232];
        case M.OW_L: case M.OW_R: return [120, 80, 200];
        case M.ICE: return [127, 196, 230];
      }
      return null;
    }
  }

  OL.TerrainRenderer = TerrainRenderer;
})();
