# Engine reference

Plain HTML + JavaScript, no build step, no external assets. It opens straight from `file://`, which is how the Omarchy bar widget launches it.

```
index.html            page shell (HUD, stage, dock)
css/style.css         Omarchy UI styling
js/core/terrain.js    pixel material map + level shape rasteriser   (DOM-free)
js/core/sim.js        deterministic lemming simulation + replays     (DOM-free)
js/core/levels.js     level / solution registry                      (DOM-free)
js/gfx/palette.js     lemming colours
js/gfx/theme.js       theme palettes (UI + neon linework + scenery + backdrop)
js/gfx/lemming.js     vector lemmings (pose-based, smooth at any zoom)
js/gfx/board.js       routed circuit-board artwork for breakable rock (buses, chips, vias, silkscreen)
js/gfx/terrain-render.js  hi-res terrain (anti-aliased edges, sub-pixel textures), live fluids, glow
js/gfx/scenery.js     vector hatch, gate, mark, mechanisms; parallax backdrop
js/gfx/renderer.js    camera, smooth zoom, particles, skill preview, minimap, debug overlays
js/audio.js           procedural music + effects (WebAudio)
js/main.js            screens, input, loop, HUD, debug panel
levels/*.js           level data (one file per level)
levels/solutions.js   recorded replays (generated)
tools/                node scripts: verify, plan, solve, shortcut search, tolerance
legacy/               the original prototype, untouched
```

The three `js/core` files run unchanged in node (`tools/load.js`). That lets `tools/verify.js` replay solutions under exactly the physics the browser uses.

## Rendering
Physics stays on the 1-pixel material map; the picture does not.
- Terrain is rendered at **S sub-pixels per world pixel** (S = 2–4, picked from the zoom). Edges follow a smooth contour (a bilinear solid field with a signed-distance estimate), so digs, slopes and stairs look rounded and anti-aliased. Textures (soil noise, pebbles, copper traces, vias, rivets, chevrons) are evaluated per sub-pixel.
- The terrain is split into 128 px tiles, so a dig or bash re-renders and re-uploads only the tiles it touches.
- Grass only grows on the level's original surfaces, so freshly dug soil stays bare.
- Fluids are drawn live every frame from collected rectangles, with moving surfaces, bubbles and shimmer.
- Lemmings, hatch, gate, mark, crusher, platforms, particles and the hover bracket are vector drawings.
- The zoom fits the window height exactly (any ratio); `Z`/`X` zoom out/in, `0` refits.
- Glow is a cheap blur: emissive pixels averaged down 4× and scaled back up additively.

## World and timing
- 1 world pixel = 1 terrain cell. Each pixel holds one material.
- 20 simulation ticks per second. Speed-up runs more ticks per frame, so it is still deterministic.
- A lemming's position `(x, y)` is its **foot pixel**; the ground is at `y+1`. The body is about 14 px tall, plus hair.
- No randomness in the simulation. The same action list always gives the same result.

## Materials
| id | name | solid | breakable | notes |
|---|---|---|---|---|
| dirt | grassy soil | ✓ | ✓ | grass is drawn on exposed tops |
| rock | circuit board: routed buses with 45° bends, copper pour, chips, gold vias, silkscreen labels; tan fibreglass where cut | ✓ | ✓ | same rules as dirt |
| metal | system plating | ✓ | ✗ | neon top edges |
| tech | Omarchy architecture | ✓ | ✗ | circuit panels |
| brick | builder steps (drawn as circuit-board planks) | ✓ | ✓ | |
| oneway-left/right | purple chevrons | ✓ | only in the arrow's direction | digging always works |
| lava | | ✗ | — | lethal on contact |
| water / coolant | | ✗ | — | lethal on contact |

Map edges act as metal walls at the sides and as a bottomless drop at the bottom.

