/* omarchy lemmings — canvas renderer.
   Pure drawing: no game rules live here. Everything is procedural so the
   game stays a folder of text files with no image assets.

   The scene is painted at 2x into an offscreen buffer and scaled down, which
   is what keeps the shapes soft instead of blocky. Terrain is cached and only
   repainted when a tile actually changes. */

"use strict";

const RENDER = (function () {
  const { CELL, GRID_W, GRID_H, LEM_W, LEM_H, ST } = ENGINE;

  const WORLD_W = GRID_W * CELL; /* 1600 */
  const W = 48 * CELL;           /* viewport: 960 */
  const H = GRID_H * CELL;      /* 540 */
  const SS = 2;                 /* supersample factor */

  /* stable per-cell noise so terrain does not shimmer between frames */
  function hash(x, y) {
    let n = (x * 73856093) ^ (y * 19349663);
    n = (n ^ (n >>> 13)) >>> 0;
    return ((n * 1274126177) >>> 8) & 0xffff;
  }

  function shade(hex, amt) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => {
      const v = ((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * k;
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    };
    return `#${ch(16)}${ch(8)}${ch(0)}`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, rr); return; }
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      canvas.width = W;
      canvas.height = H;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = true;

      this.scene = document.createElement("canvas");
      this.scene.width = W * SS;
      this.scene.height = H * SS;
      this.sctx = this.scene.getContext("2d");

      this.terrain = document.createElement("canvas");
      this.terrain.width = WORLD_W * SS;
      this.terrain.height = H * SS;
      this.tctx = this.terrain.getContext("2d");

      this.terrainKey = -1;
      this.cameraX = 0;
      this.theme = THEMES.jungle;
      this.frame = 0;
    }

    setTheme(theme) { this.theme = theme; this.terrainKey = -1; }

    updateCamera(view) {
      const max = Math.max(0, WORLD_W - W);
      if (!view || !view.inside) return;
      const screenX = Number.isFinite(view.screenX) ? view.screenX : W / 2;
      const edge = 110;
      let delta = 0;
      if (screenX < edge) delta = -(edge - screenX) * 0.08;
      else if (screenX > W - edge) delta = (screenX - (W - edge)) * 0.08;
      this.cameraX = Math.max(0, Math.min(max, this.cameraX + delta));
    }

    /* ------------------------------------------------------------ terrain */
    terrainSum(grid) {
      let n = 2166136261;
      for (let i = 0; i < grid.length; i++) n = ((n ^ grid[i]) * 16777619) >>> 0;
      return n;
    }

    /* palette shortcuts with sensible fallbacks */
    rock() { return this.theme.rock || shade(this.theme.brown, 0.05); }
    grass() { return this.theme.grass || this.theme.green; }

    solid(e, x, y) {
      if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return true;
      const v = e.grid[y * GRID_W + x];
      return v === ENGINE.DIRT || v === ENGINE.STEEL || v === ENGINE.BRICK;
    }
    isDirt(e, x, y) {
      if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
      return e.grid[y * GRID_W + x] === ENGINE.DIRT;
    }

    paintTerrain(e) {
      const g = this.tctx, t = this.theme;
      g.setTransform(SS, 0, 0, SS, 0, 0);

      /* sky: a soft vertical wash, warmer near the horizon */
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, shade(t.background, 0.10));
      bg.addColorStop(0.62, shade(t.background, -0.15));
      bg.addColorStop(1, shade(t.background, -0.55));
      g.fillStyle = bg;
      g.fillRect(0, 0, WORLD_W, H);

      /* a distant glow so the void is not flat black */
      const glow = g.createRadialGradient(WORLD_W * 0.5, H * 0.78, 10, WORLD_W * 0.5, H * 0.78, H * 0.9);
      glow.addColorStop(0, shade(t.rock || t.brown, -0.55));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, WORLD_W, H);

      /* dirt mass: overlapping rounded cells merge into one soft body */
      const rock = this.rock();
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (e.grid[y * GRID_W + x] !== ENGINE.DIRT) continue;
          this.dirtBody(g, x, y, rock);
        }
      }

      /* texture + rims */
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (e.grid[y * GRID_W + x] !== ENGINE.DIRT) continue;
          this.dirtDetail(g, e, x, y, rock);
        }
      }

      /* grass caps on every upward-facing surface */
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (e.grid[y * GRID_W + x] !== ENGINE.DIRT) continue;
          if (this.solid(e, x, y - 1)) continue;
          this.grassCap(g, x, y);
        }
      }

      /* bedrock and player-built bricks sit on top of the rock */
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const v = e.grid[y * GRID_W + x];
          if (v === ENGINE.STEEL) this.steel(g, e, x, y);
          else if (v === ENGINE.BRICK) this.brick(g, e, x, y);
        }
      }

      /* hatch */
      this.hatch(g, e.hatch.x, e.hatch.y);

      /* very light terminal grain — the world is still a screen */
      g.fillStyle = "rgba(0,0,0,0.05)";
      for (let y = 0; y < H; y += 3) g.fillRect(0, y, WORLD_W, 1);
    }

    dirtBody(g, x, y, rock) {
      const px = x * CELL, py = y * CELL;
      const h = hash(x, y);
      const tint = ((h & 7) - 3) / 90;                 /* gentle per-cell variation */
      const grd = g.createLinearGradient(px, py - 2, px, py + CELL + 2);
      grd.addColorStop(0, shade(rock, 0.10 + tint));
      grd.addColorStop(1, shade(rock, -0.16 + tint));
      g.fillStyle = grd;
      /* cells overlap by a pixel so interior corners never notch */
      roundRect(g, px - 1, py - 1, CELL + 2, CELL + 2, 7);
      g.fill();
    }

    dirtDetail(g, e, x, y, rock) {
      const px = x * CELL, py = y * CELL;
      const h = hash(x, y);

      /* lit rim just under the surface, shadow underneath overhangs */
      if (!this.solid(e, x, y - 1)) {
        g.fillStyle = shade(rock, 0.26);
        roundRect(g, px + 1, py + 1, CELL - 2, 4, 2);
        g.fill();
      }
      if (!this.solid(e, x, y + 1)) {
        g.fillStyle = "rgba(0,0,0,0.22)";
        roundRect(g, px + 1, py + CELL - 5, CELL - 2, 4, 2);
        g.fill();
      }
      if (!this.solid(e, x - 1, y)) {
        g.fillStyle = "rgba(255,255,255,0.05)";
        g.fillRect(px, py + 3, 2, CELL - 6);
      }
      if (!this.solid(e, x + 1, y)) {
        g.fillStyle = "rgba(0,0,0,0.16)";
        g.fillRect(px + CELL - 2, py + 3, 2, CELL - 6);
      }

      /* pebbles + speckle so big masses are not flat */
      g.fillStyle = shade(rock, -0.3);
      for (let i = 0; i < 3; i++) {
        const k = (h >> (i * 5)) & 15;
        const dx = 3 + (k % 5) * 3.4, dy = 6 + ((k >> 3) % 5) * 3.2;
        const r = 1 + ((k >> 2) & 1);
        g.beginPath();
        g.arc(px + dx, py + dy, r, 0, Math.PI * 2);
        g.fill();
      }
      if ((h & 15) < 3) {
        g.fillStyle = shade(rock, 0.3);
        g.beginPath();
        g.arc(px + 5 + (h % 9), py + 9 + ((h >> 4) % 7), 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }

    grassCap(g, x, y) {
      const px = x * CELL, py = y * CELL;
      const gr = this.grass();
      const h = hash(x, y);
      const amp = 1.6 + ((h & 3) * 0.5);
      const phase = (h % 13) * 0.48;
      const depth = 6 + (h & 3);

      /* wavy lower edge so the lawn never reads as a straight bar */
      g.beginPath();
      g.moveTo(px - 1, py - 1);
      g.lineTo(px + CELL + 1, py - 1);
      for (let i = 0; i <= 6; i++) {
        const fx = px + 1 + (i * (CELL - 2)) / 6;
        const fy = py + depth + Math.sin(phase + i * 1.05) * amp;
        g.lineTo(fx, fy);
      }
      g.lineTo(px + CELL + 1, py - 1);
      g.closePath();
      const grd = g.createLinearGradient(0, py - 1, 0, py + depth + 2);
      grd.addColorStop(0, shade(gr, 0.24));
      grd.addColorStop(1, shade(gr, -0.34));
      g.fillStyle = grd;
      g.fill();

      /* a couple of blades catching the light */
      g.strokeStyle = shade(gr, 0.4);
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const k = (h >> (i * 3)) & 7;
        const bx = px + 3 + k * 2.6;
        const bh = 2.5 + ((k % 3) * 1.4);
        g.moveTo(bx, py + 1);
        g.lineTo(bx + (k % 2 ? 1.4 : -1.4), py + 1 - bh);
      }
      g.stroke();
    }

    steel(g, e, x, y) {
      const t = this.theme;
      const px = x * CELL, py = y * CELL;
      const base = shade(t.dark_foreground, -0.12);
      const grd = g.createLinearGradient(px, py, px, py + CELL);
      grd.addColorStop(0, shade(base, 0.42));
      grd.addColorStop(0.5, base);
      grd.addColorStop(1, shade(base, -0.3));
      g.fillStyle = grd;
      roundRect(g, px + 0.5, py + 0.5, CELL - 1, CELL - 1, 4);
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.45)";
      g.lineWidth = 1;
      roundRect(g, px + 0.5, py + 0.5, CELL - 1, CELL - 1, 4);
      g.stroke();

      /* bevel + rivets */
      g.strokeStyle = shade(t.light_foreground, 0.1);
      g.beginPath();
      g.moveTo(px + 3, py + CELL - 4); g.lineTo(px + 3, py + 3); g.lineTo(px + CELL - 4, py + 3);
      g.stroke();
      g.fillStyle = shade(t.light_foreground, -0.2);
      g.beginPath(); g.arc(px + 5, py + 5, 1.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(px + CELL - 5, py + CELL - 5, 1.3, 0, Math.PI * 2); g.fill();
    }

    brick(g, e, x, y) {
      const t = this.theme;
      const px = x * CELL, py = y * CELL;
      const base = "#b77a3d";
      const plankY = py + 8;
      const plankH = 5;
      const grd = g.createLinearGradient(px, plankY, px, plankY + plankH);
      grd.addColorStop(0, shade(base, 0.28));
      grd.addColorStop(0.5, base);
      grd.addColorStop(1, shade(base, -0.28));
      g.fillStyle = grd;
      roundRect(g, px - 1, plankY, CELL + 2, plankH, 2);
      g.fill();
      g.strokeStyle = "rgba(44,25,12,0.72)";
      g.lineWidth = 0.8;
      roundRect(g, px - 1, plankY, CELL + 2, plankH, 2);
      g.stroke();
      /* wood grain and small supports make each cell read as a plank */
      g.strokeStyle = "rgba(255,220,150,0.35)";
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(px + 2, plankY + 1.4); g.lineTo(px + CELL - 3, plankY + 1.4);
      g.stroke();
      g.fillStyle = "#5b3a22";
      g.beginPath(); g.arc(px + 3, plankY + plankH / 2, 1, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(px + CELL - 3, plankY + plankH / 2, 1, 0, Math.PI * 2); g.fill();
    }

    hatch(g, cx, cy) {
      const t = this.theme;
      const px = cx * CELL, py = cy * CELL;
      g.fillStyle = shade(t.selection, 0.16);
      roundRect(g, px - 1, py - 9, CELL + 2, 10, 3);
      g.fill();
      g.fillStyle = shade(t.accent, 0.1);
      roundRect(g, px - 1, py - 9, CELL + 2, 3, 2);
      g.fill();
      g.strokeStyle = shade(t.foreground, -0.35);
      g.lineWidth = 1.2;
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const bx = px + 3 + i * 6;
        g.moveTo(bx, py - 3); g.lineTo(bx, py + 0.5);
      }
      g.stroke();
    }

    /* --------------------------------------------------------------- lava */
    lava(e) {
      const ctx = this.sctx, t = this.theme;
      const ph = this.frame / 16;
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (e.grid[y * GRID_W + x] !== ENGINE.LAVA) continue;
          const px = x * CELL, py = y * CELL;
          const top = !this.solid(e, x, y - 1);
          const w = Math.sin(ph + x * 0.55) * 1.5;
          const grd = ctx.createLinearGradient(px, py + w, px, py + CELL);
          grd.addColorStop(0, shade(t.yellow, 0.12));
          grd.addColorStop(0.35, t.orange);
          grd.addColorStop(1, shade(t.red, -0.12));
          ctx.fillStyle = grd;
          roundRect(ctx, px - 0.5, py - (top ? 1.5 : 0), CELL + 1, CELL + 1, top ? 7 : 2);
          ctx.fill();
          if (top) {
            /* rolling crest */
            ctx.strokeStyle = shade(t.yellow, 0.45);
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let i = 0; i <= 4; i++) {
              const fx = px + (i * CELL) / 4;
              const fy = py + 2 + Math.sin(ph * 1.2 + x * 0.7 + i * 0.8) * 1.3;
              if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
            }
            ctx.stroke();
          }
          /* bubbles */
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          const b1 = (ph * 9 + x * 13) % CELL;
          const b2 = (ph * 6 + x * 7 + 9) % CELL;
          ctx.beginPath(); ctx.arc(px + 5 + ((x * 7) % 9), py + CELL - b1, 1.4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 12 - ((x * 5) % 6), py + CELL - b2, 1, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    /* -------------------------------------------------------------- exits */
    exits(e) {
      const ctx = this.sctx, t = this.theme;
      const pulse = 0.5 + 0.5 * Math.sin(this.frame / 9);
      for (const z of e.exitZones) {
        /* arch */
        const grd = ctx.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
        grd.addColorStop(0, "rgba(0,0,0,0.62)");
        grd.addColorStop(0.55, shade(t.selection, 0.02));
        grd.addColorStop(1, shade(t.selection, 0.16));
        ctx.fillStyle = grd;
        roundRect(ctx, z.x, z.y, z.w, z.h, 8);
        ctx.fill();

        /* inner glow */
        ctx.fillStyle = shade(t.accent, 0.05 + 0.12 * pulse);
        roundRect(ctx, z.x + 3, z.y + 3, z.w - 6, z.h - 6, 6);
        ctx.fill();

        /* Omarchy logo: a compact, self-contained recreation of the linked
           green square mark, rather than a network-loaded image asset. */
        const size = Math.min(31, Math.max(22, z.w + 11));
        this.omarchyLogo(ctx, z.x + z.w / 2, z.y + z.h / 2, size, pulse);
      }
    }

    omarchyLogo(ctx, cx, cy, size, pulse) {
      const s = size / 2;
      const green = "#90d35b";
      ctx.save();
      ctx.shadowColor = `rgba(144,211,91,${0.18 + pulse * 0.2})`;
      ctx.shadowBlur = 5;
      ctx.fillStyle = green;
      roundRect(ctx, cx - s, cy - s, size, size, 2.5);
      ctx.fill();
      ctx.shadowBlur = 0;

      /* chunky terminal/O mark, matching the square dashboard icon */
      ctx.fillStyle = "#080a08";
      const inner = size * 0.66;
      roundRect(ctx, cx - inner / 2, cy - inner / 2, inner, inner, 2);
      ctx.fill();
      /* green terminal prompt makes the mark readable at small sizes */
      ctx.strokeStyle = green;
      ctx.lineWidth = Math.max(1.2, size * 0.075);
      ctx.lineCap = "square";
      ctx.beginPath();
      ctx.moveTo(cx - inner * 0.27, cy - inner * 0.14);
      ctx.lineTo(cx - inner * 0.08, cy);
      ctx.lineTo(cx - inner * 0.27, cy + inner * 0.14);
      ctx.moveTo(cx + inner * 0.02, cy + inner * 0.15);
      ctx.lineTo(cx + inner * 0.27, cy + inner * 0.15);
      ctx.stroke();
      /* broken outer corners echo the supplied Omarchy square mark */
      ctx.fillStyle = green;
      ctx.fillRect(cx - s + size * 0.12, cy - s + size * 0.12, size * 0.26, size * 0.07);
      ctx.fillRect(cx - s + size * 0.12, cy - s + size * 0.12, size * 0.07, size * 0.26);
      ctx.fillRect(cx + s - size * 0.38, cy + s - size * 0.19, size * 0.26, size * 0.07);
      ctx.fillRect(cx + s - size * 0.19, cy + s - size * 0.38, size * 0.07, size * 0.26);
      ctx.restore();
    }

    /* ----------------------------------------------------------- lemmings */
    lemming(e, l) {
      const ctx = this.sctx, t = this.theme;
      const dying = l.state === ST.DEAD;
      const leaving = l.state === ST.EXIT;
      const fade = dying ? Math.max(0, l.timer / 26)
        : leaving ? Math.max(0, l.timer / 22) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (dying) { this.splatMark(l); ctx.restore(); return; }

      const x = Math.round(l.x), y = Math.round(l.y);
      const swing = Math.sin(l.anim / 4) * (l.state === ST.WALK || l.state === ST.CLIMB ? 1 : 0);

      /* Classic Lemmings silhouette: green hair, peach face, blue tunic,
         tiny trousers and boots. Keeping these roles separate stops the
         character reading as a green snowman. */
      const hair = t.lemming || t.green;
      const face = "#d9a06f";
      const shirt = "#4776a6";
      const shirtDark = "#2d5279";
      const trousers = "#294766";
      const boots = "#30251f";

      /* contact shadow */
      if (!leaving) {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath();
        ctx.ellipse(x + LEM_W / 2, y + LEM_H - 1, 6.4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (l.state === ST.CLIMB) {
        ctx.strokeStyle = face; ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(x + 4.5, y + 9); ctx.lineTo(x + (l.dir > 0 ? 12.5 : -0.5), y + 2.5);
        ctx.stroke();
      }

      /* legs */
      ctx.fillStyle = trousers;
      roundRect(ctx, x + 2.2 + swing, y + 14, 3, 5, 1.2); ctx.fill();
      roundRect(ctx, x + 7.1 - swing, y + 14, 3, 5, 1.2); ctx.fill();
      ctx.fillStyle = boots;
      roundRect(ctx, x + 1.2 + swing, y + 18, 4.2, 2, 0.8); ctx.fill();
      roundRect(ctx, x + 7.1 - swing, y + 18, 4.2, 2, 0.8); ctx.fill();

      /* small arms and hands */
      ctx.strokeStyle = shirtDark; ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 8); ctx.lineTo(x + (l.dir > 0 ? 0 : 4), y + 13);
      ctx.moveTo(x + 10, y + 8); ctx.lineTo(x + (l.dir > 0 ? 12 : 8), y + 13);
      ctx.stroke();
      ctx.fillStyle = face;
      ctx.beginPath(); ctx.arc(x + (l.dir > 0 ? 0 : 4), y + 13, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + (l.dir > 0 ? 12 : 8), y + 13, 1.3, 0, Math.PI * 2); ctx.fill();

      /* torso */
      const tg = ctx.createLinearGradient(0, y + 6, 0, y + 16);
      tg.addColorStop(0, shade(shirt, 0.16));
      tg.addColorStop(1, shirtDark);
      ctx.fillStyle = tg;
      roundRect(ctx, x + 2, y + 6.5, LEM_W - 4, 9, 2.5);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 0.8;
      roundRect(ctx, x + 2, y + 6.5, LEM_W - 4, 9, 2.5);
      ctx.stroke();
      /* dungaree straps and shirt highlight */
      ctx.strokeStyle = shade(shirt, 0.42); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 3.5, y + 7); ctx.lineTo(x + 4.5, y + 12);
      ctx.moveTo(x + 8.5, y + 7); ctx.lineTo(x + 7.5, y + 12);
      ctx.stroke();

      /* head */
      const hg = ctx.createLinearGradient(0, y + 2, 0, y + 10);
      hg.addColorStop(0, shade(face, 0.16));
      hg.addColorStop(1, shade(face, -0.08));
      ctx.fillStyle = hg;
      roundRect(ctx, x + 2, y + 1.5, 9, 8.5, 3.2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 0.8;
      roundRect(ctx, x + 2, y + 1.5, 9, 8.5, 3.2);
      ctx.stroke();

      /* unmistakable floppy green lemming hair */
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 3);
      ctx.lineTo(x + 1.5, y - 1);
      ctx.lineTo(x + 4, y + 0.5);
      ctx.lineTo(x + 6, y - 3);
      ctx.lineTo(x + 7.5, y + 0.2);
      ctx.lineTo(x + 11.5, y - 1);
      ctx.lineTo(x + 11, y + 4);
      ctx.quadraticCurveTo(x + 6, y + 1.5, x + 1, y + 3);
      ctx.closePath();
      ctx.fill();

      /* eye */
      const ex = l.dir > 0 ? x + 7 : x + 2.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(ex + 0.8, y + 5, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#10120f";
      ctx.beginPath(); ctx.arc(ex + 1.1, y + 5, 0.8, 0, Math.PI * 2); ctx.fill();

      if (leaving) {
        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = t.accent;
        roundRect(ctx, x, y, LEM_W, LEM_H, 5);
        ctx.fill();
      }
      this.tools(e, l, x, y);
      ctx.restore();
    }

    splatMark(l) {
      const ctx = this.sctx, t = this.theme;
      ctx.fillStyle = shade(t.red, 0.05);
      ctx.beginPath();
      ctx.ellipse(l.x + LEM_W / 2, l.feet - 2, 9, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(l.x + LEM_W / 2 - 1, l.feet - 2);
      ctx.lineTo(l.x + LEM_W / 2 - 1, l.feet - 12);
      ctx.lineTo(l.x + LEM_W / 2 + 3, l.feet - 9);
      ctx.lineTo(l.x + LEM_W / 2 - 1, l.feet - 2);
      ctx.fill();
      ctx.fillStyle = shade(t.red, -0.25);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.9 + l.id;
        ctx.beginPath();
        ctx.arc(l.x + 6 + Math.cos(a) * 10, l.feet - 3 + Math.sin(a) * 5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* per-state badges and props */
    tools(e, l, x, y) {
      const ctx = this.sctx, t = this.theme;
      if (l.climber) {
        /* climber trait is an armband, not a floating pick above the head */
        ctx.fillStyle = t.yellow;
        roundRect(ctx, x + (l.dir > 0 ? 8 : 2), y + 9, 2.5, 2.5, 0.8);
        ctx.fill();
      }
      if (l.floaters > 0) {
        ctx.strokeStyle = t.yellow;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(x + LEM_W / 2, y - 4, 6.5, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + LEM_W / 2, y - 4); ctx.lineTo(x + LEM_W / 2, y + 1);
        ctx.stroke();
      }
      if (l.bombs > 0) {
        const k = 1 - l.bombs / 300;
        ctx.fillStyle = k > 0.75 || (this.frame >> 3) % 2 ? t.red : shade(t.red, 0.4);
        ctx.beginPath();
        ctx.arc(x + LEM_W / 2, y - 4, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = t.yellow;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x + LEM_W / 2, y - 4, 5.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
        ctx.stroke();
      }
      if (l.state === ST.BLOCK) this.badge(x + LEM_W / 2, y - 5, "●", t.red);
      if (l.state === ST.BUILD) {
        ctx.fillStyle = shade(mix(t.rock, t.orange, 0.4), 0.1);
        roundRect(ctx, x + (l.dir > 0 ? LEM_W : -4), y + 8, 4.5, 4.5, 1);
        ctx.fill();
      }
      if (l.state === ST.BASH) {
        ctx.strokeStyle = t.yellow; ctx.lineWidth = 2; ctx.lineCap = "round";
        const k = (l.timer % 12) / 12;
        ctx.beginPath();
        ctx.moveTo(x + LEM_W / 2, y + 8);
        ctx.lineTo(x + LEM_W / 2 + l.dir * (5 + k * 7), y + 4 - k * 4);
        ctx.stroke();
      }
      if (l.state === ST.DIG) {
        ctx.strokeStyle = t.yellow; ctx.lineWidth = 2; ctx.lineCap = "round";
        const k = (l.timer % 12) / 12;
        ctx.beginPath();
        ctx.moveTo(x + LEM_W / 2, y + 10);
        ctx.lineTo(x + LEM_W / 2 + l.dir * (4 + k * 6), y + 12 + k * 6);
        ctx.stroke();
      }
      if (l.state === ST.RM) {
        ctx.fillStyle = shade(this.rock(), 0.3);
        for (let i = 0; i < 3; i++) {
          const k = ((l.timer * 2 + i * 5) % 15) / 15;
          ctx.beginPath();
          ctx.arc(x + 2.5 + i * 3, y + LEM_H - k * 10, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    badge(cx, cy, glyph, color) {
      const ctx = this.sctx;
      ctx.fillStyle = color;
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(glyph, cx, cy + 3);
    }

    /* ------------------------------------------------- cursor + highlight */
    highlight(l, skill, ok) {
      if (!l) return;
      const ctx = this.sctx;
      const pulse = 0.55 + 0.45 * Math.sin(this.frame / 5);
      ctx.save();
      ctx.strokeStyle = ok ? this.theme.foreground : shade(this.theme.red, 0.1);
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = pulse;
      roundRect(ctx, l.x - 1.5, l.y - 1.5, LEM_W + 3, LEM_H + 3, 5);
      ctx.stroke();
      ctx.restore();
      if (skill) {
        const s = window.SKILL_BY_ID && window.SKILL_BY_ID[skill];
        if (s) {
          ctx.save();
          ctx.fillStyle = ok ? this.theme.accent : this.theme.red;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`$ ${s.label}`, l.x + LEM_W + 4, l.y + 8);
          ctx.fillText(s.verb, l.x + LEM_W + 4, l.y + 18);
          ctx.restore();
        }
      }
    }

    /* the floating skill strip that follows the pointer, Lemmings style */
    cursor(mx, my, skills, selected) {
      const ctx = this.sctx, t = this.theme;
      const n = skills.length;
      const w = 46, h = 15;
      let x = mx + 16, y = my - (n * h) / 2;
      if (x + w > W - 4) x = mx - w - 14;
      y = Math.max(4, Math.min(H - n * h - 4, y));
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      roundRect(ctx, x - 2, y - 2, w + 4, n * h + 4, 6);
      ctx.fill();
      skills.forEach((s, i) => {
        const sy = y + i * h;
        const on = s.id === selected;
        if (on) {
          ctx.fillStyle = t.selection;
          roundRect(ctx, x, sy, w, h - 1, 3);
          ctx.fill();
          ctx.strokeStyle = t.accent;
          ctx.lineWidth = 1;
          roundRect(ctx, x, sy, w, h - 1, 3);
          ctx.stroke();
        }
        ctx.fillStyle = s.left > 0 ? t.foreground : shade(t.dark_foreground, -0.1);
        ctx.font = (on ? "bold " : "") + "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${s.key} ${s.label}`, x + 4, sy + 10);
        ctx.textAlign = "right";
        ctx.fillStyle = on ? t.accent : t.dark_foreground;
        ctx.fillText(s.left > 0 ? String(s.left) : "-", x + w - 4, sy + 10);
      });
      ctx.restore();
    }

    offscreenMarkers(e) {
      const ctx = this.sctx;
      const left = e.lems.filter((l) => l.state !== ST.DEAD && l.x + LEM_W < this.cameraX - 2);
      const right = e.lems.filter((l) => l.state !== ST.DEAD && l.x > this.cameraX + W + 2);
      const marker = (side, count) => {
        if (!count) return;
        const x = side < 0 ? 15 : W - 15;
        const y = H * 0.2;
        ctx.fillStyle = this.theme.accent;
        ctx.beginPath();
        if (side < 0) { ctx.moveTo(x - 7, y); ctx.lineTo(x + 5, y - 7); ctx.lineTo(x + 5, y + 7); }
        else { ctx.moveTo(x + 7, y); ctx.lineTo(x - 5, y - 7); ctx.lineTo(x - 5, y + 7); }
        ctx.closePath(); ctx.fill();
        ctx.font = "bold 10px monospace";
        ctx.textAlign = side < 0 ? "left" : "right";
        ctx.fillText(String(count), x + side * 11, y + 4);
      };
      marker(-1, left.length);
      marker(1, right.length);
    }

    /* --------------------------------------------------------------- draw */
    draw(e, view) {
      this.frame++;
      const ctx = this.sctx;
      view = view || {};
      this.updateCamera(view);
      ctx.setTransform(SS, 0, 0, SS, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const key = this.terrainSum(e.grid);
      if (key !== this.terrainKey) {
        this.paintTerrain(e);
        this.terrainKey = key;
      }
      ctx.fillStyle = this.theme.background;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(this.terrain, this.cameraX * SS, 0, W * SS, H * SS, 0, 0, W, H);
      ctx.translate(-this.cameraX, 0);
      this.lava(e);
      this.exits(e);

      for (const l of e.lems) this.lemming(e, l);

      for (const p of e.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (view.hover) this.highlight(view.hover, view.selected, view.legal);
      if (view.showCursor) this.cursor(view.mx, view.my, view.skills || [], view.selected);

      /* vignette */
      ctx.setTransform(SS, 0, 0, SS, 0, 0);
      this.offscreenMarkers(e);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.0);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.34)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      /* downsample the 2x buffer: everything lands anti-aliased */
      this.ctx.clearRect(0, 0, W, H);
      this.ctx.drawImage(this.scene, 0, 0, W, H);
    }
  }

  return { Renderer, W, H, SS };
})();

if (typeof module !== "undefined" && module.exports) module.exports = RENDER;
if (typeof window !== "undefined") window.RENDER = RENDER;
