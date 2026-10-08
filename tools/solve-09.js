/* Scripted solutions for LVL 09. Run: node tools/solve.js 09 [--write] */
"use strict";
const W = (l) => l.state === "walk";
const shelf = (l) => l.y > 182 && l.y < 192, floor = (l) => l.y > 262 && l.y < 272;

const gap1 = { skill: "builder", when: (l) => W(l) && shelf(l) && l.dir > 0 && l.x >= 464 && l.x < 470, note: "bridge the shelf's lava gap" };
const gap2 = { skill: "builder", when: (l) => W(l) && shelf(l) && l.dir > 0 && l.x >= 574 && l.x < 580, note: "bridge the shelf's second gap" };
const shelfWall = { skill: "builder", when: (l) => W(l) && shelf(l) && l.dir > 0 && l.x >= 640 && l.x < 648, note: "stairs over the wall on the shelf" };
const moat = { skill: "builder", when: (l) => W(l) && floor(l) && l.dir > 0 && l.x >= 815 && l.x < 820, note: "bridge the hall's coolant" };
const wall = { skill: "basher", when: (l) => W(l) && floor(l) && l.dir > 0 && l.x >= 950 && l.x < 960, note: "bash the last wall" };
const cut = { skill: "digger", when: (l) => W(l) && shelf(l) && l.dir > 0 && l.x >= 250 && l.x < 260, note: "cut down through the ice shelf onto the floor below" };
const mineDown = { skill: "miner", when: (l) => W(l) && shelf(l) && l.dir > 0 && l.x >= 250 && l.x < 260, note: "mine down through the ice shelf (a ramp, instead of a shaft)" };
const pit = { skill: "builder", when: (l) => W(l) && floor(l) && l.dir > 0 && l.x >= 464 && l.x < 470, note: "bridge the lava pit on the ice floor" };
const lowWall = { skill: "builder", when: (l) => W(l) && floor(l) && l.dir > 0 && l.x >= 552 && l.x < 560, note: "stairs over the low wall" };

const PLANS = {
  "A-over-the-shelf": [gap1, gap2, shelfWall, moat, wall],
  "B-cut-down": [cut, pit, lowWall, moat, wall],
  "C-mine-down": [mineDown, pit, lowWall, moat, wall],
};
module.exports = { LEVEL: "ice-caverns", FILE: "levels/solutions-09.js", PLANS };
