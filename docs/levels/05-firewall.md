# LEVEL DESIGN RECORD — LVL 05 FIREWALL

Level file: `levels/05-firewall.js`. Solutions: `tools/solve-05.js`, recorded in `levels/solutions-05.js`.

## Identity
- Map size: 1280 × 352
- Daemons / quota / time / minimum release rate: 30 / save 18 / 6:00 / rate 50
- Skills: Blocker 3, Builder 5, Basher 3, Bomber 2
- Goal: Two firewalls. The perimeter is thick (bash its port or build a long flight over it onto a catwalk); the inner wall is thin and tall (bash a port, or bomb the maintenance plug).
- Puzzle sentence: **Hazard → Wall (port | perimeter) → Hazard → Wall (port | plug) → Hazard → Wall → Drop**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-ports | 23/30 | Bash port 22, bridge the DMZ pit, bash the maintenance plug, bridge the moat, bash the last wall. | builder 3, basher 3 |
| B-bomb-the-plug | 19/30 | As A, but a daemon plants himself at the plug and becomes the charge (the crowd turned back by him pays for it). | blocker 1, builder 3, basher 2, bomber 1 |
| C-perimeter-catwalk | 22/30 | Three flights of stairs over the perimeter wall onto the catwalk, bash the high port off it, then the moat and last wall. | builder 5, basher 2 |

Run `node tools/solve.js 05` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js <id> 20000`) found no win with two to four random assignments.
- Every route needs at least three decisions.

## What we learned
- A bridge is one-way: a crowd turned back by a blocker walks west off the bridge's end. Blockers only help when the space behind them is safe.
- A basher must be assigned within about 6 px of what it will bash, or it gives up.
- A bomb clears about 13 px: the maintenance plug is 6 px thick so one bomber is enough.
