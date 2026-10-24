/* Omarchy Daemons — vector daemons.
   Each daemon is drawn from a pose (feet, hands, head, bob, tool) with
   smooth shapes and a soft dark outline, so it stays crisp at any zoom.
   Coordinates are world pixels; the foot point is (0, 0), facing right.
   A daemon is ~16 px tall: legs to -5, torso to -10, head around -13. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const P = OL.PAL;
  const TAU = Math.PI * 2;
  const COL = {
    outline: "rgba(6,10,8,0.92)",
    hair: P.hair, hairDark: P.hairDark, hairLight: P.hairLight,
    skin: P.skin, skinShade: P.skinShade, eye: P.eye,
    shirt: P.shirt, shirtShade: P.shirtShade,
    pants: P.pants, pantsShade: P.pantsShade, shoe: P.shoe,
  };

  /* --------------------------------------------------------------- poses */
  function pose(state, l, tick, C) {
    const p = {
      bob: 0, ff: [1.6, 0], fb: [-1.6, 0], hf: [1.4, -5.6], hb: [-1.2, -5.8],
      head: [0.6, -13.2], front: false, lean: 0, tool: null, scale: 1, alpha: 1, dy: 0,
    };
    switch (state) {
      case "walk": {
        const ph = (tick + l.id * 7) * 0.33;
        const s = Math.sin(ph), c = Math.cos(ph);
        p.ff = [2.1 * s, -Math.max(0, c) * 1.1]; p.fb = [-2.1 * s, -Math.max(0, -c) * 1.1];
        p.hf = [0.6 - 1.7 * s, -5.6]; p.hb = [-0.4 + 1.7 * s, -5.8];
        p.bob = -Math.abs(c) * 0.45; p.lean = 0.25;
        break;
      }
      case "fall": {
        const w = Math.sin(tick * 0.6 + l.id) * 0.9;
        p.hf = [3.4, -16.5 + w]; p.hb = [-3.0, -16.2 - w];
        p.ff = [1.4, -0.4 + w * 0.3]; p.fb = [-1.3, -0.2 - w * 0.3];
        p.head = [0.4, -13.4];
        break;
      }
      case "build": {
        const ph = (l.t % C.BUILD_PERIOD) / C.BUILD_PERIOD;
        const k = Math.sin(ph * Math.PI);
        p.bob = k * 1.6; p.lean = k * 0.9;
        p.ff = [2.2, 0]; p.fb = [-1.8, 0];
        p.hf = [2.6 + ph * 2.4, -6.5 + ph * 4 + p.bob]; p.hb = [1.6 + ph * 1.6, -6.2 + ph * 3.5 + p.bob];
        p.tool = { kind: "plank", at: p.hf };
        break;
      }
      case "shrug": {
        const u = Math.sin(tick * 0.3) * 0.5;
        p.front = true; p.hf = [4.2, -10.5 + u]; p.hb = [-4.2, -10.5 + u]; p.ff = [1.6, 0]; p.fb = [-1.6, 0];
        break;
      }
      case "dig": {
        const ph = (l.t % (C.DIG_PERIOD * 4)) / (C.DIG_PERIOD * 4);
        const k = Math.sin(ph * TAU);
        p.bob = 0.8 + k * 0.7; p.ff = [2.3, 0]; p.fb = [-2.1, 0];
        p.hf = [1.6, -7.5 + k * 1.6 + p.bob]; p.hb = [0.6, -6.6 + k * 1.6 + p.bob];
        p.tool = { kind: "shovel", top: [1.4, -9.5 + k * 1.6 + p.bob], bot: [1.8, 0.8 + k * 0.6] };
        break;
      }
      case "bash": {
        const ph = (l.t % C.BASH_PERIOD) / C.BASH_PERIOD;
        const a = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        p.ff = [2.4, 0]; p.fb = [-2.2, 0]; p.lean = 0.9;
        p.hf = [1.8 + a * 3.4, -7.2]; p.hb = [1.4 + (1 - a) * 2.6, -6.6];
        p.tool = { kind: "punch", at: [5.6, -7.2], k: a };
        break;
      }
      case "mine": {
        const ph = (l.t % C.MINE_PERIOD) / C.MINE_PERIOD;
        const ang = -2.4 + ph * 2.9;                       // overhead -> down-forward
        const hx = 0.8 + Math.cos(ang) * 2.4, hy = -9 + Math.sin(ang) * 2.4;
        p.ff = [2.4, 0]; p.fb = [-2.2, 0]; p.lean = 0.6; p.bob = ph > 0.7 ? 0.8 : 0;
        p.hf = [hx, hy]; p.hb = [hx - 0.6, hy + 0.5];
        p.tool = { kind: "pick", at: [hx, hy], ang };
        break;
      }
      case "block": {
        const u = Math.sin(tick * 0.18 + l.id) * 0.35;
        p.front = true; p.ff = [2.6, 0]; p.fb = [-2.6, 0];
        p.hf = [5.8, -8.6 + u]; p.hb = [-5.8, -8.6 - u];
        break;
      }
      case "exit": {
        const ph = l.t / C.EXIT_TICKS;
        p.front = true; p.dy = -Math.sin(Math.min(1, ph * 1.6) * Math.PI) * 3.5;
        p.hf = [5.2, -16.5]; p.hb = [-5.2, -16.5]; p.ff = [1.2, -0.6]; p.fb = [-1.2, -0.6];
        p.scale = 1 - Math.max(0, ph - 0.5) * 1.2; p.alpha = 1 - Math.max(0, ph - 0.55) * 2.2;
        break;
      }
    }
    return p;
  }

  /* ------------------------------------------------------------- drawing */
  function limb(ctx, a, b, w, col, outline) {
    ctx.strokeStyle = outline ? COL.outline : col;
    ctx.lineWidth = outline ? w + 0.9 : w;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  function blob(ctx, x, y, r, col, outline) {
    ctx.fillStyle = outline ? COL.outline : col;
    ctx.beginPath(); ctx.arc(x, y, outline ? r + 0.45 : r, 0, TAU); ctx.fill();
  }
  function ell(ctx, x, y, rx, ry, col, outline, rot) {
    ctx.fillStyle = outline ? COL.outline : col;
    ctx.beginPath(); ctx.ellipse(x, y, outline ? rx + 0.45 : rx, outline ? ry + 0.45 : ry, rot || 0, 0, TAU); ctx.fill();
  }

  function figure(ctx, p, pass, opts) {
    const o = pass === 0, b = p.bob;
    const hip = [0.1 + p.lean * 0.3, -4.8 + b], sh = [0.4 + p.lean, -9.2 + b];
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // back leg + shoe
    limb(ctx, [hip[0] - 0.7, hip[1]], [p.fb[0], p.fb[1] - 0.9], 2.1, COL.pantsShade, o);
    ell(ctx, p.fb[0] + 0.4, p.fb[1] - 0.5, 1.5, 0.75, COL.shoe, o);
    // back arm
    if (!p.front) { limb(ctx, sh, p.hb, 1.5, COL.shirtShade, o); blob(ctx, p.hb[0], p.hb[1], 0.85, COL.skinShade, o); }
    // front leg + shoe
    limb(ctx, [hip[0] + 0.7, hip[1]], [p.ff[0], p.ff[1] - 0.9], 2.1, COL.pants, o);
    ell(ctx, p.ff[0] + 0.5, p.ff[1] - 0.5, 1.55, 0.78, COL.shoe, o);
    // torso
    ctx.fillStyle = o ? COL.outline : COL.shirt;
    ctx.beginPath();
    const tw = o ? 3.25 : 2.8, tx = (hip[0] + sh[0]) / 2;
    ctx.roundRect(tx - tw, sh[1] - 0.8 - (o ? 0.45 : 0), tw * 2, hip[1] - sh[1] + 1.4 + (o ? 0.9 : 0), 1.6);
    ctx.fill();
    if (!o) {
      ctx.fillStyle = COL.shirtShade; ctx.fillRect(tx - tw, hip[1] - 1.1, tw * 2, 0.9);      // belt shadow
      ctx.fillStyle = COL.pants; ctx.fillRect(tx - tw + 0.2, hip[1] - 0.5, tw * 2 - 0.4, 0.9);
    }
    // tools that sit behind the front arm
    if (p.tool && p.tool.kind === "shovel") drawTool(ctx, p.tool, o);
    // head
    const hx = p.head[0] + p.lean * 0.9, hy = p.head[1] + b;
    if (p.front) {
      ell(ctx, hx - 0.4, hy + 0.4, 3.3, 3.2, COL.skin, o);
      if (!o) {
        hair(ctx, hx - 0.4, hy, true);
        ctx.fillStyle = COL.eye;
        ctx.beginPath(); ctx.ellipse(hx - 1.6, hy + 0.7, 0.45, 0.7, 0, 0, TAU); ctx.ellipse(hx + 0.8, hy + 0.7, 0.45, 0.7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = COL.skinShade; ctx.beginPath(); ctx.ellipse(hx - 0.4, hy + 2.4, 0.9, 0.35, 0, 0, TAU); ctx.fill();
      } else { blob(ctx, hx - 0.4, hy - 1.5, 3.9, null, true); }
    } else {
      ell(ctx, hx + 0.3, hy + 0.5, 3.2, 3.1, COL.skin, o);
      if (!o) {
        hair(ctx, hx, hy, false);
        ctx.fillStyle = COL.eye;
        ctx.beginPath(); ctx.ellipse(hx + 1.7, hy + 0.6, 0.45, 0.75, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(hx + 1.75, hy + 0.15, 0.25, 0.25);
        ctx.fillStyle = COL.skinShade; ctx.beginPath(); ctx.ellipse(hx + 3.2, hy + 1.3, 0.5, 0.4, 0, 0, TAU); ctx.fill();
      } else { blob(ctx, hx - 0.4, hy - 1.6, 3.9, null, true); }
    }
    // front arm + hand
    const shF = p.front ? [sh[0] + 2.3, sh[1] + 0.6] : sh, shB = [sh[0] - 2.3, sh[1] + 0.6];
    if (p.front) { limb(ctx, shB, p.hb, 1.5, COL.shirt, o); blob(ctx, p.hb[0], p.hb[1], 0.85, COL.skin, o); }
    limb(ctx, shF, p.hf, 1.5, COL.shirt, o);
    blob(ctx, p.hf[0], p.hf[1], 0.85, COL.skin, o);
    if (p.tool && p.tool.kind !== "shovel") drawTool(ctx, p.tool, o);
  }

  /* hair: a puffy blob with a fringe, highlight on top */
  function hair(ctx, x, y, front) {
    ctx.fillStyle = COL.hair;
    ctx.beginPath();
    if (front) {
      ctx.ellipse(x, y - 2.0, 3.9, 2.6, 0, 0, TAU);
      ctx.ellipse(x - 3.0, y - 0.6, 1.3, 1.9, 0.3, 0, TAU);
      ctx.ellipse(x + 3.0, y - 0.6, 1.3, 1.9, -0.3, 0, TAU);
    } else {
      ctx.ellipse(x - 0.6, y - 2.0, 3.8, 2.7, -0.15, 0, TAU);
      ctx.ellipse(x - 2.6, y + 0.1, 1.7, 2.3, 0.2, 0, TAU);
      ctx.ellipse(x + 2.0, y - 1.0, 1.5, 1.2, 0.5, 0, TAU);      // fringe
    }
    ctx.fill();
    ctx.fillStyle = COL.hairDark;
    ctx.beginPath(); ctx.ellipse(x - (front ? 0 : 1.6), y - 0.4, 2.2, 0.7, front ? 0 : -0.2, 0, Math.PI); ctx.fill();
    ctx.fillStyle = COL.hairLight;
    ctx.beginPath(); ctx.ellipse(x - (front ? 0.8 : 1.4), y - 3.4, 1.4, 0.6, -0.3, 0, TAU); ctx.fill();
  }

  function drawTool(ctx, t, o) {
    const T = OL.T;
    if (t.kind === "plank") {
      ctx.fillStyle = o ? COL.outline : OL.mix(T.accent, "#000000", 0.6);
      ctx.beginPath(); ctx.roundRect(t.at[0] - 0.5 - (o ? 0.45 : 0), t.at[1] - 0.9 - (o ? 0.45 : 0), 5 + (o ? 0.9 : 0), 1.8 + (o ? 0.9 : 0), 0.4); ctx.fill();
      if (!o) { ctx.fillStyle = T.accentHot; ctx.fillRect(t.at[0] - 0.5, t.at[1] - 0.9, 5, 0.5); ctx.fillStyle = "#f0c35a"; ctx.fillRect(t.at[0] + 1, t.at[1] + 0.1, 0.6, 0.5); ctx.fillRect(t.at[0] + 3, t.at[1] + 0.1, 0.6, 0.5); }
    } else if (t.kind === "shovel") {
      limb(ctx, t.top, t.bot, 0.7, "#8a5a32", o);
      ctx.fillStyle = o ? COL.outline : "#c4ccd6";
      ctx.beginPath(); ctx.ellipse(t.bot[0], t.bot[1] - 0.4, o ? 1.6 : 1.2, o ? 1.4 : 1.0, 0, 0, TAU); ctx.fill();
    } else if (t.kind === "pick") {
      const a = t.ang, hx = t.at[0] + Math.cos(a) * 3.2, hy = t.at[1] + Math.sin(a) * 3.2;
      limb(ctx, [t.at[0] - Math.cos(a) * 0.8, t.at[1] - Math.sin(a) * 0.8], [hx, hy], 0.7, "#8a5a32", o);
      const px = -Math.sin(a), py = Math.cos(a);
      ctx.strokeStyle = o ? COL.outline : "#c4ccd6"; ctx.lineWidth = o ? 1.6 : 0.9;
      ctx.beginPath(); ctx.moveTo(hx - px * 2, hy - py * 2); ctx.quadraticCurveTo(hx + Math.cos(a) * 0.8, hy + Math.sin(a) * 0.8, hx + px * 2, hy + py * 2); ctx.stroke();
    } else if (t.kind === "punch" && !o && t.k > 0.7) {
      ctx.strokeStyle = "rgba(255,226,122,0.85)"; ctx.lineWidth = 0.4;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(t.at[0] + 0.8, t.at[1] + i * 1.1); ctx.lineTo(t.at[0] + 2.2, t.at[1] + i * 1.5); ctx.stroke(); }
    }
  }

  /* death poses */
  function drawDeath(ctx, l, C) {
    const ph = Math.min(1, l.t / C.DIE_TICKS);
    if (l.cause === "splat") {
      const w = 3 + ph * 3.5, h = Math.max(0.7, 3.6 - ph * 3);
      ctx.fillStyle = COL.outline; ctx.beginPath(); ctx.ellipse(0, -h / 2, w + 0.5, h / 2 + 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.shirt; ctx.beginPath(); ctx.ellipse(0, -h / 2, w, h / 2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.hair; ctx.beginPath(); ctx.ellipse(-0.6, -h * 0.7, w * 0.7, h * 0.45, 0, 0, TAU); ctx.fill();
      return;
    }
    if (l.cause === "drown") {
      ctx.save(); ctx.globalAlpha = 1 - ph; ctx.translate(0, ph * 9);
      figure(ctx, { bob: 0, ff: [1, 0], fb: [-1, 0], hf: [5, -17 + Math.sin(l.t) * 0.8], hb: [-3.4, -6], head: [0.4, -13], front: true, lean: 0, tool: null }, 0);
      figure(ctx, { bob: 0, ff: [1, 0], fb: [-1, 0], hf: [5, -17 + Math.sin(l.t) * 0.8], hb: [-3.4, -6], head: [0.4, -13], front: true, lean: 0, tool: null }, 1);
      ctx.restore();
      return;
    }
    if (l.cause === "burn" || l.cause === "oom") {
      ctx.save(); ctx.globalAlpha = 1 - ph * 0.9;
      const sq = l.cause === "oom" ? Math.max(0.15, 1 - ph * 3) : 1 - ph * 0.5;
      ctx.scale(1 + (1 - sq) * 0.6, sq);
      ctx.fillStyle = "#1b1416";
      ctx.beginPath(); ctx.ellipse(0, -7, 3.2, 7, 0, 0, TAU); ctx.ellipse(0.4, -13, 3.6, 3.2, 0, 0, TAU); ctx.fill();
      if (l.cause === "burn") { ctx.fillStyle = "#ff6a2b"; ctx.fillRect(-1, -9 + Math.sin(l.t) * 2, 0.6, 0.6); ctx.fillRect(1.2, -12 + Math.cos(l.t) * 2, 0.5, 0.5); }
      ctx.restore();
    }
  }

  /* public: draw daemon l at its foot point in world space */
  function draw(ctx, l, tick) {
    const C = OL.C;
    ctx.save();
    ctx.translate(l.x + 0.5, l.y + 1);
    if (l.dir < 0) ctx.scale(-1, 1);
    if (l.state === "die") { drawDeath(ctx, l, C); ctx.restore(); return; }
    const p = pose(l.state === "bash" && l.seek ? "walk" : l.state, l, tick, C);
    ctx.translate(0, p.dy);
    if (p.scale !== 1) ctx.scale(p.scale, p.scale);
    ctx.globalAlpha = Math.max(0, p.alpha);
    figure(ctx, p, 0);
    figure(ctx, p, 1);
    ctx.restore();
  }

  /* toolbar icon for a skill, drawn into a small canvas */
  function icon(canvas, skill) {
    const ctx = canvas.getContext("2d");
    const s = canvas.height / 22;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(s, s);
    const st = { blocker: "block", builder: "build", basher: "bash", miner: "mine", digger: "dig", bomber: "walk" }[skill];
    const fake = { id: 2, x: canvas.width / s / 2 - 0.5, y: 19.5, dir: 1, state: st, t: { build: 4, dig: 3, bash: 3, mine: 6 }[st] || 0 };
    draw(ctx, fake, 3);
    if (skill === "bomber") {
      ctx.font = "bold 7px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.lineWidth = 1.6; ctx.strokeStyle = COL.outline; ctx.strokeText("5", fake.x + 0.5, 4.6);
      ctx.fillStyle = OL.T.warn; ctx.fillText("5", fake.x + 0.5, 4.6);
    }
    ctx.restore();
  }

  OL.DaemonArt = { draw, icon, pose };
})();
