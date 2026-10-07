/* Omarchy Lemmings — deterministic simulation.
   Integer pixel physics at a fixed tick rate. No randomness, no DOM.
   The same file runs in the browser and in node (tools/verify.js), so a
   recorded list of actions always replays to the same result. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const M = OL.M, Terrain = OL.Terrain;

  /* ---- tuning (world pixels / ticks). Documented in docs/ENGINE.md ---- */
  const C = OL.C = {
    TPS: 20,             // simulation ticks per second
    LEM_H: 14,           // body height above the foot pixel (for tunnels & hit boxes)
    STEP_UP: 6,          // walkers climb ledges up to this many px
    STEP_DOWN: 3,        // ...and step down this many before they start falling
    FALL_SPEED: 3,       // px per tick
    SPLAT: 96,           // a fall longer than this is fatal
    OPEN_DELAY: 30,      // ticks before the first lemming drops from a hatch
    BUILD_PERIOD: 8,     // ticks per brick
    BRICKS: 12,
    BRICK_W: 8,          // brick length (px)
    STEP_X: 4,           // stairs advance this far per brick...
    STEP_Y: 2,           // ...and rise this far
    SHRUG_TICKS: 14,
    DIG_PERIOD: 3,       // ticks per 1px of digging
    DIG_HALF: 4,         // digger hole is 2*DIG_HALF+1 wide
    BASH_PERIOD: 5,      // ticks per basher stroke
    BASH_REACH: 5,       // px removed ahead per stroke
    BASH_ADVANCE: 2,     // px moved per stroke
    BASH_LOOK: 10,       // basher keeps going while terrain is within this distance
    MINE_PERIOD: 9,
    MINE_ADVANCE: 2,     // miner moves 2 across, 2 down per stroke (45°)
    BLOCK_RX: 6,         // blocker turns walkers within this horizontal range
    FUSE: 100,           // bomber countdown (5 s)
    BOOM_R: 13,
    EXIT_TICKS: 16,
    DIE_TICKS: 18,
    EXIT_RX: 4,          // exit trigger half-width
    EXIT_RY: 10,         // exit trigger height above the exit's floor point
  };

  const ST = OL.ST = {
    FALL: "fall", WALK: "walk", BUILD: "build", SHRUG: "shrug", DIG: "dig",
    BASH: "bash", MINE: "mine", BLOCK: "block", EXIT: "exit", DIE: "die", OUT: "out",
  };

  /* Skills in toolbar order. `from` lists the states a skill can be given to. */
  const WORKING = [ST.WALK, ST.BUILD, ST.SHRUG, ST.DIG, ST.BASH, ST.MINE];
  const SKILLS = OL.SKILLS = [
    { id: "blocker", key: "1", label: "Blocker", verb: "BLOCK" },
    { id: "builder", key: "2", label: "Builder", verb: "BUILD" },
    { id: "basher",  key: "3", label: "Basher",  verb: "BASH" },
    { id: "miner",   key: "4", label: "Miner",   verb: "MINE" },
    { id: "digger",  key: "5", label: "Digger",  verb: "DIG" },
    { id: "bomber",  key: "6", label: "Bomber",  verb: "BOMB" },
  ];

  /* release rate (1..99, classic scale) -> ticks between spawns */
  function spawnInterval(rate) {
    return Math.max(3, Math.round(((53 - rate / 2) * C.TPS) / 17));
  }
  OL.spawnInterval = spawnInterval;

  class Lemming {
    constructor(id, x, y, dir) {
      this.id = id;
      this.x = x; this.y = y;      // (x, y) = the foot pixel; ground is at y+1
      this.dir = dir;
      this.state = ST.FALL;
      this.t = 0;                  // ticks in current state
      this.fall = 0;               // px fallen in current fall
      this.bricks = 0;
      this.fuse = -1;              // >=0 while a bomb is ticking
      this.cause = "";             // death cause
      this.saved = false;
    }
  }

  class Sim {
    constructor(level, opts) {
      opts = opts || {};
      this.level = level;
      this.terrain = OL.buildTerrain(level);
      this.W = this.terrain.w; this.H = this.terrain.h;
      this.tick = 0;
      this.lems = [];
      this.nextId = 1;
      this.spawned = 0;
      this.saved = 0;
      this.dead = 0;
      this.total = level.lemmings;
      this.need = level.save;
      this.timeLimit = (level.time || 300) * C.TPS;
      this.rateMin = level.rate || 50;
      this.rate = this.rateMin;
      this.spawnTimer = C.OPEN_DELAY;
      this.spawnIdx = 0;
      this.nuked = false;
      this.skills = {};
      for (const s of SKILLS) this.skills[s.id] = (level.skills && level.skills[s.id]) || 0;
      this.used = {};
      for (const s of SKILLS) this.used[s.id] = 0;
      this.infinite = !!opts.infinite;
      this.actions = [];           // replay log: [{t, a, id?, skill?, v?}]
      this.events = [];            // per-tick events for audio/fx (consumer clears)
      this.status = "play";        // play | won | lost
      this.entrances = level.entrances.map((e) => ({ x: e.x, y: e.y, dir: e.dir || 1 }));
      this.exits = level.exits.map((e) => ({ x: e.x, y: e.y }));
    }

    get out() { return this.lems.filter((l) => l.state !== ST.OUT).length; }
    get alive() { return this.lems.filter((l) => l.state !== ST.OUT && l.state !== ST.DIE && l.state !== ST.EXIT).length; }
    get timeLeft() { return Math.max(0, this.timeLimit - this.tick); }
    lem(id) { return this.lems.find((l) => l.id === id); }

    /* which breakable material is in this pixel list? (for debris colour only) */
    matOf(px, dir) {
      for (let i = 0; i < px.length; i += 2) {
        const m = this.terrain.get(px[i], px[i + 1]);
        if (Terrain.removable(m, dir)) return m;
      }
      return 0;
    }

    emit(type, x, y, extra) { this.events.push(Object.assign({ type, x, y }, extra || {})); }

    /* ------------------------------------------------------------ actions */
    canAssign(l, skill) {
      if (!l || l.state === ST.OUT || l.state === ST.DIE || l.state === ST.EXIT) return false;
      if (!this.infinite && this.skills[skill] <= 0) return false;
      switch (skill) {
        case "bomber": return l.fuse < 0;
        case "blocker": return WORKING.includes(l.state);
        /* a blocker can be handed a new job: that is how a held crowd is released */
        case "builder": return (WORKING.includes(l.state) || l.state === ST.BLOCK) && l.state !== ST.BUILD;
        case "basher": return (WORKING.includes(l.state) || l.state === ST.BLOCK) && l.state !== ST.BASH;
        case "miner": return (WORKING.includes(l.state) || l.state === ST.BLOCK) && l.state !== ST.MINE;
        case "digger": return (WORKING.includes(l.state) || l.state === ST.BLOCK) && l.state !== ST.DIG;
      }
      return false;
    }

    assign(id, skill) {
      const l = this.lem(id);
      if (!this.canAssign(l, skill)) return false;
      if (!this.infinite) this.skills[skill]--;
      this.used[skill]++;
      this.actions.push({ t: this.tick, a: "assign", id, skill });
      if (skill === "bomber") { l.fuse = C.FUSE; }
      else {
        const st = { blocker: ST.BLOCK, builder: ST.BUILD, basher: ST.BASH, miner: ST.MINE, digger: ST.DIG }[skill];
        this.setState(l, st);
        if (st === ST.BUILD) { l.bricks = C.BRICKS; l.t = C.BUILD_PERIOD - 3; }
      }
      this.emit("assign", l.x, l.y - 8, { skill });
      return true;
    }

    setRate(v) {
      v = Math.max(this.rateMin, Math.min(99, v | 0));
      if (v === this.rate) return;
      this.rate = v;
      this.actions.push({ t: this.tick, a: "rate", v });
    }

    nuke() {
      if (this.nuked) return;
      this.nuked = true;
      this.actions.push({ t: this.tick, a: "nuke" });
      let k = 0;
      for (const l of this.lems) {
        if (l.state === ST.OUT || l.state === ST.DIE || l.state === ST.EXIT) continue;
        if (l.fuse < 0) l.fuse = C.FUSE + k++;
      }
    }

    applyAction(a) {
      if (a.a === "assign") return this.assign(a.id, a.skill);
      if (a.a === "rate") return this.setRate(a.v);
      if (a.a === "nuke") return this.nuke();
    }

    setState(l, st) { l.state = st; l.t = 0; }

    /* --------------------------------------------------------------- step */
    step() {
      if (this.status !== "play") return;
      this.spawn();
      const blockers = [];
      for (const l of this.lems) if (l.state === ST.BLOCK) blockers.push(l);
      for (const l of this.lems) this.update(l, blockers);
      this.tick++;
      this.checkEnd();
    }

    spawn() {
      if (this.nuked || this.spawned >= this.total) return;
      if (--this.spawnTimer > 0) return;
      const e = this.entrances[this.spawnIdx % this.entrances.length];
      this.spawnIdx++;
      const l = new Lemming(this.nextId++, e.x, e.y, e.dir);
      this.lems.push(l);
      this.spawned++;
      this.spawnTimer = spawnInterval(this.rate);
      this.emit("spawn", e.x, e.y);
    }

    /* debug tooling: drop an extra lemming anywhere (not part of replays) */
    debugSpawn(x, y, dir) {
      const l = new Lemming(this.nextId++, x | 0, y | 0, dir || 1);
      l.debug = true;
      this.lems.push(l);
      this.total++; this.spawned++;
      return l;
    }

    checkEnd() {
      const finished = (this.spawned >= this.total || this.nuked) && this.out === 0;
      const timeUp = this.tick >= this.timeLimit;
      if (!finished && !timeUp) return;
      if (timeUp) for (const l of this.lems) if (l.state !== ST.OUT && l.state !== ST.EXIT) l.state = ST.OUT;
      this.status = this.saved >= this.need ? "won" : "lost";
      this.endReason = finished ? "done" : "time";
    }

    kill(l, cause) {
      if (l.state === ST.DIE || l.state === ST.OUT) return;
      l.cause = cause;
      l.fuse = -1;
      this.setState(l, ST.DIE);
      this.emit("die", l.x, l.y, { cause });
    }

    update(l, blockers) {
      const t = this.terrain;
      if (l.state === ST.OUT) return;
      l.t++;

      if (l.state === ST.DIE) { if (l.t >= C.DIE_TICKS) { l.state = ST.OUT; this.dead++; } return; }
      if (l.state === ST.EXIT) { if (l.t >= C.EXIT_TICKS) { l.state = ST.OUT; l.saved = true; this.saved++; } return; }

      /* bomb fuse */
      if (l.fuse >= 0) {
        if (l.fuse === 0) { this.explode(l); return; }
        l.fuse--;
      }

      switch (l.state) {
        case ST.FALL: this.doFall(l); break;
        case ST.WALK: this.doWalk(l, blockers); break;
        case ST.BUILD: this.doBuild(l, blockers); break;
        case ST.SHRUG: if (l.t >= C.SHRUG_TICKS) this.setState(l, ST.WALK); break;
        case ST.DIG: this.doDig(l); break;
        case ST.BASH: this.doBash(l, blockers); break;
        case ST.MINE: this.doMine(l, blockers); break;
        case ST.BLOCK: if (!t.solid(l.x, l.y + 1)) this.startFall(l); break;
      }
      if (l.state === ST.DIE || l.state === ST.OUT) return;

      /* hazards and the bottom of the world */
      if (l.y >= this.H) { this.kill(l, "void"); return; }
      if (t.lethal(l.x, l.y)) { this.kill(l, t.get(l.x, l.y) === M.LAVA ? "burn" : "drown"); return; }

      /* exits */
      if (l.state === ST.WALK || l.state === ST.FALL || l.state === ST.SHRUG) {
        for (const e of this.exits) {
          if (Math.abs(l.x - e.x) <= C.EXIT_RX && l.y <= e.y && l.y >= e.y - C.EXIT_RY) {
            this.setState(l, ST.EXIT);
            l.x = e.x;
            this.emit("exit", e.x, e.y);
            break;
          }
        }
      }
    }

    startFall(l) { this.setState(l, ST.FALL); l.fall = 0; }

    doFall(l) {
      const t = this.terrain;
      for (let i = 0; i < C.FALL_SPEED; i++) {
        if (t.solid(l.x, l.y + 1)) {
          if (l.fall > C.SPLAT) { this.kill(l, "splat"); return; }
          this.setState(l, ST.WALK);
          this.emit("land", l.x, l.y);
          return;
        }
        l.y++; l.fall++;
        if (t.lethal(l.x, l.y) || l.y >= this.H) return;
      }
    }

    /* Is a blocker in the way of l moving in its current direction? */
    blockedBy(l, blockers) {
      for (const b of blockers) {
        if (b === l) continue;
        const dx = b.x - l.x;
        if (dx === 0 || Math.abs(dx) > C.BLOCK_RX) continue;
        if (l.y < b.y - 10 || l.y > b.y + 4) continue;
        if (Math.sign(dx) === l.dir) return true;
      }
      return false;
    }

    /* One horizontal walking step. Returns false if it turned around. */
    walkStep(l) {
      const t = this.terrain;
      const nx = l.x + l.dir;
      let up = -1;
      for (let s = 0; s <= C.STEP_UP; s++) if (!t.solid(nx, l.y - s)) { up = s; break; }
      if (up < 0) { l.dir = -l.dir; return false; }        // wall
      l.x = nx; l.y -= up;
      if (!t.solid(l.x, l.y + 1)) {
        let d = 1;
        while (d <= C.STEP_DOWN && !t.solid(l.x, l.y + 1 + d)) d++;
        if (d <= C.STEP_DOWN) l.y += d;      // ground at y+1+d -> feet at y+d
        else this.startFall(l);
      }
      return true;
    }

    doWalk(l, blockers) {
      if (this.blockedBy(l, blockers)) l.dir = -l.dir;
      this.walkStep(l);
    }

    doBuild(l, blockers) {
      const t = this.terrain;
      if (this.blockedBy(l, blockers)) { l.dir = -l.dir; this.setState(l, ST.WALK); return; }
      if (l.t % C.BUILD_PERIOD !== 0) return;
      const d = l.dir;
      /* lay a brick: 2 rows at feet level, BRICK_W long, starting just behind */
      t.fillRect(l.x - d, l.y - C.STEP_Y + 1, l.x + d * (C.BRICK_W - 2), l.y, M.BRICK);
      l.bricks--;
      this.emit("brick", l.x + d * 3, l.y, { left: l.bricks });
      /* walk up onto it unless the way is blocked */
      const nx = l.x + d * C.STEP_X, ny = l.y - C.STEP_Y;
      let blocked = false;
      for (let k = 1; k <= C.LEM_H - 2 && !blocked; k++) {
        for (let c = 0; c <= 2; c++) if (t.solid(nx + d * c, ny - k)) { blocked = true; break; }
      }
      if (blocked) { l.dir = -d; this.setState(l, ST.WALK); this.emit("bump", l.x, l.y); return; }
      l.x = nx; l.y = ny;
      if (l.bricks <= 0) { this.setState(l, ST.SHRUG); this.emit("shrug", l.x, l.y); }
    }

    doDig(l) {
      const t = this.terrain;
      if (l.t % C.DIG_PERIOD !== 0) return;
      const row = l.y + 1, px = [];
      for (let x = l.x - C.DIG_HALF; x <= l.x + C.DIG_HALF; x++) px.push(x, row);
      if (t.anyBlocking(px, 0)) { this.setState(l, ST.WALK); this.emit("clink", l.x, row); return; }
      if (!t.anyRemovable(px, 0)) { this.startFall(l); return; }
      const mat = this.matOf(px, 0);
      t.removePixels(px, 0);
      l.y++;
      this.emit("dig", l.x, row, { mat, dir: l.dir });
      if (!t.solid(l.x, l.y + 1)) {
        /* through the floor: is there anything left under the hole edge? */
        let any = false;
        for (let x = l.x - C.DIG_HALF; x <= l.x + C.DIG_HALF; x++) if (t.solid(x, l.y + 1)) { any = true; break; }
        if (!any) this.startFall(l);
      }
    }

    bashArea(l) {
      const px = [], d = l.dir;
      for (let c = 1; c <= C.BASH_REACH; c++)
        for (let y = l.y - C.LEM_H + 1; y <= l.y; y++) px.push(l.x + d * c, y);
      return px;
    }

    doBash(l, blockers) {
      const t = this.terrain, d = l.dir;
      if (this.blockedBy(l, blockers)) { l.dir = -d; this.setState(l, ST.WALK); return; }
      if (l.t % C.BASH_PERIOD !== 0) return;
      /* anything left to bash within reach? (checked at body height) */
      const look = [];
      for (let c = 1; c <= C.BASH_LOOK; c++)
        for (let y = l.y - C.LEM_H + 3; y <= l.y - 2; y++) look.push(l.x + d * c, y);
      if (!t.anyRemovable(look, d) && l.t > C.BASH_PERIOD) { this.setState(l, ST.WALK); return; }
      const area = this.bashArea(l);
      if (t.anyBlocking(area, d)) { this.setState(l, ST.WALK); this.emit("clink", l.x + d * 3, l.y - 6); return; }
      if (!t.anyRemovable(look, d)) { this.setState(l, ST.WALK); return; }
      const mat = this.matOf(area, d);
      t.removePixels(area, d);
      this.emit("bash", l.x + d * 4, l.y - 6, { mat, dir: d });
      for (let i = 0; i < C.BASH_ADVANCE; i++) {
        l.x += d;
        if (!t.solid(l.x, l.y + 1)) {
          let dn = 0;
          while (dn < C.STEP_DOWN && !t.solid(l.x, l.y + 1 + dn)) dn++;
          if (t.solid(l.x, l.y + 1 + dn)) { l.y += dn; }
          else { this.startFall(l); return; }
        }
      }
    }

    doMine(l, blockers) {
      const t = this.terrain, d = l.dir;
      if (this.blockedBy(l, blockers)) { l.dir = -d; this.setState(l, ST.WALK); return; }
      if (l.t % C.MINE_PERIOD !== 0) return;
      const a = C.MINE_ADVANCE, px = [];
      for (let c = 0; c <= 6; c++) {
        const top = l.y - C.LEM_H + 1 + Math.floor(c / 2) + a;
        const bot = l.y + a;
        for (let y = top; y <= bot; y++) px.push(l.x + d * c, y);
      }
      if (t.anyBlocking(px, d)) { this.setState(l, ST.WALK); this.emit("clink", l.x + d * 3, l.y); return; }
      const mat = this.matOf(px, d);
      t.removePixels(px, d);
      this.emit("mine", l.x + d * 4, l.y - 2, { mat, dir: d });
      l.x += d * a; l.y += a;
      if (!t.solid(l.x, l.y + 1)) this.startFall(l);
    }

    explode(l) {
      const t = this.terrain, px = [], r = C.BOOM_R, cx = l.x, cy = l.y - 5;
      for (let y = cy - r; y <= cy + r; y++)
        for (let x = cx - r; x <= cx + r; x++)
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) px.push(x, y);
      t.removePixels(px, 0);
      this.emit("boom", cx, cy);
      l.cause = "boom";
      l.fuse = -1;
      l.state = ST.OUT;
      this.dead++;
    }
  }

  /* ---------------------------------------------------------------- replay
     Run a list of recorded actions headlessly. Returns the finished sim. */
  function runReplay(level, actions, opts) {
    opts = opts || {};
    const sim = new Sim(level, opts);
    const queue = actions.slice().sort((a, b) => a.t - b.t);
    let qi = 0;
    const maxTicks = opts.maxTicks || sim.timeLimit + 10;
    const failures = [];
    while (sim.status === "play" && sim.tick < maxTicks) {
      while (qi < queue.length && queue[qi].t <= sim.tick) {
        const a = queue[qi++];
        const ok = sim.applyAction(a);
        if (a.a === "assign" && !ok) failures.push(a);
      }
      sim.events.length = 0;
      sim.step();
      if (opts.onTick) opts.onTick(sim);
    }
    sim.failedActions = failures;
    return sim;
  }

  OL.Lemming = Lemming;
  OL.Sim = Sim;
  OL.runReplay = runReplay;
})();
