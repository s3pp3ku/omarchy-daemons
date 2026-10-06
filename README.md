# Omarchy Lemmings

> **A novice-made, unfinished game/plugin experiment. Help is very welcome.**

Omarchy Lemmings is a small browser game inspired by the classic Lemmings
games, rebuilt as a procedural Omarchy/terminal-themed world. The lemmings
are shell users, the tools are commands, and the levels are little rescue
puzzles.

This began as a first-time game-development experiment. I am not a game
developer, artist, audio designer, or Quickshell plugin author. The engine,
renderer, generated levels, UI, audio, and plugin wrapper were developed by
iterating from a playable prototype and asking for help when something was
unclear. Expect rough edges, unusual ideas, and places where a more
experienced contributor could improve the design.

## What is included

- Eight procedural campaign levels.
- Slow, readable lemming movement with mouse-edge camera scrolling.
- Classic-style tools: climb, float, bomb, build, block, bash, dig, and rm.
- Procedural terrain, planks, Omarchy-logo exits, lemming characters, and
  WebAudio music/effects. No downloaded game assets are required.
- Keyboard navigation, help, save/resume, and a bar widget launcher.

## Screenshots

![Intro screen](screenshots/intro.png)

![Gameplay](screenshots/gameplay.png)

## Install as an Omarchy plugin

Once this repository is public and approved, install it with:

```sh
omarchy plugin add https://github.com/YOUR-USERNAME/omarchy-lemmings.git --enable
```

The plugin adds a small `λ` game button to the Omarchy bar. Click it to open
the local game as a web app. The plugin does not install packages, use sudo,
run a service, or contact a remote server at runtime.

## Local development and validation

From the repository root:

```sh
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" Lemmings.qml
node --check js/engine.js
node --check js/render.js
node --check js/audio.js
```

The game itself can also be opened directly:

```sh
omarchy-launch-webapp "file://$PWD/index.html"
```

## Controls

- Click a skill, then a lemming; or click a lemming, then a skill.
- `1–8`: select a skill.
- `W`: help.
- `Space`: pause/resume.
- `F`: fast-forward after the puzzle is set up.
- `R`: restart.
- `Q`: save and quit.
- `M`: mute.
- Arrow keys + `Enter`: navigate menus.

The number shown on a skill is its available uses for that level. `∞` means
the skill is a permanent trait; `—` means it is not available in that level.

## Backstory

This started with a simple question: could a tiny Omarchy-themed game be
made from plain HTML, CSS, and JavaScript without external assets? The answer
became a terminal-flavoured Lemmings tribute: users fall out of a hatch,
commands become abilities, and every level is a small systems problem.

The project grew through repeated playtesting. The first versions were too
fast, too blocky, too teal, and often unclear about what the controls meant.
The current version deliberately favors slow movement, visible feedback,
limited level-specific tools, procedural art, and a little synthesized music.

## Help wanted

This is explicitly a novice project. Helpful contributions and kind feedback
are welcome, especially for:

- Level design with more than one reasonable solution.
- Better lemming silhouettes and animation.
- More faithful classic-Lemmings interactions.
- Music composition and sound mixing.
- Quickshell/plugin packaging and accessibility review.
- Testing on different Omarchy screen sizes and browsers.

Please explain changes gently and include reproduction steps for bugs.

## License and scope

The original code in this repository is released under MIT. This is an
unofficial tribute and is not affiliated with the owners of the Lemmings
name or original game. The game uses procedural code-drawn visuals and
procedural audio rather than copied original assets.
