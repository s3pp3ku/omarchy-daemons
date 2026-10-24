/* Scripted solutions for LVL 12. Run: node tools/solve.js 12 [--write]
   Floors (tops): 110 E, 200 W, 290 E, 380 W, 470 E, 560 W. Presses 0, 1, 2 are on floors 1, 4 and 6. */
"use strict";
const P = require("./lib-plan.js");
const { W, E, Wd } = P;
const F = [110, 200, 290, 380, 470, 560];

/* gate a press: the first daemon in the window becomes a blocker; once `tick` has passed and the press has just risen, a basher (with nothing to bash) releases him */
function gate(i, press, win, k, tick, dirW, box) {
  const cond = dirW ? Wd(F[i], win[0], win[1]) : E(F[i], win[0], win[1]);
  return [
    { skill: "blocker", when: (l) => { if (!cond(l)) return false; box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; }, note: `floor ${i + 1}: a blocker gates the press` },
    { skill: "basher", when: (l, s) => l.id === box.id && s.tick >= tick && s.crushers[k].c >= 2 && s.crushers[k].c <= 12, note: `...and lets the crowd through just after it lifts` },
  ];
}
const bridgeE = (i, lip) => ({ skill: "builder", when: E(F[i], lip - 4, lip), note: `bridge the pit on floor ${i + 1}` });
const bridgeW = (i, lip) => ({ skill: "builder", when: Wd(F[i], lip, lip + 4), note: `bridge the pit on floor ${i + 1}` });
const g0 = {}, g3 = {}, g5 = {}, u1 = {}, u4 = {};
const wall = { skill: "basher", when: E(F[2], 194, 200), note: "bash the wall on floor 3" };

/* guard a pit: the first daemon builds, the next plants himself a flight behind, `rel` releases him once the bridge is done */
function guard(i, lip, rel, box, dirW) {
  const first = dirW ? Wd(F[i], lip, lip + 4) : E(F[i], lip - 4, lip);
  const back = dirW ? Wd(F[i], lip + 14, lip + 26) : E(F[i], lip - 26, lip - 14);
  const b1 = {};
  return [
    { skill: "builder", when: (l) => { if (!first(l)) return false; b1.id = b1.id === undefined ? l.id : Math.min(b1.id, l.id); return true; }, note: `floor ${i + 1}: the first daemon builds the bridge` },
    { skill: "blocker", when: (l) => l.id !== b1.id && back(l) && ((box.id = box.id === undefined ? l.id : Math.min(box.id, l.id)) > 0), note: `...the second plants himself behind him` },
    { skill: rel, when: (l, s) => l.id === box.id && s.lem(b1.id) && (dirW ? s.lem(b1.id).x < lip - 52 : s.lem(b1.id).x > lip + 52), note: `...released when the bridge is finished` },
  ];
}

/* the scout (daemon #1) runs ahead alone and clears the floors while the crowd is held at the first press */
const scout = (cond, skill, note) => ({ who: 1, skill, when: cond, note });
const scoutPlan = [
  scout(Wd(F[1], 336, 340), "builder", "scout: bridge floor 2's lava alone"),
  scout(E(F[2], 194, 200), "basher", "scout: bash the wall on floor 3"),
  scout(E(F[4], 116, 120), "builder", "scout: bridge floor 5's coolant alone"),
];

const PLANS = {
  "A-gate-the-first-two-presses": [
    { who: 2, skill: "blocker", when: E(F[0], 176, 184), note: "floor 1: the second daemon gates the first press; the scout runs on" },
    ...scoutPlan,
    { who: 2, skill: "basher", when: (l, s) => s.tick >= 3000 && s.crushers[0].c >= 2 && s.crushers[0].c <= 12, note: "...release the crowd just after the press lifts" },
    ...gate(3, 330, [356, 364], 1, 3000, true, g3),
  ],
  "B-gate-the-first-and-last-presses": [
    { who: 2, skill: "blocker", when: E(F[0], 176, 184), note: "floor 1: the second daemon gates the first press; the scout runs on" },
    ...scoutPlan,
    { who: 2, skill: "basher", when: (l, s) => s.tick >= 3000 && s.crushers[0].c >= 2 && s.crushers[0].c <= 12, note: "...release the crowd just after the press lifts" },
    ...gate(5, 300, [326, 334], 2, 3000, true, g5),
  ],
};
module.exports = { LEVEL: "segfault", FILE: "levels/solutions-12.js", PLANS };
