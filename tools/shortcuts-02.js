/* Anti-triviality probes for LVL 02: obvious lazy strategies + random search. */
"use strict";
const { load } = require("./load.js");
const { runPlan, report } = require("./plan.js");
const OL = load();
const lv = OL.getLevel("network-nodes");
const W = (l) => l.state === "walk";
const lazy = {
  "no-blocker lower": [
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 192 },
    { who: 1, skill: "basher", when: (l) => l.state === "dig" && l.y >= 162 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 414 && l.y > 200 && l.dir > 0 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 604 && l.y > 200 && l.dir > 0 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 1030 && l.y > 200 && l.dir > 0 },
  ],
  "no-blocker upper": [
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 209 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 398 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 514 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 754 && l.y < 110 && l.dir > 0 },
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 1096 && l.y < 160 },
  ],
  "dig straight to bedrock then bash": [
    { who: 2, skill: "blocker", when: (l) => W(l) && l.x >= 130 },
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 192 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.y > 230 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 414 && l.y > 200 && l.dir > 0 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 604 && l.y > 200 && l.dir > 0 },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 700 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 1030 && l.y > 200 && l.dir > 0 },
  ],
  "hybrid: dig straight through R1": [
    { who: 2, skill: "blocker", when: (l) => W(l) && l.x >= 130 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 209 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 398 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 492 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 604 && l.y > 200 && l.dir > 0 },
    { who: 2, skill: "basher", when: (l, s) => s.lem(1).x > 640 },
    { who: 1, skill: "basher", when: (l) => W(l) && l.x >= 1030 && l.y > 200 && l.dir > 0 },
  ],
  "release too early (upper)": [
    { who: 2, skill: "blocker", when: (l) => W(l) && l.x >= 130 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 209 && l.dir > 0 },
    { who: 2, skill: "basher", when: (l, s) => s.lem(1).x > 300 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 398 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 514 && l.y < 130 && l.dir > 0 },
    { who: 1, skill: "builder", when: (l) => W(l) && l.x >= 754 && l.y < 110 && l.dir > 0 },
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 1096 && l.y < 160 },
  ],
};
for (const [n, p] of Object.entries(lazy)) report(n, runPlan(OL, lv, p));

/* random search: up to N tick-based actions on random lemmings */
if (process.argv.includes("--random")) {
  const N = +process.argv[process.argv.indexOf("--random") + 1] || 2000;
  const skills = Object.keys(lv.skills);
  let rng = 12345; const rnd = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const wins = {};
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const K = +(process.env.KMAX || 4), K0 = +(process.env.KMIN || 1); const k = K0 + Math.floor(rnd() * (K - K0 + 1));
    const acts = [];
    for (let j = 0; j < k; j++) acts.push({ t: Math.floor(rnd() * (+(process.env.TMAX || 900))), a: "assign", id: 1 + Math.floor(rnd() * (+(process.env.IDS || 4))), skill: skills[Math.floor(rnd() * skills.length)] });
    const s = OL.runReplay(lv, acts);
    if (s.status === "won") { const used = Object.values(s.used).reduce((a, b) => a + b, 0); (wins[used] = wins[used] || []).push(acts); }
  }
  console.log(`\nrandom search: ${N} plans of ${process.env.KMIN || 1}-${process.env.KMAX || 4} actions in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("wins by #skills used:", Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v.length])));
  for (const [k, v] of Object.entries(wins)) console.log(k, JSON.stringify(v[0]));
}
