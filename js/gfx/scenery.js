/* Omarchy Lemmings — scenery: entrance hatch, exit gate, parallax backdrop.
   All drawn procedurally at world-pixel scale. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  function canvas(doc, w, h) { const c = doc.createElement("canvas"); c.width = w; c.height = h; return c; }
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) & 255;
  }
  const R = (ctx, col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

  /* filled triangle with a 1px neon edge, apex (cx, top), base width bw */
  function tri(ctx, cx, top, h, fill, edge) {
    for (let r = 0; r < h; r++) {
      const half = Math.floor((r * (h + 1)) / h / 2 + r / 2);
      const w = half * 2 + 1;
      R(ctx, fill, cx - half, top + r, w, 1);
      if (edge) { R(ctx, edge, cx - half, top + r, 1, 1); R(ctx, edge, cx + half, top + r, 1, 1); }
    }
    if (edge) { const half = Math.floor(((h - 1) * (h + 1)) / h / 2 + (h - 1) / 2); R(ctx, edge, cx - half, top + h - 1, half * 2 + 1, 1); }
  }

  /* ------------------------------------------------------------ entrance
     Stone arch with a glowing triangle keystone. Frames: 0 closed .. 3 open.
     Anchor: (AX, AY) is the spawn point = bottom centre of the opening. */
  const HATCH = { W: 36, H: 34, AX: 18, AY: 29 };
  function drawHatch(doc, frame) {
    const c = canvas(doc, HATCH.W, HATCH.H), x = c.getContext("2d");
    const stone = ["#4e5469", "#575d74", "#454a5e"];
    // interior
    R(x, "#04060a", 7, 10, 22, 19);
    const g = x.createLinearGradient(0, 10, 0, 29);
    g.addColorStop(0, "rgba(46,229,157,0.05)"); g.addColorStop(1, "rgba(46,229,157,0.22)");
    x.fillStyle = g; x.fillRect(7, 10, 22, 19);
    // pillars + lintel, stone blocks
    const block = (bx, by, bw, bh) => {
      R(x, "#16161f", bx, by, bw, bh);
      R(x, stone[hash(bx, by) % 3], bx + 1, by + 1, bw - 1, bh - 1);
      R(x, "#6e7592", bx + 1, by + 1, bw - 1, 1);
      R(x, "#2c2f3d", bx + 1, by + bh - 1, bw - 1, 1);
    };
    for (let by = 10; by < 32; by += 5) { block(0, by, 7, 5); block(29, by, 7, 5); }
    block(0, 6, 12, 5); block(12, 6, 12, 5); block(24, 6, 12, 5);
    // keystone triangle
    tri(x, 18, 0, 9, "#0f3b2a", "#2ee59d");
    R(x, "#b9ffe0", 18, 3, 1, 2);
    // trapdoor leaves
    const lc = "#2c323a", le = "#4a5461";
    if (frame === 0) { R(x, lc, 7, 27, 22, 2); R(x, le, 7, 27, 22, 1); R(x, "#14181d", 17, 27, 2, 2); }
    else if (frame === 1) { R(x, lc, 7, 27, 9, 3); R(x, lc, 20, 27, 9, 3); R(x, le, 7, 27, 9, 1); R(x, le, 20, 27, 9, 1); }
    else if (frame === 2) { for (let i = 0; i < 7; i++) { R(x, lc, 7 + Math.floor(i / 2), 27 + i, 2, 1); R(x, lc, 27 - Math.floor(i / 2), 27 + i, 2, 1); } }
    else { R(x, lc, 7, 27, 2, 7); R(x, lc, 27, 27, 2, 7); R(x, le, 7, 27, 1, 7); R(x, le, 28, 27, 1, 7); }
    // floor ledge of the arch
    R(x, "#2ee59d", 0, 32, 7, 1); R(x, "#2ee59d", 29, 32, 7, 1);
    return c;
  }

  /* ---------------------------------------------------------------- exit
     Metal gate, neon edges, Omarchy triangle on the lintel, animated portal.
     Anchor: (AX, AY) = the exit's floor point. */
  const GATE = { W: 34, H: 38, AX: 17, AY: 37 };
  function drawGate(doc, frame) {
    const c = canvas(doc, GATE.W, GATE.H), x = c.getContext("2d");
    // portal
    const g = x.createLinearGradient(0, 12, 0, 37);
    const p = 0.55 + 0.15 * Math.sin((frame / 6) * Math.PI * 2);
    g.addColorStop(0, `rgba(34,211,238,${0.25 * p})`);
    g.addColorStop(0.6, `rgba(46,229,157,${0.55 * p})`);
    g.addColorStop(1, `rgba(185,255,224,${0.9 * p})`);
    R(x, "#03100c", 6, 12, 22, 25);
    x.fillStyle = g; x.fillRect(6, 12, 22, 25);
    for (let yy = 12; yy < 37; yy += 2) { x.fillStyle = "rgba(0,0,0,0.18)"; x.fillRect(6, yy + (frame & 1), 22, 1); }
    // rising motes
    for (let i = 0; i < 6; i++) {
      const mx = 8 + ((i * 7 + frame * 3) % 18), my = 36 - ((i * 11 + frame * 4) % 22);
      R(x, "#b9ffe0", mx, my, 1, 1);
    }
    // pillars
    const metal = (bx, by, bw, bh) => {
      R(x, "#14181d", bx, by, bw, bh);
      R(x, "#2c323a", bx + 1, by + 1, bw - 2, bh - 2);
      R(x, "#4a5461", bx + 1, by + 1, bw - 2, 1);
    };
    metal(0, 10, 6, 28); metal(28, 10, 6, 28);
    R(x, "#2ee59d", 5, 12, 1, 25); R(x, "#2ee59d", 28, 12, 1, 25);
    R(x, "#8592a1", 2, 15, 1, 1); R(x, "#8592a1", 2, 31, 1, 1); R(x, "#8592a1", 31, 15, 1, 1); R(x, "#8592a1", 31, 31, 1, 1);
    // lintel
    metal(0, 8, 34, 5);
    R(x, "#2ee59d", 1, 12, 32, 1);
    // triangle crest
    tri(x, 17, 0, 9, "#0f3b2a", "#2ee59d");
    R(x, frame % 2 ? "#b9ffe0" : "#2ee59d", 17, 3, 1, 3);
    // threshold
    R(x, "#b9ffe0", 6, 37, 22, 1);
    return c;
  }

  /* ----------------------------------------------------------- backdrop
     Three parallax layers at world-pixel scale. Layer width covers the
     whole scroll range for its factor. */
  function buildBackdrop(doc, W, H, viewW, seed) {
    seed = seed || 1;
    const layers = [];
    const mk = (factor) => {
      const w = Math.ceil((W - viewW) * factor + viewW) + 2;
      const c = canvas(doc, Math.max(w, viewW), H);
      layers.push({ c, f: factor });
      return c.getContext("2d");
    };

    /* sky (static) */
    const sky = mk(0);
    const sg = sky.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, "#030507"); sg.addColorStop(0.55, "#06100f"); sg.addColorStop(1, "#0a1a17");
    sky.fillStyle = sg; sky.fillRect(0, 0, sky.canvas.width, H);
    for (let i = 0; i < 160; i++) {
      const sx = hash(i, seed) * sky.canvas.width / 256 + hash(seed, i) % 4, sy = hash(i * 3, seed + 9) * H * 0.6 / 256;
      R(sky, hash(i, 77) > 220 ? "#a6ffd8" : "#3a5550", sx | 0, sy | 0, 1, 1);
    }
    // moon: outlined circle
    const mx = Math.floor(viewW * 0.72), my = Math.floor(H * 0.2), mr = 14;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
      const d = x * x + y * y;
      if (d <= mr * mr) R(sky, d >= (mr - 1) * (mr - 1) ? "#2ee59d" : (x + y > 6 ? "#0c2620" : "#0f3127"), mx + x, my + y, 1, 1);
    }

    /* far: mountains with the big triangle peak */
    const far = mk(0.15);
    const fw = far.canvas.width;
    far.fillStyle = "#08130f";
    far.beginPath(); far.moveTo(0, H);
    for (let x = 0; x <= fw; x += 4) {
      const y = H * 0.62 - 26 * Math.abs(Math.sin(x / 61 + seed)) - 14 * Math.abs(Math.sin(x / 23));
      far.lineTo(x, Math.round(y));
    }
    far.lineTo(fw, H); far.closePath(); far.fill();
    const px = Math.floor(fw * 0.38), ph = Math.floor(H * 0.42);
    tri(far, px, Math.floor(H * 0.62) - ph, ph, "#0a1a14", "#1a8f63");
    tri(far, px, Math.floor(H * 0.62) - ph + Math.floor(ph * 0.55), Math.floor(ph * 0.45), "#071510", null);

    /* mid: city towers with lit windows */
    const mid = mk(0.35);
    const mw = mid.canvas.width;
    let x = 0, i = 0;
    while (x < mw) {
      const bw = 10 + (hash(i, seed + 3) % 18), bh = 30 + (hash(i, seed + 5) % 70);
      const top = Math.floor(H * 0.78) - bh;
      R(mid, "#08100f", x, top, bw, H - top);
      R(mid, "#0f2420", x, top, bw, 1);
      if (hash(i, 9) % 4 === 0) R(mid, "#1a8f63", x + (bw >> 1), top - 8, 1, 8);
      for (let wy = top + 4; wy < H * 0.78; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        const hv = hash(wx, wy);
        if (hv > 236) R(mid, hv > 250 ? "#22d3ee" : "#1a8f63", wx, wy, 1, 2);
      }
      x += bw + 2 + (hash(i, 11) % 6); i++;
    }
    mid.fillStyle = "#06100d"; mid.fillRect(0, Math.floor(H * 0.78), mw, H);

    /* near: cave ceiling silhouette + drips */
    const near = mk(0.6);
    const nw = near.canvas.width;
    near.fillStyle = "#050807";
    for (let x2 = 0; x2 < nw; x2 += 2) {
      const d = 6 + (hash(x2 >> 3, seed + 21) % 18) + ((hash(x2 >> 5, seed) % 4 === 0) ? hash(x2 >> 2, 1) % 30 : 0);
      near.fillRect(x2, 0, 2, d);
    }
    return { layers };
  }

  OL.Scenery = { HATCH, GATE, drawHatch, drawGate, buildBackdrop, tri };
})();
