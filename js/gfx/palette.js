/* Omarchy Daemons — palette.
   World: near-black, neon green/cyan linework, dark stone + metal,
   restrained orange/red hazards, purple for special mechanics. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

OL.PAL = {
  // ui / world accents
  void: "#06080a",
  bg: "#0a0e12",
  panel: "#0d1317",
  line: "#1c2a27",
  neon: "#2ee59d",
  neonDim: "#1a8f63",
  neonHot: "#a6ffd8",
  cyan: "#22d3ee",
  blue: "#3b82f6",
  purple: "#9b6bff",
  orange: "#ff6a2b",
  red: "#ff3b4e",
  text: "#d6e2dc",
  textDim: "#7c8c86",

  // daemon
  outline: "#0b120e",
  hair: "#3fd46c",
  hairDark: "#1f8f45",
  hairLight: "#a5f7b4",
  skin: "#f6dcc6",
  skinShade: "#d9a88a",
  eye: "#17151f",
  shirt: "#9a86f0",
  shirtShade: "#6a55c9",
  pants: "#3c5ee0",
  pantsShade: "#2a3f9e",
  shoe: "#2b2a3a",
  brick: "#e0953f",
  brickShade: "#9a5a22",
  steel: "#c4ccd6",
  steelShade: "#6c7684",
  wood: "#8a5a32",
};

/* "#rrggbb" -> [r,g,b] */
OL.rgb = function (hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
