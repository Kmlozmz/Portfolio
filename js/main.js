"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------- Cursor notayan: pointer (inmediato) + trail (lerp) ---------- */
function initCursor() {
  if (prefersReducedMotion || !finePointer) return;

  const pointer = $("#cursorPointer");
  const trail = $("#cursorTrail");
  if (!pointer || !trail) return;

  document.body.classList.add("has-cursor");

  // Hide native cursor
  const style = document.createElement("style");
  style.id = "custom-cursor-style";
  style.textContent = "* { cursor: none !important; }";
  document.head.appendChild(style);

  const mousePos = { x: -100, y: -100 };
  const trailPos = { x: -100, y: -100 };
  let currentScale = 1;
  let pointerScale = 1;
  let isHovering = false;
  let isVisible = false;
  let rafId = 0;
  let isLooping = false;

  const CURSOR_SPEED = 0.15;
  const CURSOR_HOVER_SCALE = 1.5;
  const TRAIL_SIZE = 40;
  const POINTER_SIZE = 16;

  const update = () => {
    const targetX = mousePos.x;
    const targetY = mousePos.y;

    const dx = targetX - trailPos.x;
    const dy = targetY - trailPos.y;

    const targetScale = isHovering ? CURSOR_HOVER_SCALE : 1;
    const dScale = targetScale - currentScale;

    const targetPointerScale = isHovering ? 0.3 : 1;
    const dPointerScale = targetPointerScale - pointerScale;

    const targetOpacity = isVisible ? 1 : 0;

    // Check if settled
    if (
      Math.abs(dx) < 0.05 &&
      Math.abs(dy) < 0.05 &&
      Math.abs(dScale) < 0.005 &&
      Math.abs(dPointerScale) < 0.005
    ) {
      trailPos.x = targetX;
      trailPos.y = targetY;
      currentScale = targetScale;
      pointerScale = targetPointerScale;

      trail.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(${targetScale})`;
      trail.style.opacity = String(targetOpacity * 0.85);
      pointer.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(${targetPointerScale})`;
      pointer.style.opacity = String(targetOpacity);

      isLooping = false;
      return;
    }

    trailPos.x += dx * CURSOR_SPEED;
    trailPos.y += dy * CURSOR_SPEED;
    currentScale += dScale * 0.15;
    pointerScale += dPointerScale * 0.15;

    trail.style.transform = `translate3d(${trailPos.x}px, ${trailPos.y}px, 0) scale(${currentScale})`;
    trail.style.opacity = String(targetOpacity * 0.85);
    pointer.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(${pointerScale})`;
    pointer.style.opacity = String(targetOpacity);

    rafId = requestAnimationFrame(update);
  };

  const onMouseMove = (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    if (!isVisible) isVisible = true;
    if (!isLooping) {
      isLooping = true;
      rafId = requestAnimationFrame(update);
    }
  };

  const onMouseLeave = () => {
    isVisible = false;
    if (!isLooping) {
      isLooping = true;
      rafId = requestAnimationFrame(update);
    }
  };

  const onMouseOver = (e) => {
    const target = e.target;
    if (!target) return;
    const isInteractive = target.closest(
      "a, button, [role='button'], input, select, textarea, label, [data-state]",
    );
    const newHover = !!isInteractive;
    if (newHover !== isHovering) {
      isHovering = newHover;
      if (!isLooping) {
        isLooping = true;
        rafId = requestAnimationFrame(update);
      }
    }
  };

  const onClick = (e) => {
    if (e.button !== 0) return;
    const pulse = document.createElement("div");
    pulse.className = "custom-cursor-pulse";
    pulse.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scale(0.5)`;
    pulse.style.opacity = "0.8";
    document.body.appendChild(pulse);

    requestAnimationFrame(() => {
      pulse.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scale(2.5)`;
      pulse.style.opacity = "0";
    });

    window.setTimeout(() => pulse.remove(), 400);
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick, true);
  document.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("mouseover", onMouseOver);

  // Start loop
  isLooping = true;
  rafId = requestAnimationFrame(update);

  // Cleanup
  return () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("click", onClick, true);
    document.removeEventListener("mouseleave", onMouseLeave);
    window.removeEventListener("mouseover", onMouseOver);
    cancelAnimationFrame(rafId);
    style.remove();
    document.body.classList.remove("has-cursor");
  };
}

/* ---------- Lens: zoom + blur en hero (notayan 1:1) ---------- */
function initLens() {
  if (prefersReducedMotion) return;

  const lens = $("#heroLens");
  if (!lens) return;

  const img = lens.querySelector("img");
  if (!img) return;

  // Create overlay elements
  const overlay = document.createElement("div");
  overlay.className = "lens-overlay";
  overlay.innerHTML = `
    <div class="lens-overlay-bg"></div>
    <div class="lens-overlay-zoom">
      <img src="${img.src}" alt="" width="${img.width}" height="${img.height}" />
    </div>
  `;
  lens.appendChild(overlay);

  const zoomEl = overlay.querySelector(".lens-overlay-zoom");
  const zoomImg = zoomEl.querySelector("img");

  const LENS_SIZE = 180; // diameter
  const ZOOM_FACTOR = 1.5;

  const handleMouseMove = (e) => {
    const rect = lens.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update mask position (centered on mouse)
    const mask = `radial-gradient(circle ${LENS_SIZE / 2}px at ${x}px ${y}px, black 80%, transparent 100%)`;
    zoomEl.style.webkitMaskImage = mask;
    zoomEl.style.maskImage = mask;
    zoomEl.style.transformOrigin = `${x}px ${y}px`;
    zoomImg.style.transformOrigin = `${x}px ${y}px`;
  };

  lens.addEventListener("mouseenter", () => {
    overlay.classList.add("active");
    // Trigger zoom animation
    requestAnimationFrame(() => {
      zoomEl.style.transform = "scale(1)";
      zoomImg.style.transform = `scale(${ZOOM_FACTOR})`;
    });
  });

  lens.addEventListener("mouseleave", () => {
    overlay.classList.remove("active");
    // Reset zoom
    zoomEl.style.transform = "scale(0.58)";
    zoomImg.style.transform = "scale(1)";
  });

  lens.addEventListener("mousemove", handleMouseMove);
}

/* ---------- Lenis: scroll con inercia ---------- */
function initLenis() {
  if (prefersReducedMotion || typeof Lenis === "undefined") return null;

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  window.__lenis = lenis;
  return lenis;
}

function scrollToTarget(target) {
  const el = typeof target === "string" ? $(target) : target;
  if (!el) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset: -16 });
  } else {
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }
}

/* ---------- Anclas suaves ---------- */
function initAnchors() {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2 || !$(id)) return;
      e.preventDefault();
      scrollToTarget(id);
      $("#quickMenu")?.classList.remove("is-open");
      $("#quickMenuBtn")?.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Revelado ---------- */
function initReveal() {
  const items = $$(".reveal");
  if (!items.length) return;
  if (prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const obs = new IntersectionObserver(
    (entries, o) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
        entry.target.classList.add("is-visible");
        o.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
  );
  items.forEach((el) => obs.observe(el));
}

/* ---------- Showcase de proyectos ---------- */
const SWATCHES = [
  "#F1A5A0", "#7c8cf8", "#4ec9a4", "#f0b35a",
  "#c78bf2", "#5ab0ee", "#ef6b6b", "#9aa5b1",
];

const LANDING_URL = "https://unistack.srk-lab.workers.dev/";

/* Captura automática de la web (se vuelve a generar cada pocas horas). */
const shot = (u) =>
  `https://image.thum.io/get/maxAge/6/width/1280/crop/800/noanimate/${u}`;

/* Si un sitio permite ser embebido, pon embed=true para ver el sitio en vivo. */
const livePreview = (url, label, embed) => `
  <div class="art">
    <div class="browser wide">
      <div class="br-bar"><i></i><i></i><i></i><span class="br-url">${label}</span><a class="br-open" href="${url}" target="_blank" rel="noopener">Open ↗</a></div>
      <div class="live-frame">
        ${embed
          ? `<iframe src="${url}" title="Live preview of ${label}" loading="lazy" tabindex="-1" scrolling="no"></iframe>`
          : `<img src="${shot(url)}" alt="Preview of ${label}" loading="lazy" />`}
      </div>
    </div>
    <p class="art-caption">${embed ? "LIVE PREVIEW" : "AUTO-UPDATED PREVIEW"}</p>
  </div>`;

const ART = {
  unistack: () => `
    <div class="art">
      <div class="phones" style="--ap:${SWATCHES[0]}" id="unistackArt">
        <div class="phone main">
          <div class="ph-head">Semester <span class="ph-chip">Term 2</span></div>
          <div class="ph-ring">
            <svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="42" fill="none" stroke-width="9"/><circle class="val" cx="50" cy="50" r="42" fill="none" stroke-width="9" stroke-dasharray="211 264"/></svg>
            <b><span>4.3<small>WEIGHTED GPA</small></span></b>
          </div>
          <div class="ph-course"><span>Mathematics <em>4.6</em></span><div class="ph-bar"><i style="width:88%"></i></div></div>
          <div class="ph-course"><span>History <em>4.1</em></span><div class="ph-bar"><i style="width:74%"></i></div></div>
          <div class="ph-course"><span>Physics <em>4.2</em></span><div class="ph-bar"><i style="width:80%"></i></div></div>
          <div class="ph-nav"><i class="on"></i><i></i><i></i><i></i></div>
        </div>
        <div class="phone side">
          <div class="ph-head">Themes <span class="ph-chip">28</span></div>
          <div class="ph-aa">Aa</div>
          <div class="ph-note">Font pairing</div>
          <div class="ph-swatches">
            ${SWATCHES.map((c, i) => `<button type="button" class="ph-swatch${i === 0 ? " is-on" : ""}" style="--c:${c}" data-accent="${c}" aria-label="Theme ${i + 1}"></button>`).join("")}
          </div>
          <div class="ph-note">Tap a color</div>
        </div>
      </div>
      <p class="art-caption">ILLUSTRATIVE · SAMPLE DATA</p>
    </div>`,

  landing: () => livePreview(LANDING_URL, "unistack.srk-lab.workers.dev", false),

  portfolio: () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    let cells = "";
    for (let k = 0; k < 130; k++) {
      const r = rand();
      cells += `<i class="${r > 0.86 ? "l3" : r > 0.7 ? "l2" : r > 0.5 ? "l1" : ""}"></i>`;
    }
    return `
    <div class="art">
      <div class="browser">
        <div class="br-bar"><i></i><i></i><i></i><span class="br-url">this website</span></div>
        <div class="br-body">
          <img class="br-banner" src="assets/hero.gif" alt="" />
          <div class="br-id"><img src="assets/pfp.webp" alt="" /><div><b>Camilo Pineda</b><span>Software developer &amp; builder</span></div></div>
          <div class="mini-heat">${cells}</div>
        </div>
      </div>
    </div>`;
  },
};

const WORK = [
  {
    title: "UniStack",
    tag: "Android app",
    kicker: "ANDROID APP",
    status: "● Available now",
    desc: "An Android app that puts your whole university life in one place: courses, assignments, exams, grades and expenses. It works without internet, saves everything in a single backup file, updates itself, and can be customized with 28 themes.",
    made: ["Kotlin", "Jetpack Compose", "Room", "Hilt"],
    links: [
      { label: "DOWNLOAD APK ↗", href: "https://github.com/Kmlozmz/UniStack-releases" },
      { label: "VISIT WEBSITE ↗", href: LANDING_URL, ghost: true },
    ],
    art: "unistack",
  },
  {
    title: "UniStack Website",
    tag: "Web",
    kicker: "WEBSITE",
    status: "● Live",
    desc: "The official website for UniStack. It explains what the app does, shows how it looks and lets anyone download the latest version.",
    made: ["Web design", "Responsive", "Cloudflare"],
    links: [{ label: "VISIT WEBSITE ↗", href: LANDING_URL }],
    art: "landing",
  },
  {
    title: "Personal Portfolio",
    tag: "Web",
    kicker: "WEBSITE",
    status: "● You are here",
    desc: "The website you are on right now: a place to show my work, tell who I am and make it easy to get in touch.",
    made: ["HTML", "CSS", "JavaScript"],
    links: [{ label: "VIEW SOURCE ↗", href: "https://github.com/Kmlozmz/Portafolio-JC" }],
    art: "portfolio",
  },
];

function initWork() {
  const list = $("#workTabs");
  const art = $("#stageArt");
  const info = $("#stageInfo");
  const stage = $("#workStage");
  if (!list || !art || !info) return;

  let idx = 0;

  list.innerHTML = WORK.map(
    (w, k) => `
    <li role="presentation">
      <button class="work-tab" type="button" role="tab" data-index="${k}">
        <span class="tab-index">${String(k + 1).padStart(2, "0")}</span>
        <span class="tab-title">${w.title}</span>
        <span class="tab-tag">${w.tag}</span>
      </button>
    </li>`,
  ).join("");
  const tabs = $$(".work-tab", list);

  const fitFrame = () => {
    const f = $(".live-frame iframe", art);
    if (f) f.style.transform = `scale(${f.parentElement.clientWidth / 1280})`;
  };
  window.addEventListener("resize", fitFrame);

  const render = () => {
    const w = WORK[idx];
    art.innerHTML = ART[w.art]();
    fitFrame();

    info.style.animation = "none";
    void info.offsetWidth;
    info.style.animation = "";
    info.innerHTML = `
      <div>
        <div class="stage-meta">
          <span class="count">${String(idx + 1).padStart(2, "0")} / ${String(WORK.length).padStart(2, "0")}</span>
          <span>${w.kicker}</span>
          <span class="stage-status">${w.status}</span>
        </div>
        <h3 class="work-title">${w.title}</h3>
        <p class="work-desc">${w.desc}</p>
        <ul class="made">${w.made.map((m) => `<li>${m}</li>`).join("")}</ul>
      </div>
      <div class="stage-actions">
        ${w.links
          .map(
            (l) =>
              `<a class="work-link${l.ghost ? " ghost" : ""}" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`,
          )
          .join("")}
        <div class="work-nav">
          <button class="arrow-btn" type="button" data-nav="-1" aria-label="Previous project">&lt;</button>
          <button class="arrow-btn" type="button" data-nav="1" aria-label="Next project">&gt;</button>
        </div>
      </div>`;

    tabs.forEach((t, k) => {
      const on = k === idx;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
  };

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      idx = Number(t.getAttribute("data-index"));
      render();
    }),
  );

  stage.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      idx = (idx + Number(nav.getAttribute("data-nav")) + WORK.length) % WORK.length;
      render();
      return;
    }
    const sw = e.target.closest("[data-accent]");
    if (sw) {
      const host = $("#unistackArt");
      if (host) host.style.setProperty("--ap", sw.getAttribute("data-accent"));
      $$(".ph-swatch", art).forEach((b) => b.classList.toggle("is-on", b === sw));
      return;
    }
  });

  render();
}

