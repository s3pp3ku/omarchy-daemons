/* omarchy lemmings — embedded Omarchy OS theme palettes (from colors.toml)
   Each level sets a theme, exactly like `omarchy theme set <name>`. */

"use strict";

const THEMES = {
  jungle: {
    lemming: "#6cc24a",
    label: "Jungle",
    rock: "#7a5330", grass: "#4f9b3a",
    accent: "#ff6362", selection: "#47241c", muted: "#4d6d4e",
    background: "#000b01", dark_background: "#000801", darker_background: "#000601",
    lighter_background: "#071808",
    foreground: "#e3eae3", dark_foreground: "#949c94", light_foreground: "#c5cdc5",
    red: "#fb4c04", yellow: "#ffe887", orange: "#fea63b", green: "#5fe654",
    cyan: "#00ef99", blue: "#079e77", magenta: "#ff6362", brown: "#7f531e",
    border: ["#00ef99", "#ff6362"],
  },
  "tokyo-night": {
    lemming: "#86c06f",
    label: "Tokyo Night",
    rock: "#6f4a3e", grass: "#7fae5a",
    accent: "#7aa2f7", selection: "#292e42", muted: "#414868",
    background: "#1a1b26", dark_background: "#13141c", darker_background: "#0e0e14",
    lighter_background: "#24283b",
    foreground: "#a9b1d6", dark_foreground: "#565f89", light_foreground: "#b4bee6",
    red: "#f7768e", yellow: "#e0af68", orange: "#eb927b", green: "#9ece6a",
    cyan: "#449dab", blue: "#7aa2f7", magenta: "#ad8ee6", brown: "#75493d",
    border: ["#449dab", "#7aa2f7"],
  },
  gruvbox: {
    lemming: "#b8bb26",
    label: "Gruvbox",
    rock: "#77553a", grass: "#a9b665",
    accent: "#7daea3", selection: "#504945", muted: "#665c54",
    background: "#282828", dark_background: "#1e1e1e", darker_background: "#161616",
    lighter_background: "#3c3836",
    foreground: "#d4be98", dark_foreground: "#7c6f64", light_foreground: "#bdae93",
    red: "#ea6962", yellow: "#d8a657", orange: "#e1875c", green: "#a9b665",
    cyan: "#89b482", blue: "#7daea3", magenta: "#d3869b", brown: "#70432e",
    border: ["#89b482", "#d8a657"],
  },
  synthwave: {
    lemming: "#67e08a",
    label: "Synthwave",
    rock: "#6b4450", grass: "#8f7ae0",
    accent: "#d563fe", selection: "#441e5d", muted: "#665a8c",
    background: "#0c031f", dark_background: "#090217", darker_background: "#060210",
    lighter_background: "#190f2e",
    foreground: "#e8e6ef", dark_foreground: "#9b97a6", light_foreground: "#cbc9d4",
    red: "#fe288f", yellow: "#fde3c9", orange: "#fe9f8b", green: "#fc9afe",
    cyan: "#21e4f8", blue: "#766dff", magenta: "#d563fe", brown: "#7f5046",
    border: ["#21e4f8", "#d563fe"],
  },
  poison: {
    lemming: "#8fd44a",
    label: "Poison",
    rock: "#5f6b2c", grass: "#8fbf3a",
    accent: "#e550fe", selection: "#401a47", muted: "#516c4b",
    background: "#000500", dark_background: "#000400", darker_background: "#000300",
    lighter_background: "#041102",
    foreground: "#e4eae2", dark_foreground: "#949a93", light_foreground: "#c6cdc4",
    red: "#69a701", yellow: "#eef300", orange: "#abcd14", green: "#d0b4fe",
    cyan: "#15f441", blue: "#0aa14e", magenta: "#e550fe", brown: "#56670a",
    border: ["#15f441", "#e550fe"],
  },
  volcano: {
    lemming: "#b5a642",
    label: "Volcano",
    rock: "#6e4030", grass: "#8a7a52",
    accent: "#fe5c90", selection: "#501a28", muted: "#825652",
    background: "#0d0000", dark_background: "#0a0000", darker_background: "#070000",
    lighter_background: "#1b0605",
    foreground: "#f0e5e4", dark_foreground: "#a19594", light_foreground: "#d4c7c6",
    red: "#d4052f", yellow: "#fddec3", orange: "#ef8b61", green: "#ff939e",
    cyan: "#fdc1ab", blue: "#e64700", magenta: "#fe5c90", brown: "#784631",
    border: ["#ef8b61", "#fe5c90"],
  },
  hacker: {
    lemming: "#5ef458",
    label: "Hacker",
    rock: "#5a5326", grass: "#6fbf3f",
    accent: "#12bb7c", selection: "#053a24", muted: "#4f6c54",
    background: "#000802", dark_background: "#000602", darker_background: "#000401",
    lighter_background: "#07150a",
    foreground: "#e3eae4", dark_foreground: "#949b95", light_foreground: "#c4cdc5",
    red: "#568104", yellow: "#dbf515", orange: "#94ba11", green: "#11dc4b",
    cyan: "#51f75b", blue: "#12a05c", magenta: "#12bb7c", brown: "#4a5d09",
    border: ["#51f75b", "#12bb7c"],
  },
  galaxy: {
    lemming: "#86d9a0",
    label: "Galaxy",
    rock: "#4a3a63", grass: "#9a8ad6",
    accent: "#ce6afc", selection: "#3a1e53", muted: "#54618c",
    background: "#010111", dark_background: "#010109", darker_background: "#010109",
    lighter_background: "#050920",
    foreground: "#e5e8f0", dark_foreground: "#9597a2", light_foreground: "#c3c8dc",
    red: "#fc4356", yellow: "#fee799", orange: "#fda460", green: "#23dee4",
    cyan: "#8ed5fc", blue: "#3f7efc", magenta: "#ce6afc", brown: "#5a3d7a",
    border: ["#8ed5fc", "#ce6afc"],
  },
};

