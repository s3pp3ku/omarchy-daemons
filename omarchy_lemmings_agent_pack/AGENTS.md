# OMARCHY LEMMINGS — AGENT DESIGN & IMPLEMENTATION BRIEF

## Mission
Build a polished Lemmings-style puzzle game with an Omarchy-inspired visual/UI identity and genuinely interesting puzzle levels.

The main failure mode to avoid is trivial level design: one wall -> one digger -> exit; one pit -> one builder -> exit; unlimited tools; a single obvious route; or several unrelated obstacles in a row.

Reference artwork:
- `art/reference/omarchy_lemmings_core_concept.png`
- `art/reference/omarchy_lemmings_large_levels_concept.png`

Use these as art direction, not exact map geometry or production-ready sprite sheets.

## Core design pillars
1. **Readable first, clever second.** Entrance, exit, terrain materials, hazards, lemming direction and skills must be visually obvious.
2. **Several decisions, not one trick.** After tutorials, target 3–7 meaningful interacting decisions per level, 2+ skill types, and at least one crowd-management/timing problem.
3. **Multiple solutions.** Most mature levels should support at least two genuinely different approaches. A safer route may cost builders; a lower tunnel may cost miners; an expert route may save everyone.
4. **Tools are the puzzle economy.** Skill counts must matter. A builder used early should change later options.
5. **Cause and effect across the map.** Early terrain changes should affect later crowd flow.

## Core skills
Walker, Builder, Digger, Basher, Miner, Blocker, Bomber. Add Climber/Floater/Swimmer/Glider only after the core game produces good puzzles.

## Terrain
- Dirt: destructible.
- Rock: destructible/heavier visual language.
- Metal/system blocks: indestructible and used to constrain brute-force solutions.
- Tech/platform: Omarchy architecture.
- Ice: deterministic slippery behavior if used.
- Lava: lethal.
- Coolant/water: lethal initially unless swimming is deliberately introduced.
- One-way terrain: clearly marked and deterministic.

Puzzle physics must be deterministic.

## Puzzle grammar
Build maps from interacting puzzle ideas:
- Containment: crowd heads toward danger; contain/redirect it.
- Gap: bridge, bypass, fall manipulation, or terrain modification.
- Wall: go over, through, under, around, or selectively destroy it.
- Vertical separation: entrances/exits at different elevations.
- Hazard corridor: prepare safe traversal.
- Fork: routes have different costs/risks.
- Locked route: modification elsewhere opens a route.
- Release: contained crowd must later be freed.
- Timing gate: moving platform/trap cycle/crowd flow matters.
- Sacrifice: risky shortcut costs lemmings but may meet quota.
- Multi-entrance synchronization: manage populations simultaneously.

A good puzzle sentence might be:
`Containment -> Fork -> Vertical separation -> Timing gate -> Release`.

## Mandatory level-design record
Before implementing each map, write:
- Level name
- Teaching/challenge goal
- Lemming count / save quota / time
- Entrances / exits
- Skill inventory
- Primary route
- Alternate route
- Optional expert route
- Critical decisions
- Intended insight
- Failure modes
- Minimum expected skill usage
- Solvability evidence

## Multiple-solution example
Entrance upper-left, exit lower-right:
1. Crowd approaches lava shaft.
2. Upper bridge route later hits a constrained wall.
3. Lower route can be mined under the shaft.
4. Center chamber has a timed crusher.
5. Exit platform is elevated.

Solution A: block -> bridge lava -> bash side wall -> build to exit -> release.
Solution B: mine before lava -> lower tunnel -> time crusher -> dig into exit chamber -> one builder.
Expert: bomb a support/open shortcut -> one builder -> save 100%.

These are meaningfully different strategies.

# Ten-level campaign

## 01 — BOOT SEQUENCE
20 lemmings; save 15.
Builder x4, Digger x3, Blocker x2.
Shallow pit, raised center, destructible lower tunnel, second gap.
Routes: bridge-heavy; dig lower tunnel; blocker/terrain redirect.
Teach that tools are resources.

## 02 — NETWORK NODES
25; save 18.
Builder x5, Digger x3, Basher x3, Blocker x2.
Upper/lower routes, coolant, wall, drop hazard, final barrier.
Solutions: upper bridge network; lower tunnel; hybrid.

## 03 — DEPENDENCIES
25; save 16. Two entrances.
Builder x5, Basher x4, Blocker x4.
Two groups begin separated. Actions for group A should alter access for group B.
Support early merge, late merge, and redirect strategy.

## 04 — PACKAGE CACHE
30; save 18.
Digger x4, Builder x4, Miner x3, Blocker x2.
Large multi-tier ruin. Upper route, lower mining route, central shortcut.
Optional AUR cache rewards efficiency.

## 05 — FIREWALL
30; save 20.
Builder x5, Basher x4, Blocker x3, Bomber x2.
Large central firewall. Bash through ports, build over perimeter, or bomb maintenance tunnel.
Each breach route must lead to another puzzle; breaching the wall is not the whole level.

## 06 — VERTICAL WORLD
30; save 22.
All core skills except optional advanced skills.
Tall multi-chamber map. Dangerous falls, upward construction, release shafts, one-way constraints.
At least three macro-routes.

## 07 — THE ARCH
30; save 20.
Builder, Digger, Basher, Miner, Blocker.
A large triangular Omarchy/Arch-inspired structure is real puzzle geometry.
Cross through it, tunnel beneath it, or construct around its outer geometry.

## 08 — AUR VALLEY
30; save 18.
Builder, Digger, Blocker, Bomber.
Stable long route; dangerous short tunnel; moving/timed "unsupported package" route.
Optional cache rewards perfect/efficient play.

