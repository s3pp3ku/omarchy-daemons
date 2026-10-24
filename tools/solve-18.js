/* Scripted solutions for LVL 18. Run: node tools/solve.js 18 [--write]
   Odd ids are group A (deck), even ids group B (/var/cache). Floor top is 270. */
"use strict";
const P = require("./lib-plan.js");
const { W, E, Wd } = P;
const Y = 270;
const S = (l) => l.y > 262 && l.y < 272;
const min = (box, l) => { box.id = box.id === undefined ? l.id : Math.min(box.id, l.id); return true; };
const door = { skill: "basher", when: (l) => l.id % 2 === 1 && W(l) && S(l) && l.dir < 0 && l.x <= 326, note: "A: bash the one-way door open from outside, once the first A daemon comes back" };

function holdAndScout(tail) {
  const sc = {}, gd = {};
  const isScout = (l) => l.id === sc.id;
  return [
    door,
    { skill: "basher", when: (l) => E(Y, 752, 758)(l) && min(sc, l), note: "the first to reach the kernel's west port bashes it open (the scout)" },
    { skill: "blocker", when: (l) => l.id !== sc.id && E(Y, 726, 738)(l) && min(gd, l), note: "the next plants himself in front of the port to hold the crowd" },
    ...tail(isScout),
    { skill: "basher", when: (l, s) => l.id === gd.id && s.lem(sc.id) && (s.lem(sc.id).x > 1500 || s.lem(sc.id).state === "out"), note: "release the guard: the whole crowd walks across" },
  ];
}
function hallRoute() {
  return holdAndScout((isScout) => [
    { skill: "builder", when: (l) => isScout(l) && E(Y, 976, 980)(l), note: "scout: bridge the lava in the hall" },
    { skill: "basher", when: (l) => isScout(l) && E(Y, 1122, 1130)(l), note: "scout: bash the east port" },
    { skill: "builder", when: (l) => isScout(l) && E(Y, 1326, 1330)(l), note: "scout: bridge the east moat" },
    { skill: "basher", when: (l) => isScout(l) && E(Y, 1440, 1450)(l), note: "scout: bash the low wall" },
  ]);
}
function basementRoute() {
  const sc = {}, gd = {};
  const isScout = (l) => l.id === sc.id;
  const base = (a, b) => (l) => W(l) && l.y > 340 && l.dir > 0 && l.x >= a && l.x < b;
  return [
    door,
    { skill: "digger", when: (l) => E(Y, 690, 698)(l) && min(sc, l), note: "the first to reach the shaft site digs down into the basement (the scout)" },
    { skill: "blocker", when: (l) => l.id !== sc.id && E(Y, 664, 680)(l) && min(gd, l), note: "the next plants himself behind him to hold the crowd" },
    { skill: "basher", when: (l) => isScout(l) && base(894, 900)(l), note: "scout: bash the thick plug" },
    { skill: "builder", when: (l) => isScout(l) && base(1006, 1010)(l), note: "scout: bridge the basement pit" },
    { skill: "basher", when: (l) => isScout(l) && base(1142, 1150)(l), note: "scout: bash the basement's low wall" },
    { skill: "basher", when: (l, s) => l.id === gd.id && s.lem(sc.id) && (s.lem(sc.id).x > 1480 || s.lem(sc.id).state === "out"), note: "release the guard: the crowd falls down the shaft and walks the basement" },
  ];
}
const PLANS = { "A-scout-the-hall": hallRoute(), "B-scout-the-basement": basementRoute() };
module.exports = { LEVEL: "kernel-panic", FILE: "levels/solutions-18.js", PLANS, hallRoute };
