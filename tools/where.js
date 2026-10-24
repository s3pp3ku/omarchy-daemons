/* node tools/where.js <NN> <plan> [tick] : final (or at tick) positions of all daemons */
"use strict";
const { load } = require("./load.js");
const OL = load();
const { LEVEL, PLANS } = require("./solve-" + process.argv[2] + ".js");
const lv = OL.getLevel(LEVEL), plan = PLANS[process.argv[3]], T = +process.argv[4] || 1e9;
const s = new OL.Sim(lv); let si = 0;
while (s.status === "play" && s.tick < T) {
  while (si < plan.length) {
    const st = plan[si];
    if (st.atTick !== undefined && s.tick < st.atTick) break;
    const c = s.lems.filter((l) => (st.who === undefined || l.id === st.who) && s.canAssign(l, st.skill) && st.when(l, s));
    if (!c.length) break; s.assign(c[0].id, st.skill); si++;
  }
  s.events.length = 0; s.step();
}
console.log("tick", s.tick, "saved", s.saved, "dead", s.dead, "plan step", si, "/", plan.length);
const by = {};
for (const l of s.lems) { const k = l.state + "@F" + (Math.round((l.y + 1) / 10) * 10); (by[k] = by[k] || []).push(l.id + ":" + l.x); }
for (const [k, v] of Object.entries(by)) console.log(k.padEnd(14), v.join(" "));
