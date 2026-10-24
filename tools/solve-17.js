/* Scripted solutions for LVL 17. Run: node tools/solve.js 17 [--write]
   Floors (tops): 110 E, 200 W, 290 E, 380 W, 470 E, 560 W. Walls start at x300; thicknesses 12, 36, 12, 36, 12, 12. */
"use strict";
const P = require("./lib-plan.js");
const { E, Wd } = P;
const F = [110, 200, 290, 380, 470, 560];
const min = (box, l) => { box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; };

/* bomb a thin wall: a daemon plants himself against it and becomes the charge */
function bomb(i, thick, dirW) {
  const box = {};
  const cond = dirW ? Wd(F[i], 299 + thick, 300 + thick) : E(F[i], 299, 300);
  return [
    { skill: "blocker", when: (l) => cond(l) && min(box, l), note: `floor ${i + 1}: a daemon plants himself against the wall` },
    { skill: "bomber", when: (l) => l.id === box.id && l.state === "block", note: "...and becomes the charge" },
  ];
}
const bash = (i, thick, dirW) => ({ skill: "basher", when: dirW ? Wd(F[i], 300 + thick, 300 + thick + 6) : E(F[i], 294, 300), note: `floor ${i + 1}: bash the thick wall` });
const dig = (i) => ({ skill: "digger", when: E(F[i], 150, 158), note: `floor ${i + 1}: dig down early and skip its wall` });

const PLANS = {
  "A-bash-the-thick-bomb-the-thin": [...bomb(0, 12, false), bash(1, 36, true), ...bomb(2, 12, false), bash(3, 36, true), ...bomb(4, 12, false), ...bomb(5, 12, true)],
  "B-dig-the-first-floor": [dig(0), ...bomb(2, 12, false), bash(3, 36, true), ...bomb(4, 12, false), ...bomb(5, 12, true)],
};
module.exports = { LEVEL: "zero-day", FILE: "levels/solutions-17.js", PLANS };