/* ---------- Heatmap of contributions ---------- */
function initHeatmap() {
  const root = $("#heatmap");
  if (!root) return;

  const WEEKS = 53;
  const DAYS = 7;
  const MONTHS = [
    "OCT", "NOV", "DEC", "JAN", "FEB", "MAR",
    "APR", "MAY", "JUN", "JUL", "AUG", "SEP",
  ];
  // Column distribution per month summing to 53
  const SPANS = [5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 5];

  // Seeded pseudo-random: stable across refreshes
  let seed = 129;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const months = document.createElement("div");
  months.className = "hm-months";
  months.setAttribute("aria-hidden", "true");
  months.appendChild(document.createElement("span"));
  MONTHS.forEach((m, k) => {
    const s = document.createElement("span");
    s.textContent = m;
    s.style.gridColumn = `span ${SPANS[k]}`;
    months.appendChild(s);
  });

  const grid = document.createElement("div");
  grid.className = "hm-grid";
  grid.setAttribute("aria-hidden", "true");

  // First column: day labels; then one column per week
  const ROW_LABELS = ["MON", "", "WED", "", "FRI", "", ""];
  ROW_LABELS.forEach((t) => {
    const lab = document.createElement("span");
    lab.className = "hm-day";
    lab.textContent = t;
    grid.appendChild(lab);
  });

  let total = 0;
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS; d++) {
      const c = document.createElement("span");
      c.className = "hm-cell";
      // Activity spike mid-year
      const hot = w >= 26 && w <= 42 ? 0.34 : 0.1;
      const r = rand();
      let lvl = 0;
      if (r < hot * 0.35) lvl = 4;
      else if (r < hot * 0.7) lvl = 3;
      else if (r < hot) lvl = 2;
      else if (r < hot + 0.12) lvl = 1;
      if (lvl > 0) {
        c.classList.add(`l${lvl}`);
        total += lvl * 2;
      }
      grid.appendChild(c);
    }
  }

  root.replaceChildren(months, grid);
  const totalEl = $("#ghTotal");
  if (totalEl)
    totalEl.textContent = `${total} contributions in the last year`;
}

