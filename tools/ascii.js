/* ASCII view of a level's terrain, for design work.
   node tools/ascii.js <level-id> [x0 x1 y0 y1] [--cell N]
   . air  d dirt  r rock  M metal  T tech  b brick  ~ water  ^ lava  < > one-way
   E entrance  X exit */
"use strict";
const { load } = require("./load.js");
const OL = load();
const a = process.argv.slice(2);
const cellI = a.indexOf("--cell"); const cell = cellI >= 0 ? +a.splice(cellI, 2)[1] : 4;
const lv = OL.getLevel(a[0]);
if (!lv) { console.error("no level", a[0]); process.exit(1); }
const sim = new OL.Sim(lv), t = sim.terrain;
const [x0, x1, y0, y1] = a.length >= 5 ? a.slice(1, 5).map(Number) : [0, t.w, 0, t.h];
const ch = ".drMTb^~<>#i";
const cx = (x, y) => {
  for (const e of lv.entrances) if (Math.abs(e.x - x) < cell && e.y >= y - cell && e.y < y + cell * 2) return "E";
  for (const e of lv.exits) if (Math.abs(e.x - x) < cell && e.y >= y - cell && e.y < y + cell * 2) return "X";
  // majority-ish: prefer the most "interesting" material in the cell
  let best = 0, bs = -1;
  const pri = { 0: 0, 1: 2, 2: 3, 3: 5, 4: 5, 5: 2, 6: 6, 7: 6, 8: 4, 9: 4, 11: 1 };
  for (let yy = y; yy < y + cell * 2; yy++) for (let xx = x; xx < x + cell; xx++) { const m = t.get(xx, yy); if ((pri[m] || 0) > bs) { bs = pri[m] || 0; best = m; } }
  return ch[best] || "?";
};
let out = "    " + Array.from({ length: Math.ceil((x1 - x0) / cell) }, (_, i) => ((x0 + i * cell) % 100 === 0 ? String(((x0 + i * cell) / 100) % 10) : " ")).join("") + "\n";
for (let y = y0; y < y1; y += cell * 2) {
  let row = String(y).padStart(3) + " ";
  for (let x = x0; x < x1; x += cell) row += cx(x, y);
  out += row + "\n";
}
console.log(out);
