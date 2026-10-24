/* Scripted solutions for LVL 11. Run: node tools/solve.js 11 [--write]
   Floors (tops): 110 E, 200 W, 290 E, 380 W, 470 E, 560 W. */
"use strict";
const P = require("./lib-plan.js");
const { W, E, Wd, pick } = P;
const F = [110, 200, 290, 380, 470, 560];

const bridge = (i, lip, note) => ({ skill: "builder", when: E(F[i], lip - 4, lip), note });
const bridgeW = (i, lip, note) => ({ skill: "builder", when: Wd(F[i], lip, lip + 4), note });

/* hold the crowd at a pit's lip, then let the blocker himself become the bridge once enough have gathered */
function hold(i, lip, tick, box, dirW) {
  const cond = dirW ? Wd(F[i], lip + 4, lip + 10) : E(F[i], lip - 10, lip - 4);
  return [
    { skill: "blocker", when: (l, s) => { if (!cond(l)) return false; box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; }, note: `hold the crowd at the lip on floor ${i + 1}` },
    { skill: "builder", when: (l, s) => l.id === box.id && s.tick >= tick, note: `...then the blocker becomes the bridge` },
  ];
}
/* blocker one flight of stairs behind the builder, released by `rel` once the bridge is done */
function guard(i, lip, rel, box, dirW) {
  const first = dirW ? Wd(F[i], lip, lip + 4) : E(F[i], lip - 4, lip);
  const back = dirW ? Wd(F[i], lip + 14, lip + 24) : E(F[i], lip - 24, lip - 14);
  const b1 = {};
  return [
    { skill: "builder", when: (l) => { if (!first(l)) return false; b1.id = b1.id === undefined ? l.id : Math.min(b1.id, l.id); return true; }, note: `floor ${i + 1}: the first daemon builds the bridge` },
    { skill: "blocker", when: (l) => l.id !== b1.id && back(l) && ((box.id = box.id === undefined ? l.id : Math.min(box.id, l.id)) > 0), note: `...and the second plants himself behind him` },
    { skill: rel, when: (l, s) => l.id === box.id && s.lem(b1.id) && Math.abs(s.lem(b1.id).x - lip) > 52 + 8 * 0 && (dirW ? s.lem(b1.id).x < lip - 52 : s.lem(b1.id).x > lip + 52), note: `...released when the bridge is finished` },
  ];
}
const b0 = {}, b2 = {}, b4 = {};
const skip0 = { skill: "digger", when: E(F[0], 150, 160), note: "dig through floor 1 early: skip its lava and the wall below" };
const PLANS = {
  "A-guard-the-first-two": [
    ...guard(0, 250, "builder", b0),
    { skill: "basher", when: Wd(F[1], 336, 342), note: "bash the wall on floor 2" },
    ...guard(2, 240, "builder", b2),
    { skill: "basher", when: Wd(F[3], 316, 322), note: "bash the port in the metal door on floor 4" },
    bridge(4, 200, "bridge the lava on floor 5"),
    { skill: "basher", when: E(F[4], 394, 400), note: "bash the low wall on floor 5" },
    bridgeW(5, 366, "bridge the moat on floor 6"),
  ],
  "B-dig-then-guard": [
    skip0,
    ...guard(2, 240, "builder", b2),
    { skill: "basher", when: Wd(F[3], 316, 322), note: "bash the port in the metal door on floor 4" },
    ...guard(4, 200, "builder", b4),
    { skill: "basher", when: E(F[4], 394, 400), note: "bash the low wall on floor 5" },
    bridgeW(5, 366, "bridge the moat on floor 6"),
  ],
};
module.exports = { LEVEL: "systemd", FILE: "levels/solutions-11.js", PLANS };
