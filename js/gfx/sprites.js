/* Omarchy Lemmings — lemming sprites.
   Hand-placed pixel parts (char grids) composed per animation frame, then
   auto-outlined. Everything is generated at startup: no image files.

   Frame space: FW x FH pixels, the lemming's foot pixel sits at (OX, OY).
   All part coordinates below are relative to the foot pixel, facing right. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const P = OL.PAL;
  const FW = 24, FH = 26, OX = 11, OY = 22;

  const COLORS = {
    G: P.hair, g: P.hairDark, L: P.hairLight,
    S: P.skin, s: P.skinShade, E: P.eye,
    P: P.shirt, p: P.shirtShade,
    B: P.pants, b: P.pantsShade, F: P.shoe,
    O: P.brick, o: P.brickShade,
    T: P.steel, t: P.steelShade, W: P.wood,
    K: P.outline, R: "#ff4d5e", r: "#b3263a", Y: "#ffe27a", w: "#ffffff",
    N: P.neon, n: P.neonDim, A: "#ff8a3d",
  };

  /* ------------------------------------------------------------- parts */
  const HEAD = {
    ax: -4, ay: -16, g: [
      "..GGG....",
      ".GLLGG...",
      "GGLGGGGG.",
      "GGGGGGGGG",
      "GGgSSSSG.",
      "GgSSSESS.",
      ".gSSSSSs.",
      "..sSSSs..",
    ],
  };
  /* head looking straight at the player (blocker, cheering) */
  const HEAD_FRONT = {
    ax: -4, ay: -16, g: [
      "..GGGGG..",
      ".GLLGGGG.",
      "GGLGGGGGG",
      "GGGGGGGGG",
      "GgSSSSSgG",
      "gSESSSESg",
      ".SSSSSSS.",
      "..sSSSs..",
    ],
  };
  const TORSO = { ax: -2, ay: -8, g: ["pPPPP", "pPPPP", "pPPPP", "pPPPP", "bBBBB"] };

  const LEGS = {
    stand:  { ax: -3, ay: -3, g: ["..bBB..", "..bBB..", "..bBB..", ".FFFF.."] },
    strideA:{ ax: -4, ay: -3, g: ["...bbBB...", "..bb..BB..", ".bb....BB.", "FFF....FFF"] },
    passA:  { ax: -3, ay: -3, g: ["..bBB..", "..bBB..", "...BB..", "..bFFF."] },
    strideB:{ ax: -4, ay: -3, g: ["...BBbb...", "..BB..bb..", ".BB....bb.", "FFF....FFF"] },
    passB:  { ax: -3, ay: -3, g: ["..BBb..", "..BBb..", "..bb...", "..FFF.."] },
    wide:   { ax: -4, ay: -3, g: ["..bBBBB...", ".bb...BB..", ".bb...BB..", "FFF...FFF."] },
    dangle: { ax: -3, ay: -3, g: ["..bBB..", ".bb.BB.", ".bb.BB.", ".F...F."] },
    kneel:  { ax: -4, ay: -2, g: ["..bBBBBB..", ".bbb..BB..", "FFF...FFF."] },
  };

  /* small overlays: hands, arms, tools. {ax, ay, g} relative to foot */
  const ARM = {
    swingF: { ax: 1, ay: -7, g: ["pP", ".PS"] },
    swingB: { ax: -3, ay: -7, g: [".p", "Sp"] },
    down:   { ax: 1, ay: -7, g: ["P", "P", "S"] },
    up:     { ax: -4, ay: -13, g: ["S.......S", "P.......P", ".P.....P."] },
    upHigh: { ax: -5, ay: -18, g: ["S.........S", "P.........P", ".P.......P.", "..P.....P.."] },
    out:    { ax: -6, ay: -7, g: ["SPP.....PPS"] },
    shrug:  { ax: -5, ay: -9, g: ["S.........S", ".PP.....PP."] },
  };

  /* --------------------------------------------------------- composition */
  function blank() { return new Array(FW * FH).fill(0); }

  function put(buf, part, dx, dy) {
    dx = dx || 0; dy = dy || 0;
    for (let r = 0; r < part.g.length; r++) {
      const row = part.g[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        const x = OX + part.ax + c + dx, y = OY + part.ay + r + dy;
        if (x < 0 || y < 0 || x >= FW || y >= FH) continue;
        buf[y * FW + x] = ch;
      }
    }
  }
  function px(buf, x, y, ch) {
    const X = OX + x, Y = OY + y;
    if (X < 0 || Y < 0 || X >= FW || Y >= FH) return;
    buf[Y * FW + X] = ch;
  }
  function outline(buf) {
    const out = buf.slice();
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (buf[y * FW + x]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < FW && yy < FH && buf[yy * FW + xx] && buf[yy * FW + xx] !== "Y";
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * FW + x] = "K";
    }
    return out;
  }

  /* Build one frame from a recipe: {legs, head, arm[], body dy, extra fn} */
  function compose(r) {
    let b = blank();
    const by = r.bob || 0;
    if (r.back) for (const a of r.back) put(b, a.p, a.dx, (a.dy || 0) + by);
    put(b, LEGS[r.legs || "stand"], r.legDx || 0, (r.legDy || 0) + (r.hop ? by : 0));
    put(b, TORSO, r.bodyDx || 0, by);
    put(b, r.front ? HEAD_FRONT : HEAD, (r.headDx || 0) + (r.bodyDx || 0), by + (r.headDy || 0));
    if (r.arms) for (const a of r.arms) put(b, a.p || a, a.dx || 0, (a.dy || 0) + by);
    if (r.draw) r.draw(b, by);
    b = outline(b);
    if (r.fx) r.fx(b);
    return b;
  }

  const g = (ax, ay, rows) => ({ ax, ay, g: rows });

  /* ---------------------------------------------------------- animations */
  const ANIM = {};

  ANIM.walk = [
    { legs: "strideA", bob: 1, arms: [ARM.swingF] },
    { legs: "passA", arms: [ARM.down] },
    { legs: "strideB", bob: 1, arms: [ARM.swingB] },
    { legs: "passB", arms: [ARM.down] },
  ];

  ANIM.fall = [
    { legs: "dangle", arms: [ARM.upHigh], headDy: 0 },
    { legs: "dangle", arms: [{ p: ARM.upHigh, dy: 1 }], headDy: 0 },
  ];

  ANIM.block = [
    { legs: "wide", front: true, arms: [ARM.out] },
    { legs: "wide", front: true, arms: [{ p: ARM.out, dy: -1 }] },
  ];

  ANIM.shrug = [
    { legs: "stand", front: true, arms: [ARM.shrug] },
    { legs: "stand", front: true, arms: [{ p: ARM.shrug, dy: -1 }] },
  ];

  /* builder: carry a plank, crouch, lay it in front */
  const PLANK = g(1, -6, ["OOOOO", "ooooo"]);
  ANIM.build = [
    { legs: "stand", arms: [g(1, -7, ["PS"]), PLANK] },
    { legs: "stand", bob: 1, arms: [g(1, -6, ["PS"]), g(2, -4, ["OOOOO", "ooooo"])] },
    { legs: "kneel", bob: 2, arms: [g(1, -5, ["PPS"]), g(3, -2, ["OOOOO", "ooooo"])] },
    { legs: "kneel", bob: 2, arms: [g(1, -5, ["PPS"])] },
    { legs: "stand", bob: 1, arms: [g(1, -6, ["PS"])] },
    { legs: "stand", arms: [g(-3, -7, ["Sp"]), g(-6, -9, ["OOOO", "oooo"])] },
  ];

  /* digger: shovel straight down, both hands */
  ANIM.dig = [
    { legs: "wide", bob: 0, arms: [g(-1, -7, ["SPPS"]), g(0, -9, ["W", "W", ".", ".", "W", "W", "W"]), g(-1, -2, ["TTT", "TTT", ".t."])] },
    { legs: "wide", bob: 1, arms: [g(-1, -6, ["SPPS"]), g(0, -8, ["W", "W", ".", ".", "W", "W"]), g(-1, -2, ["TTT", "TTT", ".t."])], legDy: 0 },
    { legs: "kneel", bob: 2, arms: [g(-1, -5, ["SPPS"]), g(0, -6, ["W", ".", ".", "W", "W"]), g(-1, -1, ["TTT", ".t."])] },
    { legs: "wide", bob: 1, arms: [g(-1, -6, ["SPPS"]), g(0, -8, ["W", "W", ".", ".", "W", "W"]), g(-1, -2, ["TTT", "TTT", ".t."])] },
  ];

  /* basher: alternating punches */
  ANIM.bash = [
    { legs: "strideA", arms: [g(1, -7, ["PPPS"])] },
    { legs: "strideA", arms: [g(1, -7, ["PPPPSS"]), g(7, -8, ["Y.", ".Y", "Y."])] },
    { legs: "strideA", arms: [g(1, -6, ["PPS"]), g(-3, -7, [".p", "Sp"])] },
    { legs: "strideA", arms: [g(1, -6, ["PPPPSS"]), g(7, -7, [".Y", "Y.", ".Y"])] },
  ];

  /* miner: pickaxe overhead -> strike ahead/down */
  const PICK_UP = g(-3, -19, ["tTTTT.", "T..W..", "...W..", "...W.."]);
  const PICK_MID = g(1, -15, [".tTT", "..WT", ".W.T", "W..."]);
  const PICK_DOWN = g(2, -7, ["WW....", "..WWW.", ".....T", "....TT", "....t."]);
  ANIM.mine = [
    { legs: "strideA", arms: [g(-1, -14, ["SS"]), g(-1, -12, ["P"]), PICK_UP] },
    { legs: "strideA", arms: [g(0, -12, ["SS"]), PICK_MID] },
    { legs: "strideA", bob: 1, arms: [g(1, -7, ["PPS"]), PICK_DOWN] },
    { legs: "strideA", bob: 1, arms: [g(1, -7, ["PPS"]), PICK_DOWN], fx: (b) => { px(b, 8, -2, "Y"); px(b, 9, -4, "Y"); } },
  ];

  /* exit: hop and cheer */
  ANIM.exit = [
    { legs: "stand", front: true, arms: [ARM.up] },
    { legs: "stand", front: true, arms: [ARM.upHigh], bob: -2, hop: true },
    { legs: "dangle", front: true, arms: [ARM.upHigh], bob: -4, hop: true },
    { legs: "stand", front: true, arms: [ARM.upHigh], bob: -2, hop: true },
  ];

  /* splat: squash into a puddle */
  ANIM.splat = [
    { custom: [g(-4, -9, ["..GGGGG..", ".GLGGGGG.", "GGSSESSGG", ".SSSSSSS.", ".pPPPPPp.", "..BBBBB..", ".FF...FF."])] },
    { custom: [g(-5, -5, ["...GGGGG...", ".GGLGGGGGG.", "GSSEGGSESSG", "pPPPPPPPPPp", ".FBBB.BBBF."])] },
    { custom: [g(-6, -2, ["..GGGGGGGG..", "GGPPPGGPPPGG", ".FBB.ppp.BBF"])] },
    { custom: [g(-6, -1, ["GgGGPPPGGgGG", ".BB.ppp..BB."])] },
  ];

  /* drown / burn: sink with a waving hand */
  ANIM.drown = [
    { legs: "dangle", arms: [ARM.upHigh], bob: 2 },
    { custom: [g(-4, -12, ["S.......S", "P.......P", ".GGGGGGG.", "GGLGGGGGG", "GGgSSSSG.", "GgSSSESS."])] },
    { custom: [g(-4, -8, ["S.......S", "P.......P", ".GGGGGGG.", "GGLGGGGGG"])] },
    { custom: [g(-1, -4, ["S", "P", "P"])] },
  ];

  ANIM.burn = [
    { legs: "wide", front: true, arms: [ARM.upHigh], fx: (b) => { px(b, -3, -18, "Y"); px(b, 3, -19, "A"); px(b, 0, -20, "Y"); } },
    { legs: "wide", front: true, arms: [{ p: ARM.upHigh, dy: 1 }], bob: 2, fx: (b) => { px(b, -2, -19, "A"); px(b, 2, -17, "Y"); } },
    { custom: [g(-4, -6, ["..KAKK...", ".KKAKKK..", "KKKKKKKK.", ".KAK.KK.."])], fx: (b) => { px(b, -1, -9, "Y"); } },
    { custom: [g(-3, -2, ["KKAKKK", ".K.KK."])] },
  ];

  /* ---------------------------------------------------------- rasterise */
  function render(rec) {
    if (rec.custom) {
      let b = blank();
      for (const p of rec.custom) put(b, p);
      b = outline(b);
      if (rec.fx) rec.fx(b);
      return b;
    }
    return compose(rec);
  }

  /* Build the atlas. Returns { canvas, get(anim, frame, dir) -> {sx,sy} } */
  function buildAtlas(doc) {
    const names = Object.keys(ANIM);
    let maxF = 0;
    for (const n of names) maxF = Math.max(maxF, ANIM[n].length);
    const cv = doc.createElement("canvas");
    cv.width = FW * maxF * 2;
    cv.height = FH * names.length;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(cv.width, cv.height);
    const rgbCache = {};
    const rgb = (ch) => rgbCache[ch] || (rgbCache[ch] = OL.rgb(COLORS[ch]));
    const index = {};
    names.forEach((name, row) => {
      index[name] = { row, n: ANIM[name].length };
      ANIM[name].forEach((rec, f) => {
        const buf = render(rec);
        for (let flip = 0; flip < 2; flip++) {
          const ox = (f * 2 + flip) * FW, oy = row * FH;
          for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
            const ch = buf[y * FW + x];
            if (!ch) continue;
            // mirror around the foot column so left/right share the same foot pixel
            const tx = flip ? 2 * OX - x : x;
            if (tx < 0 || tx >= FW) continue;
            const c = rgb(ch), k = ((oy + y) * cv.width + ox + tx) * 4;
            img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
          }
        }
      });
    });
    ctx.putImageData(img, 0, 0);
    return {
      canvas: cv, FW, FH, OX, OY, index,
      frame(name, f, dir) {
        const a = index[name];
        const i = ((f % a.n) + a.n) % a.n;
        return { sx: (i * 2 + (dir < 0 ? 1 : 0)) * FW, sy: a.row * FH };
      },
    };
  }

  /* toolbar icons: one representative frame per skill */
  OL.SKILL_ICON = {
    blocker: ["block", 0], builder: ["build", 2], basher: ["bash", 1],
    miner: ["mine", 2], digger: ["dig", 0], bomber: ["walk", 0],
  };

  OL.Sprites = { buildAtlas, ANIM, FW, FH, OX, OY };
})();
