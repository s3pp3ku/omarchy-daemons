# LEVEL DESIGN RECORD — LVL 01 BOOT SEQUENCE

Level file: `levels/01-boot-sequence.js`. Solutions: `tools/solve-01.js`, recorded in `levels/solutions-01.js`.

## Identity
- Map size: 960 × 256
- Daemons / quota / time / minimum release rate: 20 / save 15 / 4:00 / rate 50
- Skills: Blocker 2, Builder 4, Digger 3
- Goal: Teach that tools are a budget. Two coolant pits on the surface, a flooded stretch in the service tunnel below, and the exit at the tunnel's far end.
- Puzzle sentence: **Containment → Fork → Hazard corridor → Release**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-tunnel-first | 20/20 | Digger into the tunnel, a blocker holds the crowd at the flood, a daemon bridges it, the blocker becomes a builder to release the crowd. | blocker 1, builder 2, digger 1 |
| B-surface-bridges | 20/20 | Bridge both surface pits (holding the crowd at the first), then sink a shaft into the vault chamber. | blocker 1, builder 3, digger 1 |

Run `node tools/solve.js 01` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- Both routes cost two to three skills, so wasting one matters but is survivable.
- A builder's bridge only reaches 48 px across: every gap is 38–40 px, so the builder must start within a few pixels of the lip.
- The tunnel's flooded stretch sits in a chamber 60 px tall; in a 26 px tunnel the stairs bump the ceiling.
