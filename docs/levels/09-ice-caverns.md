# LEVEL DESIGN RECORD — LVL 09 ICE CAVERNS

Level file: `levels/09-ice-caverns.js`. Solutions: `tools/solve-09.js`, recorded in `levels/solutions-09.js`.

## Identity
- Map size: 1280 × 340
- Daemons / quota / time / minimum release rate: 30 / save 20 / 5:00 / rate 50
- Skills: Blocker 3, Builder 4, Basher 1, Digger 2, Miner 2
- Goal: New material: ICE. A daemon standing on it covers two pixels per tick, so the crowd arrives at hazards twice as fast. An ice shelf runs above an ice floor; both routes share a lava column and rejoin in the hall.
- Puzzle sentence: **Fork → Gap ×2 → Wall → Hazard → Wall, or Cut down → Press → Pit → Wall → Hazard → Wall**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-over-the-shelf | 23/30 | Bridge the shelf's two gaps, stairs over its wall, bridge the hall's coolant, bash the last wall. | builder 4, basher 1 |
| B-cut-down | 22/30 | Dig through the shelf onto the floor below, bridge the lava, stairs over the low wall, then the hall. | builder 3, basher 1, digger 1 |
| C-mine-down | 21/30 | As B, but a miner makes the cut (a ramp instead of a shaft). | builder 3, basher 1, miner 1 |

Run `node tools/solve.js 09` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- Speed shortens every reaction window, so assignments have to be placed a little earlier than on rock.
- Ice is breakable like dirt; the shelf is only 10 px thick so any digger or miner cuts through it.
