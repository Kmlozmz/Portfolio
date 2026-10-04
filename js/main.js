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
    window.__lenis.scrollTo(el, { offset: -68, duration: 0.8 });
  } else {
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }
}

/* ---------- Navigation (Option 3: Riel Minimalista Luminous + Desplazamiento Directo y a la Par) ---------- */
let updateNavPillGlobal = null;

function initNav() {
  const nav = $("#mainHeaderNav");
  const navPill = $("#navActivePill");
  const navButtons = $$(".header-nav .nav-btn");
  if (!nav || !navPill || !navButtons.length) return;

  const SECTIONS = ["inicio", "sobre-mi", "proyectos", "habilidades", "contacto"];

  let currentX = null;
  let currentW = null;
  let targetX = 0;
  let targetW = 0;
  let activeIndex = 0;
  let isLooping = false;
  let rafId = 0;
  let isManualClick = false;
  let manualClickTimer = null;

  function getNavMetrics() {
    const navRect = nav.getBoundingClientRect();
    return navButtons.map((btn) => {
      const r = btn.getBoundingClientRect();
      return {
        x: r.left - navRect.left,
        width: r.width,
      };
    });
  }

  function getSectionTargets() {
    const headerHeight = 56;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    const targets = [];
    SECTIONS.forEach((id, idx) => {
      if (idx === 0) {
        targets.push(0);
        return;
      }
      const el = document.getElementById(id);
      if (!el) {
        targets.push(0);
        return;
      }
      const top = Math.max(0, el.offsetTop - headerHeight);
      targets.push(top);
    });

    if (targets.length === 5) {
      targets[4] = Math.min(targets[4], maxScroll);
      for (let i = 1; i < targets.length; i++) {
        if (targets[i] <= targets[i - 1]) {
          targets[i] = targets[i - 1] + 60;
        }
      }
    }

    return { targets, maxScroll };
  }

  // Progreso continuo 1:1 con el scroll sin paradas intermedias ni mesetas
  function getProgress(scrollY, targets, maxScroll) {
    if (scrollY <= 0) return 0;
    if (maxScroll > 0 && scrollY >= maxScroll - 30) return targets.length - 1;

    for (let i = 0; i < targets.length - 1; i++) {
      const y0 = targets[i];
      const y1 = targets[i + 1];
      if (scrollY >= y0 && scrollY <= y1) {
        return i + (scrollY - y0) / (y1 - y0);
      }
    }

    return targets.length - 1;
  }

  // Interpola posición x y ancho w exactamente a la par
  function calculateTarget(progress, metrics) {
    if (!metrics.length) return { x: 0, width: 0, activeIdx: 0 };

    const clamped = Math.max(0, Math.min(metrics.length - 1, progress));
    const baseIdx = Math.floor(clamped);
    const nextIdx = Math.min(metrics.length - 1, baseIdx + 1);
    const frac = clamped - baseIdx;

    const m0 = metrics[baseIdx];
    const m1 = metrics[nextIdx];

    const x = m0.x + (m1.x - m0.x) * frac;
    const width = m0.width + (m1.width - m0.width) * frac;
    const activeIdx = Math.round(clamped);

    return { x, width, activeIdx };
  }

  function loop() {
    if (isManualClick) {
      isLooping = false;
      return;
    }

    const dx = targetX - currentX;
    const dw = targetW - currentW;

    if (Math.abs(dx) > 0.15 || Math.abs(dw) > 0.15) {
      currentX += dx * 0.28;
      currentW += dw * 0.28;
      navPill.style.transform = `translateX(${currentX}px)`;
      navPill.style.width = `${currentW}px`;
      rafId = requestAnimationFrame(loop);
    } else {
      currentX = targetX;
      currentW = targetW;
      navPill.style.transform = `translateX(${targetX}px)`;
      navPill.style.width = `${targetW}px`;
      isLooping = false;
    }
  }

  function update(immediate = false) {
    if (isManualClick && !immediate) return;

    const metrics = getNavMetrics();
    const { targets, maxScroll } = getSectionTargets();
    const scrollY = window.scrollY || window.pageYOffset;
    const progress = getProgress(scrollY, targets, maxScroll);
    const t = calculateTarget(progress, metrics);

    targetX = t.x;
    targetW = t.width;
    activeIndex = t.activeIdx;

    navButtons.forEach((b, idx) => {
      b.classList.toggle("active", idx === activeIndex);
    });

    if (immediate || currentX === null || prefersReducedMotion) {
      if (rafId) cancelAnimationFrame(rafId);
      isLooping = false;
      currentX = targetX;
      currentW = targetW;
      navPill.style.transition = "none";
      navPill.style.transform = `translateX(${targetX}px)`;
      navPill.style.width = `${targetW}px`;
      navPill.style.opacity = "1";
      return;
    }

    if (!isLooping) {
      isLooping = true;
      rafId = requestAnimationFrame(loop);
    }
  }

  updateNavPillGlobal = (idx, immediate = true) => {
    update(immediate);
  };

  // Manejador de clics en la navegación: deslizamiento visible, fluido y elegante directo al destino
  navButtons.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      const metrics = getNavMetrics();
      if (!metrics[idx]) return;

      const dest = metrics[idx];
      targetX = dest.x;
      targetW = dest.width;
      activeIndex = idx;

      // Iluminar botón de destino inmediatamente
      navButtons.forEach((b, i) => b.classList.toggle("active", i === idx));

      // Pausar el loop LERP para permitir que la transición CSS ejecute el deslizamiento visible
      if (rafId) cancelAnimationFrame(rafId);
      isLooping = false;
      isManualClick = true;
      clearTimeout(manualClickTimer);

      if (prefersReducedMotion) {
        navPill.style.transition = "none";
        navPill.style.transform = `translateX(${targetX}px)`;
        navPill.style.width = `${targetW}px`;
        currentX = targetX;
        currentW = targetW;
        isManualClick = false;
        return;
      }

      // Deslizamiento con trayectoria visible de 460ms (ni instantáneo ni lento, perfectamente perceptible)
      navPill.style.transition = "transform 0.46s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1)";
      navPill.style.transform = `translateX(${targetX}px)`;
      navPill.style.width = `${targetW}px`;

      currentX = targetX;
      currentW = targetW;

      // Restablecer sin transición una vez completado el deslizamiento para el scroll manual
      manualClickTimer = setTimeout(() => {
        isManualClick = false;
        navPill.style.transition = "none";
      }, 480);
    });
  });

  // Listener pasivo de scroll continuo
  window.addEventListener("scroll", () => update(false), { passive: true });

  if (window.__lenis) {
    window.__lenis.on("scroll", () => update(false));
  }

  window.addEventListener("resize", () => update(true), { passive: true });

  // Disparo inicial tras pintar el layout
  requestAnimationFrame(() => {
    setTimeout(() => update(true), 60);
  });
}

