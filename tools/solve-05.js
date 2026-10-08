/* Scripted solutions for LVL 05. Run: node tools/solve.js 05 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const floor = (l) => l.y > 260;

const PLANS = {
  "A-ports": [
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 296 && l.x < 304 && l.dir > 0, note: "bridge the lava trench" },
    { skill: "basher", when: (l) => W(l) && floor(l) && l.x >= 514 && l.dir > 0, note: "bash port 22 through the perimeter wall" },
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 596 && l.dir > 0, note: "bridge the DMZ pit" },
    { skill: "basher", when: (l) => W(l) && floor(l) && l.x >= 752 && l.dir > 0, note: "bash the maintenance plug" },
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 876 && l.dir > 0, note: "bridge the moat" },
    { skill: "basher", when: (l) => W(l) && floor(l) && l.x >= 996 && l.dir > 0, note: "bash the last wall" },
  ],
  "B-bomb-the-plug": [
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 296 && l.x < 304 && l.dir > 0, note: "bridge the lava trench" },
    { skill: "basher", when: (l) => W(l) && floor(l) && l.x >= 514 && l.dir > 0, note: "bash port 22 through the perimeter wall" },
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 596 && l.dir > 0, note: "bridge the DMZ pit" },
    { skill: "blocker", when: (l) => W(l) && floor(l) && l.x >= 753 && l.dir > 0, note: "a daemon plants himself at the maintenance plug" },
    { skill: "bomber", when: (l) => l.state === "block" && l.x >= 753, note: "...and becomes the charge" },
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 876 && l.dir > 0, note: "bridge the moat" },
    { skill: "basher", when: (l) => W(l) && floor(l) && l.x >= 996 && l.dir > 0, note: "bash the last wall" },
  ],
  "C-perimeter-catwalk": [
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 296 && l.x < 304 && l.dir > 0, note: "bridge the lava trench" },
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 377 && l.x < 385 && l.dir > 0, note: "first flight" },
    { skill: "builder", when: (l) => l.state === "shrug" && l.y > 240 && l.dir > 0, note: "second flight" },
    { skill: "builder", when: (l) => l.state === "shrug" && l.y > 216 && l.y <= 240 && l.dir > 0, note: "third flight" },
    { skill: "basher", when: (l) => W(l) && l.y < 205 && l.y > 180 && l.x >= 754 && l.dir > 0, note: "bash the high port off the catwalk" },
    { skill: "builder", when: (l) => W(l) && floor(l) && l.x >= 876 && l.dir > 0, note: "bridge the moat" },
    { skill: "basher", when: (l) => W(l) && floor(l) && l.x >= 996 && l.dir > 0, note: "bash the last wall" },
  ],
};
module.exports = { LEVEL: "firewall", FILE: "levels/solutions-05.js", PLANS };
