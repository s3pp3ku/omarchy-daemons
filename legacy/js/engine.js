/* omarchy lemmings — simulation core.
   DOM-free on purpose: the same file runs in the browser and inside node
   (`node --check`-able, headless-testable via `globalThis.ENGINE`).

   Coordinates: pixels. Grid cells are CELL x CELL (20x20).
   A lemming body is LEM_W x LEM_H (12x20) anchored at its top-left (x, y);
   its "centre column" is x + LEM_W/2. */

"use strict";

const CELL = 20;
const GRID_W = 80;
const GRID_H = 27;
const LEM_W = 12;
const LEM_H = 20;

const EMPTY = 0, DIRT = 1, STEEL = 2, BRICK = 3, LAVA = 4;

const SAFE_FALL = 170;      /* px a lemming may drop before it splats */
const WALK_SPEED = 0.65;       /* slow, readable classic-Lemmings pace */
const CLIMB_SPEED = 1.6;
const BASH_CREEP = 0.65;
const FLOAT_FALL = 1.1;     /* terminal velocity while nohup is active */
const GRAVITY = 0.34;
const MAX_FALL = 8;

const TOOL_TICK = 12;       /* ticks between bash / dig / rm removals */
const BUILD_TICK = 5;       /* ticks per brick */
const BOMB_TICKS = 300;     /* 5 seconds */
const EXIT_TICKS = 22;      /* sink animation */
const DEAD_TICKS = 26;      /* splat animation */
const BLOCK_R = 14;         /* flock blocking radius (px) */

const ST = {
  FALL: "fall", WALK: "walk", CLIMB: "climb", BASH: "bash",
  DIG: "dig", RM: "rm", BUILD: "build", BLOCK: "block",
  EXIT: "exit", DEAD: "dead",
};

class Lemming {
  constructor(id, x, y) {
    this.id = id;
    this.x = x; this.y = y;
    this.dir = id % 2 ? 1 : -1;
    this.state = ST.FALL;
    this.timer = 0;            /* state timer (bash creep, climb rise, ...) */
    this.vy = 0;
    this.fallFrom = y;         /* y when the current fall began */
    this.climber = false;
    this.floaters = 0;
    this.bombs = 0;            /* ticks of countdown, >0 = bomb set */
    this.buildLeft = 0;
    this.bashHits = 0;
    this.digHits = 0;
    this.anim = 0;
    this.done = false;         /* reached the exit */
    this.blasted = false;
  }
  get cx() { return this.x + LEM_W / 2; }
  get cy() { return this.y + LEM_H / 2; }
  get feet() { return this.y + LEM_H; }
  get row() { return Math.floor(this.y / CELL); }
  get col() { return Math.floor((this.x + LEM_W / 2) / CELL); }
}

class Engine {
  constructor(level, opts) {
    opts = opts || {};
    this.level = level;
    this.grid = new Uint8Array(GRID_W * GRID_H);
    this.hatch = { x: 0, y: 0 };
    this.exits = [];
    this.parseMap(level.map);

    this.time = (level.time || 150) * 60;   /* ticks */
    this.timeTotal = this.time;
    this.spawned = 0;
    this.saved = 0;
    this.dead = 0;
    this.tickCount = 0;
    this.spawnTimer = Math.round((level.interval || 3) * 60);
    this.status = "playing";                 /* playing | won | lost */
    this.lems = [];
    this.particles = [];
    this.events = [];
    this.nextId = 1;
    this.require = Math.ceil((level.total * (level.required || 50)) / 100);
    this.speed = opts.speed || 1;
    this.frozen = false;
  }