/* ---------- Language Switcher (ES / EN) ---------- */
function initLanguage() {
  const toggleBtn = $("#langToggle");
  const esEl = $("#langES");
  const enEl = $("#langEN");
  const heroTagline = $("#heroTagline");
  const navBtns = $$(".header-nav .nav-btn");

  if (!toggleBtn) return;

  let currentLang = "ES";

  const updateLanguageUI = () => {
    if (esEl && enEl) {
      if (currentLang === "ES") {
        esEl.className = "lang-active";
        enEl.className = "lang-muted";
      } else {
        esEl.className = "lang-muted";
        enEl.className = "lang-active";
      }
    }

    if (heroTagline) {
      if (currentLang === "EN") {
        heroTagline.textContent =
          "Software developer & builder crafting resilient mobile apps, interactive web experiences, and digital tools with meticulous care.";
      } else {
        heroTagline.textContent =
          "Desarrollador de software y creador enfocado en aplicaciones móviles resilientes, experiencias web interactivas y herramientas con diseño meticuloso.";
      }
    }

    navBtns.forEach((btn) => {
      const text =
        currentLang === "EN"
          ? btn.getAttribute("data-en")
          : btn.getAttribute("data-es");
      if (text) btn.textContent = text;
    });

    $$("[data-es][data-en]").forEach((el) => {
      const text =
        currentLang === "EN"
          ? el.getAttribute("data-en")
          : el.getAttribute("data-es");
      if (text) el.textContent = text;
    });

    // Recalibrate rail width for new text dimensions
    if (typeof updateNavPillGlobal === "function") {
      requestAnimationFrame(() => {
        updateNavPillGlobal(currentNavIndex, true);
      });
    }

    if (typeof updatePassConstruction === "function") {
      requestAnimationFrame(updatePassConstruction);
    }

    if (typeof updateWorkPillGlobal === "function") {
      requestAnimationFrame(updateWorkPillGlobal);
    }
  };

  toggleBtn.addEventListener("click", () => {
    currentLang = currentLang === "ES" ? "EN" : "ES";
    updateLanguageUI();
  });
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

/* Capturas estáticas de los sitios (guardadas en assets/projects). */
const sitePreview = (img, url, label) => `
  <div class="art">
    <a class="browser wide" href="${url}" target="_blank" rel="noopener" aria-label="Open ${label}">
      <div class="br-bar"><i></i><i></i><i></i><span class="br-url">${label}</span><span class="br-open">Open ↗</span></div>
      <div class="live-frame"><img src="${img}" alt="Screenshot of ${label}" loading="lazy" /></div>
    </a>
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

  landing: () => sitePreview("assets/projects/unistack-site.jpg", LANDING_URL, "unistack.srk-lab.workers.dev"),

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
  const stage = $("#workStage");
  const panelsContainer = $("#stagePanels");
  if (!list || !stage || !panelsContainer) return;

  let activeIdx = 0;

  // 1. Build tabs markup with the sliding pill indicator
  list.innerHTML = `
    <div class="work-sliding-pill" id="workSlidingPill" aria-hidden="true"></div>
    ${WORK.map(
      (w, k) => `
      <li role="presentation">
        <button class="work-tab${k === 0 ? " is-active" : ""}" type="button" role="tab" data-index="${k}" aria-selected="${k === 0 ? "true" : "false"}">
          <span class="tab-index">${String(k + 1).padStart(2, "0")}</span>
          <span class="tab-title">${w.title}</span>
          <span class="tab-tag">${w.tag}</span>
        </button>
      </li>`,
    ).join("")}
  `;
  const tabs = $$(".work-tab", list);
  const pill = $("#workSlidingPill", list);

  // 2. Pre-render all panels for instant, zero-flicker directional transitions
  panelsContainer.innerHTML = WORK.map(
    (w, k) => `
    <div class="stage-panel${k === 0 ? " is-active" : ""}" id="stagePanel${k}" role="tabpanel" aria-label="${w.title}">
      <div class="stage-art">
        ${ART[w.art]()}
      </div>
      <div class="stage-info">
        <div class="stage-info-main">
          <div class="stage-meta">
            <span class="count">${String(k + 1).padStart(2, "0")} / ${String(WORK.length).padStart(2, "0")}</span>
            <span>${w.kicker}</span>
            <span class="stage-status">${w.status}</span>
          </div>
          <h3 class="work-title">${w.title}</h3>
          <p class="work-desc">${w.desc}</p>
          <ul class="made">${w.made.map((m) => `<li>${m}</li>`).join("")}</ul>
        </div>
        <div class="stage-actions">
          <div class="stage-links">
            ${w.links
              .map(
                (l) =>
                  `<a class="work-link${l.ghost ? " ghost" : ""}" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`,
              )
              .join("")}
          </div>
          <div class="work-nav">
            <button class="arrow-btn" type="button" data-nav="-1" aria-label="Previous project">&lt;</button>
            <button class="arrow-btn" type="button" data-nav="1" aria-label="Next project">&gt;</button>
          </div>
        </div>
      </div>
    </div>`,
  ).join("");
  const panels = $$(".stage-panel", panelsContainer);

  const updateSlidingPill = (idx) => {
    if (!pill) return;
    const targetTab = tabs[idx];
    if (!targetTab) return;
    const li = targetTab.closest("li") || targetTab;
    pill.style.transform = `translateX(${li.offsetLeft}px)`;
    pill.style.width = `${li.offsetWidth}px`;
    pill.style.height = `${li.offsetHeight}px`;
    const listRect = list.getBoundingClientRect();
    const tabRect = li.getBoundingClientRect();
    if (tabRect.left < listRect.left || tabRect.right > listRect.right) {
      li.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  window.updateWorkPillGlobal = () => updateSlidingPill(activeIdx);

  const goToProject = (newIdx, direction = null) => {
    if (newIdx === activeIdx && panels.length > 0) return;
    const prevIdx = activeIdx;
    activeIdx = newIdx;

    tabs.forEach((t, i) => {
      const on = i === activeIdx;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });

    updateSlidingPill(activeIdx);

    const isForward = direction !== null ? direction > 0 : newIdx > prevIdx;
    const isMobile = window.innerWidth <= 960;

    panels.forEach((p, i) => {
      p.classList.remove("slide-exit-left", "slide-exit-right", "slide-exit-up", "slide-exit-down");
      if (i === prevIdx) {
        if (isMobile) {
          p.classList.add(isForward ? "slide-exit-up" : "slide-exit-down");
        } else {
          p.classList.add(isForward ? "slide-exit-left" : "slide-exit-right");
        }
        p.classList.remove("is-active");
      } else if (i === newIdx) {
        p.classList.remove("is-active");
        void p.offsetWidth;
        if (isMobile) {
          p.style.transform = isForward ? "translateY(24px)" : "translateY(-24px)";
        } else {
          p.style.transform = isForward ? "translateX(28px)" : "translateX(-28px)";
        }
        setTimeout(() => {
          p.classList.add("is-active");
          p.style.transform = isMobile ? "translateY(0)" : "translateX(0)";
        }, 20);
      } else {
        p.classList.remove("is-active");
      }
    });
  };

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      goToProject(Number(t.getAttribute("data-index")));
    }),
  );

  stage.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      const dir = Number(nav.getAttribute("data-nav"));
      goToProject((activeIdx + dir + WORK.length) % WORK.length, dir);
      return;
    }
    const sw = e.target.closest("[data-accent]");
    if (sw) {
      const activeArt = $(".stage-panel.is-active .art", stage);
      const host = $("#unistackArt", activeArt);
      if (host) host.style.setProperty("--ap", sw.getAttribute("data-accent"));
      $$(".ph-swatch", activeArt).forEach((b) => b.classList.toggle("is-on", b === sw));
      return;
    }
  });

  window.addEventListener("resize", () => {
    updateSlidingPill(activeIdx);
  });

  requestAnimationFrame(() => {
    updateSlidingPill(0);
  });
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
  const clockCOT = $("#liveClockCOT");
  if (!clock && !clockCOT) return;
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });
  const tick = () => {
    const timeStr = fmt.format(new Date());
    if (clock) clock.textContent = timeStr;
    if (clockCOT) clockCOT.textContent = `${timeStr} COT (GMT-5)`;
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

/* ---------- Developer Pass: Progressive Morphological Construction & Flight Docking ---------- */
let updatePassConstruction = null;

function initPassConstruction() {
  const sobreMi = $("#sobre-mi");
  const pageWrapper = $(".page-wrapper");
  const heroVisualCard = $(".hero-visual-card");
  const heroAvatarWrap = $("#heroAvatarWrap");
  const heroIntroCol = $("#heroIntroCol");
  const heroName = $("#heroName");
  const heroTagline = $("#heroTagline");
  const heroActionsCol = $(".hero-actions-col");
  const developerPass = $("#developerPass");
  const passHd = $("#passHd");
  const passAvatarTarget = $("#passAvatarTarget");
  const passInfoTarget = $("#passInfoTarget");
  const passTagline = $("#passTagline");
  const passPerf1 = $("#passPerf1");
  const passLi1 = $("#passLi1");
  const passLi2 = $("#passLi2");
  const passSecLabel = $("#passSecLabel");
  const passChips = $$("#passChips .pass-chip");
  const passPerf2 = $("#passPerf2");
  const passStatItems = $$("#passStats .pass-stat-item");
  const manifestoRight = $("#manifestoRight");

  // Right Column Modular Elements
  const manCard = $("#manCard");
  const manSubLabel = $("#manSubLabel");
  const manH3 = $("#manH3");
  const manBodyText = $("#manBodyText");
  const manEm = $("#manEm");
  const telemClockCard = $("#telemClockCard");
  const telemClockSub = $("#telemClockSub");
  const telemCity = $("#telemCity");
  const telemClockChip = $("#telemClockChip");
  const telemPrinciplesCard = $("#telemPrinciplesCard");
  const telemPrinciplesSub = $("#telemPrinciplesSub");
  const principle01 = $("#principle01");
  const principle02 = $("#principle02");
  const principle03 = $("#principle03");

  // Flight layer elements: Living Identity Unit (Avatar + Name/Handle)
  const flightAvatar = $("#flightAvatar");
  const flightInfo = $("#flightInfo");
  const flightName = $("#flightName");
  const flightHandleHero = $("#flightHandleHero");
  const flightHandlePass = $("#flightHandlePass");

  // Sobre Mi header elements for progressive construction
  const sobreMiKicker = $("#sobreMiKicker");
  const sobreMiTitle = $("#sobreMiTitle");

  // Elements inside pass socket
  const passAvatarImg = passAvatarTarget ? $("img", passAvatarTarget) : null;
  const passOnline = $("#passOnline");
  const passEmoji = $("#passEmoji");
  const passName = $("#passName");
  const passHandle = $("#passHandle");

  if (!developerPass || !sobreMi || !flightAvatar) return;

  // Specular spotlight tracking for cards (NO 3D tilt distortion - clean, flat, premium feel)
  const setupCardSpotlight = (cardEl) => {
    if (!cardEl) return;
    cardEl.addEventListener("pointermove", (e) => {
      const b = cardEl.getBoundingClientRect();
      const x = e.clientX - b.left;
      const y = e.clientY - b.top;
      cardEl.style.setProperty("--mx", `${x}px`);
      cardEl.style.setProperty("--my", `${y}px`);
    });
  };

  setupCardSpotlight(developerPass);
  setupCardSpotlight(manCard);
  setupCardSpotlight(telemClockCard);
  setupCardSpotlight(telemPrinciplesCard);

  // Coordinates cache
  let originAv = null;
  let targetAv = null;
  let originInfo = null;
  let targetInfo = null;
  let startScroll = 20;
  let targetScroll = 620;

  const measure = () => {
    if (!pageWrapper || !heroAvatarWrap || !passAvatarTarget || !heroName || !passInfoTarget) return;

    // Temporarily clear any active transforms so we measure pure layout coordinates
    const savedPassTransform = developerPass.style.transform;
    const savedHeroTransform = heroAvatarWrap.style.transform;
    const savedHeroBannerTransform = heroVisualCard ? heroVisualCard.style.transform : "";
    developerPass.style.transform = "none";
    heroAvatarWrap.style.transform = "none";
    if (heroVisualCard) heroVisualCard.style.transform = "none";

    const wrapRect = pageWrapper.getBoundingClientRect();
    const hARect = heroAvatarWrap.getBoundingClientRect();
    const tARect = passAvatarTarget.getBoundingClientRect();
    const hNRect = heroName.getBoundingClientRect();
    const tIRect = passInfoTarget.getBoundingClientRect();

    developerPass.style.transform = savedPassTransform;
    heroAvatarWrap.style.transform = savedHeroTransform;
    if (heroVisualCard) heroVisualCard.style.transform = savedHeroBannerTransform;

    originAv = {
      x: hARect.left - wrapRect.left,
      y: hARect.top - wrapRect.top,
      w: hARect.width || 136,
      h: hARect.height || 136,
    };

    targetAv = {
      x: tARect.left - wrapRect.left,
      y: tARect.top - wrapRect.top,
      w: tARect.width || 76,
      h: tARect.height || 76,
    };

    originInfo = {
      x: hNRect.left - wrapRect.left,
      y: hNRect.top - wrapRect.top,
      w: hNRect.width || 400,
      h: hNRect.height || 50,
    };

    targetInfo = {
      x: tIRect.left - wrapRect.left,
      y: tIRect.top - wrapRect.top,
      w: tIRect.width || 220,
      h: tIRect.height || 60,
    };

    if (sobreMi) {
      startScroll = 40;
      // Complete assembly comfortably centered in viewport (scrollY ~700-720px), well before top clipping!
      targetScroll = Math.max(620, sobreMi.offsetTop + 14);
    }

    update();
  };

  // Smoothstep interpolation helper: maps value x in [a, b] to [0, 1] with cubic ease
  const step = (x, a, b) => {
    if (x <= a) return 0;
    if (x >= b) return 1;
    const t = (x - a) / (b - a);
    return t * t * (3 - 2 * t);
  };

  const update = () => {
    if (!originAv || !targetAv || !originInfo || !targetInfo) return;

    if (prefersReducedMotion) {
      flightAvatar.style.display = "none";
      if (flightInfo) flightInfo.style.display = "none";
      heroAvatarWrap.style.opacity = "1";
      if (heroIntroCol) heroIntroCol.style.opacity = "1";
      if (heroName) heroName.style.opacity = "1";
      if (heroTagline) {
        heroTagline.style.opacity = "1";
        heroTagline.style.transform = "none";
      }
      if (heroActionsCol) {
        heroActionsCol.style.opacity = "1";
        heroActionsCol.style.transform = "none";
      }
      if (heroVisualCard) {
        heroVisualCard.style.opacity = "1";
        heroVisualCard.style.transform = "none";
        heroVisualCard.style.filter = "none";
      }
      if (passAvatarImg) passAvatarImg.style.opacity = "1";
      if (passOnline) {
        passOnline.style.transform = "none";
        passOnline.style.opacity = "1";
      }
      if (passEmoji) {
        passEmoji.style.transform = "none";
        passEmoji.style.opacity = "1";
      }
      if (passName) {
        passName.style.transform = "none";
        passName.style.opacity = "1";
      }
      if (passHandle) {
        passHandle.style.transform = "none";
        passHandle.style.opacity = "1";
      }
      developerPass.style.transform = "none";
      developerPass.style.opacity = "1";
      if (manifestoRight) {
        manifestoRight.style.transform = "none";
        manifestoRight.style.opacity = "1";
      }
      if (manCard) { manCard.style.transform = "none"; manCard.style.opacity = "1"; }
      if (manSubLabel) { manSubLabel.style.transform = "none"; manSubLabel.style.opacity = "1"; }
      if (manH3) { manH3.style.transform = "none"; manH3.style.opacity = "1"; }
      if (manBodyText) { manBodyText.style.transform = "none"; manBodyText.style.opacity = "1"; }
      if (manEm) { manEm.style.setProperty("--em-width", "100%"); manEm.style.setProperty("--em-op", "1"); }
      if (telemClockCard) { telemClockCard.style.transform = "none"; telemClockCard.style.opacity = "1"; }
      if (telemClockSub) { telemClockSub.style.transform = "none"; telemClockSub.style.opacity = "1"; }
      if (telemCity) { telemCity.style.transform = "none"; telemCity.style.opacity = "1"; }
      if (telemClockChip) { telemClockChip.style.transform = "none"; telemClockChip.style.opacity = "1"; }
      if (telemPrinciplesCard) { telemPrinciplesCard.style.transform = "none"; telemPrinciplesCard.style.opacity = "1"; }
      if (telemPrinciplesSub) { telemPrinciplesSub.style.transform = "none"; telemPrinciplesSub.style.opacity = "1"; }
      [principle01, principle02, principle03].forEach(pEl => {
        if (pEl) { pEl.style.transform = "none"; pEl.style.opacity = "1"; }
      });
      return;
    }

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const rawP = (scrollY - startScroll) / (targetScroll - startScroll);
    const p = Math.max(0, Math.min(1, rawP));

    // Dynamic flight trajectory: smoothly spans p from 0.18 to 0.78 (400px of scroll travel!)
    // Smooth, gentle pace matching scroll naturally without rushing ahead
    const pFlight = step(p, 0.18, 0.78);

    // ========================================================
    // 1. HERO DECONSTRUCTION (Desarmando al bajar / Armando al subir)
    // ========================================================
    const pHero = step(p, 0.10, 0.55);
    if (heroVisualCard) {
      const heroScale = 1 - 0.03 * pHero;
      const heroY = -pHero * 22;
      const heroOp = 1 - 0.75 * pHero;
      heroVisualCard.style.transform = `translateY(${heroY}px) scale(${heroScale})`;
      heroVisualCard.style.opacity = String(heroOp);
    }

    const pTagFade = step(p, 0.08, 0.40);
    if (heroTagline) {
      heroTagline.style.transform = `translateY(${pTagFade * 20}px)`;
      heroTagline.style.opacity = String(Math.max(0, 1 - pTagFade));
    }
    if (heroActionsCol) {
      heroActionsCol.style.transform = `translateY(${pTagFade * 20}px)`;
      heroActionsCol.style.opacity = String(Math.max(0, 1 - pTagFade));
    }

    // ========================================================
    // 2. LIVING IDENTITY UNIT (Avatar + Name/Handle moving together)
    // ========================================================
    const isDocked = p >= 0.78;

    // Smooth invisible crossfade across p in [0.12, 0.19]
    // The hero avatar and name stay anchored in the hero until liftoff begins!
    const pFade = step(p, 0.12, 0.19);

    if (p <= 0.11) {
      heroAvatarWrap.style.opacity = "1";
      if (heroName) heroName.style.opacity = "1";
      flightAvatar.style.opacity = "0";
      if (flightInfo) flightInfo.style.opacity = "0";
      if (flightHandleHero) flightHandleHero.style.opacity = "1";
      if (flightHandlePass) flightHandlePass.style.opacity = "0";
    } else {
      heroAvatarWrap.style.opacity = String(Math.max(0, 1 - pFade));
      if (heroName) heroName.style.opacity = String(Math.max(0, 1 - pFade));
      flightAvatar.style.opacity = isDocked ? "0" : String(pFade);
      if (flightInfo) flightInfo.style.opacity = isDocked ? "0" : String(pFade);
    }

    // Avatar flight trajectory
    const curAvX = originAv.x + (targetAv.x - originAv.x) * pFlight;
    const curAvY = originAv.y + (targetAv.y - originAv.y) * pFlight;
    const curAvScale = 1.0 + (targetAv.w / originAv.w - 1.0) * pFlight;
    const pBorderFade = step(p, 0.40, 0.78);
    const curBorderW = Math.max(0, 6 * (1 - pBorderFade));
    flightAvatar.style.transform = `translate3d(${curAvX}px, ${curAvY}px, 0) scale(${curAvScale})`;
    flightAvatar.style.borderWidth = `${curBorderW}px`;

    // Text flight trajectory (Moves synchronized with avatar)
    if (flightInfo) {
      const curInfoX = originInfo.x + (targetInfo.x - originInfo.x) * pFlight;
      const curInfoY = originInfo.y + (targetInfo.y - originInfo.y) * pFlight;
      const targetScaleInfo = 0.50; // Scaled to 21px pass text size
      const curInfoScale = 1.0 + (targetScaleInfo - 1.0) * pFlight;
      flightInfo.style.transform = `translate3d(${curInfoX}px, ${curInfoY}px, 0) scale(${curInfoScale})`;

      // Dissolve of '/ Kmlo' as unit lifts off:
      const pDissolveHero = step(p, 0.18, 0.36);
      if (flightHandleHero) flightHandleHero.style.opacity = String(1 - pDissolveHero);

      // Pass handle '@Kmlozmz' fades in smoothly as unit approaches dock:
      const pFadePass = step(p, 0.55, 0.76);
      if (flightHandlePass) {
        flightHandlePass.style.opacity = String(pFadePass);
        flightHandlePass.style.transform = `translateY(${(1 - pFadePass) * 6}px)`;
      }
    }

    // Static Pass elements handoff at p >= 0.78 (Dock complete)
    if (passAvatarImg) passAvatarImg.style.opacity = isDocked ? "1" : "0";
    if (passName) passName.style.opacity = isDocked ? "1" : "0";
    if (passHandle) passHandle.style.opacity = isDocked ? "1" : "0";

    // Progressive Construction of Sobre Mí Header:
    const pKicker = step(p, 0.42, 0.62);
    if (sobreMiKicker) {
      sobreMiKicker.style.opacity = String(pKicker);
      sobreMiKicker.style.transform = `translateY(${(1 - pKicker) * 16}px)`;
    }
    const pTitle = step(p, 0.46, 0.66);
    if (sobreMiTitle) {
      sobreMiTitle.style.opacity = String(pTitle);
      sobreMiTitle.style.transform = `translateY(${(1 - pTitle) * 20}px)`;
    }

    // ========================================================
    // 3. PROGRESSIVE MORPHOLOGICAL PASS ASSEMBLY (Left Column)
    // ========================================================
    // Pass Chassis: Gentle vertical rise & settle
    const pCard = step(p, 0.22, 0.60);
    const cardScale = 0.97 + 0.03 * pCard;
    const cardY = (1 - pCard) * 26;
    const cardOp = pCard;
    if (p < 1.0) {
      developerPass.style.transform = `translateY(${cardY}px) scale(${cardScale})`;
    } else {
      developerPass.style.removeProperty("transform");
    }
    developerPass.style.opacity = String(cardOp);

    // Header Spec (>_ DEVELOPER SPEC // ID 0001)
    const pHd = step(p, 0.28, 0.62);
    if (passHd) {
      passHd.style.opacity = String(pHd);
      passHd.style.transform = `translateY(${(1 - pHd) * -14}px)`;
    }

    // Avatar Badges: Bloom when identity unit docks
    const pBadge = step(p, 0.76, 0.85);
    if (passEmoji) {
      passEmoji.style.transform = `scale(${pBadge})`;
      passEmoji.style.opacity = String(pBadge);
    }
    if (passOnline) {
      passOnline.style.transform = `scale(${pBadge})`;
      passOnline.style.opacity = String(pBadge);
    }

    // Tagline inside pass: Materializes as identity settles
    const pTag = step(p, 0.77, 0.86);
    if (passTagline) {
      passTagline.style.opacity = String(pTag);
      passTagline.style.transform = `translateY(${(1 - pTag) * 12}px)`;
    }

    // Laser Cut 1: Perforated ticket line draws across
    const pPerf1 = step(p, 0.80, 0.88);
    if (passPerf1) {
      passPerf1.style.transform = `scaleX(${pPerf1})`;
      passPerf1.style.opacity = String(pPerf1);
    }

    // Telemetry rows: Barranquilla & Mobile Arch slide in
    const pLi1 = step(p, 0.82, 0.90);
    if (passLi1) {
      passLi1.style.opacity = String(pLi1);
      passLi1.style.transform = `translateX(${(1 - pLi1) * -16}px)`;
    }
    const pLi2 = step(p, 0.84, 0.91);
    if (passLi2) {
      passLi2.style.opacity = String(pLi2);
      passLi2.style.transform = `translateX(${(1 - pLi2) * -16}px)`;
    }

    // Specialties label & chips: Sockets plug in
    const pSec = step(p, 0.86, 0.93);
    if (passSecLabel) {
      passSecLabel.style.opacity = String(pSec);
    }
    if (passChips && passChips.length) {
      passChips.forEach((chip, i) => {
        const start = 0.87 + i * 0.02;
        const end = Math.min(0.96, start + 0.06);
        const pChip = step(p, start, end);
        chip.style.opacity = String(pChip);
        chip.style.transform = `translateY(${(1 - pChip) * 10}px) scale(${0.85 + 0.15 * pChip})`;
      });
    }

    // Laser Cut 2
    const pPerf2 = step(p, 0.91, 0.96);
    if (passPerf2) {
      passPerf2.style.transform = `scaleX(${pPerf2})`;
      passPerf2.style.opacity = String(pPerf2);
    }

    // Pass Stats Footer: 4 Metrics rise into place
    if (passStatItems && passStatItems.length) {
      passStatItems.forEach((stat, i) => {
        const start = 0.92 + i * 0.016;
        const end = Math.min(0.99, start + 0.05);
        const pStat = step(p, start, end);
        stat.style.opacity = String(pStat);
        stat.style.transform = `translateY(${(1 - pStat) * 12}px) scale(${0.90 + 0.10 * pStat})`;
      });
    }

    // ========================================================
    // 4. PROGRESSIVE DYNAMIC RIGHT COLUMN (Manifesto & Telemetry)
    // ========================================================
    if (manifestoRight) {
      manifestoRight.style.opacity = "1";
    }

    // 4a. Manifesto Card (#manCard)
    const pManCard = step(p, 0.26, 0.62);
    if (manCard) {
      manCard.style.opacity = String(pManCard);
      if (p < 1.0) {
        const manY = (1 - pManCard) * 22;
        const manScale = 0.98 + 0.02 * pManCard;
        manCard.style.transform = `translateY(${manY}px) scale(${manScale})`;
      } else {
        manCard.style.removeProperty("transform");
      }
    }
    // Manifesto Sub-label
    const pManSub = step(p, 0.32, 0.55);
    if (manSubLabel) {
      manSubLabel.style.opacity = String(pManSub);
      manSubLabel.style.transform = `translateX(${(1 - pManSub) * -12}px)`;
    }
    // Manifesto H3 Headline
    const pManH3 = step(p, 0.38, 0.60);
    if (manH3) {
      manH3.style.opacity = String(pManH3);
      manH3.style.transform = `translateY(${(1 - pManH3) * 12}px)`;
    }
    // Manifesto Body Text
    const pManBody = step(p, 0.44, 0.66);
    if (manBodyText) {
      manBodyText.style.opacity = String(pManBody);
      manBodyText.style.transform = `translateY(${(1 - pManBody) * 10}px)`;
    }
    // Manifesto Em Highlight Glow
    const pManEm = step(p, 0.52, 0.72);
    if (manEm) {
      manEm.style.setProperty("--em-width", `${pManEm * 100}%`);
      manEm.style.setProperty("--em-op", String(pManEm));
    }

    // 4b. Clock Telemetry Card (#telemClockCard)
    const pClockCard = step(p, 0.48, 0.76);
    if (telemClockCard) {
      telemClockCard.style.opacity = String(pClockCard);
      if (p < 1.0) {
        const clockY = (1 - pClockCard) * 18;
        const clockScale = 0.98 + 0.02 * pClockCard;
        telemClockCard.style.transform = `translateY(${clockY}px) scale(${clockScale})`;
      } else {
        telemClockCard.style.removeProperty("transform");
      }
    }
    // Clock Sub-label
    const pClockSub = step(p, 0.52, 0.70);
    if (telemClockSub) {
      telemClockSub.style.opacity = String(pClockSub);
      telemClockSub.style.transform = `translateX(${(1 - pClockSub) * -10}px)`;
    }
    // Clock City
    const pCity = step(p, 0.54, 0.72);
    if (telemCity) {
      telemCity.style.opacity = String(pCity);
      telemCity.style.transform = `translateX(${(1 - pCity) * -10}px)`;
    }
    // Clock Chip Pop & Bloom
    const pClockChip = step(p, 0.58, 0.76);
    if (telemClockChip) {
      telemClockChip.style.opacity = String(pClockChip);
      telemClockChip.style.transform = `translateY(${(1 - pClockChip) * 8}px) scale(${0.85 + 0.15 * pClockChip})`;
    }

    // 4c. Principles Card (#telemPrinciplesCard)
    const pPrinciplesCard = step(p, 0.54, 0.82);
    if (telemPrinciplesCard) {
      telemPrinciplesCard.style.opacity = String(pPrinciplesCard);
      if (p < 1.0) {
        const princY = (1 - pPrinciplesCard) * 18;
        const princScale = 0.98 + 0.02 * pPrinciplesCard;
        telemPrinciplesCard.style.transform = `translateY(${princY}px) scale(${princScale})`;
      } else {
        telemPrinciplesCard.style.removeProperty("transform");
      }
    }
    // Principles Sub-label
    const pPrincSub = step(p, 0.56, 0.75);
    if (telemPrinciplesSub) {
      telemPrinciplesSub.style.opacity = String(pPrincSub);
      telemPrinciplesSub.style.transform = `translateX(${(1 - pPrincSub) * -10}px)`;
    }

    // 4d. The 3 Core Principles (Tactical staggered slide-in)
    const pP1 = step(p, 0.65, 0.80);
    if (principle01) {
      principle01.style.opacity = String(pP1);
      if (p < 1.0) {
        principle01.style.transform = `translateX(${(1 - pP1) * -12}px)`;
      } else {
        principle01.style.removeProperty("transform");
      }
    }
    const pP2 = step(p, 0.74, 0.88);
    if (principle02) {
      principle02.style.opacity = String(pP2);
      if (p < 1.0) {
        principle02.style.transform = `translateX(${(1 - pP2) * -12}px)`;
      } else {
        principle02.style.removeProperty("transform");
      }
    }
    const pP3 = step(p, 0.82, 0.96);
    if (principle03) {
      principle03.style.opacity = String(pP3);
      if (p < 1.0) {
        principle03.style.transform = `translateX(${(1 - pP3) * -12}px)`;
      } else {
        principle03.style.removeProperty("transform");
      }
    }
  };

  updatePassConstruction = update;

  window.addEventListener("scroll", update, { passive: true });
  if (window.__lenis) {
    window.__lenis.on("scroll", update);
  }
  window.addEventListener("resize", measure, { passive: true });

  // Initial measurement after layout pass
  requestAnimationFrame(() => {
    setTimeout(measure, 80);
  });
}

/* ---------- Whole-Page Progressive Construction Engine (Armando al bajar / Desarmando al subir) ---------- */
function initPageProgressiveConstruction() {
  if (prefersReducedMotion) return;

  // Cache elements across all sections
  const projLabel = $("#projLabel");
  const projTitle = $("#projTitle");
  const workStageContainer = $("#workStageContainer");
  const workTabs = $("#workTabs");
  const workStage = $("#workStage");

  const collabCard = $("#collabCard");

  const expSec = $("#habilidades");
  const expLabel = $("#expLabel");
  const expSticky = $("#expSticky");
  const expCategories = $$("#expRight > p.label");
  const expSkillRows = $$("#expRight > .skill-rows");

  const servLabel = $("#servLabel");
  const servTitle = $("#servTitle");
  const servDesc = $("#servDesc");
  const setupCards = $$("#servGrid .card.setup");

  const ghTitle = $("#ghTitle");
  const ghCard = $("#ghCard");

  const contactTitle = $("#contactTitle");
  const contactCards = $$("#contactGrid .card");

  const step = (x, a, b) => {
    if (x <= a) return 0;
    if (x >= b) return 1;
    const t = (x - a) / (b - a);
    return t * t * (3 - 2 * t);
  };

  const getViewportProgress = (el, enterFrac = 0.95, settleFrac = 0.35) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const enterY = vh * enterFrac;
    const settleY = vh * settleFrac;
    const raw = (enterY - rect.top) / (enterY - settleY);
    return Math.max(0, Math.min(1, raw));
  };

  const update = () => {
    // --- 1. PROYECTOS PROGRESSIVE CONSTRUCTION ---
    if (projTitle || workStage) {
      const pProj = getViewportProgress(projLabel || projTitle, 0.95, 0.40);

      if (projLabel) {
        const pPl = step(pProj, 0.05, 0.32);
        projLabel.style.opacity = String(pPl);
        projLabel.style.transform = `translateY(${(1 - pPl) * 18}px)`;
      }
      if (projTitle) {
        const pPt = step(pProj, 0.10, 0.42);
        projTitle.style.opacity = String(pPt);
        projTitle.style.transform = `translateY(${(1 - pPt) * 26}px)`;
      }

      const pStage = getViewportProgress(workStageContainer || workStage, 0.92, 0.45);
      if (workTabs) {
        const pTabs = step(pStage, 0.08, 0.45);
        workTabs.style.opacity = String(pTabs);
        workTabs.style.transform = `translateX(${(1 - pTabs) * -24}px)`;
      }
      if (workStage) {
        const pWs = step(pStage, 0.15, 0.65);
        const y = (1 - pWs) * 24;
        const scale = 0.98 + 0.02 * pWs;
        workStage.style.opacity = String(pWs);
        if (pWs < 1.0) {
          workStage.style.transform = `translateY(${y}px) scale(${scale})`;
        } else {
          workStage.style.removeProperty("transform");
        }
      }
    }

    // --- 2. COLLABORATION BANNER ---
    if (collabCard) {
      const pCollab = getViewportProgress(collabCard, 0.93, 0.45);
      const y = (1 - pCollab) * 20;
      collabCard.style.opacity = String(pCollab);
      if (pCollab < 1.0) {
        collabCard.style.transform = `translateY(${y}px)`;
      } else {
        collabCard.style.removeProperty("transform");
      }
    }

    // --- 3. HABILIDADES / EXPERTISE ---
    if (expSec) {
      const pExpHeader = getViewportProgress(expLabel || expSec, 0.94, 0.45);
      if (expLabel) {
        expLabel.style.opacity = String(pExpHeader);
        expLabel.style.transform = `translateY(${(1 - pExpHeader) * 18}px)`;
      }
      if (expSticky) {
        const pSticky = step(pExpHeader, 0.10, 0.50);
        expSticky.style.opacity = String(pSticky);
        expSticky.style.transform = `translateY(${(1 - pSticky) * 24}px)`;
      }

      // Categories & Skill Rows
      expCategories.forEach((catLabel, idx) => {
        const pCat = getViewportProgress(catLabel, 0.94, 0.50);
        catLabel.style.opacity = String(pCat);
        catLabel.style.transform = `translateX(${(1 - pCat) * -18}px)`;

        const ul = expSkillRows[idx];
        if (ul) {
          const rows = $$("li", ul);
          rows.forEach((row, rIdx) => {
            const start = 0.10 + rIdx * 0.12;
            const end = Math.min(1.0, start + 0.35);
            const pRow = step(pCat, start, end);
            row.style.opacity = String(pRow);
            row.style.transform = `translateX(${(1 - pRow) * 22}px)`;
          });
        }
      });
    }

    // --- 4. SERVICIOS (4 Setup Cards) ---
    if (servTitle || setupCards.length) {
      const pServHeader = getViewportProgress(servLabel || servTitle, 0.94, 0.45);
      if (servLabel) {
        servLabel.style.opacity = String(pServHeader);
        servLabel.style.transform = `translateY(${(1 - pServHeader) * 18}px)`;
      }
      if (servTitle) {
        servTitle.style.opacity = String(pServHeader);
        servTitle.style.transform = `translateY(${(1 - pServHeader) * 25}px)`;
      }
      if (servDesc) {
        const pDesc = step(pServHeader, 0.15, 0.60);
        servDesc.style.opacity = String(pDesc);
        servDesc.style.transform = `translateY(${(1 - pDesc) * 20}px)`;
      }

      setupCards.forEach((card, i) => {
        const pCard = getViewportProgress(card, 0.94, 0.45);
        const y = (1 - pCard) * 22;
        const scale = 0.98 + 0.02 * pCard;
        card.style.opacity = String(pCard);
        if (pCard < 1.0) {
          card.style.transform = `translateY(${y}px) scale(${scale})`;
        } else {
          card.style.removeProperty("transform");
        }
      });
    }

    // --- 5. GITHUB ACTIVITY ---
    if (ghTitle || ghCard) {
      const pGh = getViewportProgress(ghTitle || ghCard, 0.94, 0.45);
      if (ghTitle) {
        ghTitle.style.opacity = String(pGh);
        ghTitle.style.transform = `translateY(${(1 - pGh) * 22}px)`;
      }
      if (ghCard) {
        const pGc = step(pGh, 0.15, 0.65);
        ghCard.style.opacity = String(pGc);
        ghCard.style.transform = `translateY(${(1 - pGc) * 32}px) scale(${0.96 + 0.04 * pGc})`;
      }
    }

    // --- 6. CONTACTO ---
    if (contactTitle || contactCards.length) {
      const pContact = getViewportProgress(contactTitle || contactCards[0], 0.94, 0.45);
      if (contactTitle) {
        contactTitle.style.opacity = String(pContact);
        contactTitle.style.transform = `translateY(${(1 - pContact) * 25}px)`;
      }
      contactCards.forEach((card, i) => {
        const pCard = getViewportProgress(card, 0.95, 0.50);
        card.style.opacity = String(pCard);
        card.style.transform = `translateY(${(1 - pCard) * 28}px) scale(${0.94 + 0.06 * pCard})`;
      });
    }
  };

  window.addEventListener("scroll", update, { passive: true });
  if (window.__lenis) {
    window.__lenis.on("scroll", update);
  }
  window.addEventListener("resize", update, { passive: true });
  requestAnimationFrame(() => update());
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
  initLenis();
  initNav();
  initLanguage();
  initCursor();
  initLens();
  initAnchors();
  initReveal();
  initWork();
  initHeatmap();
  initClock();
  initPassConstruction();
  initPageProgressiveConstruction();
  initFabs();
});

