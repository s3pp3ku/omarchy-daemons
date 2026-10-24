/* Helpers for scripting solutions: conditions for "a walking daemon is at
   this spot of this floor, heading this way". Foot y of a daemon on a floor
   whose top is F is F-1 (bridges and stairs change it, so floor tests allow
   a few px). Windows are [a, b): the assignment fires for the first
   daemon whose x lands in the window, so windows are wide enough that a
   walking daemon (1 px/tick, 2 on ice) can not skip them. */
"use strict";
const W = (l) => l.state === "walk";
const onFloor = (F) => (l) => l.y >= F - 4 && l.y <= F - 1;
const east = (l) => l.dir > 0, west = (l) => l.dir < 0;
/* walking east, x in [a,b) on floor F */
const E = (F, a, b) => (l) => W(l) && onFloor(F)(l) && east(l) && l.x >= a && l.x < b;
/* walking west, x in (a,b] on floor F */
const Wd = (F, a, b) => (l) => W(l) && onFloor(F)(l) && west(l) && l.x > a && l.x <= b;
/* a step that fires for the first daemon in the window and remembers it */
function pick(cond, skill, note, box) {
  return { skill, note, when: (l, s) => { if (!cond(l, s)) return false; if (box) box.id = l.id; return true; } };
}
module.exports = { W, onFloor, east, west, E, Wd, pick };
