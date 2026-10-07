/* Omarchy Lemmings — circuit-board artwork for breakable "rock".

   Instead of per-pixel noise, the board is *routed* once per level, like a
   real PCB, and the terrain renderer samples it wherever there is rock:
     - parallel buses of traces with 45° chamfered bends and jogs,
     - traces a lighter green under the solder mask (as on real boards),
     - gold pads and vias where traces end,
     - chips (SOIC / QFP) with silver pins and fan-out traces,
     - small passives and white silkscreen labels (eth0, tty1, /dev/sda…).
   Everything is deterministic for a given level. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const M = OL.M;
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];   // 8 headings, 45° apart
  const LABELS = ["eth0", "tty1", "sda1", "U1", "U7", "R12", "C3", "/dev/sda", "wlan0", "gpio", "i2c-1", "nvme0", "lo", "kvm", "usb1", "pci0", "D4", "Q2", "L1", "J5"];

  function rng(seed) {                                 // mulberry32
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function buildBoard(doc, terrain, S, T) {
    const W = terrain.w, H = terrain.h, m = terrain.m;
    const cv = doc.createElement("canvas");
    cv.width = W * S; cv.height = H * S;
    const g = cv.getContext("2d");
    g.scale(S, S);
    const R = rng(W * 7919 + H * 104729 + 17);
    const isRock = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[(y | 0) * W + (x | 0)] === M.ROCK;
    const mix = OL.mix;
    const COL = {
      mask: mix("#0d3f2d", T.bg, 0.25),
      mask2: mix("#104a35", T.bg, 0.25),
      trace: mix("#2b8a58", T.bg, 0.15),
      traceHi: mix("#58c28a", T.bg, 0.1),
      traceLo: mix("#08261b", T.bg, 0.2),
      gold: "#d8b04f", goldHi: "#f3d98a", hole: "#0a1410",
      chip: "#15171b", chipHi: "#2a2e35", pin: "#b9c2cc",
      silk: "rgba(225,235,228,0.82)",
    };

    /* solder mask with soft large-scale variation */
    g.fillStyle = COL.mask; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (W * H) / 6000; i++) {
      const x = R() * W, y = R() * H, r = 20 + R() * 60;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, mix(COL.mask2, "#000000", R() * 0.1)); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    /* copper pour: lighter islands of ground plane */
    for (let i = 0; i < (W * H) / 4000; i++) {
      const x = R() * W, y = R() * H, w = 20 + R() * 70, h = 10 + R() * 40;
      g.fillStyle = mix(COL.mask, COL.trace, 0.22);
      g.beginPath(); g.roundRect(x, y, w, h, 3); g.fill();
      g.strokeStyle = mix(COL.mask, COL.trace, 0.4); g.lineWidth = 0.35;
      g.beginPath(); g.roundRect(x, y, w, h, 3); g.stroke();
    }

    /* occupancy on a 3 px grid so buses don't cross */
    const GS = 3, GW = Math.ceil(W / GS), GH = Math.ceil(H / GS);
    const occ = new Uint8Array(GW * GH);
    const cellsFree = (pts, pad) => {
      for (const [x, y] of pts) {
        for (let dy = -pad; dy <= pad; dy += GS) for (let dx = -pad; dx <= pad; dx += GS) {
          const cx = Math.floor((x + dx) / GS), cy = Math.floor((y + dy) / GS);
          if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || occ[cy * GW + cx]) return false;
        }
      }
      return true;
    };
    const claim = (pts, pad) => {
      for (const [x, y] of pts) for (let dy = -pad; dy <= pad; dy += GS) for (let dx = -pad; dx <= pad; dx += GS) {
        const cx = Math.floor((x + dx) / GS), cy = Math.floor((y + dy) / GS);
        if (cx >= 0 && cy >= 0 && cx < GW && cy < GH) occ[cy * GW + cx] = 1;
      }
    };
    const rockFrac = (pts) => { let n = 0; for (const [x, y] of pts) if (isRock(x, y)) n++; return n / Math.max(1, pts.length); };
    const sample = (poly) => {                       // points every ~1.5 px along a polyline
      const out = [];
      for (let i = 0; i + 1 < poly.length; i++) {
        const [ax, ay] = poly[i], [bx, by] = poly[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.5));
        for (let k = 0; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
      }
      return out;
    };
    /* offset a polyline sideways with mitred corners */
    const offset = (poly, d) => poly.map((p, i) => {
      const a = poly[Math.max(0, i - 1)], b = poly[Math.min(poly.length - 1, i + 1)];
      const n1 = i > 0 ? norm(poly[i - 1], p) : norm(p, b), n2 = i < poly.length - 1 ? norm(p, b) : n1;
      let nx = n1[0] + n2[0], ny = n1[1] + n2[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const cos = nx * n1[0] + ny * n1[1] || 1;
      void a;
      return [p[0] + (nx * d) / cos, p[1] + (ny * d) / cos];
    });
    function norm(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }

    const drawTrace = (poly, w) => {
      g.lineJoin = "miter"; g.lineCap = "round";
      g.strokeStyle = COL.mask; g.lineWidth = w + 1.6;                       // clearance cut into any copper pour
      g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.strokeStyle = COL.traceLo; g.lineWidth = w + 0.5;
      g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 0.25) : g.moveTo(p[0], p[1] + 0.25))); g.stroke();
      g.strokeStyle = COL.trace; g.lineWidth = w;
      g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      g.strokeStyle = COL.traceHi; g.lineWidth = w * 0.3;
      g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(p[0], p[1] - w * 0.2) : g.moveTo(p[0], p[1] - w * 0.2))); g.stroke();
    };
    const via = (x, y, r) => {
      g.fillStyle = COL.gold; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = COL.goldHi; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2); g.fill();
      g.fillStyle = COL.hole; g.beginPath(); g.arc(x, y, r * 0.42, 0, Math.PI * 2); g.fill();
    };
    const pad = (x, y, w, h) => { g.fillStyle = COL.gold; g.fillRect(x - w / 2, y - h / 2, w, h); g.fillStyle = COL.goldHi; g.fillRect(x - w / 2, y - h / 2, w, h * 0.3); };
    const silk = (txt, x, y, size) => { g.fillStyle = COL.silk; g.font = `${size || 2.6}px ui-monospace, monospace`; g.textBaseline = "middle"; g.fillText(txt, x, y); };

    /* ---- chips first (they anchor the routing) ---- */
    const chips = [];
    for (let i = 0; i < (W * H) / 2600; i++) {
      const qfp = R() < 0.35;
      const cw = qfp ? 10 : 9 + Math.floor(R() * 3) * 2, ch = qfp ? 10 : 5;
      const x = Math.round(R() * (W - cw - 16)) + 8, y = Math.round(R() * (H - ch - 16)) + 8;
      const box = [];
      for (let yy = y - 7; yy <= y + ch + 7; yy += 2) for (let xx = x - 7; xx <= x + cw + 7; xx += 2) box.push([xx, yy]);
      if (!cellsFree(box, 0) || rockFrac(box) < 1) continue;
      claim(box, 0);
      chips.push({ x, y, cw, ch, qfp });
      // pins
      g.fillStyle = COL.pin;
      for (let px = x + 1; px < x + cw - 0.5; px += 1.6) { g.fillRect(px, y - 1.3, 0.8, 1.4); g.fillRect(px, y + ch - 0.1, 0.8, 1.4); }
      if (qfp) for (let py = y + 1; py < y + ch - 0.5; py += 1.6) { g.fillRect(x - 1.3, py, 1.4, 0.8); g.fillRect(x + cw - 0.1, py, 1.4, 0.8); }
      // body
      g.fillStyle = COL.chip; g.beginPath(); g.roundRect(x, y, cw, ch, 0.6); g.fill();
      g.fillStyle = COL.chipHi; g.fillRect(x + 0.3, y + 0.3, cw - 0.6, 0.5);
      g.fillStyle = "#4a5058"; g.beginPath(); g.arc(x + 1.4, y + 1.6, 0.45, 0, Math.PI * 2); g.fill();
      silk(LABELS[Math.floor(R() * LABELS.length)], x, y - 3.4, 2.4);
      // fan-out traces from the long sides
      for (let px = x + 1.4; px < x + cw - 0.5; px += 1.6 * (1 + Math.floor(R() * 2))) {
        const up = R() < 0.5, y0 = up ? y - 1.3 : y + ch + 1.3, dy = up ? -1 : 1;
        const len = 3 + R() * 4, jog = (R() < 0.5 ? -1 : 1) * 2;
        const poly = [[px, y0], [px, y0 + dy * len], [px + jog, y0 + dy * (len + 2)]];
        drawTrace(poly, 0.55);
        via(poly[2][0], poly[2][1] + dy * 0.8, 0.85);
      }
    }

    /* ---- buses: parallel traces with chamfered bends ---- */
    const tries = (W * H) / 30;
    for (let i = 0; i < tries; i++) {
      const x0 = Math.round(R() * W / GS) * GS, y0 = Math.round(R() * H / GS) * GS;
      if (!isRock(x0, y0)) continue;
      const k = R() < 0.2 ? 1 : 2 + Math.floor(R() * 6);           // traces in this bus
      const sp = 2.2, tw = k === 1 ? 0.8 : 0.6;
      let h = Math.floor(R() * 4) * 2;                                  // start orthogonal
      const poly = [[x0, y0]];
      let x = x0, y = y0;
      const segs = 2 + Math.floor(R() * 4);
      for (let s = 0; s < segs; s++) {
        const len = 8 + Math.floor(R() * 26);
        x += DIRS[h][0] * len; y += DIRS[h][1] * len; poly.push([x, y]);
        if (s === segs - 1) break;
        const turn = R() < 0.5 ? 1 : -1;
        h = (h + turn + 8) % 8;                                         // 45° chamfer
        const dl = 2 + Math.floor(R() * 4);
        x += DIRS[h][0] * dl; y += DIRS[h][1] * dl; poly.push([x, y]);
        h = (h + (R() < 0.7 ? turn : -turn) + 8) % 8;                   // finish the 90° turn, or jog back
        if (h % 2) h = (h + turn + 8) % 8;
      }
      const half = ((k - 1) * sp) / 2 + 1.5;
      const pts = sample(poly);
      if (rockFrac(pts) < 0.6 || !cellsFree(pts, Math.ceil(half))) continue;
      claim(pts, Math.ceil(half));
      for (let t = 0; t < k; t++) {
        const off = offset(poly, -half + 1.5 + t * sp);
        drawTrace(off, tw);
        const end = off[off.length - 1], start = off[0];
        const e1 = R(), e2 = R();
        if (e1 < 0.55) via(end[0], end[1], 0.9); else if (e1 < 0.8) pad(end[0], end[1], 1.6, 1.6);
        if (e2 < 0.3) via(start[0], start[1], 0.9);
      }
      if (k >= 3 && R() < 0.35) silk(LABELS[Math.floor(R() * LABELS.length)], poly[0][0] + 2, poly[0][1] - half - 2.2);
    }

    /* ---- a sprinkle of passives and lone vias ---- */
    for (let i = 0; i < (W * H) / 700; i++) {
      const x = R() * W, y = R() * H;
      const box = [[x - 3, y - 2], [x + 3, y + 2], [x, y]];
      if (!cellsFree(box, 0) || !isRock(x, y)) continue;
      claim(box, 0);
      if (R() < 0.5) via(x, y, 0.8);
      else {
        const vert = R() < 0.4;
        if (vert) { pad(x, y - 1.4, 1.4, 1); pad(x, y + 1.4, 1.4, 1); g.fillStyle = R() < 0.5 ? "#2a2a2e" : "#b59a6a"; g.fillRect(x - 0.6, y - 0.9, 1.2, 1.8); }
        else { pad(x - 1.4, y, 1, 1.4); pad(x + 1.4, y, 1, 1.4); g.fillStyle = R() < 0.5 ? "#2a2a2e" : "#b59a6a"; g.fillRect(x - 0.9, y - 0.6, 1.8, 1.2); }
      }
    }

    const data = g.getImageData(0, 0, cv.width, cv.height).data;
    return { data, w: cv.width, h: cv.height };
  }

  OL.buildBoard = buildBoard;
})();
