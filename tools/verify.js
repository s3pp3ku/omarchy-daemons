/* Regression check: replay every recorded solution under the real engine
   and confirm it still wins with the recorded save count.
   Run from the repo root:  node tools/verify.js
   Exit code is non-zero if anything regressed. */
"use strict";
const { load } = require("./load.js");
const OL = load();

let fail = 0, n = 0;
for (const lv of OL.LEVELS) {
  const sols = OL.SOLUTIONS[lv.id];
  if (!sols) { if (!lv.debug) console.log(`?  ${lv.id}: no recorded solutions`); continue; }
  for (const [name, s] of Object.entries(sols)) {
    n++;
    const sim = OL.runReplay(lv, s.actions);
    const used = Object.entries(sim.used).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(" ");
    const ok = sim.status === "won" && sim.saved === s.saved && !sim.failedActions.length;
    if (!ok) fail++;
    console.log(`${ok ? "ok" : "FAIL"}  ${lv.id} / ${name}: ${sim.status} ${sim.saved}/${sim.total} (need ${sim.need}, recorded ${s.saved}) ` +
      `in ${(sim.tick / OL.C.TPS).toFixed(1)}s of ${lv.time}s · ${used}` +
      (sim.failedActions.length ? ` · ${sim.failedActions.length} assignments no longer valid` : ""));
  }
}
console.log(fail ? `\n${fail} of ${n} solutions regressed` : `\nall ${n} solutions verified`);
process.exit(fail ? 1 : 0);
