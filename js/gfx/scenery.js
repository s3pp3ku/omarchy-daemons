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
  const A = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

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

  /* ---------------------------------------------------------------- mark
     Original "prompt mark": a neon triangle with a terminal cursor inside.
     Used on the hatch, the gate and the title. Swap it here to rebrand. */
  function drawMark(ctx, cx, top, h, col, fill, cursorOn) {
    for (let r = 0; r < h; r++) {
      const half = Math.floor((r * 0.62) + 0.5);
      if (fill) R(ctx, fill, cx - half, top + r, half * 2 + 1, 1);
      R(ctx, col, cx - half, top + r, 1, 1);
      R(ctx, col, cx + half, top + r, 1, 1);
      if (r === h - 1) R(ctx, col, cx - half, top + r, half * 2 + 1, 1);
    }
    if (cursorOn) {
      const w = Math.max(2, Math.floor(h / 3));
      R(ctx, OL.T.accentHot, cx - (w >> 1), top + h - 3, w, 1);
    }
  }

  /* 3x5 pixel glyphs for tiny in-world text */
  const GLYPH = {
    "$": [".#.", "##.", ".#.", ".##", ".#."], ">": ["#..", ".#.", "..#", ".#.", "#.."],
    "_": ["...", "...", "...", "...", "###"], "~": ["...", ".#.", "#.#", "...", "..."], "/": ["..#", "..#", ".#.", "#..", "#.."],
  };
  function text(ctx, str, x, y, col) {
    for (const ch of str) {
      const g = GLYPH[ch];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === "#") R(ctx, col, x + c, y + r, 1, 1);
      x += 4;
    }
  }

  /* a tiled window: rounded frame, neon border, title bar with workspace dots */
  function tileWin(ctx, x, y, w, h, active) {
    const border = OL.T.accent, bar = OL.T.panel;
    R(ctx, OL.T.void, x + 1, y + 1, w - 2, h - 2);
    R(ctx, border, x + 2, y, w - 4, 1); R(ctx, border, x + 2, y + h - 1, w - 4, 1);
    R(ctx, border, x, y + 2, 1, h - 4); R(ctx, border, x + w - 1, y + 2, 1, h - 4);
    R(ctx, border, x + 1, y + 1, 1, 1); R(ctx, border, x + w - 2, y + 1, 1, 1);
    R(ctx, border, x + 1, y + h - 2, 1, 1); R(ctx, border, x + w - 2, y + h - 2, 1, 1);
    R(ctx, bar, x + 1, y + 1, w - 2, 6);
    R(ctx, OL.T.accentDim, x + 1, y + 7, w - 2, 1);
    // workspace dots (one active), like a bar
    for (let i = 0; i < 3; i++) R(ctx, i === active ? OL.T.accentHot : OL.T.line2, x + w - 6 - i * 4, y + 3, 2, 2);
  }

  /* ------------------------------------------------------------ entrance
     A floating terminal window; its bottom edge splits open like a trapdoor.
     Frames: 0 closed .. 3 open. (AX, AY) = spawn point. */
  const HATCH = { W: 40, H: 46, AX: 20, AY: 41 };
  function drawHatch(doc, frame, blink) {
    const c = canvas(doc, HATCH.W, HATCH.H), x = c.getContext("2d");
    drawMark(x, 20, 1, 10, OL.T.accent, OL.T.accentDeep, false);
    tileWin(x, 1, 11, 38, 31, 0);
    // terminal body
    const g = x.createLinearGradient(0, 19, 0, 41);
    g.addColorStop(0, A(OL.T.accent, 0.03)); g.addColorStop(1, A(OL.T.accent, 0.22));
    x.fillStyle = g; x.fillRect(2, 19, 36, 22);
    text(x, ">", 5, 22, OL.T.accent);
    if (blink) R(x, OL.T.accentHot, 10, 22, 3, 5);
    // trapdoor: the window's bottom border
    const lc = OL.T.accent, dk = OL.T.accentDim, y0 = 41;
    R(x, OL.T.void, 3, y0, 34, 1);
    if (frame === 0) R(x, lc, 3, y0, 34, 1);
    else if (frame === 1) { R(x, lc, 3, y0, 14, 1); R(x, lc, 23, y0, 14, 1); }
    else if (frame === 2) { for (let i = 0; i < 6; i++) { R(x, lc, 3 + i * 2, y0 + Math.floor(i / 2), 2, 1); R(x, lc, 35 - i * 2, y0 + Math.floor(i / 2), 2, 1); } }
    else { R(x, lc, 3, y0, 2, 5); R(x, lc, 35, y0, 2, 5); R(x, dk, 5, y0, 1, 4); R(x, dk, 34, y0, 1, 4); }
    return c;
  }

  /* ---------------------------------------------------------------- exit
     A tall window-portal crowned by the prompt mark.
     (AX, AY) = the exit's floor point. */
  const GATE = { W: 38, H: 50, AX: 19, AY: 49 };
  function drawGate(doc, frame) {
    const c = canvas(doc, GATE.W, GATE.H), x = c.getContext("2d");
    // crown: big mark with halo
    drawMark(x, 19, 1, 14, OL.T.accent, OL.T.accentDeep, frame % 3 !== 2);
    // frame
    tileWin(x, 3, 15, 32, 35, (frame >> 1) % 3);
    // portal
    const p = 0.6 + 0.2 * Math.sin((frame / 6) * Math.PI * 2);
    const g = x.createLinearGradient(0, 23, 0, 48);
    g.addColorStop(0, A(OL.T.accent2, 0.3 * p));
    g.addColorStop(0.55, A(OL.T.accent, 0.75 * p));
    g.addColorStop(1, A(OL.T.accentHot, 0.95 * p));
    x.fillStyle = g; x.fillRect(4, 23, 30, 26);
    for (let yy = 23; yy < 49; yy += 2) { x.fillStyle = "rgba(0,0,0,0.2)"; x.fillRect(4, yy + (frame & 1), 30, 1); }
    for (let i = 0; i < 7; i++) {
      const mx = 6 + ((i * 7 + frame * 3) % 26), my = 47 - ((i * 11 + frame * 4) % 22);
      R(x, OL.T.accentHot, mx, my, 1, 1);
    }
    text(x, ">_", 7, 17, frame & 2 ? OL.T.accentHot : OL.T.accent);
    // threshold
    R(x, OL.T.accentHot, 4, 49, 30, 1);
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
    sg.addColorStop(0, OL.T.sky[0]); sg.addColorStop(0.55, OL.T.sky[1]); sg.addColorStop(1, OL.T.sky[2]);
    sky.fillStyle = sg; sky.fillRect(0, 0, sky.canvas.width, H);
    for (let i = 0; i < 160; i++) {
      const sx = hash(i, seed) * sky.canvas.width / 256 + hash(seed, i) % 4, sy = hash(i * 3, seed + 9) * H * 0.6 / 256;
      R(sky, hash(i, 77) > 220 ? OL.T.accentHot : OL.T.line2, sx | 0, sy | 0, 1, 1);
    }
    // moon: outlined circle
    const mx = Math.floor(viewW * 0.72), my = Math.floor(H * 0.2), mr = 14;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
      const d = x * x + y * y;
      if (d <= mr * mr) R(sky, d >= (mr - 1) * (mr - 1) ? OL.T.accent : (x + y > 6 ? OL.T.accentDeep : OL.mix(OL.T.accentDeep, OL.T.accent, 0.15)), mx + x, my + y, 1, 1);
    }

    /* far: mountains with the big triangle peak */
    const far = mk(0.15);
    const fw = far.canvas.width;
    far.fillStyle = OL.T.land;
    far.beginPath(); far.moveTo(0, H);
    for (let x = 0; x <= fw; x += 4) {
      const y = H * 0.62 - 26 * Math.abs(Math.sin(x / 61 + seed)) - 14 * Math.abs(Math.sin(x / 23));
      far.lineTo(x, Math.round(y));
    }
    far.lineTo(fw, H); far.closePath(); far.fill();
    const px = Math.floor(fw * 0.38), ph = Math.floor(H * 0.42);
    tri(far, px, Math.floor(H * 0.62) - ph, ph, OL.T.land, OL.T.accentDim);
    tri(far, px, Math.floor(H * 0.62) - ph + Math.floor(ph * 0.55), Math.floor(ph * 0.45), OL.T.ceil, null);

    /* mid: city towers with lit windows */
    const mid = mk(0.35);
    const mw = mid.canvas.width;
    let x = 0, i = 0;
    while (x < mw) {
      const bw = 10 + (hash(i, seed + 3) % 18), bh = 30 + (hash(i, seed + 5) % 70);
      const top = Math.floor(H * 0.78) - bh;
      R(mid, OL.T.city, x, top, bw, H - top);
      R(mid, OL.T.cityTop, x, top, bw, 1);
      if (hash(i, 9) % 4 === 0) R(mid, OL.T.accentDim, x + (bw >> 1), top - 8, 1, 8);
      for (let wy = top + 4; wy < H * 0.78; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        const hv = hash(wx, wy);
        if (hv > 236) R(mid, hv > 250 ? OL.T.accent2 : OL.T.accentDim, wx, wy, 1, 2);
      }
      x += bw + 2 + (hash(i, 11) % 6); i++;
    }
    mid.fillStyle = OL.T.city; mid.fillRect(0, Math.floor(H * 0.78), mw, H);

    /* near: cave ceiling silhouette + drips */
    const near = mk(0.6);
    const nw = near.canvas.width;
    near.fillStyle = OL.T.ceil;
    for (let x2 = 0; x2 < nw; x2 += 2) {
      const d = 6 + (hash(x2 >> 3, seed + 21) % 18) + ((hash(x2 >> 5, seed) % 4 === 0) ? hash(x2 >> 2, 1) % 30 : 0);
      near.fillRect(x2, 0, 2, d);
    }
    return { layers };
  }

  OL.Scenery = { HATCH, GATE, drawHatch, drawGate, drawMark, buildBackdrop, tri };
})();