/* The eight skills — every one a real shell command.
   `verb` is the classic Lemmings action it maps to. */
const SKILLS = [
  { id: "sudo",  key: "1", verb: "CLIMB",  label: "sudo",
    desc: "Escalate privileges to scale any wall. Permanent trait." },
  { id: "nohup", key: "2", verb: "FLOAT",  label: "nohup",
    desc: "Detach from gravity. Parachutes gently down. Permanent trait." },
  { id: "kill",  key: "3", verb: "BOMB",   label: "kill",
    desc: "SIGKILL self in 5s. Blasts a hole through dirt. One-shot." },
  { id: "make",  key: "4", verb: "BUILD",  label: "make",
    desc: "Make a staircase: 8 bricks up, then keep walking. One-shot." },
  { id: "flock", key: "5", verb: "BLOCK",  label: "flock",
    desc: "Acquire a lock. Halts other lemmings both ways. One-shot." },
  { id: "bash",  key: "6", verb: "BASH",   label: "bash",
    desc: "Shell out sideways. Chews a tunnel through dirt. One-shot." },
  { id: "dig",   key: "7", verb: "MINE",   label: "dig",
    desc: "Delve diagonally, 45 degrees down. Stops at bedrock. One-shot." },
  { id: "rm",    key: "8", verb: "DIG",    label: "rm",
    desc: "rm the floor out from under you. Digs straight down. One-shot." },
];

const SKILL_BY_ID = {};
for (const s of SKILLS) SKILL_BY_ID[s.id] = s;

if (typeof module !== "undefined" && module.exports) {
  module.exports = { THEMES, SKILLS, SKILL_BY_ID };
}
if (typeof window !== "undefined") {
  window.THEMES = THEMES;
  window.SKILLS = SKILLS;
  window.SKILL_BY_ID = SKILL_BY_ID;
}
