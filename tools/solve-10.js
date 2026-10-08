/* Scripted solutions for LVL 10. Run: node tools/solve.js 10 [--write]
   Daemons alternate hatches: odd ids are group A (deck), even ids group B (/var/cache). */
"use strict";
const W = (l) => l.state === "walk";
const S = (l) => l.y > 262 && l.y < 272;                 // standing on the main floor (foot y 269)
const base = (l) => l.y > 340;                           // in the basement tunnel (foot y 349)

const hold = { who: 2, skill: "blocker", when: (l) => W(l) && l.y > 260 && l.x >= 232 && l.x < 238, note: "B: hold everyone right at the pit's edge" };
const door = { skill: "basher", when: (l) => l.id % 2 === 1 && W(l) && S(l) && l.dir < 0 && l.x <= 326, note: "A: bash the one-way door open from outside" };
const release = { who: 2, skill: "builder", when: (l, s) => s.used.basher === 1, note: "B: the blocker becomes the bridge: release and crossing in one" };
const westPort = { skill: "basher", when: (l) => W(l) && S(l) && l.dir > 0 && l.x >= 752 && l.x < 758, note: "bash the kernel's west port" };
const lava = { skill: "builder", when: (l) => W(l) && S(l) && l.dir > 0 && l.x >= 976 && l.x < 980, note: "bridge the lava hall" };
const eastPort = { skill: "basher", when: (l) => W(l) && S(l) && l.dir > 0 && l.x >= 1122 && l.x < 1130, note: "bash the kernel's east port" };
const moat = { skill: "builder", when: (l) => W(l) && S(l) && l.dir > 0 && l.x >= 1326 && l.x < 1330, note: "bridge the east moat" };
const wall = { skill: "basher", when: (l) => W(l) && S(l) && l.dir > 0 && l.x >= 1440 && l.x < 1450, note: "bash the low wall; the vault is a drop away" };

const shaft = { skill: "digger", when: (l) => W(l) && S(l) && l.x >= 690 && l.x < 698 && l.dir > 0, note: "shaft down into the basement, west of the kernel" };
const hallShaft = { skill: "digger", when: (l) => W(l) && S(l) && l.x >= 915 && l.x < 925 && l.dir > 0, note: "dig down from the hall, past the basement plug" };
const plugBlock = { skill: "blocker", when: (l) => W(l) && base(l) && l.dir > 0 && l.x >= 893 && l.x < 897, note: "a daemon plants himself at the plug" };
const plugBomb = { skill: "bomber", when: (l) => l.state === "block" && l.x >= 893, note: "...and becomes the charge" };
const pit = { skill: "builder", when: (l) => W(l) && base(l) && l.dir > 0 && l.x >= 1006 && l.x < 1010, note: "bridge the basement pit" };
const lowWall = { skill: "basher", when: (l) => W(l) && base(l) && l.dir > 0 && l.x >= 1142 && l.x < 1150, note: "bash the basement's low wall" };

const PLANS = {
  "A-through-the-hall": [hold, door, release, westPort, lava, eastPort, moat, wall],
  "B-under-the-kernel": [hold, door, release, shaft, plugBlock, plugBomb, pit, lowWall],
  "C-in-through-the-port-down-through-the-hall": [hold, door, release, westPort, hallShaft, pit, lowWall],
};
module.exports = { LEVEL: "the-omarch", FILE: "levels/solutions-10.js", PLANS };
