/* LVL 08 — AUR VALLEY
   Design record: docs/levels/08-aur-valley.md
   A lava lake fills the valley. The stable route is a long catwalk along the
   rim (three gaps to bridge). The short route
   is a service tunnel underneath: dig in, bomb through a thin plug and pass an
   OOM-killer press. */
OL.registerLevel({
  id: "aur-valley",
  slot: 8,
  title: "AUR VALLEY",
  brief: "A lava lake fills the valley. The safe way is the long catwalk around the rim: three gaps to bridge. The short way is the service tunnel underneath: a sealed plug and an OOM killer. Choose your risk.",
  size: [1280, 340],
  seed: 17,
  theme: "matte-black",
  daemons: 30,
  save: 18,
  time: 360,
  rate: 50,
  skills: { blocker: 3, builder: 4, digger: 3, bomber: 2 },
  entrances: [{ x: 80, y: 100 }],
  exits: [{ x: 1030, y: 321 }],
  camera: { x: 0 },

  objects: [
    { type: "crusher", x: 760, y: 321, top: 288, w: 14, period: 100, down: 12, rise: 22, phase: 0 },
  ],
  props: [
    { kind: "plaque", x: 80, y: 66, text: "$ yay -S aur/omarchy" },
    { kind: "window", x: 130, y: 30, w: 122, h: 48, title: "~ yay", active: 0, lines: ["$ yay -S aur/foo", "!warn: unsupported", "# PKGBUILD from AUR", "# review before use"] },
    { kind: "fetch", x: 420, y: 90, w: 112, h: 44 },
    { kind: "plaque", x: 590, y: 160, text: "LAVA LAKE", color: "#ff6a2b" },
    { kind: "plaque", x: 760, y: 160, text: "UNSUPPORTED PACKAGE", color: "#ff3b4e" },
    { kind: "bar", x: 820, y: 100, w: 220 },
    { kind: "plaque", x: 450, y: 256, text: "SERVICE TUNNEL", color: "#e68e0d" },
    { kind: "plaque", x: 1060, y: 250, text: "/usr/bin/exit", color: "#e68e0d" },
  ],
  decor: [
    { m: "tech", rect: [940, 284, 170, 38] },
    { cable: [[240, 150], [520, 170]], sag: 24, leds: 24 },
    { cable: [[780, 160], [1100, 150]], sag: 24, leds: 24 },
  ],

  terrain: [
    { m: "metal", rect: [0, 322, 1280, 18] },
    { m: "rock", rect: [0, 270, 1250, 52] },
    { m: "metal", rect: [1250, 0, 30, 322] },

    /* west: plateau, then a ledge, then the valley floor */
    { m: "dirt", rect: [0, 110, 230, 160] },
    { m: "dirt", rect: [230, 190, 90, 80] },

    /* the lava lake and its two shores */
    { m: "air", rect: [440, 270, 300, 20] },
    { m: "lava", rect: [440, 278, 300, 12] },

    /* rim catwalk: three gaps, each needing a bridge */
    { m: "tech", rect: [360, 190, 140, 6] },
    { m: "tech", rect: [540, 190, 200, 6] },
    { m: "tech", rect: [780, 190, 220, 6] },

    /* the service tunnel: plug, press, vault */
    { m: "air", rect: [340, 288, 600, 34] },
    { m: "rock", rect: [500, 288, 6, 34] },
    { m: "air", rect: [940, 284, 170, 38] },
    { m: "air", rect: [1010, 270, 90, 14] },
    { m: "tech", rect: [1000, 322, 60, 3] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1280, 0], [1280, 40], [1120, 40], [1120, 26], [960, 26], [960, 44], [780, 44], [780, 28], [560, 28], [560, 48], [380, 48], [380, 30], [220, 30], [220, 46], [0, 46]] },
  ],
});