/* ---------- Live Clock (Bogota) ---------- */
function initClock() {
  const clock = $("#clock");
  if (!clock) return;
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });
  const tick = () => {
    clock.textContent = fmt.format(new Date());
  };
  tick();
  window.setInterval(tick, 1000);
}

/* ---------- Floating Controls ---------- */
function initFabs() {
  $("#toTop")?.addEventListener("click", () => {
    if (window.__lenis) window.__lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  const btn = $("#quickMenuBtn");
  const menu = $("#quickMenu");
  if (!btn || !menu) return;
  const setOpen = (open) => {
    menu.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!menu.classList.contains("is-open"));
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

/* ---------- Light / Dark Theme ---------- */
function initTheme() {
  const btn = $("#themeToggle");
  const label = $("#themeLabel");
  const root = document.documentElement;
  const KEY = "tema";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  const isDark = () => {
    const chosen = root.getAttribute("data-theme");
    return chosen ? chosen === "dark" : systemDark.matches;
  };

  const sync = () => {
    const dark = isDark();
    btn?.setAttribute("aria-pressed", String(dark));
    btn?.setAttribute(
      "aria-label",
      dark ? "Switch to light theme" : "Switch to dark theme",
    );
    if (label) label.textContent = dark ? "LIGHT" : "DARK";
  };

  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light")
      root.setAttribute("data-theme", stored);
  } catch {
    /* modo privado: se sigue sin persistencia */
  }
  sync();

  systemDark.addEventListener("change", () => {
    if (!root.getAttribute("data-theme")) sync();
  });

  if (!btn) return;

  const apply = (next) => {
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* sin persistencia, pero el cambio se aplica igual */
    }
    sync();
  };

  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    if (!document.startViewTransition || prefersReducedMotion) {
      apply(next);
      return;
    }

    // El círculo nace en el centro de la píldora
    const box = btn.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    root.style.setProperty("--reveal-x", `${x}px`);
    root.style.setProperty("--reveal-y", `${y}px`);
    root.style.setProperty("--reveal-r", "0px");

    const transition = document.startViewTransition(() => apply(next));
    transition.ready
      .then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            root.style.setProperty("--reveal-r", `${radius}px`);
          });
        });
      })
      .catch(() => {
        /* si el navegador aborta, el tema ya quedó aplicado */
      });
    transition.finished.finally(() => {
      root.style.removeProperty("--reveal-x");
      root.style.removeProperty("--reveal-y");
      root.style.removeProperty("--reveal-r");
    });
  });
}

/* ---------- Arranque ---------- */
document.addEventListener("DOMContentLoaded", () => {
  try {
    localStorage.removeItem("lab_palette");
    localStorage.removeItem("lab_hero");
  } catch (e) {}
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.removeAttribute("data-hero");

  initTheme();
  initCursor();
  initLenis();
  initLens();
  initAnchors();
  initReveal();
  initWork();
  initHeatmap();
  initClock();
  initFabs();
});

