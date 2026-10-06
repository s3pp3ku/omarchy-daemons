/* How forgiving are the key decisions in LVL 02? Sweeps one parameter of a
   known solution and reports the save count. */
"use strict";
const { load } = require("./load.js");
const { runPlan } = require("./plan.js");
const OL = load();
const lv = OL.getLevel("network-nodes");
const W = (l) => l.state === "walk";
function lower(depth, blockAt) {
  return [
    { who: 2, skill: "blocker", when: (l) => W(l) && l.x >= blockAt },
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 192 },
    { who: 1, skill: "basher", when: (l) => (l.state === "dig" && l.y >= 112 + depth) || (W(l) && l.y > 112 + depth) },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 414 && l.y > 200 && l.dir > 0 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 604 && l.y > 200 && l.dir > 0 },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 700 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 1030 && l.y > 200 && l.dir > 0 },
  ];
}
const row = [];
for (let d = 10; d <= 130; d += 10) row.push(`${d}px:${runPlan(OL, lv, lower(d, 130)).sim.saved}`);
console.log("lower route — shaft depth before bashing east -> saved:\n  " + row.join("  "));
const row2 = [];
for (let x = 70; x <= 200; x += 10) row2.push(`x${x}:${runPlan(OL, lv, lower(50, x)).sim.saved}`);
console.log("blocker position on the boot ledge -> saved:\n  " + row2.join("  "));
function upper(edge) {
  return [
    { who: 2, skill: "blocker", when: (l) => W(l) && l.x >= 130 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= edge && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 398 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 514 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 754 && l.y < 110 && l.dir > 0 },
    { who: 2, skill: "basher", when: (l, s) => s.lem(1).x > 820 },
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 1096 && l.y < 160 },
  ];
}
const row3 = [];
for (let x = 180; x <= 213; x += 3) row3.push(`x${x}:${runPlan(OL, lv, upper(x)).sim.saved}`);
console.log("first bridge start (edge is x213) -> saved:\n  " + row3.join("  "));

/* every bridge in the upper route: how early can each builder start? */
const EDGES = [[213, 120, "A->R1"], [403, 130, "pool"], [519, 130, "R1->R2"], [759, 110, "lava"]];
for (let b = 0; b < EDGES.length; b++) {
  const out = [];
  for (let off = 0; off <= 30; off += 3) {
    const plan = upper(209);
    const st = plan[1 + b], [edge, ymax] = EDGES[b];
    st.when = (l) => W(l) && l.x >= edge - off && l.y < (b === 0 ? 130 : ymax) && l.dir > 0;
    out.push(`-${off}:${runPlan(OL, lv, plan).sim.saved}`);
  }
  console.log(`bridge ${EDGES[b][2]} start offset from edge -> saved:\n  ` + out.join("  "));
}
