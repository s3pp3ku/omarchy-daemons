/* Scripted solutions for LVL 20. Run: node tools/solve.js 20 [--write]
   Floors (tops): 110 E, 200 W, 290 E, 380 W, 470 E, 560 W, 650 E. Odd ids come from the first hatch, even from the second.
   Presses: floor 1 (x260, crushers[0]) and floor 4 (x400, crushers[1]). The bridge on floor 5 is platforms[0] (cycle 968, extended for 700). */
"use strict";
const P = require("./lib-plan.js");
const { E, Wd } = P;
const F = [110, 200, 290, 380, 470, 560, 650];
const PHB = Number(process.env.PHB || 660);
const min = (box, l) => { box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; };
const scout = (cond, skill, note) => ({ who: 2, skill, when: cond, note });
const beat = (s, k) => s.crushers[k].c >= 2 && s.crushers[k].c <= 12;

function run(bridgeTick, skipWall) {
  const g0 = {}, g3 = {}, g4 = {};
  return [
    { skill: "blocker", when: (l) => l.id !== 2 && E(F[0], 236, 244)(l) && min(g0, l), note: "a daemon from the other hatch gates the first press; the scout (the first to arrive) runs on" },
    scout(Wd(F[1], 336, 340), "builder", "scout: bridge floor 2's lava"),
    skipWall ? scout(E(F[2], 150, 158), "digger", "scout: dig down early through floor 3 and skip its wall") : scout(E(F[2], 294, 300), "basher", "scout: bash floor 3's wall"),
    scout(Wd(F[5], 316, 322), "basher", "scout: bash the port in floor 6's metal door"),
    scout(Wd(F[5], 196, 200), "builder", "scout: bridge floor 6's pit"),
    scout(E(F[6], 136, 140), "builder", "scout: bridge floor 7's pit"),
    scout(E(F[6], 414, 420), "basher", "scout: bash floor 7's low wall"),
    { skill: "basher", when: (l, s) => l.id === g0.id && s.tick >= 5200 && beat(s, 0), note: "release the crowd just after the first press lifts" },
    { skill: "blocker", when: (l) => Wd(F[3], 424, 432)(l) && min(g3, l), note: "gate floor 4's press for the clump that arrives" },
    { skill: "basher", when: (l, s) => l.id === g3.id && s.tick >= 5600 && beat(s, 1), note: "...and let it through just after the press lifts" },
    { skill: "blocker", when: (l) => E(F[4], 312, 320)(l) && min(g4, l), note: "hold the crowd at the bridge's dock" },
    { skill: "basher", when: (l, s) => l.id === g4.id && s.tick >= bridgeTick && (s.tick + PHB) % 968 < 6 && s.platforms[0].off === 0, note: "...and release it on the bridge's beat" },
  ];
}
const PLANS = { "A-scout-gate-and-time-it": run(7000, false), "B-dig-past-the-wall": run(7000, true) };
module.exports = { LEVEL: "the-last-boot", FILE: "levels/solutions-20.js", PLANS };
