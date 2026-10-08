/* HAZARD LAB — not part of the campaign. A small playground for the two
   newer mechanisms so they can be tried (and tuned) before a campaign level
   leans on them:
     - crusher ("OOM killer"): a press on a timer; anyone under it when it
       slams is killed. Telegraphed by a red warning light.
     - window: a sliding tiled-window platform. It carries anyone standing
       on it, and scoops up anyone it moves onto. */
OL.registerLevel({
  id: "hazard-lab",
  slot: 90,
  lab: true,
  title: "HAZARD LAB",
  theme: "matte-black",
  brief: "A test bench for new kernel features: an OOM killer on a timer, a retracting window bridge over lava and a window lift. Get half of them home.",
  size: [960, 260],
  seed: 11,
  daemons: 20,
  save: 12,
  time: 300,
  rate: 50,
  skills: { blocker: 2, builder: 3, basher: 2, digger: 2 },
  entrances: [{ x: 50, y: 66 }],
  exits: [{ x: 890, y: 89 }],
  camera: { x: 0 },

  objects: [
    // OOM killer over the upper corridor
    { type: "crusher", x: 160, y: 95, top: 40, w: 18, period: 96, down: 14, rise: 22, phase: 0 },
    // retracting bridge over the lava pit (slides right into the far ledge)
    { type: "window", x: 420, y: 150, w: 80, h: 3, axis: "x", range: 72, step: 2, dwell: [150, 70], phase: 0 },
    // lift: rests just below the ledge, rises to the exit ledge
    { type: "window", x: 700, y: 169, w: 60, h: 6, axis: "y", range: 79, step: 2, dwell: [70, 40], phase: 0 },
  ],

  props: [
    { kind: "plaque", x: 160, y: 56, text: "OOM KILLER", color: "#ff3b4e" },
    { kind: "window", x: 236, y: 44, w: 120, h: 52, title: "~ dmesg -w", active: 1, lines: ["!oom-kill: pid 418", "!out of memory", "# window: sliding", "# lift: workspace 2"] },
    { kind: "fetch", x: 520, y: 44, w: 116, h: 46 },
    { kind: "bar", x: 700, y: 50, w: 200 },
    { kind: "plaque", x: 460, y: 122, text: "LAVA", color: "#ff6a2b" },
  ],

  decor: [
    { m: "tech", rect: [120, 20, 80, 20] },
    { cable: [[240, 60], [420, 100]], sag: 20, leds: 18 },
    { cable: [[560, 100], [700, 60]], sag: 18, leds: 16 },
  ],

  terrain: [
    { m: "metal", rect: [0, 250, 960, 10] },
    /* upper corridor (A): soil, with a metal plate under the press */
    { m: "dirt", rect: [0, 96, 230, 60] },
    { m: "metal", rect: [146, 96, 28, 8] },
    { m: "rock", rect: [0, 156, 230, 94] },
    /* the press housing hangs from the ceiling */
    { m: "metal", rect: [140, 0, 40, 40] },
    /* lower floor (L) */
    { m: "rock", rect: [230, 150, 190, 100] },
    { m: "dirt", rect: [230, 150, 190, 12] },
    /* lava pit under the bridge */
    { m: "rock", rect: [420, 210, 80, 40] },
    { m: "lava", rect: [420, 156, 80, 54] },
    /* far ledge (F) with a slot the bridge slides into */
    { m: "rock", rect: [500, 150, 180, 100] },
    { m: "rock", rect: [680, 158, 20, 92] },          // step down: no climbing back toward the lava
    { m: "air", rect: [500, 150, 76, 3] },
    { m: "tech", rect: [500, 153, 76, 3] },
    /* lift shaft floor + exit ledge (U) */
    { m: "rock", rect: [700, 175, 60, 75] },          // shaft floor
    { m: "metal", rect: [692, 40, 8, 84] },          // lip: stops riders stepping off the lift's left side
    { m: "rock", rect: [760, 90, 200, 160] },
    { m: "tech", rect: [760, 90, 200, 4] },
    /* ceiling */
    { m: "rock", poly: [[0, 0], [960, 0], [960, 20], [888, 20], [888, 32], [760, 32], [760, 16], [632, 16], [632, 36], [488, 36], [488, 16], [360, 16], [360, 32], [264, 32], [264, 12], [116, 12], [116, 16], [0, 16]] },
  ],
});
