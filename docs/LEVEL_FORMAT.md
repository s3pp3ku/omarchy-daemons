# Level format

One file per level in `levels/`, added to `index.html` with a `<script>` tag. A level is pure data: changing a map never touches game code.

```js
OL.registerLevel({
  id: "network-nodes",        // stable id (progress + solutions key)
  slot: 2,                    // campaign position
  title: "NETWORK NODES",
  brief: "One or two sentences shown before play.",
  size: [1280, 320],          // world pixels; 320 tall = 3x zoom on a 1080p screen
  seed: 7,                    // backdrop variation
  theme: "omarchy",           // palette: omarchy tokyo-night catppuccin gruvbox everforest nord kanagawa rose-pine matte-black
  lab: false,                 // true = listed under the campaign as a mechanics playground
  daemons: 25, save: 20,     // population and quota
  time: 240,                  // seconds
  rate: 65,                   // minimum release rate (player can only raise it)
  skills: { blocker: 2, builder: 5, basher: 3, miner: 0, digger: 2, bomber: 0 },
  entrances: [{ x: 64, y: 86 }],          // spawn points (bottom-centre of the hatch); optional dir: -1
  exits: [{ x: 1180, y: 237 }],           // the exit's floor point (daemon foot y)
  camera: { x: 0 },                       // optional start camera

  objects: [                              // moving mechanisms (deterministic, tick-driven)
    // OOM killer: press over floor point (x, y); hangs from `top`. Kills anyone under it while down.
    { type: "crusher", x: 160, y: 95, top: 40, w: 18, period: 96, down: 14, rise: 22, phase: 0 },
    // sliding window: solid, indestructible platform. Slides `range` px along `axis`
    // (x = right, y = up), 1 px every `step` ticks, pausing `dwell` [start, end] ticks.
    // Carries riders; scoops anyone it moves onto.
    { type: "window", x: 420, y: 150, w: 80, h: 3, axis: "x", range: 72, step: 2, dwell: [150, 70] },
  ],

  decor: [                                // scenery only, never collides
    { m: "tech", rect: [1064, 176, 186, 62] },        // faint back-wall
    { cable: [[330, 176], [612, 196]], sag: 30, leds: 22 },
  ],

  props: [                                // Omarchy desktop scenery drawn behind the terrain
    { kind: "window", x: 252, y: 46, w: 96, h: 48, title: "~ btop", lines: ["$ ip link", "# up", "!lo: down"] },  // $ green, # cyan, ! orange
    { kind: "fetch",   x: 354, y: 46, w: 112, h: 48 },        // mini fastfetch with the Omarchy mark
    { kind: "bar",     x: 790, y: 54, w: 230 },               // waybar strip
    { kind: "plaque",  x: 108, y: 70, text: "SUPER + RETURN", color: "#ff6a2b" },
    { kind: "logo",    x: 600, y: 80, h: 60, alpha: 0.2 },    // the Omarchy mark
  ],

  terrain: [                              // drawn in order, later ops overwrite earlier ones
    { m: "metal", rect: [0, 304, 1280, 16] },
    { m: "dirt", poly: [[0, 112], [214, 112], [214, 244], [0, 244]] },
    { m: "air", rect: [404, 120, 30, 16] },           // carve
    { m: "water", rect: [404, 124, 30, 12] },
    { m: "rock", circle: [600, 200, 20] },
    { m: "metal", rect: [0, 0, 50, 50], only: "dirt" }, // replace only dirt pixels
  ],
});
```

Materials: `air dirt rock ice metal tech brick lava water (coolant) oneway-left oneway-right`.

## Design numbers to keep in mind
- Daemon body about 16 px tall.
- Fatal fall: more than 96 px.
- Walkable step: up to 6 px.
- One builder: 48 px across, 24 px up. Make a gap at least about 30 px narrower than the reach so players get about 1 s of slack.
- Digger hole: 9 px wide.
- Basher tunnel: 14 px tall.
- The exit's floor must be solid directly under `(x, y+1)`.

## Workflow
1. Copy `docs/LEVEL_DESIGN_TEMPLATE.md` to `docs/levels/<id>.md` and fill in the puzzle before drawing it.
2. Draw the terrain. Open `index.html?level=<id>&debug=1`, edit the level file, and press `Shift+R` to reload it in place.
3. Script each intended solution with `tools/plan.js` (see `tools/solve-02.js`). Write the replays to `levels/solutions.js`.
4. Run the lazy probes and a random search for shortcuts, plus a tolerance sweep.
5. `node tools/verify.js` must pass before committing.
