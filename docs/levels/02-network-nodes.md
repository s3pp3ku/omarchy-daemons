# LEVEL DESIGN WORKSHEET — LVL 02 NETWORK NODES

## Identity
Level: 02 — NETWORK NODES (`levels/02-network-nodes.js`)
Teaching/Challenge Goal: Hold the crowd while one scout prepares a route, then release them. Tools are a budget and the route you pick decides how you spend it. Falls can be split into two survivable drops.
Theme: Omarchy network backbone. Soil "boot ledge", broken backbone ridges, a metal/tech firewall node, a flooded service tunnel, and a kernel room with the gate.
Map Size: 1280 × 320 world px (about 4 screens wide at 3× zoom)
Expected Solve Time: 2–4 min first time; recorded solutions finish in about 2:00

## Population
Lemmings: 25
Required Save Count: 20 (80%)
Entrances: 1 (upper left, x64)
Exits: 1 (kernel room, lower right, x1180)
Spawn Rate: release rate 65 minimum (about 1.3 s between drops; the player can only speed it up)
Time Limit: 4:00

## Skills
| Skill | Count | Why this amount? |
|---|---:|---|
| Builder | 5 | The upper route needs 4 bridges. Spend one early on a release and the upper route is gone. |
| Digger | 2 | One for the route, one spare. |
| Basher | 3 | The lower route needs exactly 3 (shaft exit, firewall, kernel wall), so it can't afford a basher to release the blocker. |
| Miner | 0 | Not part of this level's vocabulary yet. |
| Blocker | 2 | One to hold the crowd, one spare for a recovery. |
| Bomber | 0 | Not needed. Releasing a blocker is done by giving it a new job (see the engine note below). |

Engine note: a blocker can be handed a Builder, Basher, Miner or Digger. That releases the crowd at the cost of one more skill. What you release it *with* matters: a basher with nothing to bash just walks (a free release on top). A builder lays stairs from where the blocker stood, and those stairs can carry the crowd over a hole you dug.

## Puzzle Structure
Puzzle sentence: **Containment → Fork → Vertical separation → (Gap ×4 | Hazard corridor + Wall ×2) → Release**

Opening containment problem: The crowd walks straight off a 132 px cliff (fatal at 96). The release rate is fast enough that a builder can't finish before the next lemmings climb its unfinished stairs and fall. One lemming must hold the rest while another scouts ahead.

Obstacle / Decision 1, the fork at the cliff: bridge across to the backbone (upper), or dig into the boot ledge and tunnel out of the cliff face (lower).
Obstacle / Decision 2, vertical separation:
- Lower route: the drop from the ledge to the cavern is 132 px. Dig **40–90 px** deep, then bash east. That splits the fall into two survivable drops: into the shaft, then out of the tunnel mouth. Bash too early and everyone splats leaving the tunnel. Dig too deep and the crowd splats falling into the shaft.
- Upper route: 4 bridge gaps (cliff, sunken coolant pool, climb to the firewall node, lava trench).
Obstacle / Decision 3, the firewall: a rock wall with a metal cap and a metal/tech node on top. It can't be built over from below (the node overhangs) and can't be bashed from above (metal). Lower route: bash it. Upper route: climb onto the node and go over.

Late-level consequence of an early decision:
- How you release the blocker depends on what you have left. The lower route uses all 3 bashers, so the release must be a builder, and that builder's stairs must not cover the shaft. Blocker position matters: placed at x150 or further east, release-stairs bridge the hole and the crowd walks off the cliff (3/25 saved).
- Dropping through ridge R1 to skip the flooded channel only works for the scout. The crowd falls the full ridge height and splats (1/25 saved). The fix is the same split-fall trick as the opening: dig partway, bash out sideways.

Final approach: the kernel room has a soil roof (dig in from above, a 68 px safe drop) and a rock west wall (bash in from the tunnel). Its east wall is metal.

## Primary Solution (A — upper backbone, "build the network")
Steps: #2 Blocker on the ledge (x≤140). #1 Builder at the cliff → Builder at the coolant pool → Builder up onto the firewall node → Builder over the lava trench. Release #2 with a Basher (nothing to bash, so he walks). #1 Digger through the kernel roof.
Skills consumed: Blocker 1, Builder 4, Basher 1, Digger 1
Expected saved: 25/25 (verified)

