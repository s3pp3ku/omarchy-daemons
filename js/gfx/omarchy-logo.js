/* Omarchy brand assets, copied from /usr/share/omarchy (logo.txt, icon.txt).
   LOGO is the fastfetch wordmark; ICON is the square mark as a pixel bitmap. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});
OL.Brand = {
  LOGO: [
  "                 ▄▄▄",
  " ▄█████▄    ▄███████████▄    ▄███████   ▄███████   ▄███████   ▄█   █▄    ▄█   █▄",
  "███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███",
  "███   ███  ███   ███   ███  ███   ███  ███   ███  ███   █▀   ███   ███  ███   ███",
  "███   ███  ███   ███   ███ ▄███▄▄▄███ ▄███▄▄▄██▀  ███       ▄███▄▄▄███▄ ███▄▄▄███",
  "███   ███  ███   ███   ███ ▀███▀▀▀███ ▀███▀▀▀▀    ███      ▀▀███▀▀▀███  ▀▀▀▀▀▀███",
  "███   ███  ███   ███   ███  ███   ███ ██████████  ███   █▄   ███   ███  ▄██   ███",
  "███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███",
  " ▀█████▀    ▀█   ███   █▀   ███   █▀   ███   ███  ███████▀   ███   █▀    ▀█████▀",
  "                                       ███   █▀"
],
  /* the icon as an inline SVG string (crisp, no font dependency) */
  svg(cls, height) {
    const rows = this.ICON;
    let d = "";
    rows.forEach((r, y) => { for (const m of r.matchAll(/#+/g)) d += `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`; });
    return `<svg class="${cls}" viewBox="0 0 ${rows[0].length} ${rows.length}" height="${height}" fill="currentColor" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
  },
  ICON: [
  "###############",
  "#......#......#",
  "#.######...##.#",
  "#.#.........#.#",
  "#.#.........#.#",
  "#.#.........#.#",
  "#.#.........#.#",
  "###.........#.#",
  "#.#.........#.#",
  "#.#.........#.#",
  "#.#.........#.#",
  "#.#.........#.#",
  "#.###########.#",
  "#......#......#",
  "########.######"
],
};

/* top-bar mark: the icon as inline SVG */
document.addEventListener("DOMContentLoaded", () => {
  const el = document.querySelector(".wb-mark");
  if (!el) return;
  const rows = OL.Brand.ICON;
  let d = "";
  rows.forEach((r, y) => { for (const m of r.matchAll(/#+/g)) d += `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`; });
  el.innerHTML = `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" height="15" fill="currentColor" style="display:block"><path d="${d}"/></svg>`;
});
