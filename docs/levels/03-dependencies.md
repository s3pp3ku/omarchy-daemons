# LEVEL DESIGN WORKSHEET — LVL 03 DEPENDENCIES

## Identity
Level: 03 — DEPENDENCIES (`levels/03-dependencies.js`)
Teaching/Challenge Goal: Two populations whose fates are linked. One group must unlock the other, and doing so endangers the first. Introduces one-way walls and the fact that builder bridges only work in the direction they were built.
Theme: Tokyo Night. `/var/cache` (a sealed room), an upper deck, a service corridor and the install room.
Map Size: 1280 × 320
Expected Solve Time: 3–5 min first time; recorded solutions finish in about 2:40

## Population
Daemons: 30 (two hatches, alternating: 15 group A, 15 group B)
Required Save Count: 24 (80%)
Entrances: A on the upper deck (x70); B inside `/var/cache` (x96)
Exits: 1 (install room, on a 28 px platform)
Spawn Rate: 50 minimum
Time Limit: 5:00

## Skills
| Skill | Count | Why this amount? |
|---|---:|---|
| Builder | 3 | Two flights up to the exit platform, one bridge over B's pit. No spare, so wasting one forces a different plan. |
| Basher | 2 | One to open the door. The second is optional (releasing a blocker cheaply). |
| Blocker | 2 | B must be held. The spare covers recovery. |
| Digger | 1 | A tempting trap (see failure modes). |
| Miner / Bomber | 0 | They would let B break out without A. |

## Puzzle Structure
Puzzle sentence: **Containment (B) → Vertical separation (A drops in) → Locked route (one-way door) → Release → Final approach (platform)**

Opening containment problem: B drops into `/var/cache` and walks straight into a coolant pit beside the door. B has to be held from the first seconds, before A has even arrived.

Obstacle / Decision 1, how to hold B: a B blocker at the pit's lip, or a B builder bridging the pit with a blocker behind it. The two choices lead to different releases later.
Obstacle / Decision 2, the door: purple chevrons, which can only be bashed while moving **left**, so only from outside. B cannot open it. A must come down from the deck (two safe drops via a staging shelf), bounce off the platform wall, and walk back left to the door.
Obstacle / Decision 3, the platform: 28 px high, so two flights of steps.

Late-level consequence of an early decision:
- Bridges are one-way. Daemons walking back along the floor pass under the stairs' high end and fall into the pit. Opening the door therefore lets A walk straight into B's pit, and releasing B before the door is open sends B back into its own pit.
- If the platform steps are finished early, every A daemon climbs them and leaves, and nobody is left to open the door. A has to be sequenced: hold one back, or open the door first.

Final approach: everyone walks right along the corridor and climbs A's steps into the install room.

## Primary Solution ("B-bridges-first")
Steps: the first B daemon bridges the pit at once, and the next B daemon blocks behind it. A builds two flights at the platform (start between x940 and x980). The first A daemon walking left at the door bashes it open. The B blocker is released with a basher (nothing to bash, so he walks).
Skills consumed: Blocker 1, Builder 3, Basher 2
Expected saved: 28/30 (verified). The losses are the B bridge-builder and the A door-opener, both walking back under a bridge.

## Alternate Solution ("hold-at-the-lip")
Steps: the first B daemon blocks right at the pit's lip. A builds the platform steps and opens the door. Then the blocker itself becomes the bridge-builder, which releases B and lets them cross in one move.
Skills consumed: Blocker 1, Builder 3, Basher 1
Expected saved: 27/30 (verified). One basher cheaper, but the release has to wait until the door is open.

## Expert / Optional
Keep A out of `/var/cache` with careful timing, or use the spare blocker inside the door, to approach 30/30.

## Anti-triviality
- [x] Cannot solve with one obvious skill (random search: 20,000 plans of 3–7 actions → 0 wins)
- [x] At least 3 meaningful interactions (hold B, door, pit and bridge direction, platform, sequencing)
- [x] At least 2 plausible routes (two verified B strategies; several orderings work)
- [x] Tool scarcity matters (3 builders = exactly platform + bridge)
- [x] Crowd control/timing matters (release before the door opens → 14/30)
- [x] No direct tunnel/build shortcut (B tunnelling under the door → 0/30; A digging in from the deck → trapped, 0/30)
- [x] Most map regions serve gameplay
- [x] Indestructible terrain constrains brute force (metal bedrock; the one-way door blocks rightward escape)

## Test Evidence
Verified by `node tools/verify.js` and `node tools/solve-03.js`:

| Strategy | Result |
|---|---|
| B-bridges-first | WON 28/30 |
| hold-at-the-lip | WON 27/30 |
| Bridge B but never hold it | lost 14/30 |
| Release B before the door opens | lost 14/30 |
| A digs into `/var/cache` from the deck | lost 0/30 |
| B tunnels under the door | lost 0/30 |
| Only A goes home | lost 15/30 |

Tolerances: B's hold/bridge spot works anywhere from x221 to x237. The platform steps work if started between x940 and x980 (about 2 s of walking).
Known unintended shortcuts: none found.

## What we learned
- A second hatch doubles the attention a level needs. B's opening containment has to happen while A is still on the deck, so the player's first ten seconds are already a juggling act.
- Bridge direction is a strong, readable mechanic. It turns a simple pit into a question about traffic direction.
- One-way walls are the cleanest way to force a dependency between groups without scripting.
