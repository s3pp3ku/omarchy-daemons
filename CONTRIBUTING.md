# Contributing

Thanks for helping! Good places to start:

- **Levels.** Read [`docs/LEVEL_FORMAT.md`](docs/LEVEL_FORMAT.md) and
  [`docs/LEVEL_DESIGN_TEMPLATE.md`](docs/LEVEL_DESIGN_TEMPLATE.md). A level is not
  finished until it has a scripted, recorded solution (`node tools/solve.js NN
  --write`), passes `node tools/verify.js`, and survives
  `node tools/random.js <id> 6000` with no win from two to four random actions.
- **Bugs.** Please include the level id, what you did, and, if you can, the replay
  (the debug panel, opened with `` ` ``, can copy one).
- **Platform.** Quickshell packaging, accessibility, screen sizes, sound and music.

Keep changes small and explain them gently. By contributing you agree your work is
released under the MIT license.
