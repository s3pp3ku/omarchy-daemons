/* Load the game's core + level files into node for headless runs. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CORE = ["js/core/terrain.js", "js/core/sim.js", "js/core/levels.js"];

function load() {
  for (const f of CORE) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), "utf8"), { filename: f });
  const lvDir = path.join(ROOT, "levels");
  for (const f of fs.readdirSync(lvDir).sort()) {
    if (f.endsWith(".js")) vm.runInThisContext(fs.readFileSync(path.join(lvDir, f), "utf8"), { filename: "levels/" + f });
  }
  return globalThis.OL;
}
module.exports = { load, ROOT };
