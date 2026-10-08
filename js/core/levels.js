/* Omarchy Daemons — level registry.
   Each file in levels/ calls OL.registerLevel({...}). Level files are plain
   data: geometry, populations, skills. No gameplay code lives in them.
   See docs/LEVEL_FORMAT.md. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  OL.LEVELS = OL.LEVELS || [];
  OL.SOLUTIONS = OL.SOLUTIONS || {};

  function validate(def) {
    const need = ["id", "slot", "title", "size", "terrain", "entrances", "exits", "daemons", "save", "skills"];
    for (const k of need) if (def[k] === undefined) throw new Error(`level ${def.id || "?"}: missing "${k}"`);
    if (def.save > def.daemons) throw new Error(`level ${def.id}: save > daemons`);
    for (const e of def.entrances.concat(def.exits)) {
      if (e.x < 0 || e.y < 0 || e.x >= def.size[0] || e.y >= def.size[1])
        throw new Error(`level ${def.id}: entrance/exit outside map`);
    }
  }

  OL.registerLevel = function (def) {
    validate(def);
    const i = OL.LEVELS.findIndex((l) => l.id === def.id);
    if (i >= 0) OL.LEVELS[i] = def; else OL.LEVELS.push(def);
    OL.LEVELS.sort((a, b) => a.slot - b.slot);
    if (OL.onLevelRegistered) OL.onLevelRegistered(def);
  };

  /* Recorded solutions, keyed by level id. Each is a replay action list. */
  OL.registerSolutions = function (levelId, sols) {
    OL.SOLUTIONS[levelId] = sols;
  };

  OL.getLevel = (id) => OL.LEVELS.find((l) => l.id === id);
})();