## 09 — ICE CAVERNS
30; save 20.
Builder, Digger, Miner, Blocker, limited Basher.
Deterministic ice/sliding affects turns and timing.
Upper and lower routes rejoin; clever sliding can conserve skills.

## 10 — THE OMARCH
40; save 25.
All core skills, still limited.
Large scrolling finale with multiple entrances/elevations, lava/coolant, metal, moving platforms, destructible terrain, one-way blocks, triangular architecture, central kernel structure and one final exit.
Phases: contain populations -> choose routes -> open central traversal -> synchronize -> final approach -> release.
Must support upper, lower/mining and mixed efficient strategies. This is a puzzle finale, not combat.

# Omarchy art direction
Keep lemmings friendly and close to the supplied character references. Apply Omarchy primarily to the world and UI:
- near-black backgrounds
- neon green/cyan line work
- dark stone + futuristic metal
- terminal panels and monospace text
- triangular/Arch/Omarchy motifs
- restrained orange/red hazards
- purple/blue special mechanics
- thin luminous outlines, minimal bloom
- crisp/smooth retro-arcade sprites rather than intentionally chunky 8-bit art

Do not turn the lemmings into robots. Cute characters against severe Omarchy environments is desirable.

Use a stylized Omarchy triangular mark sparingly: exit gates, distant architecture, level-select emblem, Level 7 structure, final central structure.

# UI
Prioritize puzzle state:
`OMARCHY // LEMMINGS   LVL 07 THE ARCH`
`OUT 18/30   HOME 12/20   TIME 03:14   RATE 65%`

Bottom toolbar: skills + counts, pause, speed, restart. Selected skill must be unmistakable.

Quality-of-life:
- pause while assigning
- 2x/4x speed
- instant restart
- camera zoom/scroll
- entrance/exit highlight
- optional assignment preview
- deterministic replay/debug support

Level select can resemble workspaces/terminal entries:
`[01] BOOT SEQUENCE COMPLETE`
`[02] NETWORK NODES COMPLETE`
`[03] DEPENDENCIES 19/25`

Keep flavor brief for fast retries.

# Data-driven levels — critical
Do NOT hard-code ten maps into gameplay logic. Level data should contain:
- dimensions
- terrain/tile layers
- material/collision types
- entrances/exits
- hazards/moving objects
- lemming count / save quota / spawn rate / time
- skill inventory
- optional objectives
- camera bounds
- theme/background

Puzzle design requires rapid iteration. Changing a map should be dramatically easier than changing game code.

# Debug / design tooling — critical
Provide:
- instant restart
- pause / simulation speed
- free camera
- spawn test lemming
- collision/material visualization
- lemming state/action display
- skill count display
- hot reload/reload current level
- optional editor/debug route markers

If feasible, support deterministic input/seed recording for solution replays.

# Solvability testing
Never call a level finished because it loads.

For every level:
1. Verify exit is physically reachable under actual physics.
2. Demonstrate at least one valid solution.
3. Record skills used.
4. Verify save quota.
5. Verify time limit.
6. Search for unintended trivial shortcuts.
7. Demonstrate an alternate solution on mature levels.
8. Test at normal speed.

Maintain a solution manifest, e.g.:

level_05:
  solution_a:
    builder: 3
    basher: 2
    blocker: 1
    saved: 24
  solution_b:
    bomber: 1
    builder: 2
    blocker: 2
    saved: 22

Automate solution/replay regression tests if practical; otherwise preserve reproducible manual steps.

# Anti-triviality gate
Before accepting any level, ask:
- Can it be solved by assigning one obvious skill?
- Is there only one meaningful obstacle?
- Is there only one plausible route?
- Are skill counts so generous choices do not matter?
- Are obstacles independent instead of interacting?
- Can I build over everything?
- Can I tunnel directly to the exit?
- Is crowd control unnecessary?
- Is timing irrelevant?
- Does most of the map serve no gameplay purpose?
- Is the map merely longer rather than deeper?

If several are true, redesign the level.

# Difficulty curve
Early: teach relationships, generous timing, obvious hazards, ~2 routes.
Middle: scarce tools, interacting obstacles, vertical terrain, containment, route tradeoffs, multiple entrances.
Late: multiple populations, timing + resource constraints, routes that alter other routes, expert solutions, moving mechanisms, large-map planning.

Avoid pixel-perfect execution as the main difficulty source.

# Audio
Use original dark/minimal synthwave, retro-computer ambience and restrained arcade energy. Do not copy existing tracks/artists.
Use clear SFX for assignment, building, digging, mining, bashing, blocking, danger, save/loss, exit and success/failure. Subtle system/terminal sounds can reinforce Omarchy.

# FIRST TASK FOR THE CODING AGENT
Do not build all ten levels immediately.

1. Read this entire file.
2. Inspect and run the repository.
3. Identify engine/framework, lemming state machine, terrain/collision, skills, UI and level representation.
4. Explain specifically why existing levels are trivial.
5. Make level definitions data-driven if needed.
6. Establish fast restart/debug/reload tooling.
7. Redesign ONE representative level (Level 02 or 03 recommended) with:
   - 3+ interacting obstacles
   - at least 2 valid routes
   - limited tools
   - a crowd-management decision
   - no one-skill shortcut
8. Play/test it under actual game physics.
9. Document TWO valid solutions.
10. Stop and report what was learned before scaling to ten maps.

Do not mistake visual complexity for puzzle complexity.
Do not build ten bad levels quickly.
Prove one genuinely good puzzle first.
