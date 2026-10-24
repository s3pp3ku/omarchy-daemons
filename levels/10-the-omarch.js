/* LVL 10 — THE OMARCH
   Design record: docs/levels/10-the-omarch.md
   The finale. Two hatches: group A drops onto the upper deck, group B starts
   sealed in /var/cache behind a one-way door only A can open (from outside).
   Together they must cross the Omarch kernel — a stepped A-frame with a lava
   hall, ports at both feet, and a basement tunnel under it with a plug, a
   pit and an OOM-killer press — and finish across the east plains into the
   vault. Every phase from the campaign is here: contain, route, open,
   synchronise, release. */
OL.registerLevel({
  id: "the-omarch",
  slot: 10,
  title: "THE OMARCH",
  brief: "Forty daemons, two hatches. Group B is sealed in /var/cache behind a one-way door that only group A can open from outside. Then both must cross the Omarch kernel, over its lava hall or under it through the basement, and reach the vault.",
  size: [1800, 380],
  seed: 41,
  theme: "omarchy",
  daemons: 40,
  save: 25,
  time: 600,
  rate: 50,
  skills: { blocker: 4, builder: 6, basher: 4, digger: 2, miner: 1, bomber: 1 },
  entrances: [{ x: 70, y: 82 }, { x: 96, y: 200 }],
  exits: [{ x: 1620, y: 349 }],
  camera: { x: 0 },

  props: [
    { kind: "plaque", x: 190, y: 62, text: "SUPER + RETURN" },
    { kind: "window", x: 300, y: 44, w: 110, h: 50, title: "~ make liba", active: 0, lines: ["$ make liba", "CC src/a.c", "LD liba.so", "# built"] },
    { kind: "plaque", x: 230, y: 166, text: "/var/cache" },
    { kind: "plaque", x: 311, y: 140, text: "ONE-WAY", color: "#bb9af7" },
    { kind: "fetch", x: 500, y: 56, w: 112, h: 46 },
    { kind: "plaque", x: 1000, y: 22, text: "THE OMARCH", color: "#2ee59d" },
    { kind: "plaque", x: 760, y: 236, text: "PORT", color: "#22d3ee" },
    { kind: "plaque", x: 1180, y: 236, text: "PORT", color: "#22d3ee" },
    { kind: "plaque", x: 1000, y: 208, text: "LAVA HALL", color: "#ff6a2b" },
    { kind: "plaque", x: 700, y: 296, text: "BASEMENT", color: "#22d3ee" },
    { kind: "plaque", x: 1350, y: 242, text: "COOLANT", color: "#ff6a2b" },
    { kind: "window", x: 1280, y: 90, w: 140, h: 50, title: "journalctl -f", active: 1, lines: ["# kernel: init", "# group A: ok", "# group B: ok", "# final: vault"] },
    { kind: "bar", x: 1470, y: 70, w: 250 },
    { kind: "plaque", x: 1625, y: 262, text: "/usr/bin/home", color: "#2ee59d" },
  ],
  decor: [
    { m: "tech", rect: [8, 156, 286, 108] },
    { m: "tech", rect: [1500, 290, 200, 60] },
    { cable: [[322, 160], [740, 168]], sag: 16, leds: 18 },
    { cable: [[1260, 170], [1740, 150]], sag: 30, leds: 26 },
  ],

  terrain: [
    { m: "metal", rect: [0, 372, 1800, 8] },
    { m: "rock", rect: [0, 270, 1760, 102] },
    { m: "metal", rect: [1760, 0, 40, 372] },

    /* S1 (from LVL 03): the deck, /var/cache, the one-way door */
    { m: "dirt", poly: [[0, 104], [180, 103], [380, 105], [560, 104], [560, 138], [0, 138]] },
    { m: "rock", rect: [0, 138, 560, 12] },
    { m: "tech", rect: [24, 214, 168, 6] },
    { m: "air", rect: [238, 270, 34, 30] },
    { m: "water", rect: [238, 272, 34, 28] },
    { m: "oneway-left", rect: [300, 150, 22, 120] },
    { m: "tech", rect: [470, 186, 130, 6] },

    /* S2: the kernel, a stepped metal A-frame (every riser is taller than a daemon can climb) */
    { m: "metal", rect: [989, 50, 22, 10] },
    { m: "metal", rect: [978, 60, 44, 10] },
    { m: "metal", rect: [967, 70, 66, 10] },
    { m: "metal", rect: [956, 80, 88, 10] },
    { m: "metal", rect: [945, 90, 110, 10] },
    { m: "metal", rect: [935, 100, 130, 10] },
    { m: "metal", rect: [924, 110, 152, 10] },
    { m: "metal", rect: [913, 120, 174, 10] },
    { m: "metal", rect: [902, 130, 196, 10] },
    { m: "metal", rect: [891, 140, 218, 10] },
    { m: "metal", rect: [880, 150, 240, 10] },
    { m: "metal", rect: [869, 160, 262, 10] },
    { m: "metal", rect: [858, 170, 284, 10] },
    { m: "metal", rect: [847, 180, 306, 10] },
    { m: "metal", rect: [836, 190, 328, 10] },
    { m: "metal", rect: [825, 200, 350, 10] },
    { m: "metal", rect: [815, 210, 370, 10] },
    { m: "metal", rect: [804, 220, 392, 10] },
    { m: "metal", rect: [793, 230, 414, 10] },
    { m: "metal", rect: [782, 240, 436, 10] },
    { m: "metal", rect: [771, 250, 458, 10] },
    { m: "metal", rect: [760, 260, 480, 10] },
    { m: "air", rect: [870, 190, 260, 80] },
    { m: "air", rect: [980, 270, 40, 26] },
    { m: "lava", rect: [980, 280, 40, 16] },
    { m: "rock", rect: [758, 246, 112, 24] },
    { m: "rock", rect: [1130, 246, 112, 24] },

    /* the basement: shaft site, plug, pit, wall, OOM-killer press, vault */
    { m: "air", rect: [670, 316, 830, 34] },
    { m: "rock", rect: [900, 316, 6, 34] },
    { m: "air", rect: [980, 290, 220, 26] },
    { m: "air", rect: [1010, 350, 40, 12] },
    { m: "water", rect: [1010, 354, 40, 8] },
    { m: "rock", rect: [1150, 326, 20, 24] },

    /* S3: the east plains and the vault */
    { m: "air", rect: [1330, 270, 40, 26] },
    { m: "water", rect: [1330, 280, 40, 16] },
    { m: "rock", rect: [1450, 238, 20, 32] },
    { m: "air", rect: [1500, 290, 200, 60] },
    { m: "air", rect: [1560, 270, 90, 20] },
    { m: "tech", rect: [1590, 350, 60, 3] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1800, 0], [1800, 36], [1640, 36], [1640, 22], [1480, 22], [1480, 40], [1300, 40], [1300, 24], [1100, 24], [1100, 40], [900, 40], [900, 26], [700, 26], [700, 42], [500, 42], [500, 28], [300, 28], [300, 44], [120, 44], [120, 30], [0, 30]] },
  ],
  objects: [
    { type: "crusher", x: 1300, y: 349, top: 316, w: 10, period: 160, down: 8, rise: 22, phase: 0 },
  ],
});
