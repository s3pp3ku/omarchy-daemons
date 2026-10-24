/* node tools/table.js : difficulty table: quota vs what the recorded solutions achieve */
"use strict";
const { load } = require("./load.js");
const O = load();
for (const lv of O.LEVELS.filter((l) => !l.lab && l.slot >= 1)) {
  const sols = O.SOLUTIONS[lv.id] || {};
  const saves = Object.values(sols).map((s) => s.saved);
  const sk = Object.entries(lv.skills).filter(([, v]) => v).map(([k, v]) => k[0].toUpperCase() + v).join("");
  console.log(String(lv.slot).padStart(2), lv.id.padEnd(15), "n", String(lv.daemons).padStart(2), "need", String(lv.save).padStart(2), (100 * lv.save / lv.daemons).toFixed(0).padStart(3) + "%", "rate", String(lv.rate).padStart(2), "skills", sk.padEnd(14), "solutions", saves.join(",").padEnd(14), "best", (100 * Math.max(...saves) / lv.daemons).toFixed(0) + "%");
}
