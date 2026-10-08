/* Scripted solutions for LVL 13. Run: node tools/solve.js 13 [--write]
   Odd ids are group A (west room), even ids group B (middle room). Floor top is 270. */
"use strict";
const P = require("./lib-plan.js");
const { W, E, Wd } = P;
const Y = 270;
const bombDoor = (name, a, b, box) => [
  { skill: "blocker", when: (l) => { if (!E(Y, a, b)(l)) return false; box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; }, note: `a daemon plants himself at ${name}` },
  { skill: "bomber", when: (l) => l.id === box.id && l.state === "block", note: "...and becomes the charge: an explosion ignores which way a door faces" },
];
const d1 = {}, d2 = {};

const PLANS = {
  "A-bomb-bomb-bash": [
    ...bombDoor("door A", 294, 299, d1),
    ...bombDoor("door B2, from inside the room", 934, 939, d2),
    { skill: "builder", when: E(Y, 1046, 1050), note: "B runs out first: bridge the coolant in the last corridor" },
    { skill: "builder", when: E(Y, 446, 450), note: "bridge the lava in the first corridor" },
    { skill: "basher", when: E(Y, 634, 640), note: "bash door B1 open from the west (it is one-way: only moving east)" },
    { skill: "basher", when: E(Y, 1294, 1300), note: "bash the low wall before the vault" },
  ],
  "B-stairs-over-the-wall": [
    ...bombDoor("door A", 294, 299, d1),
    ...bombDoor("door B2, from inside the room", 934, 939, d2),
    { skill: "builder", when: E(Y, 1046, 1050), note: "B runs out first: bridge the coolant in the last corridor" },
    { skill: "builder", when: E(Y, 446, 450), note: "bridge the lava in the first corridor" },
    { skill: "basher", when: E(Y, 634, 640), note: "bash door B1 open from the west" },
    { skill: "builder", when: E(Y, 1250, 1258), note: "stairs over the low wall instead of bashing it" },
  ],
};
module.exports = { LEVEL: "deadlock", FILE: "levels/solutions-13.js", PLANS };
