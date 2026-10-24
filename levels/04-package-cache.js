/* LVL 04 — PACKAGE CACHE
   Design record: docs/levels/04-package-cache.md
   Three stacked layers: the surface ruin, a mid cache and a bottom cache,
   joined only where the player cuts a way through. Each layer charges a
   different toll, and no route can pay all of them. */
OL.registerLevel({
  id: "package-cache",
  slot: 4,
  title: "PACKAGE CACHE",
  brief: "Thirty daemons, three layers of cache. The surface is open but gapped, the mid layer is sealed by a metal pillar, and the bottom layer floods with lava before the exit. Cut your own way down.",
  size: [1280, 352],
  seed: 9,
  theme: "gruvbox",
  daemons: 30,
  save: 20,
  time: 330,
  rate: 50,
  skills: { blocker: 2, builder: 4, digger: 4, miner: 3 },
  entrances: [{ x: 70, y: 88 }],
  exits: [{ x: 1150, y: 271 }],
  camera: { x: 0 },

  props: [
    { kind: "plaque", x: 70, y: 56, text: "$ pacman -Syu" },
    { kind: "window", x: 150, y: 36, w: 110, h: 48, title: "pacman", active: 0, lines: ["$ pacman -Syu", "# resolving deps", "# 412 packages", "!cache: 31 GiB"] },
    { kind: "fetch", x: 560, y: 24, w: 112, h: 44 },
    { kind: "plaque", x: 301, y: 76, text: "dep gap", color: "#ff6a2b" },
    { kind: "plaque", x: 528, y: 56, text: "/var/cache", color: "#fabd2f" },
    { kind: "bar", x: 900, y: 40, w: 220 },
    { kind: "window", x: 300, y: 154, w: 90, h: 26, title: "~ du -sh", active: 1, lines: ["31G /var/cache"], cursor: false },
    { kind: "plaque", x: 700, y: 160, text: "METAL PILLAR", color: "#ff3b4e" },
    { kind: "plaque", x: 922, y: 250, text: "LAVA", color: "#ff6a2b" },
    { kind: "plaque", x: 382, y: 250, text: "LAVA", color: "#ff6a2b" },
  ],
  decor: [
    { m: "tech", rect: [1100, 214, 90, 58] },
    { cable: [[120, 200], [620, 210]], sag: 20, leds: 20 },
    { cable: [[680, 210], [1100, 210]], sag: 22, leds: 22 },
  ],

  terrain: [
    { m: "metal", rect: [0, 336, 1280, 16] },
    { m: "rock", rect: [0, 96, 1250, 240] },                         // the buried ruin
    { m: "dirt", rect: [0, 96, 1250, 54] },                          // soil over the first layer
    { m: "metal", rect: [1250, 0, 30, 336] },

    /* surface: two dependency gaps and a low metal wall */
    { m: "air", rect: [280, 96, 40, 44] },
    { m: "water", rect: [280, 124, 40, 16] },
    { m: "metal", rect: [520, 68, 16, 28] },
    { m: "air", rect: [760, 96, 40, 44] },
    { m: "water", rect: [760, 124, 40, 16] },

    /* mid layer: west cache (a coolant pit) | metal pillar | east cache */
    { m: "air", rect: [60, 150, 580, 34] },
    { m: "air", rect: [380, 126, 90, 58] },                       // a hall tall enough to build in
    { m: "air", rect: [400, 184, 40, 30] },
    { m: "water", rect: [400, 196, 40, 18] },
    { m: "metal", rect: [640, 140, 16, 50] },
    { m: "air", rect: [656, 150, 460, 34] },

    /* bottom layer: one long cache with a lava trench, ending in the vault */
    { m: "air", rect: [60, 238, 1130, 34] },
    { m: "air", rect: [340, 214, 90, 58] },
    { m: "air", rect: [360, 272, 40, 30] },
    { m: "lava", rect: [360, 284, 40, 18] },
    { m: "metal", rect: [560, 200, 16, 110] },                    // bottom-layer pillar: only the east half is useful
    { m: "air", rect: [880, 214, 90, 58] },
    { m: "air", rect: [900, 272, 40, 30] },
    { m: "lava", rect: [900, 284, 40, 18] },
    { m: "air", rect: [1100, 214, 90, 58] },
    { m: "tech", rect: [1100, 272, 90, 3] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1280, 0], [1280, 20], [1200, 20], [1200, 36], [1040, 36], [1040, 16], [880, 16], [880, 32], [700, 32], [700, 14], [520, 14], [520, 26], [320, 26], [320, 12], [120, 12], [120, 24], [0, 24]] },
  ],
});
