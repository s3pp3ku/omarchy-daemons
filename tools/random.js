/* Random-search probe for unintended shortcuts.
     node tools/random.js <level-id> [N]    env: KMIN KMAX TMAX IDS
   Tries N plans of KMIN..KMAX random (tick, daemon, skill) assignments and
   reports wins by number of skills used. A good level has none at low K. */
"use strict";
const { load } = require("./load.js");
const OL = load();
const lv = OL.getLevel(process.argv[2]);
const N = +process.argv[3] || 5000;
const skills = Object.keys(lv.skills).filter((k) => lv.skills[k] > 0);
let rng = 12345; const rnd = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const KMIN = +(process.env.KMIN || 1), KMAX = +(process.env.KMAX || 4), TMAX = +(process.env.TMAX || 900), IDS = +(process.env.IDS || 6);
const wins = {}, t0 = Date.now();
for (let i = 0; i < N; i++) {
  const k = KMIN + Math.floor(rnd() * (KMAX - KMIN + 1));
  const acts = [];
  for (let j = 0; j < k; j++) acts.push({ t: Math.floor(rnd() * TMAX), a: "assign", id: 1 + Math.floor(rnd() * IDS), skill: skills[Math.floor(rnd() * skills.length)] });
  acts.sort((a, b) => a.t - b.t);
  const s = OL.runReplay(lv, acts);
  if (s.status === "won") { const used = Object.values(s.used).reduce((a, b) => a + b, 0); (wins[used] = wins[used] || []).push(acts); }
}
console.log(`${lv.id}: ${N} plans of ${KMIN}-${KMAX} actions in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log("wins by #skills used:", JSON.stringify(Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v.length]))));
for (const [k, v] of Object.entries(wins)) console.log(k, JSON.stringify(v[0]));
