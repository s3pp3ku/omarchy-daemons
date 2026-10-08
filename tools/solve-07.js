/* Scripted solutions for LVL 07. Run: node tools/solve.js 07 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const top = (l) => l.y > 260 && l.y < 285, base = (l) => l.y > 340;

const PLANS = {
  "A-through-the-hall": [
    { skill: "basher", when: (l) => W(l) && top(l) && l.x >= 350 && l.x < 357 && l.dir > 0, note: "bash the west port" },
    { skill: "builder", when: (l) => W(l) && top(l) && l.x >= 576 && l.x < 582 && l.dir > 0, note: "bridge the hall's lava" },
    { skill: "basher", when: (l) => W(l) && top(l) && l.x >= 724 && l.x < 730 && l.dir > 0, note: "bash the east port" },
    { skill: "builder", when: (l) => W(l) && top(l) && l.x >= 946 && l.x < 950 && l.dir > 0, note: "bridge the surface coolant, then drop into the vault" },
  ],
  "B-under-the-arch": [
    { skill: "digger", when: (l) => W(l) && top(l) && l.x >= 290 && l.x < 300 && l.dir > 0, note: "shaft into the basement" },
    { skill: "basher", when: (l) => W(l) && base(l) && l.x >= 554 && l.x < 560 && l.dir > 0, note: "bash the plug" },
    { skill: "builder", when: (l) => W(l) && base(l) && l.x >= 656 && l.x < 660 && l.dir > 0, note: "bridge the basement pit" },
    { skill: "basher", when: (l) => W(l) && base(l) && l.x >= 794 && l.x < 800 && l.dir > 0, note: "bash the low wall" },
  ],
  "C-mine-in-and-build-over": [
    { skill: "miner", when: (l) => W(l) && top(l) && l.x >= 230 && l.x < 240 && l.dir > 0, note: "mine down into the basement" },
    { skill: "basher", when: (l) => W(l) && base(l) && l.x >= 554 && l.x < 560 && l.dir > 0, note: "bash the plug" },
    { skill: "builder", when: (l) => W(l) && base(l) && l.x >= 656 && l.x < 660 && l.dir > 0, note: "bridge the basement pit" },
    { skill: "builder", when: (l) => W(l) && base(l) && l.x >= 760 && l.x < 770 && l.dir > 0, note: "stairs over the low wall" },
  ],
  "D-port-then-dig-down": [
    { skill: "basher", when: (l) => W(l) && top(l) && l.x >= 350 && l.x < 357 && l.dir > 0, note: "bash the west port" },
    { skill: "digger", when: (l) => W(l) && top(l) && l.x >= 500 && l.x < 510 && l.dir > 0, note: "dig from the hall down into the basement" },
    { skill: "basher", when: (l) => W(l) && base(l) && l.x >= 554 && l.x < 560 && l.dir > 0, note: "bash the plug" },
    { skill: "builder", when: (l) => W(l) && base(l) && l.x >= 656 && l.x < 660 && l.dir > 0, note: "bridge the basement pit" },
    { skill: "basher", when: (l) => W(l) && base(l) && l.x >= 794 && l.x < 800 && l.dir > 0, note: "bash the low wall" },
  ],
};
module.exports = { LEVEL: "the-arch", FILE: "levels/solutions-07.js", PLANS };
