/* Omarchy Lemmings — game shell: screens, input, loop, HUD, debug panel. */
"use strict";
var OL = globalThis.OL || (globalThis.OL = {});

(function () {
  const C = OL.C, ST = OL.ST, SKILLS = OL.SKILLS;
  const $ = (s) => document.querySelector(s);

  /* The ten-level plan from AGENTS.md. Only built levels are playable. */
  const CAMPAIGN = [
    { slot: 1, id: "boot-sequence", title: "BOOT SEQUENCE" },
    { slot: 2, id: "network-nodes", title: "NETWORK NODES" },
    { slot: 3, id: "dependencies", title: "DEPENDENCIES" },
    { slot: 4, id: "package-cache", title: "PACKAGE CACHE" },
    { slot: 5, id: "firewall", title: "FIREWALL" },
    { slot: 6, id: "vertical-world", title: "VERTICAL WORLD" },
    { slot: 7, id: "the-arch", title: "THE ARCH" },
    { slot: 8, id: "aur-valley", title: "AUR VALLEY" },
    { slot: 9, id: "ice-caverns", title: "ICE CAVERNS" },
    { slot: 10, id: "the-omarch", title: "THE OMARCH" },
  ];
  const SPEEDS = [1, 2, 4];
  const params = new URLSearchParams(location.search);

  const G = {
    screen: "title", sim: null, level: null, r: null,
    paused: false, speedI: 0, acc: 0, last: 0,
    sel: "builder", hover: null, hoverOk: false,
    mouse: null, drag: null, keys: {}, nukeArmed: 0,
    replay: null, debug: params.has("debug"), infinite: false,
    menuI: 0, resultTimer: 0,
  };
  OL.G = G;

  /* ------------------------------------------------------------ storage */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const progress = () => store.get("ol.progress", {});

  /* ------------------------------------------------------------- helpers */
  const pad = (n) => String(n).padStart(2, "0");
  const fmtTime = (ticks) => { const s = Math.ceil(ticks / C.TPS); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
  let toastT = 0;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 1800);
  }

  /* -------------------------------------------------------------- level */
  function startLevel(id, opts) {
    opts = opts || {};
    const lv = OL.getLevel(id);
    if (!lv) { toast("level not found: " + id); return; }
    G.level = lv;
    G.sim = new OL.Sim(lv, { infinite: G.infinite });
    G.r.attach(G.sim);
    G.paused = false; G.speedI = 0; G.acc = 0; G.nukeArmed = 0; G.resultTimer = 0;
    G.replay = opts.replay ? { actions: opts.replay.slice().sort((a, b) => a.t - b.t), i: 0, name: opts.replayName } : null;
    const avail = SKILLS.filter((s) => G.sim.skills[s.id] > 0 || G.infinite);
    if (!avail.find((s) => s.id === G.sel) && avail.length) G.sel = avail[0].id;
    buildSkillBar();
    setScreen("play");
    hideOverlay();
    updateHud(true);
    if (G.replay) toast(`▶ watching ${G.replay.name || "replay"} — input disabled`);
  }

  function restart() { if (G.level) startLevel(G.level.id); }

  function setScreen(s) { G.screen = s; }

  /* --------------------------------------------------------------- loop */
  function frame(ts) {
    const dt = Math.min(100, ts - (G.last || ts));
    G.last = ts;
    const sim = G.sim;
    if (G.screen === "play" && sim) {
      scrollCamera(dt);
      if (!G.paused && sim.status === "play") {
        G.acc += (dt / 1000) * C.TPS * SPEEDS[G.speedI];
        let n = 0;
        while (G.acc >= 1 && n < 40) { tick(); G.acc -= 1; n++; }
        if (n >= 40) G.acc = 0;
      }
      if (!G.paused) G.r.stepParticles();
      if (sim.status !== "play" && !G.resultTimer) {
        G.resultTimer = setTimeout(showResult, 1400);
        OL.Audio.play(sim.status === "won" ? "win" : "lose");
      }
      updateHover();
      G.r.mouse = G.mouse;
      G.r.draw({ hover: G.hover, hoverOk: G.hoverOk, paused: G.paused });
      updateHud();
      if (G.debug) updateDebug();
    } else if (G.r.sim) {
      // menus: keep the last level (or demo) visible and gently panning
      G.r.cam.x += dt * 0.006; if (G.r.cam.x > G.r.sim.W - G.r.viewW()) G.r.cam.x = 0;
      G.r.clampCam();
      G.r.draw({});
    }
    requestAnimationFrame(frame);
  }

  function tick() {
    const sim = G.sim;
    if (G.replay) {
      const q = G.replay.actions;
      while (G.replay.i < q.length && q[G.replay.i].t <= sim.tick) sim.applyAction(q[G.replay.i++]);
    }
    sim.events.length = 0;
    sim.step();
    for (const e of sim.events) {
      const map = { spawn: "spawn", brick: "brick", dig: "dig", bash: "bash", mine: "mine", clink: "clink", shrug: "shrug", boom: "boom", exit: "exit" };
      if (e.type === "die") OL.Audio.play(e.cause === "splat" ? "splat" : e.cause === "burn" ? "burn" : e.cause === "drown" ? "drown" : "splat");
      else if (map[e.type]) OL.Audio.play(map[e.type]);
    }
    if (sim.tick === C.OPEN_DELAY - 16) OL.Audio.play("door");
    G.r.onEvents(sim.events);
  }

  /* ------------------------------------------------------------- camera */
  function scrollCamera(dt) {
    const r = G.r, sp = (dt / 1000) * 260;
    let dx = 0, dy = 0;
    if (G.keys.ArrowLeft || G.keys.a) dx -= sp;
    if (G.keys.ArrowRight || G.keys.d) dx += sp;
    if (G.keys.ArrowUp || G.keys.w) dy -= sp;
    if (G.keys.ArrowDown || G.keys.s) dy += sp;
    if (G.mouse && G.mouse.inside && !G.drag) {
      const rect = r.cv.getBoundingClientRect(), m = G.mouse.sx, edge = 18;
      if (m < edge) dx -= sp * 1.2; else if (m > rect.width - edge) dx += sp * 1.2;
    }
    if (dx || dy) { r.cam.x += dx; r.cam.y += dy; r.clampCam(); }
  }

  /* -------------------------------------------------------------- input */
  function pick(wx, wy) {
    const sim = G.sim;
    let best = null, bestOk = false, bestD = 1e9;
    for (const l of sim.lems) {
      if (l.state === ST.OUT || l.state === ST.DIE || l.state === ST.EXIT) continue;
      if (Math.abs(wx - l.x) > 7 || wy < l.y - 18 || wy > l.y + 3) continue;
      const ok = sim.canAssign(l, G.sel);
      const d = Math.abs(wx - l.x) + Math.abs(wy - (l.y - 7));
      if ((ok && !bestOk) || (ok === bestOk && d < bestD)) { best = l; bestOk = ok; bestD = d; }
    }
    return { l: best, ok: bestOk };
  }

  function updateHover() {
    const tag = $("#hover-tag");
    G.hover = null;
    if (!G.mouse || !G.mouse.inside || G.replay) { tag.style.display = "none"; return; }
    const w = G.r.toWorld(G.mouse.sx, G.mouse.sy);
    G.mouse.x = w.x; G.mouse.y = w.y;
    const p = pick(w.x, w.y);
    G.hover = p.l; G.hoverOk = p.ok;
    if (p.l) {
      let n = 0;
      for (const l of G.sim.lems) if (l.state !== ST.OUT && Math.abs(w.x - l.x) <= 7 && w.y >= l.y - 18 && w.y <= l.y + 3) n++;
      const nm = { walk: "WALKER", fall: "FALLER", build: "BUILDER", shrug: "BUILDER", dig: "DIGGER", bash: "BASHER", mine: "MINER", block: "BLOCKER" }[p.l.state] || p.l.state.toUpperCase();
      tag.textContent = `${nm}${p.l.fuse >= 0 ? " · BOMB" : ""}  ×${n}`;
      tag.style.display = "block";
    } else tag.style.display = "none";
  }

  function assignHover() {
    if (!G.hover || G.replay) return;
    if (G.sim.assign(G.hover.id, G.sel)) { OL.Audio.play("assign"); refreshCounts(); }
    else OL.Audio.play("deny");
  }

  function selectSkill(id) {
    if (!G.sim) return;
    if (!G.infinite && !(G.level.skills[id] > 0)) return;
    G.sel = id;
    OL.Audio.play("select");
    for (const el of document.querySelectorAll(".skill")) el.classList.toggle("sel", el.dataset.id === id);
  }

  function bindInput() {
    const cv = $("#screen");
    cv.addEventListener("mousemove", (e) => {
      const r = cv.getBoundingClientRect();
      G.mouse = { sx: e.clientX - r.left, sy: e.clientY - r.top, inside: true };
      if (G.drag) {
        G.r.cam.x = G.drag.cx - (e.clientX - G.drag.x) * G.r.dpr / G.r.zoom;
        G.r.cam.y = G.drag.cy - (e.clientY - G.drag.y) * G.r.dpr / G.r.zoom;
        G.r.clampCam();
      }
    });
    cv.addEventListener("mouseleave", () => { if (G.mouse) G.mouse.inside = false; });
    cv.addEventListener("mousedown", (e) => {
      OL.Audio.unlock();
      if (G.screen !== "play") return;
      if (e.button === 0) assignHover();
      else { G.drag = { x: e.clientX, y: e.clientY, cx: G.r.cam.x, cy: G.r.cam.y }; e.preventDefault(); }
    });
    window.addEventListener("mouseup", () => (G.drag = null));
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("wheel", (e) => {
      if (G.screen !== "play") return;
      e.preventDefault();
      if (e.ctrlKey || e.altKey) G.r.setZoom(G.r.zoom + (e.deltaY < 0 ? 1 : -1));
      else { G.r.cam.x += (e.deltaY + e.deltaX) * 0.5 / G.r.zoom * G.r.dpr; G.r.clampCam(); }
    }, { passive: false });

    $("#minimap").addEventListener("mousedown", (e) => {
      if (!G.sim) return;
      const mm = $("#minimap"), r = mm.getBoundingClientRect();
      const go = (ev) => {
        G.r.cam.x = ((ev.clientX - r.left) / r.width) * G.sim.W - G.r.viewW() / 2;
        G.r.cam.y = ((ev.clientY - r.top) / r.height) * G.sim.H - G.r.viewH() / 2;
        G.r.clampCam();
      };
      go(e);
      const mv = (ev) => go(ev), up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
      window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    });

    $("#rate-dn").onclick = () => changeRate(-5);
    $("#rate-up").onclick = () => changeRate(5);
    $("#btn-pause").onclick = () => togglePause();
    $("#btn-speed").onclick = () => cycleSpeed();
    $("#btn-restart").onclick = () => restart();
    $("#btn-nuke").onclick = () => nuke();

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", (e) => { G.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
    window.addEventListener("resize", () => G.r.resize());
    window.addEventListener("blur", () => { G.keys = {}; if (G.screen === "play" && !G.paused) togglePause(true); });
  }

  function onKey(e) {
    OL.Audio.unlock();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (G.screen !== "play") { menuKey(e, k); return; }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    G.keys[k] = true;
    if (e.repeat && !["+", "=", "-", "_", "."].includes(k)) return;
    const sk = SKILLS.find((s) => s.key === k);
    if (sk) return selectSkill(sk.id);
    switch (k) {
      case " ": case "p": togglePause(); break;
      case "f": cycleSpeed(); break;
      case "r": if (e.shiftKey && G.debug) reloadLevel(); else restart(); break;
      case "n": nuke(); break;
      case "+": case "=": changeRate(5); break;
      case "-": case "_": changeRate(-5); break;
      case "m": toast(OL.Audio.toggleMute() ? "sound off" : "sound on"); break;
      case "b": toast(OL.Audio.toggleMusic() ? "music on" : "music off"); break;
      case "z": G.r.setZoom(G.r.zoom - 1); break;
      case "x": G.r.setZoom(G.r.zoom + 1); break;
      case "h": case "?": showHelp(true); break;
      case "Escape": showPauseMenu(); break;
      case "`": case "~": toggleDebug(); break;
      case ".": if (G.paused && G.sim.status === "play") tick(); break;
      case "t": if (G.debug && G.mouse) { G.sim.debugSpawn(G.mouse.x, G.mouse.y, 1); toast("test lemming spawned"); } break;
      case "Tab": e.preventDefault(); cycleSkill(e.shiftKey ? -1 : 1); break;
    }
  }

  function cycleSkill(d) {
    const avail = SKILLS.filter((s) => G.infinite || G.level.skills[s.id] > 0);
    if (!avail.length) return;
    let i = avail.findIndex((s) => s.id === G.sel);
    i = (i + d + avail.length) % avail.length;
    selectSkill(avail[i].id);
  }

  function togglePause(force) {
    if (G.screen !== "play") return;
    G.paused = force === true ? true : !G.paused;
    $("#btn-pause").classList.toggle("on", G.paused);
    $("#btn-pause").textContent = G.paused ? "▶" : "❚❚";
  }
  function cycleSpeed() {
    G.speedI = (G.speedI + 1) % SPEEDS.length;
    $("#btn-speed").textContent = SPEEDS[G.speedI] + "×";
    $("#btn-speed").classList.toggle("on", G.speedI > 0);
  }
  function changeRate(d) {
    if (!G.sim || G.replay) return;
    G.sim.setRate(G.sim.rate + d);
    $("#rate-val").textContent = G.sim.rate;
  }
  function nuke() {
    if (!G.sim || G.sim.nuked || G.replay) return;
    const now = performance.now();
    if (now - G.nukeArmed < 1500) {
      G.sim.nuke(); OL.Audio.play("nuke");
      $("#btn-nuke").classList.remove("armed");
    } else {
      G.nukeArmed = now; toast("press nuke again to blow everyone up");
      $("#btn-nuke").classList.add("armed");
      setTimeout(() => $("#btn-nuke").classList.remove("armed"), 1500);
    }
  }

  /* ------------------------------------------------------------ toolbar */
  function buildSkillBar() {
    const box = $("#skills");
    box.innerHTML = "";
    const A = G.r.atlas;
    for (const s of SKILLS) {
      const el = document.createElement("div");
      el.className = "skill";
      el.dataset.id = s.id;
      el.innerHTML = `<span class="key">${s.key}</span><span class="count"></span><canvas width="${A.FW}" height="${A.FH}"></canvas><span class="name">${s.label.toUpperCase()}</span>`;
      const cv = el.querySelector("canvas"), g = cv.getContext("2d");
      const ic = OL.SKILL_ICON[s.id], f = A.frame(ic[0], ic[1], 1);
      g.drawImage(A.canvas, f.sx, f.sy, A.FW, A.FH, 0, 0, A.FW, A.FH);
      if (s.id === "bomber") G.r.drawDigit(g, 5, A.OX - 1, 0);
      el.onclick = () => selectSkill(s.id);
      el.title = `${s.label} (${s.key})`;
      box.appendChild(el);
    }
    refreshCounts();
    selectSkill(G.sel);
    $("#rate-val").textContent = G.sim.rate;
    $("#btn-speed").textContent = "1×"; $("#btn-speed").classList.remove("on");
    $("#btn-pause").textContent = "❚❚"; $("#btn-pause").classList.remove("on");
  }

  function refreshCounts() {
    for (const el of document.querySelectorAll(".skill")) {
      const id = el.dataset.id, n = G.sim.skills[id], had = G.level.skills[id] > 0;
      el.querySelector(".count").textContent = G.infinite ? "∞" : had ? n : "—";
      el.classList.toggle("none", !had && !G.infinite);
      el.classList.toggle("empty", had && n <= 0 && !G.infinite);
    }
  }

  /* ---------------------------------------------------------------- hud */
  let hudN = 0;
  function updateHud(force) {
    if (!force && (hudN++ % 5)) return;
    const sim = G.sim, lv = G.level;
    if (!sim) return;
    $("#hud-level").innerHTML = `<b>LVL ${pad(lv.slot)}</b>${lv.title}`;
    const left = sim.total - sim.spawned;
    const homeCls = sim.saved >= sim.need ? "good" : "";
    const tl = sim.timeLeft, tCls = tl < 30 * C.TPS ? "warn" : "";
    $("#hud-stats").innerHTML =
      `<div><span>OUT</span><b>${sim.alive}</b></div>` +
      `<div><span>WAITING</span><b>${left}</b></div>` +
      `<div class="${homeCls}"><span>HOME</span><b>${sim.saved}/${sim.need}</b></div>` +
      `<div><span>LOST</span><b>${sim.dead}</b></div>` +
      `<div class="${tCls}"><span>TIME</span><b>${fmtTime(tl)}</b></div>`;
    refreshCounts();
    $("#rate-val").textContent = sim.rate;
  }

  /* ----------------------------------------------------------- overlays */
  function showOverlay(html, cls) {
    const o = $("#overlay");
    o.innerHTML = `<div class="card ${cls || ""}">${html}</div>`;
    o.classList.add("on");
    G.menuItems = [...o.querySelectorAll(".menu .item:not(.locked)")];
    G.menuItems.forEach((el, i) => {
      el.onmouseenter = () => focusMenu(i);
      el.onclick = () => { OL.Audio.unlock(); el._act && el._act(); };
    });
    focusMenu(G.menuFocus || 0);
    G.menuFocus = 0;
  }
  function hideOverlay() { $("#overlay").classList.remove("on"); G.menuItems = []; }
  function focusMenu(i) {
    if (!G.menuItems || !G.menuItems.length) return;
    G.menuI = (i + G.menuItems.length) % G.menuItems.length;
    G.menuItems.forEach((el, j) => el.classList.toggle("focus", j === G.menuI));
  }
  function actions(list) {
    // attach callbacks to .menu .item elements in order
    const items = [...document.querySelectorAll("#overlay .menu .item:not(.locked)")];
    items.forEach((el, i) => (el._act = list[i]));
  }
  function menuKey(e, k) {
    if (k === "ArrowDown" || k === "j" || k === "Tab") { e.preventDefault(); focusMenu(G.menuI + 1); }
    else if (k === "ArrowUp" || k === "k") { e.preventDefault(); focusMenu(G.menuI - 1); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); const el = G.menuItems && G.menuItems[G.menuI]; if (el && el._act) el._act(); }
    else if (k === "Escape") { if (G.back) G.back(); }
    else if (k === "`" && G.screen !== "title") toggleDebug();
    else if (k === "m") toast(OL.Audio.toggleMute() ? "sound off" : "sound on");
  }

  function showTitle() {
    setScreen("title");
    G.back = null;
    showOverlay(`
      <div class="title">
        <div class="logo">OM<i class="tri"></i>RCHY</div>
        <div class="sub">LEMMINGS</div>
        <div class="tag">THINK AHEAD. SAVE THEM ALL.</div>
        <div class="menu">
          <div class="item">PLAY</div>
          <div class="item">LEVELS</div>
          <div class="item">HOW TO PLAY</div>
        </div>
        <div class="hint"><kbd>↑↓</kbd> choose · <kbd>enter</kbd> select · <kbd>m</kbd> sound</div>
      </div>`, "title-card");
    actions([() => showBrief(firstPlayable()), showSelect, () => showHelp(false)]);
  }

  function firstPlayable() {
    const pr = progress();
    const built = CAMPAIGN.filter((c) => OL.getLevel(c.id));
    return (built.find((c) => !(pr[c.id] && pr[c.id].done)) || built[0]).id;
  }

  function showSelect() {
    setScreen("select");
    G.back = showTitle;
    const pr = progress();
    const rows = CAMPAIGN.map((c) => {
      const lv = OL.getLevel(c.id), p = pr[c.id];
      const st = !lv ? "not built yet" : p && p.done ? `COMPLETE · best ${p.best}/${lv.lemmings}` : p ? `best ${p.best}/${lv.lemmings}` : "ready";
      return `<div class="item ${lv ? "" : "locked"} ${p && p.done ? "done" : ""}"><span class="id">[${pad(c.slot)}]</span>${c.title}<span class="st">${st}</span></div>`;
    }).join("");
    const dbg = G.debug ? `<div class="item"><span class="id">[--]</span>PHYSICS SANDBOX<span class="st">debug</span></div>` : "";
    showOverlay(`<h1>~/omarchy/lemmings</h1><h2>SELECT LEVEL</h2><div class="menu">${rows}${dbg}</div>
      <div class="hint"><kbd>↑↓</kbd> choose · <kbd>enter</kbd> open · <kbd>esc</kbd> back</div>`);
    const acts = CAMPAIGN.filter((c) => OL.getLevel(c.id)).map((c) => () => showBrief(c.id));
    if (G.debug) acts.push(() => showBrief("sandbox"));
    actions(acts);
  }

  function skillChips(lv) {
    return SKILLS.filter((s) => lv.skills[s.id] > 0).map((s) => `<span class="chip">${s.label.toUpperCase()}<b>${lv.skills[s.id]}</b></span>`).join("");
  }

  function showBrief(id) {
    const lv = OL.getLevel(id);
    if (!lv) return;
    setScreen("brief");
    G.back = showSelect;
    // preview the level behind the card
    G.level = lv;
    G.sim = new OL.Sim(lv);
    G.r.attach(G.sim);
    const p = progress()[lv.id];
    $("#rate-val").textContent = lv.rate;
    showOverlay(`<h1>LVL ${pad(lv.slot)}</h1><h2>${lv.title}</h2>
      <p>${lv.brief}</p>
      <div class="kv">
        <span>LEMMINGS</span><span>TO SAVE</span><span>TIME</span><span>RELEASE</span>
        <b>${lv.lemmings}</b><b>${lv.save}</b><b>${fmtTime(lv.time * C.TPS)}</b><b>${lv.rate}</b>
      </div>
      <div class="chips">${skillChips(lv)}</div>
      ${p ? `<p class="muted">best: ${p.best}/${lv.lemmings} saved${p.done ? " · complete" : ""}</p>` : ""}
      <div class="menu"><div class="item">START</div><div class="item">BACK</div></div>
      <div class="hint"><kbd>enter</kbd> start · <kbd>h</kbd> in game for help · <kbd>esc</kbd> back</div>`);
    actions([() => startLevel(lv.id), showSelect]);
  }

  function showResult() {
    const sim = G.sim, lv = G.level;
    const won = sim.status === "won";
    setScreen("result");
    G.back = showSelect;
    if (!sim.infinite && !G.replay) {
      const pr = progress(), p = pr[lv.id] || { best: 0, done: false };
      p.best = Math.max(p.best, sim.saved); p.done = p.done || won;
      pr[lv.id] = p; store.set("ol.progress", pr);
    }
    const used = SKILLS.filter((s) => sim.used[s.id]).map((s) => `<span class="chip">${s.label.toUpperCase()}<b>${sim.used[s.id]}</b></span>`).join("") || `<span class="chip">none</span>`;
    const msg = won
      ? (sim.saved === sim.total ? "Every single one. Flawless." : sim.saved - sim.need >= 3 ? "Comfortably done. Can you save more?" : "Just enough. The network holds.")
      : sim.endReason === "time" ? "Out of time." : "Not enough made it home.";
    showOverlay(`<div class="result"><h1>LVL ${pad(lv.slot)} · ${lv.title}</h1>
      <h2 class="${won ? "won" : "lost"}">${won ? "SYSTEM RESTORED" : "SEGFAULT"}</h2>
      <div class="big">${sim.saved}<small>/ ${sim.total} saved · needed ${sim.need}</small></div>
      <p class="muted">${msg} ${G.replay ? "(replay)" : ""}</p>
      <div class="chips">${used}</div>
      <div class="menu"><div class="item">${won ? "PLAY AGAIN" : "RETRY"}</div><div class="item">LEVELS</div></div></div>`);
    actions([restart, showSelect]);
  }

  function showPauseMenu() {
    if (G.screen !== "play") return;
    togglePause(true);
    setScreen("menu");
    G.back = resume;
    showOverlay(`<h1>PAUSED</h1><h2>${G.level.title}</h2>
      <div class="menu"><div class="item">RESUME</div><div class="item">RESTART</div><div class="item">HOW TO PLAY</div><div class="item">LEVELS</div><div class="item">TITLE</div></div>`);
    actions([resume, restart, () => showHelp(true), showSelect, showTitle]);
  }
  function resume() { hideOverlay(); setScreen("play"); togglePause(false); }

  function showHelp(fromGame) {
    if (fromGame) togglePause(true);
    const prev = fromGame ? resume : showTitle;
    setScreen("help");
    G.back = prev;
    showOverlay(`<h1>HOW TO PLAY</h1><h2>THINK AHEAD</h2>
      <p>Lemmings walk until something stops them. Give them jobs so enough of them reach the glowing gate. Every tool is limited — spending one early changes what you can do later.</p>
      <div class="help-grid">
        <kbd>1–6</kbd><span>pick a skill · click a lemming to assign it</span>
        <kbd>space</kbd><span>pause (you can still assign while paused)</span>
        <kbd>f</kbd><span>speed 1× / 2× / 4×</span>
        <kbd>+ / −</kbd><span>release rate (how fast lemmings drop in)</span>
        <kbd>r</kbd><span>restart instantly</span>
        <kbd>n n</kbd><span>nuke everyone (ends the level)</span>
        <kbd>← →</kbd><span>scroll · or move the mouse to the screen edge · right-drag · minimap</span>
        <kbd>z / x</kbd><span>zoom out / in</span>
        <kbd>m / b</kbd><span>sound / music</span>
        <kbd>esc</kbd><span>menu</span>
      </div>
      <p class="muted">BLOCKER turns others around · BUILDER lays 12 steps · BASHER tunnels sideways · MINER tunnels down at 45° · DIGGER digs straight down · BOMBER explodes after 5 s. Metal and tech plating can't be broken. Purple chevrons can only be bashed in the arrow's direction. Falls longer than six lemming-heights are fatal; lava and coolant are always fatal.</p>
      <div class="menu"><div class="item">BACK</div></div>`);
    actions([prev]);
  }

  /* -------------------------------------------------------------- debug */
  function toggleDebug() {
    G.debug = !G.debug;
    const el = $("#debug");
    el.hidden = !G.debug;
    if (G.debug) buildDebug();
    toast(G.debug ? "debug tools on (`)" : "debug tools off");
  }

  function buildDebug() {
    const el = $("#debug"), r = G.r;
    const sols = (G.level && OL.SOLUTIONS[G.level.id]) || {};
    el.innerHTML = `<h3>DEBUG · \` to close</h3>
      <label><input type="checkbox" data-k="materials"> material view</label>
      <label><input type="checkbox" data-k="labels"> lemming id / state</label>
      <label><input type="checkbox" data-k="zones"> zones · exits · splat ruler</label>
      <label><input type="checkbox" data-k="infinite"> infinite skills (restarts)</label>
      <div>
        <button data-a="step">step .</button><button data-a="reload">reload level ⇧R</button>
        <button data-a="copy">copy replay</button><button data-a="spawn">spawn @cursor T</button>
      </div>
      <div>${Object.keys(sols).map((k) => `<button data-sol="${k}">▶ ${k}</button>`).join("")}</div>
      <pre id="dbg-info"></pre>`;
    el.querySelectorAll("input").forEach((cb) => {
      const k = cb.dataset.k;
      cb.checked = k === "infinite" ? G.infinite : r.debug[k];
      cb.onchange = () => {
        if (k === "infinite") { G.infinite = cb.checked; restart(); }
        else r.debug[k] = cb.checked;
      };
    });
    el.querySelectorAll("button[data-a]").forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === "step") { togglePause(true); tick(); }
      if (a === "reload") reloadLevel();
      if (a === "spawn") toast("hover the map and press T");
      if (a === "copy") {
        const txt = JSON.stringify(G.sim.actions);
        console.log("[replay]", G.level.id, txt);
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("replay copied"), () => toast("see console"));
        else toast("replay printed to console");
      }
    }));
    el.querySelectorAll("button[data-sol]").forEach((b) => (b.onclick = () => {
      const s = sols[b.dataset.sol];
      startLevel(G.level.id, { replay: s.actions, replayName: b.dataset.sol });
    }));
  }

  let dbgN = 0;
  function updateDebug() {
    if (dbgN++ % 10) return;
    const el = $("#dbg-info");
    if (!el || !G.sim) return;
    const s = G.sim, m = G.mouse;
    el.textContent =
      `tick ${s.tick}  status ${s.status}\n` +
      `cursor ${m && m.x !== undefined ? `${m.x | 0},${m.y | 0} ${s.terrain.get(m.x | 0, m.y | 0)}` : "-"}\n` +
      `zoom ${G.r.zoom}  cam ${G.r.cam.x | 0},${G.r.cam.y | 0}\n` +
      `actions ${s.actions.length}\n` + s.actions.slice(-5).map((a) => JSON.stringify(a)).join("\n");
  }

  function reloadLevel() {
    if (!G.level) return;
    const id = G.level.id;
    const tags = [...document.querySelectorAll('script[src*="levels/"]')];
    let left = tags.length;
    for (const old of tags) {
      const s = document.createElement("script");
      s.src = old.src.split("?")[0] + "?t=" + Date.now();
      s.onload = s.onerror = () => { if (--left === 0) { startLevel(id); toast("level reloaded"); } };
      old.replaceWith(s);
    }
  }

  /* --------------------------------------------------------------- boot */
  function boot() {
    G.r = new OL.Renderer($("#screen"), $("#minimap"));
    bindInput();
    if (G.debug) { $("#debug").hidden = false; }
    const lv = params.get("level");
    const demo = OL.getLevel(lv || "network-nodes") || OL.LEVELS[0];
    G.level = demo;
    G.sim = new OL.Sim(demo);
    G.r.attach(G.sim);
    requestAnimationFrame(frame);
    if (lv && OL.getLevel(lv)) {
      const sol = params.get("solution");
      const s = sol && OL.SOLUTIONS[lv] && OL.SOLUTIONS[lv][sol];
      startLevel(lv, s ? { replay: s.actions, replayName: sol } : {});
      if (params.has("speed")) { G.speedI = Math.max(0, SPEEDS.indexOf(+params.get("speed"))); $("#btn-speed").textContent = SPEEDS[G.speedI] + "×"; }
      if (G.debug) buildDebug();
    } else showTitle();
  }
  window.addEventListener("DOMContentLoaded", boot);
})();
