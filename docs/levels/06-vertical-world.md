# LEVEL DESIGN RECORD — LVL 06 VERTICAL WORLD

Level file: `levels/06-vertical-world.js`. Solutions: `tools/solve-06.js`, recorded in `levels/solutions-06.js`.

## Identity
- Map size: 560 × 560
- Daemons / quota / time / minimum release rate: 30 / save 20 / 8:00 / rate 50
- Skills: Blocker 3, Builder 4, Basher 3, Digger 1, Miner 1
- Goal: Five stacked floors forming one long zigzag. Walk every toll, or cut down and skip some. Daemons keep their heading when they land.
- Puzzle sentence: **Gap → Wall → Hazard → Door → Gap → Wall, with vertical shortcuts**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-walk-every-toll | 25/30 | Bridge, bash, bridge, bash the metal door's port, bridge, bash. | builder 3, basher 3 |
| B-dig-bridge-mine | 30/30 | Dig through floor 1, bridge the lava on floor 3, mine down east of the metal door. | builder 1, digger 1, miner 1 |
| C-walk-then-dig | 27/30 | Walk floors 1–3, then dig down east of the metal door onto floor 5's last stretch. | builder 2, basher 1, digger 1 |

Run `node tools/solve.js 06` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- Walls double as turn-arounds: a daemon that lands heading the wrong way is bounced back by a wall, which is how one dig can skip several tolls.
- The cheap route needs an insight, not a skill: three skills and nobody lost.
