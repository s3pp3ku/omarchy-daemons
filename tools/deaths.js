/* node tools/deaths.js <NN> <plan> : where and when daemons died */
"use strict";
const { load } = require("./load.js");
const { runPlan } = require("./plan.js");
const OL = load();
const { LEVEL, PLANS } = require("./solve-" + process.argv[2] + ".js");
const r = runPlan(OL, OL.getLevel(LEVEL), PLANS[process.argv[3]]);
const by = {};
for (const l of r.sim.lems) if (l.cause) (by[l.cause] = by[l.cause] || []).push(`#${l.id}@${l.x},${l.y}`);
for (const [k, v] of Object.entries(by)) console.log(k, v.slice(0, 12).join(" "), v.length > 12 ? `(+${v.length - 12})` : "");