  /* ------------------------------------------------------------------ map */
  parseMap(rows) {
    for (let y = 0; y < GRID_H; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < GRID_W; x++) {
        const c = row[x] || ".";
        let v = EMPTY;
        if (c === "#") v = DIRT;
        else if (c === "@") v = STEEL;
        else if (c === "~") v = LAVA;
        else if (c === "H") { this.hatch = { x, y }; }
        else if (c === "X") { this.exits.push({ x, y }); }
        this.grid[y * GRID_W + x] = v;
      }
    }
    /* an exit also claims the cell above it when that cell is air, so
       lemmings can drop into the door from one cell up */
    this.exitZones = this.exits.map((e) => {
      const above = this.at(e.x, e.y - 1);
      const open = above === EMPTY;
      return { x: e.x * CELL, y: (e.y - (open ? 1 : 0)) * CELL, w: CELL, h: CELL * (open ? 2 : 1) };
    });
  }
  inBounds(x, y) { return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H; }
  at(x, y) {
    if (!this.inBounds(x, y)) return -1;    /* -1 = out of the world */
    return this.grid[y * GRID_W + x];
  }
  set(x, y, v) { if (this.inBounds(x, y)) this.grid[y * GRID_W + x] = v; }
  solid(x, y) { const v = this.at(x, y); return v === DIRT || v === STEEL || v === BRICK; }
  destructible(x, y) { const v = this.at(x, y); return v === DIRT || v === BRICK; }
  lava(x, y) { return this.at(x, y) === LAVA; }

  /* ------------------------------------------------------------- geometry */
  /* the cell immediately in front of the lemming (its body is 12px wide and
     sits 4px into its cell, so "in front" is simply the next column) */
  frontCell(l) {
    return { x: l.col + l.dir, y: l.row };
  }
  bashCell(l) {
    const front = this.frontCell(l);
    if (this.destructible(front.x, front.y)) return front;
    const rear = { x: l.col - l.dir, y: l.row };
    return this.destructible(rear.x, rear.y) ? rear : null;
  }
  /* cells under the two feet */
  footCells(l) {
    const row = Math.floor(l.feet / CELL);
    return [
      { x: Math.floor(l.x / CELL), y: row },
      { x: Math.floor((l.x + LEM_W - 1) / CELL), y: row },
    ];
  }
  grounded(l) {
    for (const c of this.footCells(l)) if (this.solid(c.x, c.y)) return true;
    return false;
  }
  /* walking needs the cell under the body's centre to be solid — a lemming
     whose trailing foot is still on the ledge must fall, not step up */
  footed(l) {
    return this.solid(l.col, Math.floor(l.feet / CELL));
  }
  touchesLava(l) {
    const c0 = Math.floor(l.x / CELL), c1 = Math.floor((l.x + LEM_W - 1) / CELL);
    const r0 = l.row, r1 = Math.floor((l.y + LEM_H - 1) / CELL);
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) if (this.lava(x, y)) return true;
    return false;
  }
  atExit(l) {
    const r = { x: l.x, y: l.y, w: LEM_W, h: LEM_H };
    for (const z of this.exitZones) {
      if (r.x < z.x + z.w && r.x + r.w > z.x && r.y < z.y + z.h && r.y + r.h > z.y) return true;
    }
    return false;
  }
  blockedAhead(l) {
    for (const o of this.lems) {
      if (o === l || o.state === ST.EXIT || o.state === ST.DEAD) continue;
      if (o.state !== ST.BLOCK) continue;
      const dx = (o.x + LEM_W / 2) - (l.x + LEM_W / 2);
      if (Math.abs(o.y - l.y) >= 24) continue;
      const overlap = Math.abs(dx) <= LEM_W;
      const ahead = Math.sign(dx) === l.dir && Math.abs(dx) < LEM_W + BLOCK_R;
      if (overlap || ahead) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------- spawning */
  spawn() {
    const h = this.hatch;
    const l = new Lemming(this.nextId++, h.x * CELL + (CELL - LEM_W) / 2, h.y * CELL);
    l.state = ST.FALL;
    l.fallFrom = l.y;
    this.lems.push(l);
    this.spawned++;
    this.emit("spawn", l.cx, l.y + LEM_H);
  }
  get alive() { return this.lems.filter((l) => l.state !== ST.EXIT && l.state !== ST.DEAD).length; }
  get unspawned() { return this.level.total - this.spawned; }

  /* ----------------------------------------------------------------- loop */
  tick() {
    if (this.status !== "playing" || this.frozen) return;
    this.tickCount++;
    if (this.time > 0) {
      this.time--;
      if (this.time === 0) this.nuke();
    }
    if (this.time > 0 && this.spawned < this.level.total) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer = Math.round((this.level.interval || 3) * 60);
      }
    }
    for (const l of this.lems) this.step(l);
    this.stepParticles();
    this.cleanup();
    this.evaluate();
  }

  evaluate() {
    if (this.status !== "playing") return;
    const pending = this.saved + this.alive + this.unspawned;
    if (pending < this.require) { this.finish(false); return; }
    if (this.spawned >= this.level.total && this.alive === 0) this.finish(this.saved >= this.require);
  }
  finish(won) {
    this.status = won ? "won" : "lost";
    this.emit(won ? "win" : "lose", 0, 0);
  }
  nuke() {
    for (const l of this.lems) {
      if (l.state === ST.EXIT || l.state === ST.DEAD) continue;
      l.bombs = 0;
      this.kill(l, true);
    }
    this.spawned = Math.max(this.spawned, 0);
    this.emit("nuke", 0, 0);
  }

  /* --------------------------------------------------------- per-lemming */
  step(l) {
    if (l.bombs > 0) {
      l.bombs--;
      if (l.bombs === 0) { this.explode(l); return; }
    }
    switch (l.state) {
      case ST.FALL: this.doFall(l); break;
      case ST.WALK: this.doWalk(l); break;
      case ST.CLIMB: this.doClimb(l); break;
      case ST.BASH: this.doBash(l); break;
      case ST.DIG: this.doMine(l); break;
      case ST.RM: this.doRm(l); break;
      case ST.BUILD: this.doBuild(l); break;
      case ST.BLOCK: l.anim += 1; break;
      case ST.EXIT: this.doExit(l); break;
      case ST.DEAD: this.doDead(l); break;
    }
  }

  /* exit check runs for every state that moves */
  moving(l) { return l.state !== ST.EXIT && l.state !== ST.DEAD && l.state !== ST.BLOCK; }

  doFall(l) {
    if (this.atExit(l)) { this.enterExit(l); return; }
    if (this.touchesLava(l)) { this.kill(l); return; }
    if (this.footed(l)) { this.land(l); return; }
    l.vy += l.floaters > 0 ? 0 : GRAVITY;
    if (l.floaters > 0) {
      l.vy = Math.min(l.vy + 0.06, FLOAT_FALL);
      l.x += l.dir * 0.5;
    }
    l.vy = Math.min(l.vy, l.floaters > 0 ? FLOAT_FALL : MAX_FALL);
    l.y += l.vy;
    if (l.floaters === 0 && (l.y - l.fallFrom > SAFE_FALL)) { this.kill(l, false, "fall"); return; }
    if (l.y > GRID_H * CELL) { this.kill(l, false, "fall"); return; }
    if (l.y >= 0 && this.footed(l)) this.land(l);
  }
  land(l) {
    l.y = Math.floor(l.feet / CELL) * CELL - LEM_H;
    l.vy = 0;
    if (this.atExit(l)) { this.enterExit(l); return; }
    if (this.touchesLava(l)) { this.kill(l); return; }
    l.state = ST.WALK;
    l.timer = 0;
    this.emit("land", l.cx, l.feet);
  }

  doWalk(l) {
    if (this.atExit(l)) { this.enterExit(l); return; }
    if (this.touchesLava(l)) { this.kill(l); return; }
    if (!this.footed(l)) { l.state = ST.FALL; l.fallFrom = l.y; l.vy = 0; return; }
    if (l.bashArmed && this.destructible(this.frontCell(l).x, this.frontCell(l).y)) {
      l.state = ST.BASH;
      l.timer = 0;
      return;
    }
    if (this.blockedAhead(l)) { l.anim += 1; return; }

    const f = this.frontCell(l);
    const fxOut = !this.inBounds(f.x, f.y);
    if (fxOut || this.solid(f.x, f.y)) {
      /* a single diggable step is walked over — this is what lets followers
         climb a builder's staircase. bedrock (@) is never stepped or climbed. */
      const canStep = !fxOut && this.destructible(f.x, f.y)
        && !this.solid(f.x, f.y - 1) && this.at(f.x, f.y - 1) !== LAVA
        && !this.blockedAt(l, f.x, (f.y - 1) * CELL);
      if (canStep) {
        l.y -= CELL;
        l.x += l.dir * CELL;
        l.anim += 1;
        if (this.grounded(l)) return;
        l.state = ST.FALL; l.fallFrom = l.y; l.vy = 0;
        return;
      }
      if (l.climber && this.destructible(f.x, f.y)) {
        l.state = ST.CLIMB;
        l.timer = 0;
        this.emit("climb", l.cx, l.y);
        return;
      }
      l.dir = -l.dir;
      this.emit("turn", l.cx, l.y);
      return;
    }
    if (this.lava(f.x, f.y)) {
      /* walking into lava is fatal; there is no bridging without a builder */
      l.x += l.dir * WALK_SPEED;
      if (this.touchesLava(l)) { this.kill(l); return; }
      return;
    }
    l.x += l.dir * WALK_SPEED;
    l.anim += 1;
    if (!this.grounded(l)) { l.state = ST.FALL; l.fallFrom = l.y; l.vy = 0; }
  }
  blockedAt(l, x, y) {
    for (const o of this.lems) {
      if (o === l || o.state !== ST.BLOCK) continue;
      if (Math.abs(o.x + LEM_W / 2 - (x * CELL + CELL / 2)) < LEM_W + BLOCK_R
        && Math.abs(o.y - y) < 24) return true;
    }
    return false;
  }

  doClimb(l) {
    const f = this.frontCell(l);
    if (f.y < 0 || !this.inBounds(f.x, f.y)) { this.detach(l); return; }
    if (!this.destructible(f.x, f.y)) {
      /* top of the climbable face: mount it if there is something to stand
         on, otherwise turn around (bedrock stops every tool). */
      if (!this.solid(f.x, f.y)) {
        if (!this.solid(f.x, f.y + 1)) { this.detach(l); return; }
        l.x = f.x * CELL + (CELL - LEM_W) / 2;
        l.y = f.y * CELL;
        l.state = ST.WALK;
        l.timer = 0;
        this.emit("land", l.cx, l.feet);
        return;
      }
      l.state = ST.WALK;
      l.dir = -l.dir;
      this.emit("turn", l.cx, l.y);
      return;
    }
    l.y -= CLIMB_SPEED;
    l.timer += CLIMB_SPEED;
    l.anim += 1;
    if (l.y < 0) this.detach(l);
  }
  detach(l) {
    l.state = ST.FALL;
    l.fallFrom = l.y;
    l.vy = 0;
    this.emit("fall", l.cx, l.y);
  }

  /* ---- bash: chew forwards through dirt, one cell per TOOL_TICK ---- */
  doBash(l) {
    if (this.atExit(l)) { this.enterExit(l); return; }
    const f = this.frontCell(l);
    l.timer++;
    l.anim += 1;
    if (l.timer >= TOOL_TICK) {
      l.timer = 0;
      if (this.destructible(f.x, f.y)) {
        this.set(f.x, f.y, EMPTY);
        l.bashHits++;
        this.emit("bash", f.x * CELL + CELL / 2, f.y * CELL + CELL / 2);
        l.x += l.dir * CELL;          /* step into the hole we just opened */
      } else if (this.solid(f.x, f.y) || this.lava(f.x, f.y)) {
        l.state = ST.WALK;            /* bedrock or sludge: give up */
        l.dir = -l.dir;
        this.emit("turn", l.cx, l.y);
        return;
      } else {
        l.state = ST.WALK;            /* keep walking until the next wall */
        l.bashArmed = true;
        l.timer = 0;
        return;
      }
    }
    if (this.atExit(l)) { this.enterExit(l); return; }
    if (this.touchesLava(l)) { this.kill(l); return; }
  }

  /* ---- dig: 45 degrees down, clearing a follower-walkable ramp ----
     keeps going until it meets something it cannot chew */
  doMine(l) {
    if (this.atExit(l)) { this.enterExit(l); return; }
    if (this.touchesLava(l)) { this.kill(l); return; }
    l.timer++;
    l.anim += 1;
    if (l.timer < TOOL_TICK) return;
    l.timer = 0;
    const f = this.frontCell(l);
    const low = { x: f.x, y: f.y + 1 };   /* the cell we sink into */
    if (!this.inBounds(low.x, low.y) || this.lava(low.x, low.y)) {
      l.state = ST.WALK; l.dir = -l.dir; this.emit("turn", l.cx, l.y); return;
    }
    if (!this.destructible(low.x, low.y)) {
      if (this.solid(low.x, low.y)) {      /* bedrock: no digging through this */
        l.state = ST.WALK; l.dir = -l.dir; this.emit("turn", l.cx, l.y); return;
      }
      /* open air below: we have broken through, drop into it */
      l.x += l.dir * CELL;
      l.y += CELL;
      l.state = ST.FALL; l.fallFrom = l.y; l.vy = 0;
      return;
    }
    this.set(low.x, low.y, EMPTY);
    /* clear the cell above too: the shaft is two cells tall so followers can
       walk down it instead of clambering back out over the spoil */
    if (this.destructible(f.x, f.y)) this.set(f.x, f.y, EMPTY);
    l.digHits++;
    this.emit("dig", low.x * CELL + CELL / 2, low.y * CELL + CELL / 2);
    l.x += l.dir * CELL;
    l.y += CELL;
    if (!this.grounded(l)) { l.state = ST.FALL; l.fallFrom = l.y; l.vy = 0; }
    else this.emit("land", l.cx, l.feet);
  }

  /* ---- rm: straight down ---- */
  doRm(l) {
    if (this.atExit(l)) { this.enterExit(l); return; }
    const cx = l.col;
    const below = Math.floor(l.feet / CELL);
    l.timer++;
    if (l.timer >= TOOL_TICK) {
      l.timer = 0;
      if (this.destructible(cx, below)) {
        this.set(cx, below, EMPTY);
        this.emit("rm", cx * CELL + CELL / 2, below * CELL + CELL / 2);
        l.y += CELL;
        l.digHits++;
        return;
      }
      if (this.lava(cx, below)) { this.kill(l); return; }
      /* steel or open air: stop digging */
      l.state = ST.WALK;
      return;
    }
    if (this.touchesLava(l)) { this.kill(l); return; }
  }

  /* ---- make: stack bricks diagonally up until the counter runs out ---- */
  doBuild(l) {
    if (this.atExit(l)) { this.enterExit(l); return; }
    const f = this.frontCell(l);
    const target = this.at(f.x, f.y);
    const head = this.at(f.x, f.y - 1);
    l.timer++;
    if (l.timer < BUILD_TICK) return;
    l.timer = 0;
    const canPlace = target === EMPTY || target === LAVA;
    const headClear = f.y - 1 >= 0 && (head === EMPTY || head === LAVA);
    if (!canPlace || !headClear || l.buildLeft <= 0 || this.blockedAt(l, f.x, (f.y - 1) * CELL)) {
      /* out of room: stop building and carry on in the same direction, so the
         lemming walks off its own staircase instead of back into the pit */
      l.state = ST.WALK;
      this.emit("land", l.cx, l.feet);
      return;
    }
    this.set(f.x, f.y, BRICK);
    /* the cell we climb into must be clear — displace sludge so a staircase
       can actually bridge it */
    if (this.lava(f.x, f.y - 1)) this.set(f.x, f.y - 1, EMPTY);
    l.buildLeft--;
    this.emit("build", f.x * CELL + CELL / 2, f.y * CELL + CELL / 2);
    /* Bridging rule: `make` spans a gap with a LEVEL plank whenever the ground
       ahead is missing (open air or sludge); it only climbs into a staircase
       when there is solid ground to climb onto. This makes `make` usable as a
       gap-bridge instead of a ramp into thin air. The test looks at the column
       we are about to move into, one row below the plank line, so a plank we
       already laid does not read as "ground" and break the run. */
    const nextX = l.col + l.dir;
    const groundContinues = this.solid(nextX, f.y + 1) && !this.lava(nextX, f.y + 1);
    if (groundContinues) {
      l.y -= CELL;                  /* ground continues: climb */
      l.x += l.dir * CELL;
      l.anim += 1;
      if (l.buildLeft <= 0 || !this.footed(l)) {
        if (!this.footed(l)) { l.state = ST.FALL; l.fallFrom = l.y; l.vy = 0; }
        else { l.state = ST.WALK; this.emit("land", l.cx, l.feet); }
      }
    } else {
      /* spanning a gap: keep going level. The builder is carried by the plank
         it just laid, so never interrupt here — only run out of bricks. */
      l.x += l.dir * CELL;
      l.anim += 1;
      if (l.buildLeft <= 0) {
        l.state = ST.WALK;
        this.emit("land", l.cx, l.feet);
      }
    }
  }

  enterExit(l) {
    if (l.state === ST.EXIT) return;
    l.state = ST.EXIT;
    l.timer = EXIT_TICKS;
    l.vy = 0;
    this.saved++;
    this.emit("exit", l.cx, l.cy);
  }
  doExit(l) {
    l.timer--;
    l.y += 1.4;
    l.anim += 1;
    if (l.timer <= 0) l.done = true;
  }

  kill(l, nuke, cause) {
    if (l.state === ST.DEAD) return;
    l.state = ST.DEAD;
    l.timer = DEAD_TICKS;
    l.vy = 0;
    this.dead++;
    this.burst(l.cx, l.cy, nuke ? "#ff6362" : cause === "fall" ? "#f7768e" : "#ff6362", nuke ? 26 : 14);
    this.emit(nuke ? "nuke" : cause === "fall" ? "splat" : "death", l.cx, l.cy);
  }
  doDead(l) {
    l.timer--;
    if (l.timer <= 0) l.done = true;
  }

  explode(l) {
    const gx = Math.floor(l.cx / CELL), gy = Math.floor(l.cy / CELL);
    for (let y = gy - 1; y <= gy + 1; y++) {
      for (let x = gx - 1; x <= gx + 1; x++) {
        if (this.destructible(x, y)) this.set(x, y, EMPTY);
      }
    }
    for (const o of this.lems) {
      if (o === l) continue;
      const d = Math.hypot(o.cx - l.cx, o.cy - l.cy);
      if (d <= 30 && o.state !== ST.EXIT) this.kill(o, true);
    }
    this.burst(l.cx, l.cy, "#f9e2af", 34);
    this.emit("explode", l.cx, l.cy);
    l.state = ST.DEAD;
    l.timer = DEAD_TICKS;
    this.dead++;
  }

  /* ------------------------------------------------------------ cosmetics */
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 1 + Math.random() * 3.4;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.9,
        life: 22 + Math.random() * 26, color, size: 1.6 + Math.random() * 2.2,
      });
    }
  }
  stepParticles() {
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.life--;
    }
    if (this.particles.length) this.particles = this.particles.filter((p) => p.life > 0);
  }
  emit(t, x, y) { this.events.push({ t, x, y }); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  cleanup() { if (this.lems.some((l) => l.done)) this.lems = this.lems.filter((l) => !l.done); }

  /* ------------------------------------------------------- player actions */
  /* Returns true when the assignment was legal (and consumed). */
  assign(l, skill) {
    if (this.status !== "playing") return false;
    switch (skill) {
      case "sudo": l.climber = true; return true;
      case "nohup": l.floaters++; return true;
      case "kill": l.bombs = BOMB_TICKS; return true;
      case "make":
        if (l.state !== ST.WALK) return false;
        l.buildLeft = 8; l.state = ST.BUILD; l.timer = 0; return true;
      case "bash":
        if (!this.canAssign(l, "bash")) return false;
        l.bashArmed = true;
        l.state = ST.BASH; l.timer = 0; return true;
      case "dig":
        if (l.state !== ST.WALK) return false;
        l.state = ST.DIG; l.timer = 0; return true;
      case "rm":
        if (l.state !== ST.WALK) return false;
        l.state = ST.RM; l.timer = 0; return true;
      case "flock":
        if (l.state !== ST.WALK) return false;
        l.state = ST.BLOCK; return true;
    }
    return false;
  }
  /* skill counts are owned by the shell (ui.js), this is the legality check */
  canAssign(l, skill) {
    if (!l || this.status !== "playing") return false;
    if (l.state === ST.EXIT || l.state === ST.DEAD) return false;
    switch (skill) {
      case "sudo": return !l.climber;
      case "nohup": return true;
      case "kill": return l.bombs <= 0;
      case "bash":
        return l.state === ST.WALK && !l.bombs;
      case "make": case "dig": case "rm": case "flock":
        return l.state === ST.WALK && !l.bombs;
    }
    return false;
  }
}

const ENGINE = {
  Engine, Lemming, ST,
  CELL, GRID_W, GRID_H, LEM_W, LEM_H,
  EMPTY, DIRT, STEEL, BRICK, LAVA,
  SAFE_FALL, TOOL_TICK, BOMB_TICKS,
};

if (typeof module !== "undefined" && module.exports) module.exports = ENGINE;
if (typeof window !== "undefined") window.ENGINE = ENGINE;
