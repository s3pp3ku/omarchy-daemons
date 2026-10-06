/* omarchy lemmings — shell, HUD, input and the game loop.
   Everything the player touches lives here; the engine stays DOM-free. */

"use strict";

(function () {
  const { Engine, ST, CELL, GRID_W, GRID_H } = ENGINE;
  const SKILL_ORDER = SKILLS;

  const SAVE_KEY = "omarchy-lemmings.save";
  const PREF_KEY = "omarchy-lemmings.prefs";

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const app = {
    mode: "menu",          /* menu | play */
    engine: null,
    level: null,
    index: 0,
    theme: THEMES.jungle,
    selected: null,
    focused: null,
    targeting: false,
    notice: "",
    hover: null,
    mx: 0, my: 0,
    inside: false,
    paused: false,
    speed: 1,
    sound: new AUDIO.Sound(),
    save: { unlocked: 1, best: {} },
    prefs: { muted: false, speed: 1 },
    last: 0,
    acc: 0,
    raf: 0,
  };

  /* ------------------------------------------------------------- storage */
  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (s && typeof s === "object") app.save = Object.assign(app.save, s);
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
      if (p && typeof p === "object") app.prefs = Object.assign(app.prefs, p);
    } catch (err) { /* first run, or storage disabled */ }
  }
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(app.save));
      localStorage.setItem(PREF_KEY, JSON.stringify(app.prefs));
    } catch (err) { /* nothing we can do, keep playing */ }
  }

  /* -------------------------------------------------------------- skills */
  function resetSkills() {
    const lv = app.level.skills || {};
    app.tokens = {};
    for (const s of SKILL_ORDER) app.tokens[s.id] = lv[s.id] || 0;
  }
  function skillList() {
    return SKILL_ORDER.map((s) => Object.assign({}, s, { left: app.tokens[s.id] }));
  }
  function take(id) {
    const s = SKILL_BY_ID[id];
    if (!s || !app.tokens[id]) return false;
    const trait = id === "sudo" || id === "nohup";
    if (!trait) app.tokens[id]--;
    return true;
  }
  function giveBack(id) {
    const s = SKILL_BY_ID[id];
    if (!s) return;
    if (id === "sudo" || id === "nohup") return;
    app.tokens[id]++;
  }

  /* --------------------------------------------------------------- theme */
  function applyTheme(name) {
    const t = THEMES[name] || THEMES.jungle;
    app.theme = t;
    const root = document.documentElement;
    const set = (k, v) => root.style.setProperty(k, v);
    set("--bg", t.background);
    set("--bg-dark", t.dark_background);
    set("--bg-darker", t.darker_background);
    set("--bg-light", t.lighter_background);
    set("--fg", t.foreground);
    set("--fg-dark", t.dark_foreground);
    set("--fg-light", t.light_foreground);
    set("--accent", t.accent);
    set("--selection", t.selection);
    set("--muted", t.muted);
    set("--red", t.red);
    set("--yellow", t.yellow);
    set("--orange", t.orange);
    set("--green", t.green);
    set("--cyan", t.cyan);
    set("--blue", t.blue);
    set("--magenta", t.magenta);
    set("--brown", t.brown);
    set("--c1", t.border[0]);
    set("--c2", t.border[1]);
    root.setAttribute("data-theme", name);
    if (app.renderer) app.renderer.setTheme(t);
  }

  /* ------------------------------------------------------------ skeleton */
  function buildShell() {
    const bar = $("#bar");
    bar.innerHTML = "";
    const left = el("div", "bar-group");
    const brand = el("button", "brand");
    brand.innerHTML = "<span class=\"brand-mark\">omarchy</span><span class=\"brand-sub\">lemmings</span>";
    brand.title = "Level select";
    brand.addEventListener("click", () => openLevels());
    left.appendChild(brand);
    const lvl = el("div", "bar-level");
    lvl.appendChild(el("span", "lvl-id", "—"));
    lvl.appendChild(el("span", "lvl-name", "no level"));
    left.appendChild(lvl);
    bar.appendChild(left);

    const mid = el("div", "bar-group bar-stats");
    for (const [k, id] of [["saved", "stat-saved"], ["dead", "stat-dead"], ["out", "stat-out"], ["time", "stat-time"]]) {
      const w = el("div", "stat " + k);
      w.appendChild(el("span", "stat-k", k));
      w.appendChild(el("span", "stat-v", "0"));
      w.id = id;
      mid.appendChild(w);
    }
    bar.appendChild(mid);

    const right = el("div", "bar-group bar-actions");
    const help = el("button", "chip", "? help");
    help.title = "W — open help";
    help.setAttribute("aria-keyshortcuts", "W");
    help.addEventListener("click", openHelp);
    const pause = el("button", "chip", "pause");
    pause.id = "btn-pause";
    pause.title = "Space — pause or resume";
    pause.setAttribute("aria-keyshortcuts", "Space");
    pause.addEventListener("click", () => togglePause());
    const mute = el("button", "chip", "sound");
    mute.id = "btn-mute";
    mute.addEventListener("click", () => toggleMute());
    const restart = el("button", "chip", "restart");
    restart.id = "btn-restart";
    restart.title = "R — restart level";
    restart.setAttribute("aria-keyshortcuts", "R");
    restart.addEventListener("click", () => loadLevel(app.index));
    const quit = el("button", "chip", "quit");
    quit.title = "Q — save and quit";
    quit.setAttribute("aria-keyshortcuts", "Q");
    quit.addEventListener("click", saveAndQuit);
    right.append(help, pause, mute, restart, quit);
    bar.appendChild(right);

    const dock = $("#dock");
    dock.innerHTML = "";
    dock.appendChild(el("span", "dock-label", "skills"));
    const list = el("div", "dock-list");
    list.id = "skill-list";
    for (const s of SKILL_ORDER) {
      const b = el("button", "skill");
      b.dataset.id = s.id;
      b.innerHTML =
        `<span class="k">${s.key}</span>` +
        `<span class="cmd">${s.label}</span>` +
        `<span class="verb">${s.verb}</span>` +
        `<span class="n">0</span>`;
      b.title = s.desc;
      b.setAttribute("aria-label", `${s.label}. Keyboard ${s.key}. Available uses shown top right.`);
      b.addEventListener("click", () => select(s.id));
      b.addEventListener("mouseenter", () => showTip(s));
      b.addEventListener("mouseleave", hideTip);
      list.appendChild(b);
    }
    dock.appendChild(list);
    const hint = el("div", "dock-hint", "top-right = uses  ·  W help  ·  Space pause  ·  F fast  ·  Q save & quit  ·  arrows/Enter menus");
    hint.id = "hint";
    dock.appendChild(hint);

    const tip = el("div", "tip");
    tip.id = "tip";
    $("#stage").appendChild(tip);
  }

  function showTip(s) {
    const tip = $("#tip");
    tip.textContent = `${s.desc}  ·  ${s.key}`;
    tip.classList.add("on");
  }
  function hideTip() { $("#tip").classList.remove("on"); }

  /* -------------------------------------------------------------- HUD */
  let prevHud = {};
  function hud(force) {
    const e = app.engine;
    if (!e) return;
    const req = e.require;
    const put = (id, v) => {
      if (!force && prevHud[id] === v) return;
      prevHud[id] = v;
      const n = document.getElementById(id);
      if (n) n.querySelector(".stat-v").textContent = v;
    };
    put("stat-saved", `${e.saved}/${req}`);
    put("stat-dead", String(e.dead));
    put("stat-out", String(Math.max(0, e.level.total - e.saved - e.dead)));
    const secs = Math.ceil(e.time / 60);
    put("stat-time", `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`);
    const bar = $("#bar");
    const idn = bar.querySelector(".lvl-id"), nm = bar.querySelector(".lvl-name");
    if (force || prevHud.lid !== e.level.id) {
      prevHud.lid = e.level.id;
      idn.textContent = String(e.level.id).padStart(2, "0");
      nm.textContent = e.level.title;
    }
    const list = $("#skill-list");
    for (const b of list.children) {
      const left = app.tokens[b.dataset.id];
      const n = b.querySelector(".n");
      const permanent = b.dataset.id === "sudo" || b.dataset.id === "nohup";
      const txt = left > 0 ? (permanent ? "∞" : `${left} uses`) : "—";
      if (n.textContent !== txt) n.textContent = txt;
      b.classList.toggle("empty", left <= 0);
      b.classList.toggle("on", app.selected === b.dataset.id);
    }
    const hint = $("#hint");
    const txt = app.notice || (app.selected
      ? `$ ${app.selected} selected — click a lemming to use it  ·  esc cancels`
      : app.focused
        ? `lemming #${app.focused.id} selected — choose a skill below`
        : "click a skill, then a lemming  ·  W help  ·  space pause");
    if (hint.textContent !== txt) hint.textContent = txt;
  }

  /* ---------------------------------------------------------- overlays */
  function closeOverlay() {
    const ov = $("#overlay");
    ov.classList.remove("on");
    ov.innerHTML = "";
  }
  function overlay(card) {
    const ov = $("#overlay");
    ov.innerHTML = "";
    ov.appendChild(card);
    ov.classList.add("on");
  }
  function panel(cls) {
    const p = el("div", "panel " + (cls || ""));
    return p;
  }
  function button(label, cls, fn) {
    const b = el("button", "btn " + (cls || ""), label);
    b.addEventListener("click", fn);
    return b;
  }

  function showIntro(level, index, first, resume) {
    const p = panel("intro");
    const h = el("h1", null, level.title);
    const sub = el("p", "kicker", `level ${String(level.id).padStart(2, "0")} / 08 · ${app.theme.label} theme · ${level.total} lemmings`);
    const brief = el("p", "brief", level.brief || "");
    const hint = el("p", "hint-line", level.hint || "");
    const meta = el("div", "meta");
    meta.appendChild(el("span", null, `save ${level.required}%`));
    meta.appendChild(el("span", null, `time ${level.time}s`));
    meta.appendChild(el("span", null, `theme ${THEMES[level.theme].label}`));
    const altLine = level.alt
      ? el("p", "hint-line alt-line", `more than one way through — ${level.alt}`)
      : null;
    const row = el("div", "row");
    row.appendChild(button(resume ? "resume" : "start", "primary", () => togglePause(false)));
    row.appendChild(button("levels", "", openLevels));
    const parts = [sub, h, brief, hint];
    if (altLine) parts.push(altLine);
    parts.push(meta, row);
    p.append(...parts);
    overlay(p);
    const b = p.querySelector(".btn.primary");
    if (b) b.focus();
    if (first) app.sound.play("select");
  }

  function togglePause(force) {
    if (!app.engine || app.mode !== "play") return;
    if (app.engine.status !== "playing") return;
    app.paused = force != null ? force : !app.paused;
    app.engine.frozen = app.paused;
    if (app.paused) {
      const p = panel("pause");
      p.append(el("h1", null, "paused"));
      p.append(el("p", "brief", app.engine.level.brief || ""));
      const row = el("div", "row");
      row.appendChild(button("resume", "primary", () => togglePause(false)));
      row.appendChild(button("restart", "", () => loadLevel(app.index)));
      row.appendChild(button("save & quit", "", saveAndQuit));
      row.appendChild(button("levels", "", openLevels));
      p.appendChild(row);
      overlay(p);
    } else {
      closeOverlay();
    }
  }

  function finish(won) {
    const e = app.engine;
    const lvl = e.level;
    if (won) {
      const id = String(lvl.id);
      app.save.best[id] = Math.max(app.save.best[id] || 0, e.saved);
      app.save.unlocked = Math.max(app.save.unlocked, Math.min(LEVELS.length, Number(lvl.id) + 1));
      persist();
    }
    const p = panel(won ? "win" : "lose");
    p.append(el("h1", null, won ? "saved" : "lost"));
    const stat = el("p", "brief");
    stat.innerHTML = `<strong>${e.saved}</strong> saved of ${lvl.total} &middot; ${e.dead} lost &middot; ${e.require} needed`;
    p.appendChild(stat);
    if (won) {
      const best = app.save.best[String(lvl.id)];
      if (best) p.appendChild(el("p", "hint-line", `best run: ${best} saved`));
    } else {
      p.appendChild(el("p", "hint-line", "the clock ran out or too few made it — try a different plan"));
    }
    const row = el("div", "row");
    if (won && Number(lvl.id) < LEVELS.length) {
      row.appendChild(button("next level", "primary", () => loadLevel(LEVELS.findIndex((l) => Number(l.id) === Number(lvl.id) + 1))));
    } else if (won) {
      row.appendChild(button("all done", "primary", openLevels));
    } else {
      row.appendChild(button("retry", "primary", () => loadLevel(app.index)));
    }
    row.appendChild(button("levels", "", openLevels));
    p.appendChild(row);
    overlay(p);
  }

  function openLevels() {
    app.mode = "levels";
    app.paused = true;
    if (app.engine) app.engine.frozen = true;
    const p = panel("levels");
    p.append(el("h1", null, "select level"));
    const grid = el("div", "grid");
    LEVELS.forEach((lv, i) => {
      const locked = Number(lv.id) > app.save.unlocked;
      const card = el("button", "card" + (locked ? " locked" : "") + (i === app.index ? " current" : ""));
      const t = THEMES[lv.theme];
      card.style.setProperty("--card-accent", t.accent);
      card.style.setProperty("--card-bg", t.background);
      card.appendChild(el("span", "card-id", String(lv.id).padStart(2, "0")));
      card.appendChild(el("span", "card-title", locked ? "locked" : lv.title));
      card.appendChild(el("span", "card-theme", locked ? "—" : t.label));
      const best = app.save.best[String(lv.id)];
      card.appendChild(el("span", "card-best", best ? `best ${best}` : "unplayed"));
      if (!locked) card.addEventListener("click", () => loadLevel(i));
      grid.appendChild(card);
    });
    p.appendChild(grid);
    const row = el("div", "row");
    if (app.engine && app.engine.status === "playing") {
      row.appendChild(button("close", "", () => { app.mode = "play"; togglePause(false); }));
    }
    const reset = button("reset progress", "ghost", () => {
      app.save = { unlocked: 1, best: {} };
      app.save.current = 1;
      persist();
      openLevels();
    });
    row.appendChild(reset);
    p.appendChild(row);
    overlay(p);
  }

  function openHelp() {
    const p = panel("help");
    p.append(el("h1", null, "how to play"));
    p.append(el("p", "brief", "Choose a skill, then click a walking lemming. You can also click a lemming first, then choose a skill."));
    const list = el("div", "help-list");
    const rows = [
      ["click skill → lemming", "assign an available skill"],
      ["shift + click", "apply that skill to every lemming that can take it"],
      ["A / D", "pan the level left and right"],
      ["1–8", "choose a skill"],
      ["W", "open this help"],
      ["Space", "pause / resume"],
      ["R", "restart the level"],
      ["N", "next level after winning"],
      ["M", "mute / unmute"],
      ["F", "fast-forward after your plan is set"],
      ["Esc / right-click", "cancel skill selection"],
      ["Quit", "save this level and close with Alt+F4"],
    ];
    for (const [key, value] of rows) list.append(el("div", "help-row", `${key} — ${value}`));
    p.append(list);
    const row = el("div", "row");
    row.appendChild(button("close", "primary", () => { app.mode = "play"; closeOverlay(); }));
    p.append(row);
    overlay(p);
  }

  function saveAndQuit() {
    if (app.level) app.save.current = Number(app.level.id);
    persist();
    app.paused = true;
    if (app.engine) app.engine.frozen = true;
    const p = panel("quit");
    p.append(el("h1", null, "progress saved"));
    p.append(el("p", "brief", `Level ${app.level ? app.level.id : 1} is saved. Close this browser window with Alt+F4.`));
    const row = el("div", "row");
    row.appendChild(button("keep playing", "primary", () => togglePause(false)));
    row.appendChild(button("levels", "", openLevels));
    p.append(row);
    overlay(p);
    try { window.close(); } catch (err) { /* browser may refuse scripted close */ }
  }

  /* -------------------------------------------------------- level setup */
  function loadLevel(index, opts) {
    const lv = LEVELS[index];
    if (!lv) return;
    const locked = Number(lv.id) > app.save.unlocked;
    if (locked && !forceLevel(lv.id)) return;
    app.index = index;
    app.level = lv;
    app.save.current = Number(lv.id);
    persist();
    app.mode = "play";
    applyTheme(lv.theme);
    app.engine = new Engine(lv, { speed: app.speed });
    app.selected = null;
    app.focused = null;
    app.hover = null;
    app.paused = true;          /* the intro panel holds the clock */
    app.engine.frozen = true;
    resetSkills();
    $("#btn-pause").textContent = "pause";
    prevHud = {};
    hud(true);
    showIntro(lv, index, false, opts && opts.resume);
  }
  function forceLevel(id) {
    const i = LEVELS.findIndex((l) => l.id === id);
    if (i < 0) return false;
    app.save.unlocked = Math.max(app.save.unlocked, Number(id));
    persist();
    return true;
  }

  /* -------------------------------------------------------------- input */
  function select(id) {
    if (!app.tokens[id]) { app.sound.play("denied"); flashSkill(id); return; }
    app.selected = app.selected === id ? null : id;
    app.sound.play("select");
    if (app.focused && app.selected && app.engine.canAssign(app.focused, app.selected)) {
      assign(app.focused, app.selected);
    }
    hud(true);
  }
  function flashSkill(id) {
    const b = document.querySelector(`.skill[data-id="${id}"]`);
    if (!b) return;
    b.classList.add("shake");
    setTimeout(() => b.classList.remove("shake"), 320);
  }

  function pointerPos(ev) {
    const c = app.canvas;
    const r = c.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * RENDER.W + (app.renderer ? app.renderer.cameraX : 0),
      y: ((ev.clientY - r.top) / r.height) * RENDER.H,
    };
  }
  function lemmingAt(x, y) {
    const e = app.engine;
    if (!e) return null;
    let best = null, bd = 1e9;
    for (const l of e.lems) {
      if (l.state === ST.DEAD) continue;
      const dx = x - (l.x + 6), dy = y - (l.y + 10);
       if (Math.abs(dx) > 30 || Math.abs(dy) > 26) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }

  function bindInput() {
    const c = app.canvas;
    window.addEventListener("pointerdown", () => app.sound.unlock(), { passive: true });
    c.addEventListener("mousemove", (ev) => {
      const p = pointerPos(ev);
      app.mx = p.x; app.my = p.y; app.inside = true;
      app.hover = lemmingAt(p.x, p.y);
      c.style.cursor = app.hover ? "pointer" : "crosshair";
    });
    c.addEventListener("mouseleave", () => { app.inside = false; app.hover = null; });
    c.addEventListener("mousedown", (ev) => {
      app.sound.unlock();
       if (ev.button === 2) {
         app.selected = null; app.focused = null; app.notice = "";
         if (app.targeting) { app.targeting = false; app.paused = false; app.engine.frozen = false; $("#btn-pause").textContent = "pause"; }
         hud(true); return;
       }
      const p = pointerPos(ev);
      const l = lemmingAt(p.x, p.y);
       if (!l) {
         app.selected = null; app.focused = null; app.notice = "";
         if (app.targeting) { app.targeting = false; app.paused = false; app.engine.frozen = false; $("#btn-pause").textContent = "pause"; }
         hud(true); return;
       }
app.focused = l;
       if (!app.selected) { hud(true); return; }
       if (ev.shiftKey) { applyToAll(app.selected); return; }
       assign(l, app.selected);
    });
    c.addEventListener("contextmenu", (ev) => ev.preventDefault());

    window.addEventListener("keydown", (ev) => {
      const k = ev.key;
      if (k >= "1" && k <= "8") { select(SKILL_ORDER[Number(k) - 1].id); ev.preventDefault(); return; }
      switch (k.toLowerCase()) {
        case "escape":
           if (app.selected || app.focused) {
             app.selected = null; app.focused = null; app.notice = "";
             if (app.targeting) { app.targeting = false; app.paused = false; app.engine.frozen = false; $("#btn-pause").textContent = "pause"; }
             hud(true);
           }
          else if (app.paused && app.engine && app.engine.status === "playing") togglePause(false);
          break;
        case " ": togglePause(); ev.preventDefault(); break;
        case "r": if (app.engine) loadLevel(app.index); break;
        case "m": toggleMute(); break;
        case "w": openHelp(); ev.preventDefault(); break;
        case "f": cycleSpeed(1); ev.preventDefault(); break;
        case "a": panCamera(-1); ev.preventDefault(); break;
        case "d": panCamera(1); ev.preventDefault(); break;
        case "q": saveAndQuit(); ev.preventDefault(); break;
        case "n": {
          const i = LEVELS.findIndex((l) => Number(l.id) === (app.level ? Number(app.level.id) + 1 : 1));
          if (i >= 0) loadLevel(i);
          break;
        }
      }
    });

      window.addEventListener("blur", () => { if (app.engine && app.engine.status === "playing") togglePause(true); });

    window.addEventListener("keydown", navigateButtons);
  }

  function navigateButtons(ev) {
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    const root = document.querySelector("#overlay.on") || document.querySelector("#skill-list");
    if (!root || !arrows.includes(ev.key)) return;
    const buttons = [...root.querySelectorAll("button:not([disabled])")];
    if (!buttons.length) return;
    const current = document.activeElement;
    let i = buttons.indexOf(current);
    if (i < 0) i = ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? 0 : -1;
    const next = ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? i - 1 : i + 1;
    buttons[(next + buttons.length) % buttons.length].focus();
    ev.preventDefault();
  }

  /* shift-click: apply the selected skill to every lemming that can take it,
     which is far kinder than clicking each one on a trackpad */
  function applyToAll(id) {
    const e = app.engine;
    if (!e || !id) return;
    let n = 0;
    for (const l of e.lems) {
      if (l.state !== ST.WALK || !e.canAssign(l, id)) continue;
      if (!take(id)) break;
      e.assign(l, id);
      n++;
    }
    app.focused = null;
    app.notice = n ? `${id} → ${n} lemmings` : `no lemming can take ${id} right now`;
    app.sound.play(n ? "assign" : "denied");
    hud(true);
    setTimeout(() => { app.notice = ""; hud(true); }, 1800);
  }

  function assign(l, id) {
    const e = app.engine;
    if (!e.canAssign(l, id)) {
      app.sound.play("denied");
      flashSkill(id);
      app.notice = id === "bash"
        ? "bash armed — it will walk to the next dirt wall and tunnel through"
        : `${id} cannot be used on this lemming right now`;
      hud(true);
      setTimeout(() => { app.notice = ""; hud(true); }, 2200);
      return false;
    }
    if (!take(id)) { app.sound.play("denied"); flashSkill(id); return false; }
    e.assign(l, id);
    app.sound.play("assign");
    app.notice = `${id} assigned — play resumed`;
    if (SKILL_BY_ID[id] && (id === "make" || id === "bash" || id === "dig" || id === "rm" || id === "flock")) {
      app.selected = null;
    }
    app.focused = null;
    app.targeting = false;
    app.paused = false;
    e.frozen = false;
    $("#btn-pause").textContent = "pause";
    setTimeout(() => { app.notice = ""; hud(true); }, 1800);
    hud(true);
    return true;
  }

  /* ------------------------------------------------------------ chrome */
  function panCamera(dir) {
    const r = app.renderer;
    if (!r) return;
    const max = Math.max(0, ENGINE.GRID_W * CELL - r.canvas.clientWidth);
    r.cameraX = Math.max(0, Math.min(max, r.cameraX + dir * 160));
  }

  function cycleSpeed(dir) {
    const steps = [1, 8];
    let i = steps.indexOf(app.speed);
    if (i < 0) i = 0;
    i = dir ? (i + (dir > 0 ? 1 : steps.length - 1)) % steps.length : (i + 1) % steps.length;
    app.speed = steps[i];
    app.prefs.speed = app.speed;
    if (app.engine) app.engine.speed = app.speed;
    persist();
  }
  function toggleMute() {
    app.prefs.muted = !app.prefs.muted;
    app.sound.setMuted(app.prefs.muted);
    $("#btn-mute").textContent = app.prefs.muted ? "muted" : "sound";
    $("#btn-mute").classList.toggle("off", app.prefs.muted);
    persist();
  }

  /* -------------------------------------------------------------- loop */
  function step() {
    const e = app.engine;
    if (!e) return;
    const before = e.status;
    e.tick();
    for (const ev of e.drainEvents()) app.sound.handle(ev);
    if (before === "playing" && e.status !== "playing") {
      app.engine.frozen = true;
      finish(e.status === "won");
    }
  }

  function loop(ts) {
    app.raf = requestAnimationFrame(loop);
    const dt = Math.min(100, ts - (app.last || ts));
    app.last = ts;
    if (app.engine && !app.paused) {
      app.acc += dt;
      const stepMs = 1000 / 60;
      let n = Math.floor(app.acc / stepMs) * app.speed;
      if (n > 12 * app.speed) n = 12 * app.speed;   /* never spiral */
      app.acc -= Math.floor(app.acc / stepMs) * stepMs;
      while (n-- > 0) step();
      hud();
    }
    if (app.engine) {
      app.renderer.draw(app.engine, {
        hover: (app.hover || app.focused) && (app.hover || app.focused).state !== ST.DEAD ? (app.hover || app.focused) : null,
        selected: app.selected,
        legal: app.hover ? app.engine.canAssign(app.hover, app.selected) : false,
        mx: app.mx, my: app.my,
        screenX: app.mx - app.renderer.cameraX,
        inside: app.inside,
        showCursor: false,
        skills: skillList(),
      });
    }
  }

  /* --------------------------------------------------------------- boot */
  function boot() {
    loadStore();
    app.canvas = $("#screen");
    app.renderer = new RENDER.Renderer(app.canvas);
    buildShell();
    bindInput();
    app.speed = 1;
    app.sound.muted = app.prefs.muted;
    $("#btn-mute").textContent = app.prefs.muted ? "muted" : "sound";
    $("#btn-mute").classList.toggle("off", app.prefs.muted);

    /* ?level=3 unlocks that level for inspection, ?mute=1 starts silent */
    const q = new URLSearchParams(location.search);
    if (q.get("mute") === "1") { app.prefs.muted = true; app.sound.muted = true; }
    const want = Number(q.get("level") || 0);
    const resumeId = Number(app.save.current || 0);
    const requested = want || resumeId;
    let index = LEVELS.findIndex((l) => Number(l.id) === requested);
    if (index < 0) index = 0;
    if (want) { app.save.unlocked = Math.max(app.save.unlocked, want); }
    loadLevel(index, !want && !!resumeId);

    document.body.classList.add("ready");
    app.raf = requestAnimationFrame(loop);
    window.LEMMINGS = app;         /* handy for the console and for tests */
    app.load = loadLevel;           /* ?level=N and automated checks use it */
    app.tick = step;
  }

  window.addEventListener("pagehide", () => {
    if (app.level) app.save.current = Number(app.level.id);
    persist();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
