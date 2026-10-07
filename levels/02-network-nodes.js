/* LVL 02 — NETWORK NODES
   Design record: docs/levels/02-network-nodes.md
   Coordinates are world pixels (x right, y down). Lemmings are ~16 px tall;
   falls over 96 px are fatal; one builder = 12 steps = 48 px across, 24 up. */
OL.registerLevel({
  id: "network-nodes",
  slot: 2,
  title: "NETWORK NODES",
  brief: "Twenty-five users, one gate. An upper backbone of broken links over a flooded service tunnel — and a firewall in the middle of both. Hold the crowd, scout a route, then let them through.",
  size: [1280, 320],
  seed: 7,
  theme: "omarchy",
  lemmings: 25,
  save: 20,
  time: 240,
  rate: 65,
  skills: { blocker: 2, builder: 5, basher: 3, digger: 2 },
  entrances: [{ x: 64, y: 86 }],
  exits: [{ x: 1180, y: 237 }],
  camera: { x: 0 },

  /* scenery only: never collides, drawn faint behind the action */
  decor: [
    { m: "tech", rect: [1064, 176, 186, 62] },                 // kernel room back panel
    { m: "metal", rect: [1130, 184, 100, 6] },
    { m: "rock", rect: [300, 176, 16, 68] },                   // cavern pillars
    { m: "rock", rect: [520, 196, 12, 48] },
    { m: "rock", rect: [860, 176, 18, 68] },
    { m: "tech", rect: [700, 196, 40, 48] },                   // dead relay box
    { cable: [[214, 150], [262, 176]], sag: 10, leds: 14 },
    { cable: [[330, 176], [612, 196]], sag: 30, leds: 22 },
    { cable: [[652, 200], [1040, 180]], sag: 36, leds: 26 },
    { cable: [[740, 120], [1040, 150]], sag: 22, leds: 20, color: "#22302e" },
    { cable: [[520, 130], [560, 112]], sag: 8, leds: 12 },
  ],

  terrain: [
    /* bedrock */
    { m: "metal", rect: [0, 304, 1280, 16] },

    /* cavern floor (lower route) */
    { m: "rock", rect: [0, 244, 1280, 60] },

    /* A — boot ledge: solid soil from the surface down to the cavern floor */
    { m: "dirt", poly: [[0, 112], [120, 110], [190, 113], [214, 112], [214, 244], [0, 244]] },

    /* R1 — first backbone ridge: soil top, rock underside, hangs over the cavern */
    { m: "dirt", poly: [[244, 121], [330, 119], [420, 120], [520, 121], [520, 150], [244, 150]] },
    { m: "rock", poly: [[244, 150], [520, 150], [516, 176], [250, 176]] },
    /* coolant pool sunk into R1 */
    { m: "air", rect: [404, 120, 30, 16] },
    { m: "water", rect: [404, 122, 30, 14] },

    /* R2 — the firewall: a metal node on top, a rock wall down to the floor */
    { m: "metal", rect: [548, 104, 212, 10] },
    { m: "tech", rect: [580, 114, 160, 14] },
    { m: "rock", rect: [612, 128, 40, 116] },
    { m: "metal", rect: [600, 128, 64, 6] },

    /* R3 — eastern ridge with a lava trench at its west end */
    { m: "dirt", poly: [[760, 150], [1040, 150], [1040, 176], [764, 176]] },
    { m: "lava", rect: [760, 150, 30, 10] },

    /* K — kernel room around the exit: rock west wall, soil roof, metal east wall */
    { m: "dirt", rect: [1040, 150, 210, 26] },
    { m: "rock", rect: [1040, 176, 24, 68] },
    { m: "metal", rect: [1250, 0, 30, 244] },
    { m: "tech", rect: [1150, 238, 60, 6] },

    /* cavern: coolant channel cut into the floor */
    { m: "air", rect: [420, 244, 42, 52] },
    { m: "water", rect: [420, 247, 42, 49] },

    /* ceiling teeth (visual + stop tall staircases) */
    { m: "rock", poly: [[0, 0], [1280, 0], [1280, 18], [1180, 30], [1100, 14], [980, 40], [900, 16], [820, 34], [700, 12], [600, 46], [540, 20], [460, 30], [380, 14], [300, 36], [220, 16], [140, 26], [60, 12], [0, 22]] },
  ],
});
