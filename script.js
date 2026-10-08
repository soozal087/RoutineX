(() => {
  const KEY = "rise-v1",
    GOOD = 0.8,
    C = 326.7;
  const RANKS = [
    ["Stardust", 0],
    ["Comet", 100],
    ["Asteroid", 300],
    ["Planet", 600],
    ["Star", 1000],
    ["Nebula", 1600],
    ["Galaxy", 2500],
  ];
  const HUES = [215, 185, 150, 35, 48, 285, 330];
  const EMO = ["", "😴", "😐", "🙂", "😄", "🚀"];
  const TIPS = [
    "Drink a glass right after you wake up.",
    "Keep a bottle on your desk where you can see it.",
    "Add lemon or mint if plain water feels boring.",
    "Drink a glass before every meal.",
    "Small sips all day beat one big gulp.",
    "Set a reminder every two hours.",
  ];
  const NAV = [
    ["index.html", "Dashboard", "dashboard"],
    ["water.html", "Hydration", "water"],
    ["focus.html", "Focus", "focus"],
    ["journey.html", "Journey", "journey"],
  ];

  const $ = (id) => document.getElementById(id);
  const on = (id, ev, fn) => {
    const e = $(id);
    if (e) e.addEventListener(ev, fn);
  };
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = (s) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = document.body.dataset.page;

  const today = new Date();
  const todayISO = iso(today);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let boost = reduce ? 0 : 10; // star speed (starts with a warp intro)

  // ================= Data =================
  const seed = [
    ["Wake up at 6:00", "06:00", 25],
    ["Drink a glass of water", "06:10", 28],
    ["Stretch for 10 minutes", "06:20", 20],
    ["Read 10 pages", "07:00", 20],
    ["Plan the day", "07:30", 25],
  ];
  function load() {
    const base = {
      focus: {},
      focusMin: {},
      mood: {},
      note: {},
      water: {},
      waterGoal: 2000,
    };
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.habits)) return Object.assign(base, s);
    } catch (e) {}
    return Object.assign(base, {
      habits: seed.map(([name, time, target]) => ({
        id: uid(),
        name,
        time,
        target,
        start: todayISO,
      })),
      log: {},
    });
  }
  let state = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  };

  const isDone = (date, id) => (state.log[date] || []).includes(id);
  const waterTotal = (date) =>
    (state.water[date] || []).reduce((a, b) => a + b, 0);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const waterDays = () =>
    Object.keys(state.water).filter((d) => waterTotal(d) >= state.waterGoal)
      .length;
  const totalXP = () =>
    Object.values(state.log).reduce((a, l) => a + l.length, 0) * 10 +
    sum(state.focus) * 25 +
    waterDays() * 30;
  const rankIdx = () => {
    const x = totalXP();
    let i = 0;
    RANKS.forEach((r, n) => {
      if (x >= r[1]) i = n;
    });
    return i;
  };

  function ratio(date) {
    const act = state.habits.filter((h) => h.start <= date);
    if (!act.length) return null;
    return act.filter((h) => isDone(date, h.id)).length / act.length;
  }
  function streaks() {
    if (!state.habits.length) return { cur: 0, best: 0 };
    const d = new Date(
      state.habits.map((h) => h.start).sort()[0] + "T00:00:00",
    );
    let cur = 0,
      best = 0;
    while (iso(d) <= todayISO) {
      const r = ratio(iso(d));
      if (r !== null && r >= GOOD) {
        cur++;
        best = Math.max(best, cur);
      } else if (iso(d) !== todayISO) cur = 0;
      d.setDate(d.getDate() + 1);
    }
    return { cur, best };
  }
  function monthInfo() {
    const y = view.getFullYear(),
      m = view.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const isCur = y === today.getFullYear() && m === today.getMonth();
    const last = isCur ? today.getDate() : view < today ? dim : 0;
    return { dim, last, date: (d) => `${y}-${pad(m + 1)}-${pad(d)}` };
  }
  function habitMonth(h, mi) {
    let done = 0,
      elig = 0;
    for (let d = 1; d <= mi.last; d++) {
      const dt = mi.date(d);
      if (dt >= h.start) {
        elig++;
        if (isDone(dt, h.id)) done++;
      }
    }
    return { done, elig };
  }

  function toggle(date, id) {
    const list = state.log[date] || (state.log[date] = []);
    const i = list.indexOf(id);
    const added = i < 0;
    if (added) list.push(id);
    else list.splice(i, 1);
    const h = state.habits.find((x) => x.id === id);
    if (h && date < h.start) h.start = date;
    save();
    renderAll();
    if (added) {
      boost = Math.max(boost, 3);
      if (date === todayISO && ratio(todayISO) === 1) {
        boost = 14;
        toast("Mission complete. Every task done today!");
      }
    }
  }

  function addWater(ml) {
    const before = waterTotal(todayISO);
    (state.water[todayISO] = state.water[todayISO] || []).push(ml);
    save();
    renderAll();
    if (before < state.waterGoal && waterTotal(todayISO) >= state.waterGoal) {
      boost = 14;
      toast("Hydration goal reached. +30 XP");
    } else boost = Math.max(boost, 2);
  }
  function undoWater() {
    const l = state.water[todayISO];
    if (l && l.length) {
      l.pop();
      save();
      renderAll();
    }
  }

  // ================= Shell (header, background, footer) =================
  const nav = NAV.map(
    ([f, l, k]) =>
      `<a href="${f}"${k === page ? ' aria-current="page"' : " "}>${l}</a>`,
  ).join("");
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<canvas id="space" aria-hidden="true"></canvas><div class="glow" id="glow" aria-hidden="true"></div><div class="floor" aria-hidden="true"></div>` +
      `<header class="top"><div class="wrap nav"><a class="brand" href="index.html"${page === "dashboard" ? "" : " "}>RISE</a>` +
      `<nav aria-label="Main">${nav}</nav><span class="sys" id="sys"></span></div></header>`,
  );
  document.body.insertAdjacentHTML(
    "beforeend",
    `<footer><span class="small muted">Your data is saved in this browser only.</span><button type="button" class="ghost" id="export">Export data</button></footer>` +
      `<div class="toast" id="toast" role="status"></div>`,
  );
  if (!reduce && !sessionStorage.getItem("rise-boot")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="boot">RISE // SYSTEM ONLINE</div>',
    );
    try {
      sessionStorage.setItem("rise-boot", "1");
    } catch (e) {}
    setTimeout(() => {
      const b = document.querySelector(".boot");
      if (b) b.remove();
    }, 2000);
  }
  const clockTick = () => {
    $("sys").textContent = new Date().toLocaleTimeString("en-GB");
  };
  clockTick();
  setInterval(clockTick, 1000);

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.id);
    toast.id = setTimeout(() => t.classList.remove("show"), 2800);
  }
  function burst(x, y) {
    if (reduce) return;
    const colors = ["#7c5cff", "#2ee6d6", "#ffc857", "#ff6bd6"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      const a = Math.random() * 6.283,
        dist = 30 + Math.random() * 50;
      s.className = "sp";
      s.style.cssText = `left:${x}px;top:${y}px;--c:${colors[i % 4]};--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }

  // ================= Rendering =================
  function weekBars(el, fn, label) {
    if (!el) return;
    let out = "";
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const r = Math.min(1, fn(iso(d)));
      out +=
        `<div class="col" title="${label(iso(d), r)}"><div class="barwrap"><div class="wbar" style="height:${Math.max(4, r * 100)}%"></div></div>` +
        `<span class="small muted">${d.toLocaleDateString("en", { weekday: "short" })}</span></div>`;
    }
    el.innerHTML = out;
  }

  function renderToday() {
    if (!$("todayList")) return;
    const hour = today.getHours();
    $("greeting").textContent =
      hour < 12
        ? "Good morning."
        : hour < 18
          ? "Good afternoon."
          : "Good evening.";
    $("dateText").textContent = today.toLocaleDateString("en", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const act = state.habits.filter((h) => h.start <= todayISO);
    const done = act.filter((h) => isDone(todayISO, h.id)).length;
    const p = act.length ? done / act.length : 0;
    $("ringArc").style.strokeDashoffset = C * (1 - p);
    $("ringPct").textContent = Math.round(p * 100) + "%";
    $("doneText").textContent = act.length
      ? `${done} of ${act.length} tasks done`
      : "Add your first task below.";
    $("todayList").innerHTML =
      act
        .map(
          (h) =>
            `<li><label><input type="checkbox" data-id="${h.id}" ${isDone(todayISO, h.id) ? "checked" : ""}>` +
            `<span class="box"></span><span class="name">${esc(h.name)}</span>${h.time ? `<span class="time">${h.time}</span>` : ""}</label></li>`,
        )
        .join("") || '<li class="muted">No tasks yet.</li>';
  }

  function renderRank() {
    if (!$("xpFill")) return;
    const x = totalXP(),
      i = rankIdx(),
      next = RANKS[i + 1];
    $("rankName").textContent = RANKS[i][0];
    $("xpFill").style.width =
      (next ? ((x - RANKS[i][1]) / (next[1] - RANKS[i][1])) * 100 : 100) + "%";
    $("xpText").textContent = next
      ? `${x} XP · ${next[1] - x} to ${next[0]}`
      : `${x} XP · max rank`;
  }

  function renderMiniWater() {
    if (!$("mwAmt")) return;
    const t = waterTotal(todayISO);
    $("mwAmt").textContent = t;
    $("mwGoal").textContent = state.waterGoal;
    $("mwFill").style.width = Math.min(100, (t / state.waterGoal) * 100) + "%";
  }

  function renderWeek() {
    if (page === "water")
      weekBars(
        $("week"),
        (d) => waterTotal(d) / state.waterGoal,
        (d, r) => `${waterTotal(d)} ml on ${d}`,
      );
    else
      weekBars(
        $("week"),
        (d) => ratio(d) || 0,
        (d, r) => `${Math.round(r * 100)}% on ${d}`,
      );
  }

  function renderMonth() {
    if (!$("stats")) return;
    const mi = monthInfo();
    $("monthLabel").textContent = view.toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
    $("next").disabled =
      view >= new Date(today.getFullYear(), today.getMonth(), 1);
    let td = 0,
      te = 0;
    state.habits.forEach((h) => {
      const s = habitMonth(h, mi);
      td += s.done;
      te += s.elig;
    });
    let strong = 0,
      days = 0;
    for (let d = 1; d <= mi.last; d++) {
      const r = ratio(mi.date(d));
      if (r !== null) {
        days++;
        if (r >= GOOD) strong++;
      }
    }
    const st = streaks();
    $("stats").innerHTML = [
      [
        "Consistency",
        te ? Math.round((td / te) * 100) + "%" : "-",
        `${td} of ${te} tasks done`,
      ],
      ["Strong days", strong, `of ${days} days so far`],
      ["Current streak", st.cur, "days in a row"],
      ["Best streak", st.best, "days in a row"],
    ]
      .map(
        ([l, v, s], i) =>
          `<div class="card stat tilt${i > 1 ? " sun" : ""}"><p class="muted">${l}</p><p class="num">${v}</p><p class="small muted">${s}</p></div>`,
      )
      .join("");

    if (!state.habits.length) {
      $("grid").innerHTML =
        '<p class="muted">Add a task to start tracking.</p>';
      return;
    }
    const head = Array.from(
      { length: mi.dim },
      (_, i) => `<th>${i + 1}</th>`,
    ).join("");
    const rows = state.habits
      .map((h) => {
        const cells = Array.from({ length: mi.dim }, (_, i) => {
          const d = i + 1,
            dt = mi.date(d),
            done = isDone(dt, h.id);
          return (
            `<td><button type="button" class="cell${done ? " on" : ""}${dt === todayISO ? " now" : ""}" data-id="${h.id}" data-date="${dt}" ` +
            `${d > mi.last ? "disabled" : ""} aria-label="${esc(h.name)}, ${dt}${done ? ", done" : ""}"></button></td>`
          );
        }).join("");
        return `<tr><th class="rowname" scope="row">${esc(h.name)}</th>${cells}</tr>`;
      })
      .join("");
    $("grid").innerHTML =
      `<table><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderGoals() {
    if (!$("goalList")) return;
    const mi = monthInfo();
    $("goalList").innerHTML =
      state.habits
        .map((h) => {
          const s = habitMonth(h, mi);
          const pct = Math.min(100, Math.round((s.done / h.target) * 100));
          const cons = s.elig ? Math.round((s.done / s.elig) * 100) : 0;
          return (
            `<li class="goal"><div class="ghead"><div><strong>${esc(h.name)}</strong><span class="muted small">${h.time ? " · " + h.time : ""}</span></div>` +
            `<button type="button" class="del" data-del="${h.id}">Remove</button></div>` +
            `<div class="track"><div class="fill" style="width:${pct}%"></div></div>` +
            `<div class="gmeta"><span>${s.done} of <label class="tgt"><input type="number" min="1" max="31" value="${h.target}" data-target="${h.id}" aria-label="Goal days per month for ${esc(h.name)}"> days</label> goal</span>` +
            `<span class="muted">${cons}% consistent</span></div></li>`
          );
        })
        .join("") || '<li class="muted">No tasks yet. Add one above.</li>';
  }

  function renderWater() {
    if (!$("wAmt")) return;
    const t = waterTotal(todayISO),
      g = state.waterGoal,
      p = Math.min(1, t / g);
    $("wAmt").textContent = t;
    $("wGoal").textContent = g;
    $("water").style.height = p * 100 + "%";
    $("water").classList.toggle("empty", p === 0);
    $("tpct").textContent = Math.round(p * 100) + "%";
    $("glasses").innerHTML = Array.from(
      { length: Math.ceil(g / 250) },
      (_, i) => `<span class="gl${t >= (i + 1) * 250 ? " on" : ""}"></span>`,
    ).join("");
    if (document.activeElement !== $("goalIn")) $("goalIn").value = g;
    $("tip").textContent =
      "Tip: " + TIPS[Math.floor(today / 864e5) % TIPS.length];
  }

  function renderJourney() {
    if (!$("planet")) return;
    const i = rankIdx();
    $("planet").style.setProperty("--h", HUES[i]);
    const s = {
      tasks: Object.values(state.log).reduce((a, l) => a + l.length, 0),
      best: streaks().best,
      full: Object.keys(state.log).filter((d) => ratio(d) === 1).length,
      wd: waterDays(),
      sess: sum(state.focus),
    };
    const B = [
      ["🚀", "First launch", "Complete your first task", s.tasks >= 1],
      ["🔥", "3-day orbit", "Reach a 3-day streak", s.best >= 3],
      ["⚡", "Week warp", "Reach a 7-day streak", s.best >= 7],
      ["🌕", "Moon month", "Reach a 30-day streak", s.best >= 30],
      ["🏆", "Full mission", "Finish every task in one day", s.full >= 1],
      ["💧", "Hydro hero", "Hit your water goal 3 times", s.wd >= 3],
      ["🧠", "Deep focus", "Finish 5 focus sessions", s.sess >= 5],
      ["🪐", "Planet rank", "Reach the Planet rank", i >= 3],
    ];
    $("badges").innerHTML = B.map(
      ([ic, n, d, got]) =>
        `<div class="card badge tilt${got ? " got" : ""}"><div class="ic">${ic}</div><h3>${n}</h3><p class="small muted">${d}</p><p class="small">${got ? "Unlocked" : "Locked"}</p></div>`,
    ).join("");
    document
      .querySelectorAll("#moods button")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(state.mood[todayISO] === +b.dataset.mood),
        ),
      );
    const dates = [
      ...new Set([...Object.keys(state.note), ...Object.keys(state.mood)]),
    ]
      .filter((d) => state.mood[d] || state.note[d])
      .sort()
      .reverse()
      .slice(0, 8);
    $("noteList").innerHTML =
      dates
        .map(
          (d) =>
            `<li><span class="small muted">${d}</span> <span>${EMO[state.mood[d]] || ""}</span><p>${esc(state.note[d] || "")}</p></li>`,
        )
        .join("") || '<li class="muted">No entries yet.</li>';
  }

  // ---- Focus timer ----
  let tLen = 25 * 60,
    tLeft = tLen,
    tEnd = 0,
    tId = null;
  const fmt = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  function drawTimer() {
    if (!$("clock")) return;
    $("clock").textContent = fmt(tLeft);
    $("tFill").style.width = 100 * (1 - tLeft / tLen) + "%";
    $("tStart").textContent = tId ? "Pause" : "Start";
    $("gyro").classList.toggle("run", !!tId);
    $("fsToday").textContent = state.focus[todayISO] || 0;
    $("fsMin").textContent = state.focusMin[todayISO] || 0;
    $("fsAll").textContent = sum(state.focus);
    document.title = tId ? `${fmt(tLeft)} · Rise` : "Rise | Focus";
  }

  function renderAll() {
    renderToday();
    renderRank();
    renderMiniWater();
    renderWeek();
    renderMonth();
    renderGoals();
    renderWater();
    renderJourney();
    drawTimer();
  }

  // ================= Events =================
  on("todayList", "change", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.checked) {
      const r = e.target.nextElementSibling.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
    }
    toggle(todayISO, id);
  });
  on("grid", "click", (e) => {
    const b = e.target.closest(".cell");
    if (b && !b.disabled) toggle(b.dataset.date, b.dataset.id);
  });
  on("goalList", "click", (e) => {
    const id = e.target.dataset.del;
    if (!id) return;
    const h = state.habits.find((x) => x.id === id);
    if (!confirm(`Remove "${h.name}"? Its history will be deleted.`)) return;
    state.habits = state.habits.filter((x) => x.id !== id);
    Object.values(state.log).forEach((l) => {
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
    });
    save();
    renderAll();
  });
  on("goalList", "change", (e) => {
    const id = e.target.dataset.target;
    if (!id) return;
    state.habits.find((x) => x.id === id).target = Math.max(
      1,
      Math.min(31, +e.target.value || 1),
    );
    save();
    renderAll();
  });
  on("addForm", "submit", (e) => {
    e.preventDefault();
    const name = $("hName").value.trim();
    if (!name) return;
    state.habits.push({
      id: uid(),
      name,
      time: $("hTime").value,
      target: Math.max(1, Math.min(31, +$("hTarget").value || 20)),
      start: todayISO,
    });
    state.habits.sort((a, b) => ((a.time || "99") > (b.time || "99") ? 1 : -1));
    save();
    e.target.reset();
    renderAll();
    toast("New task added");
  });
  on("prev", "click", () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderAll();
  });
  on("next", "click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderAll();
  });

  // water
  on("mwAdd", "click", () => addWater(250));
  on("mwUndo", "click", undoWater);
  on("wUndo", "click", undoWater);
  on("wBtns", "click", (e) => {
    const ml = e.target.dataset.ml;
    if (ml) addWater(+ml);
  });
  on("goalIn", "change", (e) => {
    state.waterGoal = Math.max(500, Math.min(6000, +e.target.value || 2000));
    save();
    renderAll();
  });
  if ($("bubs")) {
    for (let i = 0; i < 12; i++) {
      const b = document.createElement("span"),
        z = 4 + Math.random() * 12;
      b.style.cssText = `left:${Math.random() * 90}%;width:${z}px;height:${z}px;animation-duration:${4 + Math.random() * 5}s;animation-delay:${-Math.random() * 6}s`;
      $("bubs").appendChild(b);
    }
    on("tank3d", "pointermove", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      $("tank").style.setProperty(
        "--ry",
        ((e.clientX - r.left) / r.width - 0.5) * 50 + "deg",
      );
      $("tank").style.setProperty(
        "--rx",
        -((e.clientY - r.top) / r.height - 0.5) * 24 + "deg",
      );
    });
  }

  // focus
  on("tStart", "click", () => {
    if (tId) {
      clearInterval(tId);
      tId = null;
    } else {
      tEnd = Date.now() + tLeft * 1000;
      tId = setInterval(() => {
        tLeft = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000));
        if (tLeft === 0) {
          clearInterval(tId);
          tId = null;
          state.focus[todayISO] = (state.focus[todayISO] || 0) + 1;
          state.focusMin[todayISO] =
            (state.focusMin[todayISO] || 0) + tLen / 60;
          save();
          tLeft = tLen;
          boost = 12;
          toast("Focus session complete. +25 XP");
        }
        drawTimer();
      }, 250);
    }
    drawTimer();
  });
  on("tReset", "click", () => {
    clearInterval(tId);
    tId = null;
    tLeft = tLen;
    drawTimer();
  });
  on("tLen", "change", (e) => {
    clearInterval(tId);
    tId = null;
    tLen = +e.target.value * 60;
    tLeft = tLen;
    drawTimer();
  });

  // journey
  on("moods", "click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const v = +b.dataset.mood;
    state.mood[todayISO] = state.mood[todayISO] === v ? 0 : v;
    save();
    renderAll();
  });
  if ($("note")) {
    $("note").value = state.note[todayISO] || "";
    let nt;
    $("note").addEventListener("input", (e) => {
      clearTimeout(nt);
      nt = setTimeout(() => {
        state.note[todayISO] = e.target.value;
        save();
        renderJourney();
      }, 400);
    });
  }

  on("export", "click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    a.download = "rise-data.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // keep all open tabs in sync
  addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = load();
      renderAll();
    }
  });

  // ================= Cursor glow and card tilt =================
  let hot = null;
  document.addEventListener("pointermove", (e) => {
    $("glow").style.transform =
      `translate(${e.clientX - 210}px, ${e.clientY - 210}px)`;
    const c = e.target.closest && e.target.closest(".tilt");
    if (hot && hot !== c) hot.style.transform = "";
    hot = c;
    if (!c || reduce) return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    c.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-3px)`;
  });
  document.addEventListener("pointerleave", () => {
    if (hot) hot.style.transform = "";
  });

  // ================= Starfield =================
  const cv = $("space"),
    ctx = cv.getContext("2d");
  let W,
    H,
    stars = [],
    shoot = null,
    mx = 0,
    my = 0,
    tx = 0,
    ty = 0;
  function resize() {
    W = cv.width = innerWidth;
    H = cv.height = innerHeight;
    stars = Array.from(
      { length: Math.min(320, Math.floor((W * H) / 5500)) },
      () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.9 + 0.1,
        t: Math.random() * 6,
      }),
    );
  }
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => {
    tx = e.clientX / W - 0.5;
    ty = e.clientY / H - 0.5;
  });

  function sky() {
    ctx.clearRect(0, 0, W, H);
    mx += (tx - mx) * 0.05;
    my += (ty - my) * 0.05;
    for (const s of stars) {
      s.x -= (0.12 + boost) * s.z * 2;
      if (s.x < -40) {
        s.x = W + 10;
        s.y = Math.random() * H;
      }
      s.t += 0.03;
      const px = s.x - mx * s.z * 40,
        py = s.y - my * s.z * 40;
      ctx.globalAlpha =
        (0.35 + 0.65 * Math.abs(Math.sin(s.t))) * (0.4 + s.z * 0.6);
      ctx.fillStyle = s.z > 0.8 ? "#b9f4ff" : "#ffffff";
      if (boost > 1.5)
        ctx.fillRect(px, py, boost * s.z * 7, Math.max(1, s.z * 1.6));
      else {
        ctx.beginPath();
        ctx.arc(px, py, s.z * 1.5, 0, 6.283);
        ctx.fill();
      }
    }
    if (!reduce && !shoot && Math.random() < 0.004)
      shoot = {
        x: Math.random() * W,
        y: Math.random() * H * 0.5,
        vx: -9 - Math.random() * 6,
        vy: 4 + Math.random() * 3,
        life: 1,
      };
    if (shoot) {
      const g = ctx.createLinearGradient(
        shoot.x,
        shoot.y,
        shoot.x - shoot.vx * 7,
        shoot.y - shoot.vy * 7,
      );
      g.addColorStop(0, "rgba(255,255,255," + shoot.life + ")");
      g.addColorStop(1, "rgba(124,92,255,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shoot.x, shoot.y);
      ctx.lineTo(shoot.x - shoot.vx * 7, shoot.y - shoot.vy * 7);
      ctx.stroke();
      shoot.x += shoot.vx;
      shoot.y += shoot.vy;
      shoot.life -= 0.012;
      if (shoot.life <= 0) shoot = null;
    }
    boost *= 0.965;
    if (boost < 0.01) boost = 0;
    if (!reduce) requestAnimationFrame(sky);
  }

  resize();
  sky();
  renderAll();
})();
