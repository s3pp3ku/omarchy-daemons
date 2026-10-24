/* Scripted solutions for LVL 16. Run: node tools/solve.js 16 [--write]
   Floors (tops): 110 E, 200 W, 290 E, 380 W, 470 E, 560 W. */
"use strict";
const P = require("./lib-plan.js");
const { E, Wd } = P;
const F = [110, 200, 290, 380, 470, 560];
const min = (box, l) => { box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; };

/* guard a pit: the first daemon builds, the next one in the back window plants himself behind, `rel` releases him once the bridge is done */
function guard(i, lip, rel, box, dirW) {
  const first = dirW ? Wd(F[i], lip, lip + 4) : E(F[i], lip - 4, lip);
  const back = dirW ? Wd(F[i], lip + 14, lip + 26) : E(F[i], lip - 26, lip - 14);
  const b1 = {};
  return [
    { skill: "builder", when: (l) => first(l) && min(b1, l), note: `floor ${i + 1}: the first daemon builds the bridge` },
    { skill: "blocker", when: (l) => l.id !== b1.id && back(l) && min(box, l), note: `...a later one plants himself a flight behind` },
    { skill: rel, when: (l, s) => l.id === box.id && s.lem(b1.id) && (dirW ? s.lem(b1.id).x < lip - 52 : s.lem(b1.id).x > lip + 52), note: `...released when the bridge is finished` },
  ];
}
const g0 = {}, g2 = {}, g3 = {}, g5 = {};
const bridgeE = (i, lip) => ({ skill: "builder", when: E(F[i], lip - 4, lip), note: `floor ${i + 1}: bridge the pit without a guard` });
const bridgeW = (i, lip) => ({ skill: "builder", when: Wd(F[i], lip, lip + 4), note: `floor ${i + 1}: bridge the pit without a guard` });
const seg = {
  p0: () => guard(0, 300, "builder", {}, false), u0: () => [bridgeE(0, 300)],
  w1: { skill: "basher", when: Wd(F[1], 356, 362), note: "bash the wall on floor 2" },
  p2: () => guard(2, 220, "builder", {}, false), u2: () => [bridgeE(2, 220)],
  w2: { skill: "basher", when: E(F[2], 424, 430), note: "bash the low wall on floor 3" },
  p3: () => guard(3, 416, "builder", {}, true), u3: () => [bridgeW(3, 416)],
  w4: { skill: "basher", when: E(F[4], 294, 300), note: "bash the wall on floor 5" },
  p5: () => guard(5, 336, "builder", {}, true), u5: () => [bridgeW(5, 336)],
};
const build = (guarded) => [
  ...(guarded[0] ? seg.p0() : seg.u0()), seg.w1,
  ...(guarded[2] ? seg.p2() : seg.u2()), seg.w2,
  ...(guarded[3] ? seg.p3() : seg.u3()), seg.w4,
  ...(guarded[5] ? seg.p5() : seg.u5()),
];
const PLANS = {
  "A-guard-the-first-three": build({ 0: true, 2: true, 3: true, 5: false }),
  "B-guard-all-but-the-fourth": build({ 0: true, 2: true, 3: false, 5: true }),
};
module.exports = { LEVEL: "fork-bomb", FILE: "levels/solutions-16.js", PLANS, build };
