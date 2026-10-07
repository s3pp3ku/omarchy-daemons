/* Omarchy Lemmings — scenery, drawn as smooth vectors in world space:
   the prompt mark, the entrance window, the exit portal, mechanisms and
   the parallax backdrop (rendered once at S× resolution). */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const TAU = Math.PI * 2;
  const A = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) & 255;
  }

  /* ---------------------------------------------------------------- mark
     Original "prompt mark": a neon triangle with a blinking cursor inside.
     Swap this one function to rebrand. (cx, top) apex, h height. */
  function drawMark(ctx, cx, top, h, cursorOn, glow) {
    const T = OL.T, w = h * 0.62;
    ctx.save();
    if (glow) { ctx.shadowColor = T.accent; ctx.shadowBlur = h * 0.6; }
    ctx.lineJoin = "round";
    ctx.fillStyle = A(T.accentDeep, 0.95);
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = Math.max(0.6, h * 0.09);
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + w, top + h); ctx.lineTo(cx - w, top + h); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (cursorOn) { ctx.fillStyle = T.accentHot; ctx.fillRect(cx - h * 0.17, top + h * 0.68, h * 0.34, h * 0.09); }
    ctx.restore();
  }

  /* a tiled window: rounded frame, border, title bar with workspace dots */
  function tileWin(ctx, x, y, w, h, active, t) {
    const T = OL.T;
    ctx.save();
    ctx.fillStyle = A(T.void, 0.94);
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 2); ctx.fill();
    ctx.fillStyle = T.panel;
    ctx.beginPath(); ctx.roundRect(x, y, w, 5.5, [2, 2, 0, 0]); ctx.fill();
    ctx.strokeStyle = T.accent; ctx.lineWidth = 0.7;
    ctx.shadowColor = T.accent; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = T.accentDim; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(x + 0.5, y + 5.5); ctx.lineTo(x + w - 0.5, y + 5.5); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === active ? T.accentHot : T.line2;
      ctx.beginPath(); ctx.arc(x + w - 3 - i * 3, y + 2.75, 0.9, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ entrance
     Floating terminal window; its bottom edge splits open like a trapdoor.
     (x, y) = spawn point. open 0..1 */
  function drawHatch(ctx, x, y, open, blink, time) {
    const T = OL.T, w = 34, h = 28, x0 = x - w / 2, y0 = y - h - 1;
    drawMark(ctx, x, y0 - 10.5, 9, false, true);
    tileWin(ctx, x0, y0, w, h, 0, time);
    const g = ctx.createLinearGradient(0, y0 + 6, 0, y);
    g.addColorStop(0, A(T.accent, 0.02)); g.addColorStop(1, A(T.accent, 0.22));
    ctx.fillStyle = g; ctx.fillRect(x0 + 0.6, y0 + 6, w - 1.2, h - 6.6);
    ctx.font = "4px ui-monospace, monospace"; ctx.textBaseline = "top";
    ctx.fillStyle = T.accent; ctx.fillText("$", x0 + 2.5, y0 + 8);
    ctx.fillStyle = T.dim; ctx.fillText("useradd -m", x0 + 5.5, y0 + 8);
    if (blink) { ctx.fillStyle = T.accentHot; ctx.fillRect(x0 + 2.6, y0 + 13.5, 2.2, 3.4); }
    // trapdoor: two flaps in the middle of the bottom edge
    ctx.save();
    ctx.strokeStyle = T.accent; ctx.lineWidth = 0.9; ctx.lineCap = "round";
    const a = open * 1.45, fl = 5.5;
    ctx.beginPath();
    ctx.moveTo(x - fl, y); ctx.lineTo(x - fl + Math.cos(a) * fl, y + Math.sin(a) * fl);
    ctx.moveTo(x + fl, y); ctx.lineTo(x + fl - Math.cos(a) * fl, y + Math.sin(a) * fl);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------- exit
     A tall window-portal crowned by the mark. (x, y) = floor point. */
  function drawGate(ctx, x, y, time) {
    const T = OL.T, w = 30, h = 34, x0 = x - w / 2, y0 = y - h + 0.5;
    drawMark(ctx, x, y0 - 15, 13, Math.floor(time * 2) % 2 === 0, true);
    tileWin(ctx, x0, y0, w, h, Math.floor(time) % 3, time);
    const pulse = 0.65 + 0.2 * Math.sin(time * 3);
    const g = ctx.createLinearGradient(0, y0 + 6, 0, y);
    g.addColorStop(0, A(T.accent2, 0.25 * pulse)); g.addColorStop(0.55, A(T.accent, 0.7 * pulse)); g.addColorStop(1, A(T.accentHot, 0.95 * pulse));
    ctx.fillStyle = g; ctx.fillRect(x0 + 0.6, y0 + 6, w - 1.2, h - 6.6);
    // scanlines + rising motes
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let yy = y0 + 6 + ((time * 6) % 2); yy < y; yy += 2) ctx.fillRect(x0 + 0.6, yy, w - 1.2, 0.5);
    for (let i = 0; i < 9; i++) {
      const ph = (time * 0.5 + i * 0.137) % 1;
      ctx.fillStyle = A(T.accentHot, 1 - ph);
      ctx.beginPath(); ctx.arc(x0 + 3 + ((i * 7.3) % (w - 6)), y - 1 - ph * (h - 9), 0.45, 0, TAU); ctx.fill();
    }
    ctx.font = "5px ui-monospace, monospace"; ctx.textBaseline = "top";
    ctx.fillStyle = T.accentHot; ctx.fillText(">_", x0 + 2.5, y0 + 0.6);
    ctx.fillStyle = T.accentHot; ctx.fillRect(x0 + 1, y - 0.6, w - 2, 0.6);
  }

  /* ------------------------------------------------------- mechanisms */
  function drawWindowPlatform(ctx, p, time) {
    const T = OL.T;
    ctx.save();
    ctx.fillStyle = T.panel;
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, Math.min(1.4, p.h / 2)); ctx.fill();
    ctx.shadowColor = T.accent; ctx.shadowBlur = 3;
    ctx.strokeStyle = T.accent; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(p.x + 0.5, p.y + 0.3); ctx.lineTo(p.x + p.w - 0.5, p.y + 0.3); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = T.accentDim; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.roundRect(p.x + 0.2, p.y + 0.2, p.w - 0.4, p.h - 0.4, Math.min(1.2, p.h / 2)); ctx.stroke();
    if (p.h >= 5) for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 ? T.accentHot : T.line2; ctx.beginPath(); ctx.arc(p.x + p.w - 3 - i * 2.6, p.y + 2.2, 0.75, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function drawCrusher(ctx, k, ph, time) {
    const T = OL.T, headH = 10, topB = k.top + headH, floorB = k.y + 1;
    let bottom;
    if (ph.slam) bottom = floorB;
    else if (ph.c < k.rise) bottom = floorB - ((floorB - topB) * ph.c) / k.rise;
    else bottom = topB;
    if (ph.warn) bottom += Math.sin(time * 60) * 0.5;
    const hw = (k.w >> 1) + 3, x0 = k.x - hw + 0.5, w = hw * 2, y0 = bottom - headH;
    ctx.save();
    // piston
    const pg = ctx.createLinearGradient(k.x - 2, 0, k.x + 3, 0);
    pg.addColorStop(0, "#3d444f"); pg.addColorStop(0.5, "#9aa5b2"); pg.addColorStop(1, "#3d444f");
    ctx.fillStyle = pg; ctx.fillRect(k.x - 1.5, k.top, 4, Math.max(0, y0 - k.top));
    // head
    const hg = ctx.createLinearGradient(0, y0, 0, y0 + headH);
    hg.addColorStop(0, "#4a5461"); hg.addColorStop(1, "#1f242a");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(x0, y0, w, headH, 1.2); ctx.fill();
    // hazard stripes
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 0.6, y0 + headH - 3, w - 1.2, 2.2); ctx.clip();
    ctx.fillStyle = "#14181d"; ctx.fillRect(x0, y0 + headH - 3, w, 3);
    ctx.fillStyle = T.warn;
    for (let s = -4; s < w + 4; s += 3) { ctx.beginPath(); ctx.moveTo(x0 + s, y0 + headH); ctx.lineTo(x0 + s + 1.5, y0 + headH); ctx.lineTo(x0 + s + 3.5, y0 + headH - 3); ctx.lineTo(x0 + s + 2, y0 + headH - 3); ctx.fill(); }
    ctx.restore();
    ctx.font = "bold 4.2px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = ph.slam ? T.danger : "#c5ced8"; ctx.fillText("OOM", k.x + 0.5, y0 + 1.4);
    const lit = ph.slam || (ph.warn && Math.floor(time * 8) % 2);
    ctx.fillStyle = lit ? T.danger : A(T.danger, 0.3);
    if (lit) { ctx.shadowColor = T.danger; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(x0 + w - 2, y0 + 2, 0.9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ----------------------------------------------------------- backdrop
     Three parallax layers rendered at S× with smooth shapes. */
  function buildBackdrop(doc, W, H, viewW, seed, S) {
    const T = OL.T;
    seed = seed || 1; S = S || 2;
    const layers = [];
    const mk = (factor) => {
      const w = Math.ceil((W - viewW) * factor + viewW) + 2;
      const c = doc.createElement("canvas");
      c.width = Math.max(w, viewW) * S; c.height = H * S;
      const g = c.getContext("2d");
      g.scale(S, S);
      layers.push({ c, f: factor, w: c.width / S });
      return g;
    };

    const sky = mk(0), sw = layers[0].w;
    const sg = sky.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, T.sky[0]); sg.addColorStop(0.55, T.sky[1]); sg.addColorStop(1, T.sky[2]);
    sky.fillStyle = sg; sky.fillRect(0, 0, sw, H);
    for (let i = 0; i < 180; i++) {
      const x = (hash(i, seed) * sw) / 256 + (hash(seed, i) % 4), y = (hash(i * 3, seed + 9) * H * 0.62) / 256;
      const r = hash(i, 77) > 225 ? 0.55 : 0.3;
      sky.fillStyle = hash(i, 77) > 225 ? T.accentHot : A(T.text, 0.35);
      sky.beginPath(); sky.arc(x, y, r, 0, TAU); sky.fill();
    }
    const mx = viewW * 0.72, my = H * 0.2, mr = 13;
    const mg = sky.createRadialGradient(mx - 4, my - 4, 2, mx, my, mr);
    mg.addColorStop(0, OL.mix(T.accentDeep, T.accent, 0.18)); mg.addColorStop(1, T.accentDeep);
    sky.fillStyle = mg; sky.beginPath(); sky.arc(mx, my, mr, 0, TAU); sky.fill();
    sky.save(); sky.shadowColor = T.accent; sky.shadowBlur = 8;
    sky.strokeStyle = T.accent; sky.lineWidth = 0.7; sky.beginPath(); sky.arc(mx, my, mr, 0, TAU); sky.stroke();
    sky.restore();

    // far: smooth mountains + the big triangle peak
    const far = mk(0.15), fw = layers[1].w, base = H * 0.62;
    far.fillStyle = T.land;
    far.beginPath(); far.moveTo(0, H);
    for (let x = 0; x <= fw; x += 3) far.lineTo(x, base - 24 * Math.abs(Math.sin(x / 61 + seed)) - 12 * Math.abs(Math.sin(x / 23)));
    far.lineTo(fw, H); far.closePath(); far.fill();
    const px = fw * 0.38, ph = H * 0.42;
    far.fillStyle = OL.mix(T.land, T.accent, 0.04);
    far.beginPath(); far.moveTo(px, base - ph); far.lineTo(px + ph * 0.62, base); far.lineTo(px - ph * 0.62, base); far.closePath(); far.fill();
    far.save(); far.shadowColor = T.accent; far.shadowBlur = 5;
    far.strokeStyle = A(T.accentDim, 0.9); far.lineWidth = 0.6;
    far.beginPath(); far.moveTo(px - ph * 0.62, base); far.lineTo(px, base - ph); far.lineTo(px + ph * 0.62, base); far.stroke();
    far.restore();

    // mid: city towers with lit windows
    const mid = mk(0.35), mw = layers[2].w, ground = H * 0.78;
    let x = 0, i = 0;
    while (x < mw) {
      const bw = 10 + (hash(i, seed + 3) % 18), bh = 30 + (hash(i, seed + 5) % 70);
      const top = ground - bh;
      mid.fillStyle = T.city; mid.fillRect(x, top, bw, H - top);
      mid.fillStyle = T.cityTop; mid.fillRect(x, top, bw, 0.6);
      if (hash(i, 9) % 4 === 0) { mid.fillStyle = T.accentDim; mid.fillRect(x + bw / 2 - 0.25, top - 8, 0.5, 8); mid.fillStyle = T.danger; mid.beginPath(); mid.arc(x + bw / 2, top - 8, 0.6, 0, TAU); mid.fill(); }
      for (let wy = top + 4; wy < ground; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
        const hv = hash(wx, wy);
        if (hv > 232) { mid.fillStyle = hv > 249 ? T.accent2 : A(T.accent, 0.55); mid.fillRect(wx, wy, 1, 1.6); }
      }
      x += bw + 2 + (hash(i, 11) % 6); i++;
    }
    mid.fillStyle = T.city; mid.fillRect(0, ground, mw, H);

    // near: soft cave-ceiling silhouette
    const near = mk(0.6), nw = layers[3].w;
    near.fillStyle = T.ceil;
    near.beginPath(); near.moveTo(0, 0);
    for (let x2 = 0; x2 <= nw; x2 += 4) {
      const d = 6 + (hash(x2 >> 4, seed + 21) % 16) + ((hash(x2 >> 5, seed) % 4 === 0) ? hash(x2 >> 3, 1) % 26 : 0);
      near.lineTo(x2, d);
    }
    near.lineTo(nw, 0); near.closePath(); near.fill();
    return { layers, S };
  }

  OL.Scenery = { drawMark, drawHatch, drawGate, drawWindowPlatform, drawCrusher, buildBackdrop, tileWin };
})();
