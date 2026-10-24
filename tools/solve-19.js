/* Scripted solutions for LVL 19. Run: node tools/solve.js 19 [--write]
   Plateau tops: 100, 250, 400, 550. Each cliff is 150 px; a ramp starts 150 px west of the cliff (or up to 30 px east of that). */
"use strict";
const P = require("./lib-plan.js");
const { E } = P;
const P0 = 100, P1 = 250, P2 = 400, P3 = 550;
const min = (box, l) => { box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; };
const ramp = (F, a, b, note) => ({ who: 1, skill: "miner", when: E(F, a, b), note });
const scoutRun = (rel) => {
  const gd = {};
  return [
    ramp(P0, 126, 142, "scout: start the first ramp"),
    { who: 2, skill: "blocker", when: (l) => E(P0, 104, 114)(l) && min(gd, l), note: "the second daemon plants himself west of the ramp mouth to hold the crowd" },
    { who: 1, skill: "builder", when: E(P1, 296, 300), note: "scout: bridge the lava on the second plateau, alone" },
    ramp(P1, 386, 402, "scout: start the second ramp"),
    { who: 1, skill: "basher", when: E(P2, 574, 580), note: "scout: bash the wall on the third plateau" },
    ramp(P2, 646, 662, "scout: start the third ramp"),
    { who: 1, skill: "builder", when: E(P3, 896, 900), note: "scout: bridge the moat" },
    { who: 1, skill: "basher", when: E(P3, 1044, 1050), note: "scout: bash the low wall before the vault" },
    { skill: rel, when: (l, s) => l.id === gd.id && s.lem(1) && (s.lem(1).x > 1100 || s.lem(1).state === "out"), note: "release the crowd: every obstacle is already cleared" },
  ];
};
const PLANS = {
  "A-scout-then-release": scoutRun("basher"),
};
module.exports = { LEVEL: "root-access", FILE: "levels/solutions-19.js", PLANS };
