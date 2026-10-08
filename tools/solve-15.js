/* Scripted solutions for LVL 15. Run: node tools/solve.js 15 [--write]
   Floors (tops): 110 E, 200 W, 290 E, 380 W, 470 E, 560 W, 650 E. Presses: floor 1 (x220) and floor 4 (x330). */
"use strict";
const P = require("./lib-plan.js");
const { E, Wd } = P;
const F = [110, 200, 290, 380, 470, 560, 650];
const scout = (cond, skill, note) => ({ who: 1, skill, when: cond, note });
const min = (box, l) => { box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; };
const g0 = {}, g3 = {};

const scoutRun = [
  scout(Wd(F[1], 316, 320), "builder", "scout: bridge floor 2's leak alone"),
  scout(E(F[2], 214, 220), "basher", "scout: bash floor 3's wall"),
  scout(E(F[4], 296, 300), "builder", "scout: bridge floor 5's leak"),
  scout(Wd(F[5], 276, 282), "basher", "scout: bash the port in floor 6's metal door"),
  scout(E(F[6], 136, 140), "builder", "scout: bridge floor 7's leak"),
  scout(E(F[6], 324, 330), "basher", "scout: bash floor 7's low wall"),
];
const PLANS = {
  "A-scout-the-whole-tower": [
    { who: 2, skill: "blocker", when: (l) => E(F[0], 186, 194)(l) && min(g0, l), note: "the second daemon holds the crowd at floor 1's press; the scout runs on" },
    ...scoutRun,
    { who: 2, skill: "basher", when: (l, s) => s.tick >= 3800 && s.crushers[0].c >= 2 && s.crushers[0].c <= 12, note: "release the crowd just after the first press lifts" },
    { skill: "blocker", when: (l) => Wd(F[3], 342, 350)(l) && min(g3, l), note: "gate floor 4's press for the clump that arrives" },
    { skill: "basher", when: (l, s) => l.id === g3.id && s.tick >= 4300 && s.crushers[1].c >= 2 && s.crushers[1].c <= 12, note: "...and let it through just after the press lifts" },
  ],
  "B-dig-past-the-wall": [
    { who: 2, skill: "blocker", when: (l) => E(F[0], 186, 194)(l) && min(g0, l), note: "the second daemon holds the crowd at floor 1's press; the scout runs on" },
    scoutRun[0],
    scout(E(F[2], 150, 156), "digger", "scout: dig down through floor 3 early and skip its wall"),
    scoutRun[2], scoutRun[3], scoutRun[4], scoutRun[5],
    { who: 2, skill: "basher", when: (l, s) => s.tick >= 3800 && s.crushers[0].c >= 2 && s.crushers[0].c <= 12, note: "release the crowd just after the first press lifts" },
    { skill: "blocker", when: (l) => Wd(F[3], 342, 350)(l) && min(g3, l), note: "gate floor 4's press for the clump that arrives" },
    { skill: "basher", when: (l, s) => l.id === g3.id && s.tick >= 4300 && s.crushers[1].c >= 2 && s.crushers[1].c <= 12, note: "...and let it through just after the press lifts" },
  ],
};
module.exports = { LEVEL: "memory-leak", FILE: "levels/solutions-15.js", PLANS };
