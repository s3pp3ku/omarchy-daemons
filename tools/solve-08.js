/* Scripted solutions for LVL 08. Run: node tools/solve.js 08 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const rim = (l) => l.y > 180 && l.y < 196, shore = (l) => l.y > 262 && l.y < 272, tun = (l) => l.y > 310;

const PLANS = {
  "A-catwalk": [
    { skill: "builder", when: (l) => W(l) && rim(l) && l.x >= 314 && l.x < 320 && l.dir > 0, note: "bridge the gap off the ledge onto the catwalk" },
    { skill: "builder", when: (l) => W(l) && rim(l) && l.x >= 494 && l.x < 500 && l.dir > 0, note: "bridge the catwalk's gap" },
    { skill: "builder", when: (l) => W(l) && rim(l) && l.x >= 734 && l.x < 740 && l.dir > 0, note: "bridge the last gap" },
  ],
  "B-tunnel": [
    { skill: "digger", when: (l) => W(l) && shore(l) && l.x >= 380 && l.x < 390 && l.dir > 0, note: "shaft into the service tunnel" },
    { skill: "blocker", when: (l) => W(l) && tun(l) && l.x >= 492 && l.x < 497 && l.dir > 0, note: "a daemon plants himself at the plug" },
    { skill: "bomber", when: (l) => l.state === "block" && l.x >= 492, note: "...and becomes the charge" },
  ],
};
module.exports = { LEVEL: "aur-valley", FILE: "levels/solutions-08.js", PLANS };
