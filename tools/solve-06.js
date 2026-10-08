/* Scripted solutions for LVL 06. Run: node tools/solve.js 06 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const f = (n) => (l) => l.y >= [0, 100, 190, 280, 370, 460][n] - 2 && l.y <= [0, 100, 190, 280, 370, 460][n] + 12;   // standing on floor n (foot y ≈ F-1)

const PLANS = {
  "A-walk-every-toll": [
    { skill: "builder", when: (l) => W(l) && f(1)(l) && l.x >= 246 && l.dir > 0, note: "bridge the coolant pit on floor 1" },
    { skill: "basher", when: (l) => W(l) && f(2)(l) && l.x <= 344 && l.dir < 0, note: "bash the wall on floor 2" },
    { skill: "builder", when: (l) => W(l) && f(3)(l) && l.x >= 236 && l.dir > 0, note: "bridge the lava on floor 3" },
    { skill: "basher", when: (l) => W(l) && f(4)(l) && l.x <= 324 && l.dir < 0, note: "bash the port in the metal door on floor 4" },
    { skill: "builder", when: (l) => W(l) && f(5)(l) && l.x >= 196 && l.dir > 0, note: "bridge the pit on floor 5" },
    { skill: "basher", when: (l) => W(l) && f(5)(l) && l.x >= 392 && l.dir > 0, note: "bash the low wall before the vault" },
  ],
  "B-dig-bridge-mine": [
    { skill: "digger", when: (l) => W(l) && f(1)(l) && l.x >= 150 && l.x < 170 && l.dir > 0, note: "cut down through floor 1: skip its pit and the wall below" },
    { skill: "builder", when: (l) => W(l) && f(3)(l) && l.x >= 236 && l.dir > 0, note: "bridge the lava on floor 3" },
    { skill: "miner", when: (l) => W(l) && f(4)(l) && l.x <= 460 && l.x > 440 && l.dir < 0, note: "mine down east of the metal door: skip it and all of floor 5" },
  ],
  "C-walk-then-dig": [
    { skill: "builder", when: (l) => W(l) && f(1)(l) && l.x >= 246 && l.dir > 0, note: "bridge the coolant pit on floor 1" },
    { skill: "basher", when: (l) => W(l) && f(2)(l) && l.x <= 344 && l.dir < 0, note: "bash the wall on floor 2" },
    { skill: "builder", when: (l) => W(l) && f(3)(l) && l.x >= 236 && l.dir > 0, note: "bridge the lava on floor 3" },
    { skill: "digger", when: (l) => W(l) && f(4)(l) && l.x <= 440 && l.x > 420 && l.dir < 0, note: "dig down east of the metal door onto floor 5's last stretch" },
  ],
};
module.exports = { LEVEL: "vertical-world", FILE: "levels/solutions-06.js", PLANS };
