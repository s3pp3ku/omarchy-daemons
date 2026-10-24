/* node tools/trace.js <solve-script> <plan-name> <t0> <t1> <every> [ids...]  -- positions of selected daemons */
"use strict";
const { load } = require("./load.js");
const { runPlan } = require("./plan.js");
const OL = load();
const [, , script, name, t0, t1, every, ...ids] = process.argv;
const { PLANS, LEVEL } = require("./" + script);
const lv = OL.getLevel(LEVEL);
const plan = PLANS[name];
// re-run the plan, printing as we go
const sim = (function () {
  const s = new OL.Sim(lv); let si = 0;
  while (s.status === "play" && s.tick < +t1) {
    while (si < plan.length) {
      const st = plan[si];
      if (st.atTick !== undefined && s.tick < st.atTick) break;
      const c = s.lems.filter((l) => (st.who === undefined || l.id === st.who) && s.canAssign(l, st.skill) && st.when(l, s));
      if (!c.length) break; s.assign(c[0].id, st.skill); si++;
    }
    s.events.length = 0; s.step();
    if (s.tick >= +t0 && s.tick % +every === 0) console.log(s.tick, s.lems.filter((l) => l.state !== "out" && (!ids.length || ids.includes(String(l.id)))).map((l) => `${l.id}:${l.state}@${l.x},${l.y}`).join(" "));
  }
  return s;
})();
