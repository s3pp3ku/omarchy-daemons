/* LVL 03 — DEPENDENCIES
   Design record: docs/levels/03-dependencies.md
   Two hatches. Group A drops onto the upper deck; group B drops into
   /var/cache, a sealed room whose only door is a one-way wall that can be
   bashed open from OUTSIDE only (moving left). B depends on A — and opening
   the door lets A's crowd straight into B's coolant pit. */
OL.registerLevel({
  id: "dependencies",
  slot: 3,
  title: "DEPENDENCIES",
  theme: "tokyo-night",
  brief: "libb can't install until liba is built. Group B is sealed in /var/cache behind a one-way door that only opens from outside. Get group A round to it — and mind what's waiting behind that door.",
  size: [1280, 320],
  seed: 5,
  lemmings: 30,
  save: 24,
  time: 300,
  rate: 50,
  skills: { blocker: 2, builder: 3, basher: 2, digger: 1 },
  entrances: [{ x: 70, y: 82 }, { x: 96, y: 200 }],
  exits: [{ x: 1180, y: 241 }],
  camera: { x: 0 },

  decor: [
    { m: "tech", rect: [8, 156, 286, 108] },                    // /var/cache back wall
    { m: "tech", rect: [1036, 180, 210, 60] },                  // install room panel
    { cable: [[322, 160], [560, 168]], sag: 16, leds: 18 },
    { cable: [[600, 196], [1030, 200]], sag: 40, leds: 30 },
    { cable: [[560, 60], [1250, 80]], sag: 30, leds: 26, color: "#2a3050" },
  ],

  terrain: [
    { m: "metal", rect: [0, 300, 1280, 20] },                 // bedrock
    { m: "rock", rect: [0, 270, 1280, 30] },                  // floor of everything below

    /* the upper deck (A) */
    { m: "dirt", poly: [[0, 104], [180, 103], [380, 105], [560, 104], [560, 138], [0, 138]] },
    { m: "rock", rect: [0, 138, 560, 12] },

    /* /var/cache (B): shelf under the hatch, coolant pit by the door */
    { m: "tech", rect: [24, 214, 168, 6] },
    { m: "air", rect: [238, 270, 34, 30] },
    { m: "water", rect: [238, 272, 34, 28] },
    /* the one-way door: can only be bashed / mined while moving LEFT */
    { m: "oneway-left", rect: [300, 150, 22, 120] },

    /* A's way down: a staging shelf under the deck's edge (two safe drops) */
    { m: "tech", rect: [470, 186, 130, 6] },

    /* the install room: exit on a dais, 28 px above the corridor floor */
    { m: "tech", rect: [1030, 242, 220, 28] },
    { m: "metal", rect: [1250, 0, 30, 300] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1280, 0], [1280, 22], [1160, 34], [1040, 18], [900, 40], [780, 20], [640, 38], [560, 18], [420, 30], [300, 16], [160, 28], [0, 18]] },
  ],
});
