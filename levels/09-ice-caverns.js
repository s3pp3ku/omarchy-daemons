/* LVL 09 — ICE CAVERNS
   Design record: docs/levels/09-ice-caverns.md
   New material: ICE. A daemon standing on ice covers two pixels per tick, so
   crowds arrive at hazards twice as fast. An ice shelf runs above an ice
   floor; the two routes share a lava column and rejoin in the hall. */
OL.registerLevel({
  id: "ice-caverns",
  slot: 9,
  title: "ICE CAVERNS",
  brief: "Ice floors are slippery: daemons walk twice as fast on them, so hazards arrive twice as fast too. Run the ice shelf overhead, or cut down to the ice floor below. Both routes share one lava column and meet in the hall.",
  size: [1280, 340],
  seed: 27,
  theme: "nord",
  daemons: 30,
  save: 20,
  time: 300,
  rate: 50,
  skills: { blocker: 3, builder: 4, digger: 2, miner: 2, basher: 1 },
  entrances: [{ x: 70, y: 100 }],
  exits: [{ x: 1150, y: 269 }],
  camera: { x: 0 },

  objects: [
    { type: "crusher", x: 330, y: 269, top: 238, w: 10, period: 140, down: 8, rise: 22, phase: 0 },
  ],
  props: [
    { kind: "plaque", x: 70, y: 66, text: "$ ice-cli --slide" },
    { kind: "window", x: 220, y: 90, w: 112, h: 46, title: "~ sensors", active: 0, lines: ["temp: -12 C", "!ice: slippery", "# speed x2"] },
    { kind: "fetch", x: 560, y: 66, w: 112, h: 44 },
    { kind: "plaque", x: 490, y: 160, text: "LAVA", color: "#ff6a2b" },
    { kind: "plaque", x: 330, y: 232, text: "OOM", color: "#ff3b4e" },
    { kind: "plaque", x: 840, y: 222, text: "COOLANT", color: "#ff6a2b" },
    { kind: "bar", x: 760, y: 60, w: 230 },
    { kind: "window", x: 1020, y: 100, w: 140, h: 46, title: "journalctl -f", active: 1, lines: ["# ice sheet: thick", "!slip: 2x speed"] },
    { kind: "plaque", x: 1150, y: 232, text: "/usr/bin/home", color: "#88c0d0" },
  ],
  decor: [
    { m: "tech", rect: [1100, 210, 120, 60] },
    { cable: [[200, 160], [740, 170]], sag: 24, leds: 24 },
  ],

  terrain: [
    { m: "metal", rect: [0, 322, 1280, 18] },
    { m: "rock", rect: [0, 270, 1250, 52] },
    { m: "metal", rect: [1250, 0, 30, 322] },

    /* the plateau, the ice shelf above, the ice floor below */
    { m: "dirt", rect: [0, 110, 180, 160] },
    { m: "ice", rect: [180, 190, 560, 10] },
    { m: "ice", rect: [100, 270, 580, 8] },
    { m: "ice", rect: [680, 270, 220, 8] },
    { m: "rock", rect: [0, 200, 100, 70] },            // west wall of the lower cavern

    /* shared lava column: the shelf's gap sits right over the floor's pit */
    { m: "air", rect: [470, 190, 40, 10] },
    { m: "air", rect: [470, 270, 40, 30] },
    { m: "lava", rect: [470, 282, 40, 18] },
    /* the shelf's second gap, and a low wall on the shelf */
    { m: "air", rect: [580, 190, 40, 10] },
    { m: "rock", rect: [690, 162, 16, 28] },

    /* the lower floor's low wall, then the hall */
    { m: "rock", rect: [600, 240, 16, 30] },

    /* hall: coolant moat and the last wall */
    { m: "air", rect: [820, 270, 40, 30] },
    { m: "water", rect: [820, 282, 40, 18] },
    { m: "rock", rect: [960, 238, 16, 32] },
    { m: "tech", rect: [1120, 270, 60, 3] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1280, 0], [1280, 44], [1120, 44], [1120, 30], [940, 30], [940, 48], [760, 48], [760, 32], [560, 32], [560, 52], [380, 52], [380, 34], [200, 34], [200, 50], [0, 50]] },
  ],
});
