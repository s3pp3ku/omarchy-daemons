/* LVL 01 — BOOT SEQUENCE
   Design record: docs/levels/01-boot-sequence.md
   Coordinates are world pixels. A tutorial about tools as resources: two
   coolant pits on the surface, a flooded service tunnel underneath, and an
   exit at the tunnel's far end. Three routes, each costing two skills. */
OL.registerLevel({
  id: "boot-sequence",
  slot: 1,
  title: "BOOT SEQUENCE",
  brief: "Twenty daemons spawn on the boot ledge. The way out is the service tunnel below: bridge the surface, or dig into the tunnel. Tools are limited, so choose where to spend them.",
  size: [960, 256],
  seed: 3,
  theme: "everforest",
  daemons: 20,
  save: 15,
  time: 240,
  rate: 50,
  skills: { blocker: 2, builder: 4, digger: 3 },
  entrances: [{ x: 60, y: 82 }],
  exits: [{ x: 580, y: 175 }],
  camera: { x: 0 },

  props: [
    { kind: "plaque", x: 150, y: 62, text: "$ systemctl start boot" },
    { kind: "window", x: 262, y: 30, w: 100, h: 44, title: "journalctl -b", active: 0, lines: ["# Starting kernel", "# Mounting /", "$ systemctl status", "# multi-user.target"] },
    { kind: "fetch", x: 466, y: 30, w: 110, h: 44 },
    { kind: "plaque", x: 219, y: 70, text: "coolant", color: "#ff6a2b" },
    { kind: "plaque", x: 415, y: 70, text: "coolant", color: "#ff6a2b" },
    { kind: "plaque", x: 351, y: 142, text: "FLOODED", color: "#ff6a2b" },
    { kind: "bar", x: 700, y: 44, w: 200 },
  ],
  decor: [
    { m: "tech", rect: [530, 130, 100, 46] },
    { cable: [[210, 120], [440, 120]], sag: 14, leds: 18 },
  ],

  terrain: [
    { m: "metal", rect: [0, 244, 960, 12] },                          // bedrock
    { m: "dirt", rect: [0, 90, 960, 154] },                           // the ground
    /* surface pits */
    { m: "air", rect: [200, 90, 38, 50] },
    { m: "water", rect: [200, 126, 38, 14] },
    { m: "air", rect: [396, 90, 38, 50] },
    { m: "water", rect: [396, 126, 38, 14] },
    /* the service tunnel, with a flooded stretch */
    { m: "air", rect: [150, 150, 470, 26] },
    { m: "air", rect: [310, 116, 80, 60] },                      // taller flooded chamber (room to build)
    { m: "air", rect: [330, 176, 42, 24] },                       // a pit in the tunnel floor
    { m: "water", rect: [330, 184, 42, 16] },
    /* the exit chamber, taller than the tunnel */
    { m: "air", rect: [540, 130, 80, 46] },
    { m: "tech", rect: [540, 176, 80, 3] },
    /* ceiling */
    { m: "rock", poly: [[0, 0], [960, 0], [960, 16], [800, 16], [800, 28], [640, 28], [640, 12], [460, 12], [460, 24], [260, 24], [260, 12], [100, 12], [100, 20], [0, 20]] },
    /* right wall */
    { m: "metal", rect: [930, 0, 30, 244] },
  ],
});