## Movement constants (`OL.C` in `js/core/sim.js`)
| constant | value | meaning |
|---|---|---|
| walk | 1 px/tick | 20 px/s |
| STEP_UP | 6 | climbs ledges up to 6 px; higher is a wall (turn around) |
| STEP_DOWN | 3 | steps down up to 3 px, otherwise starts falling |
| FALL_SPEED | 3 px/tick | |
| SPLAT | 96 px | a longer fall is fatal (about 6 lemming heights) |
| OPEN_DELAY | 30 ticks | before the first drop |
| release rate | 1–99 | ticks between drops = (53 − rate/2) × 20/17. Level `rate` is the minimum |

## Skills
| skill | behaviour |
|---|---|
| Blocker | stands still; walkers within 6 px heading toward it turn around. **Can be given a Builder/Basher/Miner/Digger to release it.** |
| Builder | 12 bricks, one every 8 ticks; each brick is 8 px long, and the stairs advance 4 px and rise 2 px per brick (48 across, 24 up). Stops and turns around if the next step hits terrain at head height. |
| Basher | removes a 5 × 14 px slice ahead every 5 ticks and advances 2 px. Stops when nothing breakable is within 10 px, or on metal / wrong-way one-way. |
| Miner | 45° tunnel down and forward, 2 px per 9 ticks. Stops on metal. |
| Digger | removes a 9 px wide row every 3 ticks. Stops on metal; falls when it breaks into open air. |
| Bomber | 5 s fuse, then a 13 px-radius explosion (metal is untouched). Nuke = bombers for everyone. |

Walkers pass through each other; only blockers interact.

## Mechanisms (`level.objects`)
| object | behaviour |
|---|---|
| crusher ("OOM killer") | Timer: up → rises → waits → 24-tick warning (light blinks, head shudders) → slams for `down` ticks. Anyone within its width while it's down dies (`oom`). Not solid. |
| window | Sliding platform, solid and indestructible (`PLAT`, not stored in the pixel map). Moves 1 px every `step` ticks with dwell pauses at both ends. Lemmings standing on it move with it; anyone it moves onto is lifted onto its top. |

Both are pure functions of the tick, so replays stay exact.

## Themes
`js/gfx/theme.js` holds the palettes. A level names one with `theme`; the player can override it from **THEMES** on the title screen (`localStorage ol.theme`). Themes recolour the UI, neon edges, tech panels, circuit-board steps, one-way chevrons, hatch, gate and backdrop. Lemmings, soil and hazards keep their colours, so gameplay reads the same everywhere.

## Journal
In play, a `journalctl`-style log (toggle with `L`) records starts, assignments, exits and deaths with their cause: falls with distance, drowning, lava, OOM killer, bombs, and nukes.

## Replays
`sim.actions` records `{t, a:"assign", id, skill}`, `{t, a:"rate", v}` and `{t, a:"nuke"}`. Each action is applied before tick `t` runs. `OL.runReplay(level, actions)` runs a list headlessly. In the browser, the debug panel can copy the current replay or play any recorded solution.

## Tools (run from the repo root)
```sh
node tools/verify.js                 # all recorded solutions still win?
node tools/solve-02.js [--write]     # scripted LVL 02 solutions -> levels/solutions.js
node tools/shortcuts-02.js           # lazy-strategy probes
KMIN=4 KMAX=7 TMAX=1500 IDS=6 node tools/shortcuts-02.js --random 40000   # random search
node tools/tolerance-02.js           # how forgiving is each key decision?
```
`tools/plan.js` turns rule-based plans ("when lemming 1 walks past x=209, give it a builder") into exact replays. That's the quickest way to prove a level design.

## Debug tools in the game
Press `` ` `` (or open `index.html?debug=1`). Material view, lemming id/state labels, exit and blocker zones plus a splat-height ruler at the cursor, infinite skills, single-step (`.` while paused), reload the level files without losing your place (`Shift+R`), spawn a test lemming at the cursor (`T`), copy the replay, and play recorded solutions. URL shortcuts: `?level=network-nodes`, `&solution=B-lower-tunnel`, `&speed=4`.
