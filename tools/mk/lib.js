/* Level authoring kit: terrain helpers and a writer that turns a level
   object into a levels/NN-id.js file. Used by tools/mk/NN-*.js generators.
   The generated level files are plain data; the kit is not needed to play. */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");

const r = (m, x, y, w, h, extra) => Object.assign({ m, rect: [x, y, w, h] }, extra || {});
const poly = (m, pts, extra) => Object.assign({ m, poly: pts }, extra || {});

/* a pit cut into a floor whose top is y: air to y+depth, liquid in its lower part */
function pit(x, y, w, kind, depth) {
  depth = depth || 30;
  return [r("air", x, y, w, depth), r(kind, x, y + 12, w, depth - 12)];
}
/* a pit with a tall hall above it so builders have headroom */
function hallPit(x, y, w, kind, hallY, hallW, depth) {
  const hx = x - Math.round((hallW - w) / 2);
  return [r("air", hx, hallY, hallW, y - hallY), ...pit(x, y, w, kind, depth)];
}
/* a stepped metal A-frame: apex at (cx, top), half base hw, base on y (risers of 10 px) */
function aframe(cx, top, y, hw, m) {
  const out = [];
  const h = y - top;
  for (let yy = top; yy < y; yy += 10) {
    const w = Math.round(hw * (yy + 10 - top) / h);
    out.push(r(m || "metal", cx - w, yy, 2 * w, Math.min(10, y - yy)));
  }
  return out;
}
/* stepped ceiling teeth along the top of a world of width W */
function ceiling(W, base, seed) {
  let s = seed || 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pts = [[0, 0], [W, 0]];
  let x = W, y = base + Math.round(rnd() * 14);
  pts.push([x, y]);
  while (x > 0) {
    const dx = 120 + Math.round(rnd() * 120);
    x = Math.max(0, x - dx);
    pts.push([x, y]);
    y = base + Math.round(rnd() * 22);
    pts.push([x, y]);
  }
  return poly("rock", pts);
}

function ser(v) {
  if (Array.isArray(v)) return "[" + v.map(ser).join(", ") + "]";
  if (v && typeof v === "object") return "{ " + Object.entries(v).map(([k, x]) => `${/^[A-Za-z_]\w*$/.test(k) ? k : JSON.stringify(k)}: ${ser(x)}`).join(", ") + " }";
  return JSON.stringify(v);
}
const fmt = ser;

function writeLevel(file, banner, def) {
  const lines = [];
  lines.push(`/* ${banner.split("\n").join("\n   ")} */`);
  lines.push("OL.registerLevel({");
  const scalar = ["id", "slot", "title", "brief", "size", "seed", "theme", "daemons", "save", "time", "rate", "skills", "entrances", "exits", "camera"];
  for (const k of scalar) if (def[k] !== undefined) lines.push(`  ${k}: ${ser(def[k])},`);
  if (def.objects && def.objects.length) {
    lines.push("", "  objects: [");
    for (const o of def.objects) lines.push("    " + fmt(o) + ",");
    lines.push("  ],");
  }
  for (const key of ["props", "decor", "terrain"]) {
    if (!def[key] || !def[key].length) continue;
    lines.push("", `  ${key}: [`);
    for (const o of def[key]) lines.push("    " + fmt(o) + ",");
    lines.push("  ],");
  }
  lines.push("});", "");
  fs.writeFileSync(path.join(ROOT, "levels", file), lines.join("\n"));
}

/* A tall zigzag: n floors, each a corridor with 64 px of headroom, joined by
   drops at alternating ends (east, west, east...). Floor i has its top at
   y = y0 + gap*i, flows east when i is even (0-based) and west when odd.
   Returns { ops, F: [floor tops], H } where H is a good world height. */
function zigzag(o) {
  const n = o.floors, y0 = o.y0 || 110, gap = o.gap || 90, W = o.W || 560, x0 = 20, x1 = W - 20;
  const F = [], ops = [];
  for (let i = 0; i < n; i++) F.push(y0 + gap * i);
  const H = F[n - 1] + 50 + 40;
  ops.push(r("metal", 0, H - 50, W, 50));
  ops.push(r("rock", x0, 40, x1 - x0, H - 50 - 40));
  ops.push(r("metal", 0, 0, x0, H - 50), r("metal", x1, 0, W - x1, H - 50));
  for (let i = 0; i < n; i++) ops.push(r("air", x0, i === 0 ? 40 : F[i] - 64, x1 - x0, i === 0 ? F[0] - 40 : 64));
  for (let i = 0; i < n - 1; i++) {
    const east = i % 2 === 0;
    ops.push(r("air", east ? x1 - 70 : x0 + 20, F[i], 50, 30));
  }
  return { ops, F, H, W, x0, x1 };
}

module.exports = { zigzag, r, poly, pit, hallPit, aframe, ceiling, writeLevel, ROOT };
