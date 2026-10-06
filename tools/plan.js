/* Rule-based solution scripting -> exact replay action lists.
   A plan is a list of steps run in order. Each step waits until some
   lemming matches `when`, then assigns `skill` to it.
     { skill:"builder", who: 1, when: (l, sim) => l.x >= 208 && l.state==="walk" }
   `who` may be a lemming id, or omitted to take the first lemming that matches. */
"use strict";
function runPlan(OL, level, plan, opts) {
  opts = opts || {};
  const sim = new OL.Sim(level);
  let si = 0;
  const log = [];
  while (sim.status === "play") {
    while (si < plan.length) {
      const st = plan[si];
      if (st.atTick !== undefined && sim.tick < st.atTick) break;
      const cands = sim.lems.filter((l) => (st.who === undefined || l.id === st.who) && sim.canAssign(l, st.skill) && st.when(l, sim));
      if (!cands.length) break;
      const l = cands[0];
      sim.assign(l.id, st.skill);
      log.push(`t=${sim.tick} #${l.id} ${st.skill} @${l.x},${l.y}  (${st.note || ""})`);
      si++;
    }
    sim.events.length = 0;
    sim.step();
    if (opts.trace && sim.tick % opts.trace === 0) console.log(sim.tick, sim.lems.filter(l=>l.state!=="out").map((l) => `${l.id}:${l.state}@${l.x},${l.y}`).join(" "));
  }
  return { sim, log, done: si, total: plan.length };
}
function report(name, r) {
  const s = r.sim;
  const deaths = {};
  for (const l of s.lems) if (l.cause) deaths[l.cause] = (deaths[l.cause] || 0) + 1;
  console.log(`\n== ${name}: ${s.status.toUpperCase()} saved ${s.saved}/${s.total} (need ${s.need}) dead ${s.dead} time ${(s.tick / 20).toFixed(1)}s steps ${r.done}/${r.total}`);
  console.log("   used", JSON.stringify(s.used), "deaths", JSON.stringify(deaths));
  for (const line of r.log) console.log("   " + line);
}
module.exports = { runPlan, report };
