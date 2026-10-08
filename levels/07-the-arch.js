/* LVL 07 — THE ARCH
   Design record: docs/levels/07-the-arch.md
   A great metal A-frame stands on the path. Its hall can be crossed (bash a
   port at each foot, bridge the lava inside), the crowd can be tunnelled
   underneath through the basement, or the two can be combined by digging
   from the hall into the basement. The vault is below ground on the far side. */
OL.registerLevel({
  id: "the-arch",
  slot: 7,
  title: "THE ARCH",
  brief: "A metal A-frame blocks the cavern. Bash a port through its foot and cross the lava hall, or dig under it and tunnel the basement. The vault is underground on the far side, and every road ends in a drop.",
  size: [1200, 380],
  seed: 31,
  theme: "rose-pine",
  daemons: 30,
  save: 20,
  time: 420,
  rate: 50,
  skills: { blocker: 2, builder: 4, basher: 3, digger: 2, miner: 1 },
  entrances: [{ x: 90, y: 270 }],
  exits: [{ x: 1100, y: 359 }],
  camera: { x: 0 },

  props: [
    { kind: "plaque", x: 90, y: 224, text: "$ pacman -S arch" },
    { kind: "window", x: 150, y: 120, w: 112, h: 48, title: "~ uname -a", active: 0, lines: ["Linux omarchy 7.2", "# Arch Linux base", "$ btw i use omarchy"] },
    { kind: "fetch", x: 880, y: 100, w: 112, h: 44 },
    { kind: "plaque", x: 600, y: 36, text: "THE ARCH", color: "#ebbcba" },
    { kind: "plaque", x: 420, y: 250, text: "PORT", color: "#9ccfd8" },
    { kind: "plaque", x: 770, y: 250, text: "PORT", color: "#9ccfd8" },
    { kind: "plaque", x: 600, y: 218, text: "LAVA HALL", color: "#ff6a2b" },
    { kind: "plaque", x: 970, y: 252, text: "COOLANT", color: "#ff6a2b" },
    { kind: "plaque", x: 300, y: 308, text: "BASEMENT", color: "#9ccfd8" },
    { kind: "bar", x: 940, y: 40, w: 230 },
  ],
  decor: [
    { m: "tech", rect: [1040, 300, 120, 60] },
    { cable: [[40, 200], [350, 230]], sag: 20, leds: 22 },
    { cable: [[850, 230], [1160, 200]], sag: 20, leds: 22 },
  ],

  terrain: [
    { m: "metal", rect: [0, 372, 1200, 8] },
    { m: "rock", rect: [0, 280, 1180, 92] },
    { m: "metal", rect: [1180, 0, 20, 360] },

    /* the arch: a metal A-frame with a hall inside */
    /* stepped, so it cannot simply be walked over: every riser is taller than a daemon can climb */
    { m: "metal", rect: [589, 60, 22, 10] },
    { m: "metal", rect: [578, 70, 44, 10] },
    { m: "metal", rect: [567, 80, 66, 10] },
    { m: "metal", rect: [556, 90, 88, 10] },
    { m: "metal", rect: [545, 100, 110, 10] },
    { m: "metal", rect: [535, 110, 130, 10] },
    { m: "metal", rect: [524, 120, 152, 10] },
    { m: "metal", rect: [513, 130, 174, 10] },
    { m: "metal", rect: [502, 140, 196, 10] },
    { m: "metal", rect: [491, 150, 218, 10] },
    { m: "metal", rect: [480, 160, 240, 10] },
    { m: "metal", rect: [469, 170, 262, 10] },
    { m: "metal", rect: [458, 180, 284, 10] },
    { m: "metal", rect: [447, 190, 306, 10] },
    { m: "metal", rect: [436, 200, 328, 10] },
    { m: "metal", rect: [425, 210, 350, 10] },
    { m: "metal", rect: [415, 220, 370, 10] },
    { m: "metal", rect: [404, 230, 392, 10] },
    { m: "metal", rect: [393, 240, 414, 10] },
    { m: "metal", rect: [382, 250, 436, 10] },
    { m: "metal", rect: [371, 260, 458, 10] },
    { m: "metal", rect: [360, 270, 480, 10] },
    { m: "air", rect: [470, 200, 260, 80] },
    { m: "air", rect: [580, 280, 40, 26] },          // lava pit in the hall
    { m: "lava", rect: [580, 290, 40, 16] },
    { m: "rock", rect: [358, 256, 112, 24] },         // west port (bash)
    { m: "rock", rect: [730, 256, 112, 24] },         // east port (bash)

    /* the basement tunnel and its two tolls */
    { m: "air", rect: [270, 326, 770, 34] },
    { m: "rock", rect: [560, 326, 40, 34] },         // plug (bash)
    { m: "air", rect: [640, 300, 220, 26] },         // headroom for a builder
    { m: "air", rect: [660, 360, 40, 12] },          // a pit in the basement floor
    { m: "water", rect: [660, 364, 40, 8] },
    { m: "rock", rect: [800, 336, 20, 24] },         // low wall (bash or build over)

    /* east: surface coolant, then the drop into the vault */
    { m: "air", rect: [950, 280, 40, 26] },
    { m: "water", rect: [950, 290, 40, 16] },
    { m: "air", rect: [1040, 300, 120, 60] },
    { m: "air", rect: [1060, 280, 60, 20] },
    { m: "tech", rect: [1080, 360, 40, 3] },

    /* ceiling */
    { m: "rock", poly: [[0, 0], [1200, 0], [1200, 36], [1050, 36], [1050, 24], [900, 24], [900, 44], [300, 44], [300, 26], [140, 26], [140, 40], [0, 40]] },
  ],
});
