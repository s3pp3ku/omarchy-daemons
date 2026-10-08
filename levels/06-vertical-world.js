/* LVL 06 — VERTICAL WORLD
   Design record: docs/levels/06-vertical-world.md
   Five stacked floors, each a zigzag leg ending in a drop. Every floor
   charges a toll (pit, wall, lava, metal door) — but a digger or miner
   can cut straight down and skip a toll, at the cost of a vertical tool.
   Daemons keep their heading when they land, so a skip changes which way
   they face on the next floor. */
OL.registerLevel({
  id: "vertical-world",
  slot: 6,
  title: "VERTICAL WORLD",
  brief: "Five floors, one long zigzag. Walk it and pay every toll, or cut down through the floors and skip a few. Daemons keep walking the way they were facing when they land.",
  size: [560, 560],
  seed: 21,
  theme: "catppuccin",
  daemons: 30,
  save: 20,
  time: 480,
  rate: 50,
  skills: { blocker: 3, builder: 4, basher: 3, digger: 1, miner: 1 },
  entrances: [{ x: 90, y: 100 }],
  exits: [{ x: 500, y: 469 }],
  camera: { x: 0 },

  props: [
    { kind: "plaque", x: 90, y: 66, text: "$ ssh daemon@omarchy" },
    { kind: "window", x: 170, y: 52, w: 100, h: 40, title: "~ htop", active: 0, lines: ["tasks: 30", "load: 4.2", "!swap 91%"] },
    { kind: "plaque", x: 270, y: 92, text: "COOLANT", color: "#ff6a2b" },
    { kind: "plaque", x: 500, y: 130, text: "DROP ->", color: "#cba6f7" },
    { kind: "plaque", x: 328, y: 186, text: "WALL", color: "#ff3b4e" },
    { kind: "fetch", x: 120, y: 142, w: 112, h: 44 },
    { kind: "plaque", x: 260, y: 272, text: "LAVA", color: "#ff6a2b" },
    { kind: "plaque", x: 60, y: 224, text: "<- DROP", color: "#cba6f7" },
    { kind: "window", x: 330, y: 232, w: 120, h: 40, title: "journalctl -f", active: 1, lines: ["# floor 3 ok", "!lava: hot"] },
    { kind: "plaque", x: 308, y: 362, text: "METAL DOOR", color: "#ff3b4e" },
    { kind: "bar", x: 330, y: 330, w: 190 },
    { kind: "plaque", x: 220, y: 452, text: "COOLANT", color: "#ff6a2b" },
    { kind: "plaque", x: 500, y: 430, text: "/dev/exit", color: "#a6e3a1" },
  ],
  decor: [
    { m: "tech", rect: [450, 406, 80, 64] },
    { cable: [[40, 160], [520, 150]], sag: 24, leds: 24 },
    { cable: [[40, 330], [520, 340]], sag: 24, leds: 24 },
  ],

  terrain: [
    { m: "metal", rect: [0, 510, 560, 50] },
    { m: "rock", rect: [20, 40, 520, 470] },
    { m: "metal", rect: [0, 0, 20, 510] },
    { m: "metal", rect: [540, 0, 20, 510] },

    /* floor chambers: each 64 px of headroom */
    { m: "air", rect: [20, 40, 520, 70] },       // floor 1 (y 110)
    { m: "air", rect: [20, 136, 520, 64] },      // floor 2 (y 200)
    { m: "air", rect: [20, 226, 520, 64] },      // floor 3 (y 290)
    { m: "air", rect: [20, 316, 520, 64] },      // floor 4 (y 380)
    { m: "air", rect: [20, 406, 520, 64] },      // floor 5 (y 470)

    /* the drops between floors: east / west alternately */
    { m: "air", rect: [470, 110, 50, 30] },
    { m: "air", rect: [40, 200, 50, 30] },
    { m: "air", rect: [470, 290, 50, 30] },
    { m: "air", rect: [40, 380, 50, 30] },

    /* tolls */
    { m: "air", rect: [250, 110, 40, 20] },      // floor 1: coolant pit
    { m: "water", rect: [250, 118, 40, 12] },
    { m: "rock", rect: [320, 136, 16, 64] },     // floor 2: rock wall
    { m: "air", rect: [240, 290, 40, 20] },      // floor 3: lava pit
    { m: "lava", rect: [240, 298, 40, 12] },
    { m: "metal", rect: [300, 316, 16, 64] },    // floor 4: metal door with a port at the foot
    { m: "rock", rect: [300, 356, 16, 24] },
    { m: "air", rect: [200, 470, 40, 20] },      // floor 5: coolant pit
    { m: "water", rect: [200, 478, 40, 12] },
    { m: "rock", rect: [400, 446, 14, 24] },     // floor 5: low wall before the vault
    { m: "tech", rect: [480, 470, 50, 3] },

    /* ceiling teeth */
    { m: "rock", poly: [[20, 40], [540, 40], [540, 62], [440, 62], [440, 52], [320, 52], [320, 68], [200, 68], [200, 54], [20, 54]] },
  ],
});
