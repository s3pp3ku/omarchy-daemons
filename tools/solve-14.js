/* Scripted solutions for LVL 14. Run: node tools/solve.js 14 [--write]
   The bridge is extended for ticks [588n, 588n + 260). Ground top is 200. */
"use strict";
const P = require("./lib-plan.js");
const { E } = P;
const G = 200;
const G2 = 280;
const hold = {}, hold2 = {};
const PLANS = {
  "A-scout-and-two-holds": [
    { who: 2, skill: "blocker", when: (l) => { if (!E(G, 384, 390)(l)) return false; hold.id = l.id; return true; }, note: "the second daemon holds the crowd at the first dock; the first has already crossed" },
    { who: 1, skill: "basher", when: E(G2, 714, 720), note: "the scout drops to the lower ground and bashes the wall open" },
    { who: 1, skill: "blocker", when: (l) => { if (!E(G2, 884, 890)(l)) return false; hold2.id = l.id; return true; }, note: "...then holds the second dock for the crowd to come" },
    { skill: "basher", when: (l, s) => l.id === hold.id && s.tick >= 1800 && s.tick % 628 < 6 && s.platforms[0].off === 0, note: "release at the first bridge's beat, once everyone has gathered" },
    { skill: "basher", when: (l, s) => l.id === hold2.id && s.tick >= 2800 && (s.tick + 300) % 728 < 6 && s.platforms[1].off === 0, note: "release again on the second bridge's beat" },
  ],
  "B-hold-both-docks-no-scout": [
    { skill: "blocker", when: (l) => { if (!E(G, 384, 390)(l)) return false; hold.id = hold.id === undefined ? l.id : Math.min(hold.id, l.id); return true; }, note: "the first daemon holds the crowd at the first dock" },
    { skill: "basher", when: (l, s) => l.id === hold.id && s.tick >= 1800 && s.tick % 628 < 6 && s.platforms[0].off === 0, note: "release at the first bridge's beat" },
    { skill: "basher", when: E(G2, 714, 720), note: "the first one through bashes the wall" },
    { skill: "blocker", when: (l) => { if (!E(G2, 884, 890)(l)) return false; hold2.id = hold2.id === undefined ? l.id : Math.min(hold2.id, l.id); return true; }, note: "...and the next at the second dock holds the rest" },
    { skill: "basher", when: (l, s) => l.id === hold2.id && s.tick >= 2800 && (s.tick + 300) % 728 < 6 && s.platforms[1].off === 0, note: "release again on the second bridge's beat" },
  ],
};
module.exports = { LEVEL: "race-condition", FILE: "levels/solutions-14.js", PLANS };
