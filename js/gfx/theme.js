/* Omarchy Daemons — theme palettes.
   Each level names a theme (level.theme); the player can override it from
   the THEMES launcher. A theme recolours the UI, neon linework, tech panels,
   circuit-board steps, hatch/gate and backdrop. The daemons, soil and
   hazards keep their colours so gameplay reads the same in every theme.

   Palettes follow the well-known public colour schemes these themes are
   named after. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const hex = (n) => "#" + n.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  OL.mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };

  /* base: bg (darkest panel), accent (primary neon), accent2 (secondary),
     special (one-way / purple mechanics), warn, danger, text, dim */
  const BASE = {
    omarchy:      { label: "Omarchy Neon", bg: "#070b0d", accent: "#2ee59d", accent2: "#22d3ee", special: "#9b6bff", warn: "#ff6a2b", danger: "#ff3b4e", text: "#d6e2dc", dim: "#6f817a" },
    "tokyo-night": { label: "Tokyo Night", bg: "#1a1b26", accent: "#7aa2f7", accent2: "#7dcfff", special: "#bb9af7", warn: "#ff9e64", danger: "#f7768e", text: "#c0caf5", dim: "#565f89" },
    catppuccin:   { label: "Catppuccin", bg: "#1e1e2e", accent: "#cba6f7", accent2: "#94e2d5", special: "#f5c2e7", warn: "#fab387", danger: "#f38ba8", text: "#cdd6f4", dim: "#6c7086" },
    gruvbox:      { label: "Gruvbox", bg: "#282828", accent: "#fabd2f", accent2: "#8ec07c", special: "#d3869b", warn: "#fe8019", danger: "#fb4934", text: "#ebdbb2", dim: "#928374" },
    everforest:   { label: "Everforest", bg: "#2d353b", accent: "#a7c080", accent2: "#83c092", special: "#d699b6", warn: "#e69875", danger: "#e67e80", text: "#d3c6aa", dim: "#859289" },
    nord:         { label: "Nord", bg: "#2e3440", accent: "#88c0d0", accent2: "#8fbcbb", special: "#b48ead", warn: "#d08770", danger: "#bf616a", text: "#eceff4", dim: "#4c566a" },
    kanagawa:     { label: "Kanagawa", bg: "#1f1f28", accent: "#7e9cd8", accent2: "#7fb4ca", special: "#957fb8", warn: "#ffa066", danger: "#e46876", text: "#dcd7ba", dim: "#727169" },
    "rose-pine":  { label: "Rosé Pine", bg: "#191724", accent: "#ebbcba", accent2: "#9ccfd8", special: "#c4a7e7", warn: "#f6c177", danger: "#eb6f92", text: "#e0def4", dim: "#6e6a86" },
    "matte-black": { label: "Matte Black", bg: "#121212", accent: "#e68e0d", accent2: "#bebebe", special: "#a09cd0", warn: "#e68e0d", danger: "#d35f5f", text: "#d0d0d0", dim: "#6a6a6a" },
  };

  /* expand a base palette into everything the renderer and CSS need */
  function expand(id, b) {
    const black = "#000000", white = "#ffffff";
    return Object.assign({ id }, b, {
      accentDim: OL.mix(b.accent, b.bg, 0.45),
      accentHot: OL.mix(b.accent, white, 0.6),
      accentDeep: OL.mix(b.accent, black, 0.72),
      void: OL.mix(b.bg, black, 0.65),
      panel: OL.mix(b.bg, black, 0.35),
      panel2: OL.mix(b.bg, black, 0.15),
      line: OL.mix(b.bg, b.accent, 0.16),
      line2: OL.mix(b.bg, b.accent, 0.3),
      sky: [OL.mix(b.bg, black, 0.8), OL.mix(b.bg, black, 0.6), OL.mix(OL.mix(b.bg, black, 0.5), b.accent, 0.06)],
      land: OL.mix(OL.mix(b.bg, black, 0.55), b.accent, 0.05),
      city: OL.mix(b.bg, black, 0.55),
      cityTop: OL.mix(OL.mix(b.bg, black, 0.4), b.accent, 0.1),
      ceil: OL.mix(b.bg, black, 0.75),
      metal: OL.mix("#2c323a", b.bg, 0.25),
      tech: OL.mix("#0e161a", b.bg, 0.35),
      rockTint: OL.mix("#4e5469", b.bg, 0.22),
    });
  }

  OL.THEMES = {};
  for (const [id, b] of Object.entries(BASE)) OL.THEMES[id] = expand(id, b);
  OL.T = OL.THEMES.omarchy;

  /* make a theme current; recolours CSS. Renderer assets rebuild on attach. */
  OL.setTheme = function (id) {
    const t = OL.THEMES[id] || OL.THEMES.omarchy;
    OL.T = t;
    if (typeof document !== "undefined") {
      const s = document.documentElement.style;
      const v = {
        "--void": t.void, "--bg": t.panel, "--panel": t.panel2, "--panel2": OL.mix(t.panel2, t.accent, 0.06),
        "--line": t.line, "--line2": t.line2, "--neon": t.accent, "--neon-dim": t.accentDim, "--neon-hot": t.accentHot,
        "--cyan": t.accent2, "--purple": t.special, "--orange": t.warn, "--red": t.danger, "--text": t.text, "--dim": t.dim,
      };
      for (const k in v) s.setProperty(k, v[k]);
    }
    return t;
  };
})();