## Alternate Solution (B — lower service tunnel, "tunnel the network")
Steps: #2 Blocker (x≤140). #1 Digger at the cliff top → Basher east at 40–90 px depth → walk the cavern → Builder over the coolant channel → Basher through the firewall → Release #2 with a Builder (his stairs land back on the ledge before the shaft) → Basher through the kernel's west wall.
Skills consumed: Blocker 1, Builder 2, Basher 3, Digger 1
Expected saved: 25/25 (verified)

## Expert / Optional Solution (C — hybrid drop)
Steps: #2 Blocker. #1 Builder at the cliff → Builder over the pool → Digger into R1 east of the flooded channel → Basher out of R1's east face (split fall) → Basher through the firewall → Release #2 with a Builder → Basher through the kernel wall.
Skills consumed: Blocker 1, Builder 3, Basher 3, Digger 1
Expected saved: 25/25 (verified). It mixes the two routes: upper start, lower finish. It skips the lava trench and the climb, and needs the split-fall insight a second time.

## Anti-triviality
- [x] Cannot solve with one obvious skill. Random search: 60,000 plans of 1–7 random assignments on the final geometry produced **0 wins**.
- [x] At least 3 meaningful interactions (containment, fork with split-fall, firewall, release choice, final entry).
- [x] At least 2 plausible routes (3 verified).
- [x] Tool scarcity matters: the lower route needs every basher; the upper route needs 4 of 5 builders.
- [x] Crowd control/timing matters: with no blocker, the best upper play saves 17/25 and the best lower play 12/25 (need 20).
- [x] No direct tunnel/build shortcut: digging straight to bedrock gives 0/25; dropping straight through R1 gives 1/25; tall staircases hit the ceiling teeth and the ridge undersides.
- [x] Most map regions serve gameplay. The cavern is the lower route, the backbone is the upper route, and the firewall and kernel serve both.
- [x] Indestructible terrain constrains brute force: the metal bedrock stops deep digs, the firewall's metal cap stops shallow bashing, and the kernel's metal east wall closes the room.

## Test Evidence
Build/version: v0.2.0 engine (`js/core/sim.js`, TPS 20)
Primary solution verified: `node tools/verify.js` → A won 25/25 in 122.9 s
Alternate solution verified: B won 25/25 in 119.7 s; C won 25/25 in 119.0 s
Same replays also verified in the browser at 4× (`index.html?level=network-nodes&solution=A-upper-backbone&speed=4`)
Save quota verified: 20 required; the main lazy strategies fail it (see below)
Time limit verified: 4:00 limit; solutions finish around 2:00 at normal speed, leaving room to think
Known unintended shortcuts: none found. Probes (`node tools/shortcuts-02.js`):

| Probe | Result |
|---|---|
| No blocker, lower route | LOST 12/25 |
| No blocker, upper route | LOST 17/25 |
| Dig to bedrock, then bash | LOST 0/25 |
| Drop straight through R1 | LOST 1/25 |
| Release the crowd early (upper) | WON 25/25. Fine: the scout stays ahead; it's a timing read, not a shortcut |

Tolerances (`node tools/tolerance-02.js`), so it's about planning, not pixel precision:

| Decision | Window that still saves 25 |
|---|---|
| Shaft depth before bashing east | 40–90 px (about 7 s of digging) |
| Blocker position on the ledge | anywhere left of x140 |
| Each bridge start | up to about 18 px before the edge (about 1 s of walking) |

Notes: Release rate 65 and quota 20 were tuned so containment is required. At rate 40 or quota 18, the "no blocker, upper" sacrifice play passed.

## What we learned (before scaling to ten levels)
1. **Containment comes from the release rate, not from the map.** A builder needs 4.8 s; if lemmings arrive every 1.3 s, followers always overtake it. That makes one blocker plus one scout the core rhythm. Tune `rate` and `save` together and run the no-blocker probe every time.
2. **Split falls are the best cheap mechanic.** "Dig partway, then bash out" turns a lethal drop into two safe ones, and players can see the idea. It created the lower route, the hybrid route and two good failure modes for free.
3. **Releasing a blocker by re-assigning it** creates real decisions about which spare skill to spend, and where the blocker stood starts to matter. Keep it.
4. **Bridge gaps need about 30 px less than the builder's reach** to give about 1 s of slack. The first draft had about 6 px and felt pixel-precise.
5. **Overhanging metal is the cleanest anti-brute-force tool.** The firewall node stops build-over from below and bash-through from above in one shape.
6. **Every route needs a scripted plan, a lazy-strategy probe and a random search** before a level is accepted. Those took minutes per change once `tools/plan.js` existed.
