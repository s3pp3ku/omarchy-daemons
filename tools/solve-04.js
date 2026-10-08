/* Scripted solutions for LVL 04. Run: node tools/solve.js 04 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const top = (l) => l.y < 100, c1 = (l) => l.y > 150 && l.y < 190, c2 = (l) => l.y > 240;

const PLANS = {
  "A-dig-bridge-dig": [
    { who: 1, skill: "digger", when: (l) => W(l) && top(l) && l.x >= 120, note: "shaft from the surface into the west mid cache" },
    { who: 1, skill: "builder", when: (l) => W(l) && c1(l) && l.x >= 396 && l.dir > 0, note: "bridge the coolant pit" },
    { who: 2, skill: "blocker", when: (l) => W(l) && c1(l) && l.x >= 372, note: "hold the crowd at the pit lip" },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 470, note: "release: the blocker becomes a builder" },
    { who: 1, skill: "digger", when: (l) => W(l) && c1(l) && l.x >= 600, note: "shaft past the bottom pillar" },
    { who: 1, skill: "builder", when: (l) => W(l) && c2(l) && l.x >= 896 && l.dir > 0, note: "bridge the lava trench" },
  ],
  "B-dig-bridge-mine": [
    { who: 1, skill: "digger", when: (l) => W(l) && top(l) && l.x >= 120, note: "shaft into the west mid cache" },
    { who: 1, skill: "builder", when: (l) => W(l) && c1(l) && l.x >= 396 && l.dir > 0, note: "bridge the coolant pit" },
    { who: 2, skill: "blocker", when: (l) => W(l) && c1(l) && l.x >= 372, note: "hold the crowd at the pit lip" },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 470, note: "release: the blocker becomes a builder" },
    { who: 1, skill: "miner", when: (l) => W(l) && c1(l) && l.x >= 590, note: "mine under the metal pillar" },
    { who: 1, skill: "builder", when: (l) => W(l) && c2(l) && l.x >= 896 && l.dir > 0, note: "bridge the lava trench" },
  ],
  "C-surface-gap-then-dig": [
    { who: 1, skill: "builder", when: (l) => W(l) && top(l) && l.x >= 276 && l.dir > 0, note: "bridge the first dependency gap" },
    { who: 2, skill: "blocker", when: (l) => W(l) && top(l) && l.x >= 250, note: "hold the crowd at the gap" },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 400, note: "release: the blocker becomes a builder" },
    { who: 1, skill: "digger", when: (l) => W(l) && top(l) && l.x >= 450, note: "shaft past the coolant pit" },
    { who: 1, skill: "miner", when: (l) => W(l) && c1(l) && l.x >= 590, note: "mine under the metal pillar" },
    { who: 1, skill: "builder", when: (l) => W(l) && c2(l) && l.x >= 896 && l.dir > 0, note: "bridge the lava trench" },
  ],
  "D-all-surface": [
    { who: 1, skill: "builder", when: (l) => W(l) && top(l) && l.x >= 276 && l.dir > 0, note: "bridge the first dependency gap" },
    { who: 1, skill: "builder", when: (l) => W(l) && top(l) && l.x >= 476 && l.dir > 0, note: "stairs over the metal wall" },
    { skill: "builder", when: (l) => W(l) && top(l) && l.x >= 756 && l.dir > 0, note: "bridge the second gap" },
    { skill: "digger", when: (l) => W(l) && top(l) && l.x >= 820, note: "shaft into the east mid cache" },
    { skill: "miner", when: (l) => W(l) && c1(l) && l.x >= 918, note: "mine under the lava trench into the bottom cache" },
  ],
};
module.exports = { LEVEL: "package-cache", FILE: "levels/solutions-04.js", PLANS };
