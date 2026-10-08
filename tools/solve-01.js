/* Scripted solutions for LVL 01. Run: node tools/solve.js 01 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const tun = (l) => l.y > 140;          // in the service tunnel

const PLANS = {
  "A-tunnel-first": [
    { who: 1, skill: "digger", when: (l) => W(l) && l.x >= 165 && l.y < 100, note: "shaft down into the tunnel" },
    { who: 2, skill: "blocker", when: (l) => W(l) && tun(l) && l.x >= 300, note: "hold the crowd behind the bridge-builder" },
    { who: 1, skill: "builder", when: (l) => W(l) && tun(l) && l.x >= 322 && l.dir > 0, note: "bridge the flood" },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 420, note: "release: the blocker becomes a builder and the crowd walks on" },
  ],
  "B-surface-bridges": [
    { who: 1, skill: "builder", when: (l) => W(l) && l.y < 100 && l.x >= 194 && l.dir > 0, note: "bridge the first pit" },
    { who: 2, skill: "blocker", when: (l) => W(l) && l.y < 100 && l.x >= 165, note: "hold the crowd while the bridge is built" },
    { who: 1, skill: "builder", when: (l) => W(l) && l.y < 100 && l.x >= 391 && l.dir > 0, note: "bridge the second pit" },
    { who: 2, skill: "builder", when: (l, s) => s.lem(1).x > 450, note: "release the crowd" },
    { who: 1, skill: "digger", when: (l) => W(l) && l.y < 100 && l.x >= 505, note: "sink a shaft into the exit chamber" },
  ],
};

module.exports = { LEVEL: "boot-sequence", FILE: "levels/solutions-01.js", PLANS };
