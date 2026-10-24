# LEVEL DESIGN RECORD — LVL 07 THE ARCH

Level file: `levels/07-the-arch.js`. Solutions: `tools/solve-07.js`, recorded in `levels/solutions-07.js`.

## Identity
- Map size: 1200 × 380
- Daemons / quota / time / minimum release rate: 30 / save 20 / 7:00 / rate 50
- Skills: Blocker 2, Builder 4, Basher 3, Digger 2, Miner 1
- Goal: A stepped metal A-frame stands on the path. Cross its lava hall, tunnel the basement under it, or combine the two. The vault is underground on the far side.
- Puzzle sentence: **Wall (port) → Hazard (lava hall) → Wall (port) → Drop, or Shaft → Plug → Pit → Wall**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-through-the-hall | 22/30 | Bash a port at each foot, bridge the lava hall, bridge the surface coolant. | builder 2, basher 2 |
| B-under-the-arch | 28/30 | Dig a shaft, bash the basement plug, bridge the pit, bash the low wall. | builder 1, basher 2, digger 1 |
| C-mine-in-and-build-over | 26/30 | Mine into the basement, bash the plug, bridge the pit, stairs over the low wall. | builder 2, basher 1, miner 1 |
| D-port-then-dig-down | 27/30 | Bash the west port, dig down from the hall past the plug, then the pit and wall. | builder 1, basher 3, digger 1 |

Run `node tools/solve.js 07` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- The A-frame's faces are stepped (risers of 10 px), because a smooth 45° face is simply walkable.
- A builder cannot climb a wall it is facing (its head bumps), but the daemons behind it can, so wall stairs work for the crowd.
