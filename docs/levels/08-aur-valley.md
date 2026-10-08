# LEVEL DESIGN RECORD — LVL 08 AUR VALLEY

Level file: `levels/08-aur-valley.js`. Solutions: `tools/solve-08.js`, recorded in `levels/solutions-08.js`.

## Identity
- Map size: 1280 × 340
- Daemons / quota / time / minimum release rate: 30 / save 18 / 6:00 / rate 50
- Skills: Blocker 3, Builder 4, Digger 3, Bomber 2
- Goal: A lava lake fills the valley. The stable route is a long catwalk around the rim; the short route is a service tunnel under the lake with a sealed plug and an OOM-killer press.
- Puzzle sentence: **Fork → (Gap ×3 | Shaft → Plug → Press) → Drop**

## Verified solutions
| Name | Saved | What it does | Skills used |
|---|---|---|---|
| A-catwalk | 27/30 | Bridge the gap off the ledge and the catwalk's two gaps. | builder 3 |
| B-tunnel | 21/30 | Dig down at the shore, a daemon plants himself at the plug and becomes the charge, then run the press. | blocker 1, digger 1, bomber 1 |

Run `node tools/solve.js 08` to replay them and `node tools/verify.js` to regress them all.

## Anti-triviality
- A random search (`KMIN=2 KMAX=4 node tools/random.js aur-valley 20000`) found no two-skill win. Its only wins (18 of 20,000) used three skills: a bridge, a blocker and a bridge on the same daemon: one fewer builder than the catwalk's three gaps, because a blocker's hold lets one flight of stairs serve two gaps.
- Every route needs at least three decisions.

## What we learned
- The short route is cheaper in skills but dearer in daemons: the press costs about eight.
- A timed ferry was tried and removed: you cannot hold a crowd on a catwalk whose back edge is a bridge.
