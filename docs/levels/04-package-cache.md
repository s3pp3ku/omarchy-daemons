# LEVEL DESIGN RECORD — LVL 04 PACKAGE CACHE

Level file: `levels/04-package-cache.js`. Solutions: `tools/solve-04.js`, recorded in `levels/solutions-04.js`.

## Identity
- Map size: 1280 × 352
- Daemons / quota / time / minimum release rate: 30 / save 20 / 5:30 / rate 50
- Skills: Blocker 2, Builder 4, Digger 4, Miner 3
- Goal: Three stacked layers (surface ruin, mid cache, bottom cache). Each charges a different toll and no route pays all of them.
- Puzzle sentence: **Fork → Vertical separation → Gap → Pillar → Hazard → Release**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-dig-bridge-dig | 27/30 | Dig into the mid cache, bridge its pit, dig past the bottom pillar, bridge the lava. | blocker 1, builder 3, digger 2 |
| B-dig-bridge-mine | 26/30 | As A, but mine under the metal pillar instead of digging past the bottom one. | blocker 1, builder 3, digger 1, miner 1 |
| C-surface-gap-then-dig | 25/30 | Bridge the first surface gap, dig past the mid pit, mine under the pillar, bridge the lava. | blocker 1, builder 3, digger 1, miner 1 |
| D-all-surface | 25/30 | Three bridges along the surface, one shaft into the east cache, a miner under the lava trench. | builder 3, digger 1, miner 1 |

Run `node tools/solve.js 04` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- The bottom layer has a decoy lava trench in its west half: dig there and you land in a dead end.
- A miner breaks out of rock after about 54 px (30 px if there is a hall below it), which decides where it lands relative to a hazard.
- Builders need headroom, so each pit sits in a taller hall.
