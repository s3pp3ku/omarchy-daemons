# LEVEL DESIGN RECORD — LVL 10 THE OMARCH

Level file: `levels/10-the-omarch.js`. Solutions: `tools/solve-10.js`, recorded in `levels/solutions-10.js`.

## Identity
- Map size: 1800 × 380
- Daemons / quota / time / minimum release rate: 40 / save 25 / 10:00 / rate 50
- Skills: Blocker 4, Builder 6, Basher 4, Digger 2, Miner 1, Bomber 1
- Goal: The finale. Two hatches: group A drops onto the upper deck, group B starts sealed in /var/cache behind a one-way door only A can open (from outside). Both must then cross the Omarch kernel (a stepped A-frame with a lava hall, ports at both feet and a basement tunnel with a plug, a pit and an OOM-killer press) and finish across the east plains into the vault.
- Puzzle sentence: **Containment → Locked route (one-way door) → Release → Fork (hall | basement) → Hazard → Wall → Drop**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-through-the-hall | 26/40 | Hold B at its pit, A bashes the door, the blocker becomes B's bridge, bash the west port, bridge the lava hall, bash the east port, bridge the moat, bash the last wall. | blocker 1, builder 3, basher 4 |
| B-under-the-kernel | 28/40 | As A up to the release, then a shaft, a blocker-bomber at the plug, a bridge over the basement pit, a bash on its low wall. | blocker 2, builder 2, basher 2, digger 1, bomber 1 |
| C-in-through-the-port-down-through-the-hall | 25/40 | Bash the west port, dig down from the hall past the plug, then the pit and the wall. | blocker 1, builder 2, basher 3, digger 1 |

Run `node tools/solve.js 10` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- Group A's first daemons walk back west to bash the door; the ones already walking west when it opens walk straight into B's pit, which is why the finale costs about 14 daemons even with a good plan.
- A is the only route that leaves a little slack in the quota: route C is exactly at it.
