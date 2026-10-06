"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Coalesce scroll updates to a single requestAnimationFrame tick
const onScrollRaf = (fn) => {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  };
};

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------- Custom Cursor: direct pointer + smoothed trail ---------- */
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

/* ---------- Interactive Hero Banner Lens Zoom Effect ---------- */
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

/* ---------- Lenis: smooth inertial scrolling ---------- */
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

/* ---------- Header Navigation & Active Position Indicator ---------- */
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

  // Continuous progress proportional to scroll position
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

  // Simultaneously interpolates x position and width
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

  updateNavPillGlobal = (immediate = true) => {
    update(immediate);
  };

  // Navigation click handler: smooth slide transition to target position
  navButtons.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      const metrics = getNavMetrics();
      if (!metrics[idx]) return;

      const dest = metrics[idx];
      targetX = dest.x;
      targetW = dest.width;
      activeIndex = idx;

      // Highlight target button immediately
      navButtons.forEach((b, i) => b.classList.toggle("active", i === idx));

      // Pause LERP loop while CSS transition slides the pill
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

      // 460ms smooth slide trajectory
      navPill.style.transition = "transform 0.46s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1)";
      navPill.style.transform = `translateX(${targetX}px)`;
      navPill.style.width = `${targetW}px`;

      currentX = targetX;
      currentW = targetW;

      // Reset transition once slide finishes to resume smooth scroll tracking
      manualClickTimer = setTimeout(() => {
        isManualClick = false;
        navPill.style.transition = "none";
      }, 480);
    });
  });

  // Passive scroll listener coordinated via requestAnimationFrame
  const updateOnScroll = onScrollRaf(() => update(false));
  window.addEventListener("scroll", updateOnScroll, { passive: true });

  if (window.__lenis) {
    window.__lenis.on("scroll", updateOnScroll);
  }

  window.addEventListener("resize", () => update(true), { passive: true });

  // Initial update after DOM layout
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
  try {
    const saved = localStorage.getItem("idioma");
    if (saved === "EN" || saved === "ES") {
      currentLang = saved;
    }
  } catch (e) {}

  const updateLanguageUI = () => {
    document.documentElement.lang = currentLang.toLowerCase();

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
          "Growing software developer. I enjoy creating things and turning ideas into real projects. I like working on mobile apps, interactive web experiences, and above all, caring for those little details that make a project feel alive, unique, and special. The magic is in the details.";
      } else {
        heroTagline.textContent =
          "Desarrollador en crecimiento. Me gusta crear cosas y convertir ideas en proyectos reales. Disfruto trabajar en aplicaciones móviles, experiencias web interactivas y, sobre todo, cuidar esos pequeños detalles que hacen que un proyecto se sienta vivo, único y especial. La magia está en los detalles.";
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
      if (text) {
        if (el.id === "manBodyText" || text.includes("<")) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    $$("[data-aria-es][data-aria-en]").forEach((el) => {
      const aria =
        currentLang === "EN"
          ? el.getAttribute("data-aria-en")
          : el.getAttribute("data-aria-es");
      if (aria) el.setAttribute("aria-label", aria);
    });

    $$("[data-title-es][data-title-en]").forEach((el) => {
      const title =
        currentLang === "EN"
          ? el.getAttribute("data-title-en")
          : el.getAttribute("data-title-es");
      if (title) el.setAttribute("title", title);
    });

    // Recalibrate rail width for new text dimensions
    if (typeof updateNavPillGlobal === "function") {
      requestAnimationFrame(() => {
        updateNavPillGlobal(true);
      });
    }

    if (typeof updatePassConstruction === "function") {
      requestAnimationFrame(updatePassConstruction);
    }

    if (typeof updateWorkPillGlobal === "function") {
      requestAnimationFrame(updateWorkPillGlobal);
    }
  };

  window.updateLanguageGlobal = updateLanguageUI;
  window.getCurrentLanguage = () => currentLang;

  toggleBtn.addEventListener("click", () => {
    currentLang = currentLang === "ES" ? "EN" : "ES";
    try {
      localStorage.setItem("idioma", currentLang);
    } catch (e) {}
    updateLanguageUI();
  });

  // Run on startup
  updateLanguageUI();
}

/* ---------- Smooth Anchor Links ---------- */
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

/* ---------- Scroll Reveal ---------- */
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
        entry.target.style.transitionDelay = `${Math.min(i, 4) * 50}ms`;
        entry.target.classList.add("is-visible");
        o.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px 80px 0px" },
  );
  items.forEach((el) => obs.observe(el));
}

/* ---------- Projects Showcase ---------- */
const SWATCHES = [
  "#F1A5A0", "#7c8cf8", "#4ec9a4", "#f0b35a",
  "#c78bf2", "#5ab0ee", "#ef6b6b", "#9aa5b1",
];

const LANDING_URL = "https://unistack.srk-lab.workers.dev/";

/* Static screenshots stored in assets/projects */
const sitePreview = (img, url, label) => `
  <div class="art">
    <a class="browser wide" href="${url}" target="_blank" rel="noopener" aria-label="Open ${label}" data-aria-es="Abrir ${label}" data-aria-en="Open ${label}">
      <div class="br-bar"><i></i><i></i><i></i><span class="br-url">${label}</span><span class="br-open" data-es="Abrir ↗" data-en="Open ↗">Abrir ↗</span></div>
      <div class="live-frame"><img src="${img}" alt="Screenshot of ${label}" loading="lazy" /></div>
    </a>
  </div>`;
const ART = {
  unistack: () => `
    <div class="art" id="unistackArt">
      <div class="phones real-phones">
        <div class="phone-device p-main" id="unistackMainPhone">
          <img id="unistackScreenImg" src="assets/projects/unistack-inicio.webp" alt="Pantalla de UniStack" loading="lazy" />
        </div>
        <div class="phone-device p-side" id="unistackSidePhone" title="Toca para alternar pantalla" data-title-es="Toca para alternar pantalla" data-title-en="Tap to cycle screen">
          <img id="unistackSideImg" src="assets/projects/unistack-academico.webp" alt="Pantalla secundaria UniStack" loading="lazy" />
        </div>
      </div>
      <button class="btn-zoom-4k" id="openPromoBtn" type="button" aria-haspopup="dialog" aria-label="Ver pieza promocional" data-aria-es="Ver pieza promocional" data-aria-en="View 4K promotional artwork">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        <span data-es="Ver pieza promocional" data-en="View promotional artwork">Ver pieza promocional</span>
      </button>
      <p class="art-caption" data-es="CAPTURAS REALES DE LA APP · ANDROID" data-en="REAL APP SCREENSHOTS · ANDROID">CAPTURAS REALES DE LA APP · ANDROID</p>
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
    const isVoid = document.documentElement.getAttribute("data-theme") === "dark";
    const bannerFile = isVoid ? "assets/hero-void.gif" : "assets/hero-nebula.gif";
    return `
    <div class="art">
      <div class="browser">
        <div class="br-bar"><i></i><i></i><i></i><span class="br-url" data-es="este sitio web" data-en="this website">este sitio web</span></div>
        <div class="br-body">
          <img class="br-banner" src="${bannerFile}" alt="" />
          <div class="br-id"><img src="assets/pfp.webp" alt="" /><div><b>Camilo Pineda</b><span data-es="Software Developer &amp; Entusiasta" data-en="Software Developer &amp; Enthusiast">Software Developer &amp; Entusiasta</span></div></div>
          <div class="mini-heat">${cells}</div>
        </div>
      </div>
    </div>`;
  },
};

const WORK = [
  {
    title: { es: "UniStack", en: "UniStack" },
    tag: "Android app",
    kicker: { es: "APP ANDROID", en: "ANDROID APP" },
    status: { es: "● Disponible ahora", en: "● Available now" },
    desc: {
      es: "Una app Android que reúne toda tu vida universitaria en un solo lugar: cursos, tareas, exámenes, notas y gastos. Funciona sin internet, guarda todo en una sola copia de seguridad, se actualiza sola y se puede personalizar con 28 temas.",
      en: "An Android app that puts your whole university life in one place: courses, assignments, exams, grades and expenses. It works without internet, saves everything in a single backup file, updates itself, and can be customized with 28 themes.",
    },
    made: ["Kotlin", "Jetpack Compose", "Room", "Hilt"],
    links: [
      { label: { es: "CÓDIGO FUENTE ↗", en: "SOURCE CODE ↗" }, href: "https://github.com/Kmlozmz/UniStack" },
      { label: { es: "VISITAR SITIO ↗", en: "VISIT WEBSITE ↗" }, href: LANDING_URL, ghost: true },
    ],
    art: "unistack",
  },
  {
    title: { es: "Sitio Web UniStack", en: "UniStack Website" },
    tag: "Web",
    kicker: { es: "SITIO WEB", en: "WEBSITE" },
    status: { es: "● En línea", en: "● Live" },
    desc: {
      es: "El sitio web oficial de UniStack. Explica qué hace la app, muestra cómo se ve y permite a cualquiera descargar la última versión.",
      en: "The official website for UniStack. It explains what the app does, shows how it looks and lets anyone download the latest version.",
    },
    made: [
      { es: "Diseño Web", en: "Web Design" },
      { es: "Responsive", en: "Responsive" },
      { es: "Cloudflare", en: "Cloudflare" },
    ],
    links: [{ label: { es: "VISITAR SITIO ↗", en: "VISIT WEBSITE ↗" }, href: LANDING_URL }],
    art: "landing",
  },
  {
    title: { es: "Portafolio Personal", en: "Personal Portfolio" },
    tag: "Web",
    kicker: { es: "SITIO WEB", en: "WEBSITE" },
    status: { es: "● Estás aquí", en: "● You are here" },
    desc: {
      es: "El sitio web en el que estás ahora mismo: un lugar para mostrar mi trabajo, contar quién soy y facilitar el contacto.",
      en: "The website you are on right now: a place to show my work, tell who I am and make it easy to get in touch.",
    },
    made: ["HTML", "CSS", "JavaScript"],
    links: [{ label: { es: "VER CÓDIGO ↗", en: "VIEW SOURCE ↗" }, href: "https://github.com/Kmlozmz/Portfolio" }],
    art: "portfolio",
  },
];

function initWork() {
  const list = $("#workTabs");
  const stage = $("#workStage");
  const panelsContainer = $("#stagePanels");
  if (!list || !stage || !panelsContainer) return;

  let activeIdx = 0;

  // 1. Build tabs markup and sliding pill indicator
  list.innerHTML = `
    <div class="work-sliding-pill" id="workSlidingPill" aria-hidden="true"></div>
    ${WORK.map(
      (w, k) => `
      <li role="presentation">
        <button class="work-tab${k === 0 ? " is-active" : ""}" type="button" role="tab" data-index="${k}" aria-selected="${k === 0 ? "true" : "false"}">
          <span class="tab-index">${String(k + 1).padStart(2, "0")}</span>
          <span class="tab-title" data-es="${w.title.es}" data-en="${w.title.en}">${w.title.es}</span>
        </button>
      </li>`,
    ).join("")}
  `;
  const tabs = $$(".work-tab", list);
  const pill = $("#workSlidingPill", list);

  // 2. Pre-render panels for smooth transitions
  panelsContainer.innerHTML = WORK.map(
    (w, k) => `
    <div class="stage-panel${k === 0 ? " is-active" : ""}" id="stagePanel${k}" role="tabpanel" aria-label="${w.title.es}">
      <div class="stage-art">
        ${ART[w.art]()}
      </div>
      <div class="stage-info">
        <div class="stage-info-main">
          <div class="stage-meta">
            <span class="count">${String(k + 1).padStart(2, "0")} / ${String(WORK.length).padStart(2, "0")}</span>
            <span class="work-kicker" data-es="${w.kicker.es}" data-en="${w.kicker.en}">${w.kicker.es}</span>
            <span class="stage-status" data-es="${w.status.es}" data-en="${w.status.en}">${w.status.es}</span>
          </div>
          <h3 class="work-title" data-es="${w.title.es}" data-en="${w.title.en}">${w.title.es}</h3>
          <p class="work-desc" data-es="${w.desc.es}" data-en="${w.desc.en}">${w.desc.es}</p>
          <ul class="made">${w.made.map((m) => typeof m === "string" ? `<li>${m}</li>` : `<li><span data-es="${m.es}" data-en="${m.en}">${m.es}</span></li>`).join("")}</ul>
        </div>
        <div class="stage-actions">
          <div class="stage-links">
            ${w.links
              .map(
                (l) =>
                  `<a class="work-link${l.ghost ? " ghost" : ""}" href="${l.href}" target="_blank" rel="noopener" data-es="${l.label.es}" data-en="${l.label.en}">${l.label.es}</a>`,
              )
              .join("")}
          </div>
          <div class="work-nav">
            <button class="arrow-btn" type="button" data-nav="-1" aria-label="Proyecto anterior" data-aria-es="Proyecto anterior" data-aria-en="Previous project">&lt;</button>
            <button class="arrow-btn" type="button" data-nav="1" aria-label="Siguiente proyecto" data-aria-es="Siguiente proyecto" data-aria-en="Next project">&gt;</button>
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
    const listRect = list.getBoundingClientRect();
    const tabRect = li.getBoundingClientRect();
    if (tabRect.left < listRect.left || tabRect.right > listRect.right) {
      li.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  window.updateWorkPillGlobal = () => updateSlidingPill(activeIdx);

  let deconstructTimer = null;
  let reconstructTimer = null;

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

    const prevPanel = panels[prevIdx];
    const nextPanel = panels[newIdx];

    // Clear pending transition timers
    clearTimeout(deconstructTimer);
    clearTimeout(reconstructTimer);

    // Phase 1: exit transition for current project
    panels.forEach((p, i) => {
      p.classList.remove("is-reconstructing");
      if (i === prevIdx) {
        p.classList.add("is-deconstructing");
      } else if (i !== newIdx) {
        p.classList.remove("is-active", "is-deconstructing");
      }
    });

    // Phase 2: enter transition for new project
    deconstructTimer = setTimeout(() => {
      panels.forEach((p, i) => {
        p.classList.remove("is-deconstructing", "is-reconstructing");
        if (i === newIdx) {
          p.classList.add("is-reconstructing", "is-active");
        } else {
          p.classList.remove("is-active");
        }
      });

      reconstructTimer = setTimeout(() => {
        if (nextPanel) {
          nextPanel.classList.remove("is-reconstructing");
        }
      }, 380);
    }, 200);
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
    const sidePhone = e.target.closest("#unistackSidePhone");
    if (sidePhone) {
      const activeArt = $(".stage-panel.is-active .art", stage);
      const mainImg = $("#unistackScreenImg", activeArt);
      const sideImg = $("#unistackSideImg", activeArt);
      if (!mainImg || !sideImg) return;

      const screenOrder = [
        { main: "assets/projects/unistack-inicio.webp", side: "assets/projects/unistack-academico.webp" },
        { main: "assets/projects/unistack-academico.webp", side: "assets/projects/unistack-horario.webp" },
        { main: "assets/projects/unistack-horario.webp", side: "assets/projects/unistack-gastos.webp" },
        { main: "assets/projects/unistack-gastos.webp", side: "assets/projects/unistack-inicio.webp" },
      ];

      const currentSrc = mainImg.getAttribute("src") || "";
      let curIdx = screenOrder.findIndex((s) => currentSrc.includes(s.main.replace("assets/projects/", "")));
      if (curIdx === -1) curIdx = 0;
      const next = screenOrder[(curIdx + 1) % screenOrder.length];

      mainImg.style.opacity = "0.35";
      mainImg.style.transform = "scale(0.98)";
      setTimeout(() => {
        mainImg.src = next.main;
        sideImg.src = next.side;
        mainImg.style.opacity = "1";
        mainImg.style.transform = "scale(1)";
      }, 120);
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
    { es: "OCT", en: "OCT" },
    { es: "NOV", en: "NOV" },
    { es: "DIC", en: "DEC" },
    { es: "ENE", en: "JAN" },
    { es: "FEB", en: "FEB" },
    { es: "MAR", en: "MAR" },
    { es: "ABR", en: "APR" },
    { es: "MAY", en: "MAY" },
    { es: "JUN", en: "JUN" },
    { es: "JUL", en: "JUL" },
    { es: "AGO", en: "AUG" },
    { es: "SEP", en: "SEP" },
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
    s.setAttribute("data-es", m.es);
    s.setAttribute("data-en", m.en);
    s.textContent = m.es;
    s.style.gridColumn = `span ${SPANS[k]}`;
    months.appendChild(s);
  });

  const grid = document.createElement("div");
  grid.className = "hm-grid";
  grid.setAttribute("aria-hidden", "true");

  // First column: day labels; then one column per week
  const ROW_LABELS = [
    { es: "LUN", en: "MON" },
    { es: "", en: "" },
    { es: "MIÉ", en: "WED" },
    { es: "", en: "" },
    { es: "VIE", en: "FRI" },
    { es: "", en: "" },
    { es: "", en: "" },
  ];
  ROW_LABELS.forEach((t) => {
    const lab = document.createElement("span");
    lab.className = "hm-day";
    if (t.es) {
      lab.setAttribute("data-es", t.es);
      lab.setAttribute("data-en", t.en);
      lab.textContent = t.es;
    }
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
  if (totalEl) {
    totalEl.setAttribute("data-en", `${total} contributions in the last year`);
    totalEl.setAttribute("data-es", `${total} contribuciones en el último año`);
    const savedLang = localStorage.getItem("idioma") || "ES";
    totalEl.textContent = savedLang === "EN" ? totalEl.getAttribute("data-en") : totalEl.getAttribute("data-es");
  }

  // Progressive fade-in + glow sweep on initial view
  if (prefersReducedMotion) return;
  root.classList.add("hm-arm");
  const cells = Array.from(grid.children).filter((el) =>
    el.classList.contains("hm-cell"),
  );
  cells.forEach((c, k) => {
    const week = Math.floor(k / DAYS);
    c.style.transitionDelay = `${week * 24}ms`;
  });
  const light = () => {
    requestAnimationFrame(() => {
      root.classList.remove("hm-arm");
      root.classList.add("hm-lit");
    });
    setTimeout(() => {
      cells.forEach((c) => c.style.removeProperty("transition-delay"));
    }, WEEKS * 24 + 900);
    // Glow wave every 4s sweeping column by column
    // Only brighten active cells (l1-l4); leave empty cells unaffected
    const hasLevel = (cell) =>
      cell.classList.contains("l1") ||
      cell.classList.contains("l2") ||
      cell.classList.contains("l3") ||
      cell.classList.contains("l4");
    const wave = () => {
      for (let wcol = 0; wcol < WEEKS; wcol++) {
        setTimeout(() => {
          for (let d = 0; d < DAYS; d++) {
            const cell = cells[wcol * DAYS + d];
            if (cell && hasLevel(cell)) cell.classList.add("zap");
          }
        }, wcol * 18);
        setTimeout(() => {
          for (let d = 0; d < DAYS; d++) {
            const cell = cells[wcol * DAYS + d];
            if (cell) cell.classList.remove("zap");
          }
        }, wcol * 18 + 320);
      }
    };
    wave();
    window.setInterval(wave, 4000);
  };
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        light();
      });
    },
    { threshold: 0.3 },
  );
  obs.observe(root);
}

function initAge() {
  const el = $("#passAge");
  if (!el) return;
  const birthYear = 2007;
  const birthMonth = 4;
  const birthDay = 14;
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const monthDiff = now.getMonth() - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDay)) age -= 1;
  el.textContent = String(age);
}

/* ---------- Live Clock (Bogota) ---------- */
function initClock() {
  const clock = $("#clock");
  const clockCOT = $("#liveClockCOT");
  const contactClock = $("#contactClock");
  if (!clock && !clockCOT && !contactClock) return;
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
    if (contactClock) contactClock.textContent = timeStr;
  };
  tick();
  window.setInterval(tick, 1000);
}

/* ---------- Floating Controls ---------- */
/* ---------- Cosmic Theme: Void / Nebula ---------- */
function initTheme() {
  const btn = $("#themeToggle");
  const label = $("#themeLabel");
  const root = document.documentElement;
  const KEY = "tema-v2";
  const NEBULA = "nebula";

  const getTheme = () => {
    const chosen = root.getAttribute("data-theme");
    return chosen === NEBULA ? NEBULA : "dark";
  };

  const updateBannerForTheme = () => {
    const isNeb = getTheme() === NEBULA;
    const targetBanner = isNeb ? "assets/hero-nebula.gif" : "assets/hero-void.gif";

    const heroImg = document.querySelector(".hero-banner-image");
    if (heroImg && heroImg.getAttribute("src") !== targetBanner) {
      heroImg.src = targetBanner;
    }

    const zoomImg = document.querySelector(".lens-overlay-zoom img");
    if (zoomImg && zoomImg.getAttribute("src") !== targetBanner) {
      zoomImg.src = targetBanner;
    }

    const brBanner = document.querySelector(".br-banner");
    if (brBanner && brBanner.getAttribute("src") !== targetBanner) {
      brBanner.src = targetBanner;
    }
  };

  const sync = () => {
    const neb = getTheme() === NEBULA;
    root.classList.add("dark");
    btn?.setAttribute("aria-pressed", String(neb));
    btn?.setAttribute(
      "aria-label",
      neb ? "Switch to void theme" : "Switch to nebula theme",
    );
    if (label) label.textContent = neb ? "VOID" : "NEBULA";
    updateBannerForTheme();
  };

  try {
    const stored = localStorage.getItem(KEY);
    root.setAttribute("data-theme", stored === "dark" ? "dark" : NEBULA);
  } catch {
    root.setAttribute("data-theme", NEBULA);
  }
  sync();

  if (!btn) return;

  const apply = (next) => {
    root.setAttribute("data-theme", next);
    root.classList.add("dark");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* apply theme even if localStorage is restricted */
    }
    sync();
  };

  btn.addEventListener("click", () => {
    const next = getTheme() === NEBULA ? "dark" : NEBULA;
    if (!document.startViewTransition || prefersReducedMotion) {
      apply(next);
      return;
    }

    // Circle originates from the center of the toggle pill
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
        /* theme applied even if transition aborts */
      });
    transition.finished.finally(() => {
      root.style.removeProperty("--reveal-x");
      root.style.removeProperty("--reveal-y");
      root.style.removeProperty("--reveal-r");
    });
  });
}

/* ---------- Developer Pass: identity docking & scroll animation ---------- */
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

  // Right column elements
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

  // Transition elements: avatar and name
  const flightAvatar = $("#flightAvatar");
  const flightInfo = $("#flightInfo");
  const flightName = $("#flightName");
  const flightHandleHero = $("#flightHandleHero");
  const flightHandlePass = $("#flightHandlePass");

  // About section header
  const sobreMiKicker = $("#sobreMiKicker");
  const sobreMiTitle = $("#sobreMiTitle");

  // Internal elements inside pass socket
  const passAvatarImg = passAvatarTarget ? $("img", passAvatarTarget) : null;
  const passOnline = $("#passOnline");
  const passEmoji = $("#passEmoji");
  const passName = $("#passName");
  const passHandle = $("#passHandle");

  if (!developerPass || !sobreMi || !flightAvatar) return;

  // Dynamic spotlight hover on cards
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

    // Temporarily clear transforms to measure absolute coordinates
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
      // Target scroll offset before arriving at #sobre-mi
      targetScroll = Math.max(450, sobreMi.offsetTop - 180);
    }

    update();
  };

  // Cubic smoothstep interpolation between a and b
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

    // Coordinated scroll flight trajectory
    // Gradual movement synced with scroll progress
    const pFlight = step(p, 0.18, 0.78);

    // ========================================================
    // 1. Hero visual exit transition
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
    // 2. Avatar & name flight transition to Developer Pass
    // ========================================================
    const isDocked = p >= 0.78;

    // Crossfade between hero and flight elements
    // Avatar and name remain anchored until liftoff
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

    // Name and handle flight trajectory
    if (flightInfo) {
      const curInfoX = originInfo.x + (targetInfo.x - originInfo.x) * pFlight;
      const curInfoY = originInfo.y + (targetInfo.y - originInfo.y) * pFlight;
      const targetScaleInfo = 0.50;
      const curInfoScale = 1.0 + (targetScaleInfo - 1.0) * pFlight;
      flightInfo.style.transform = `translate3d(${curInfoX}px, ${curInfoY}px, 0) scale(${curInfoScale})`;

      // Hero handle fade transition
      const pDissolveHero = step(p, 0.18, 0.36);
      if (flightHandleHero) flightHandleHero.style.opacity = String(1 - pDissolveHero);

      // Pass handle fade-in
      const pFadePass = step(p, 0.55, 0.76);
      if (flightHandlePass) {
        flightHandlePass.style.opacity = String(pFadePass);
        flightHandlePass.style.transform = `translateY(${(1 - pFadePass) * 6}px)`;
      }
    }

    // Activate static pass elements once docked
    if (passAvatarImg) passAvatarImg.style.opacity = isDocked ? "1" : "0";
    if (passName) passName.style.opacity = isDocked ? "1" : "0";
    if (passHandle) passHandle.style.opacity = isDocked ? "1" : "0";

    // About section header
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
    // 3. Developer Pass visual assembly
    // ========================================================
    // Pass chassis container
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

    // Top identifier badge
    const pHd = step(p, 0.28, 0.62);
    if (passHd) {
      passHd.style.opacity = String(pHd);
      passHd.style.transform = `translateY(${(1 - pHd) * -14}px)`;
    }

    // Avatar badges
    const pBadge = step(p, 0.76, 0.85);
    if (passEmoji) {
      passEmoji.style.transform = `scale(${pBadge})`;
      passEmoji.style.opacity = String(pBadge);
    }
    if (passOnline) {
      passOnline.style.transform = `scale(${pBadge})`;
      passOnline.style.opacity = String(pBadge);
    }

    // Pass tagline
    const pTag = step(p, 0.77, 0.86);
    if (passTagline) {
      passTagline.style.opacity = String(pTag);
      passTagline.style.transform = `translateY(${(1 - pTag) * 12}px)`;
    }

    // Top divider line
    const pPerf1 = step(p, 0.80, 0.88);
    if (passPerf1) {
      passPerf1.style.transform = `scaleX(${pPerf1})`;
      passPerf1.style.opacity = String(pPerf1);
    }

    // Technical telemetry rows
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

    // Specialty chips
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

    // Bottom divider line
    const pPerf2 = step(p, 0.91, 0.96);
    if (passPerf2) {
      passPerf2.style.transform = `scaleX(${pPerf2})`;
      passPerf2.style.opacity = String(pPerf2);
    }

    // Pass footer metrics
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
    // 4. Right column (Manifesto & telemetry)
    // ========================================================
    if (manifestoRight) {
      manifestoRight.style.opacity = "1";
    }

    // 4a. Manifesto card
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

    // 4b. Local clock card
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
    // Clock indicator chip
    const pClockChip = step(p, 0.58, 0.76);
    if (telemClockChip) {
      telemClockChip.style.opacity = String(pClockChip);
      telemClockChip.style.transform = `translateY(${(1 - pClockChip) * 8}px) scale(${0.85 + 0.15 * pClockChip})`;
    }

    // 4c. Principles card
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

    // 4d. Principles staggered entrance
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

  const passOnScroll = onScrollRaf(update);
  window.addEventListener("scroll", passOnScroll, { passive: true });
  if (window.__lenis) {
    window.__lenis.on("scroll", passOnScroll);
  }
  window.addEventListener("resize", measure, { passive: true });

  // Initial measurement after layout pass
  requestAnimationFrame(() => {
    setTimeout(measure, 80);
  });
}

/* ---------- Scroll reveal animations for sections ---------- */
function initPageProgressiveConstruction() {
  if (prefersReducedMotion) return;

  // Element references
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
  const contactCards = $$("#contactGrid .uplink");

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

    // --- 3. SKILLS / EXPERTISE ---
    if (expSec) {
      const pExpHeader = getViewportProgress(expLabel || expSec, 0.94, 0.45);
      if (expLabel) {
        expLabel.style.opacity = String(pExpHeader);
        expLabel.style.transform = `translateY(${(1 - pExpHeader) * 18}px)`;
      }
      if (expSticky) {
        const pSticky = step(pExpHeader, 0.10, 0.50);
        expSticky.style.opacity = String(pSticky);
        // Avoid translateY here: sticky positioning lives on .exp-left and transforms would break sticky scrolling.
        expSticky.style.removeProperty("transform");
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

    // --- 4. SERVICES / SETUP CARDS ---
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

    // --- 6. CONTACT ---
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

  window.addEventListener("scroll", onScrollRaf(update), { passive: true });
  if (window.__lenis) {
    window.__lenis.on("scroll", onScrollRaf(update));
  }
  window.addEventListener("resize", update, { passive: true });
  requestAnimationFrame(() => update());
}

/* ---------- Copy email to clipboard ---------- */
function initCopyEmail() {
  const btns = $$("[data-copy-email]");
  if (!btns.length) return;
  const checkSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  btns.forEach((btn) => {
    const origSvg = btn.querySelector("svg")?.outerHTML || "";
    btn.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText("srkmlo16@gmail.com").catch(() => {});
      }
      btn.classList.add("ok");
      const isEn = (localStorage.getItem("idioma") || "ES") === "EN";
      btn.innerHTML = checkSvg + `<span> ${isEn ? "[ copied! ]" : "[ ¡copiado! ]"}</span>`;
      setTimeout(() => {
        btn.classList.remove("ok");
        const curLang = localStorage.getItem("idioma") || "ES";
        const copyText = curLang === "EN" ? "[ copy address ]" : "[ copiar dirección ]";
        btn.innerHTML = (origSvg || checkSvg) + `<span data-es="[ copiar dirección ]" data-en="[ copy address ]">${copyText}</span>`;
      }, 1400);
    });
  });
}

/* ---------- Deep space background: stars & meteors ---------- */
function initScrollBg() {
  const canvas = $("#scrollBg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Deep space atlas: constellations, galaxies, planet points, and black hole.
  // Named celestial entities display hover labels.
  const COL = 1100;
  let w = 0;
  let h = 0;
  let maxScroll = 0;
  let dark = true;
  let stars = [];
  let constels = [];
  let galaxies = [];
  let wanderers = []; // Planets: bright points in deep space
  let pulsar = null; // Cosmic pulsar with rotating beams
  let meteors = [];
  let nextMeteor = 0;
  let raf = 0;
  let t = 0;
  let prevY = window.scrollY || 0;
  let sVel = 0; // Smoothed scroll velocity for brightness and meteor rate
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  const spots = []; // {x, y, rad, text} candidates for hover tooltip this frame

  const readTheme = () => {
    dark = document.documentElement.getAttribute("data-theme") !== "light";
  };

  const buildCosmos = () => {
    const margin = (w - COL) / 2;
    stars = [];
    constels = [];
    galaxies = [];
    wanderers = [];
    pulsar = null;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - h);
    if (margin < 120) return; // Insufficient margin: skip
    const laneX = (side) => (side ? w - margin / 2 : margin / 2);
    const span = maxScroll * 0.95 + h; // Vertical range to populate
    // Lateral stars with fixed document coordinates
    for (let i = 0; i < 320; i++) {
      const side = i % 2 === 0 ? 0 : 1;
      const hero = Math.random() < 0.08;
      stars.push({
        x: laneX(side) + (Math.random() - 0.5) * (margin - 50),
        docY: Math.random() * span,
        r: hero ? 2.0 + Math.random() * 0.9 : 0.6 + Math.random() * 1.6,
        hero,
        depth: 0.3 + Math.random() * 0.6, // Parallax: distant stars move slower
        ph: Math.random() * 6.28,
        tw: 1.5 + Math.random() * 3.5, // Unique twinkle cycle per star
        damp: 3 + Math.random() * 6, // Slow drift while remaining anchored
        dsp: 0.1 + Math.random() * 0.25,
        dph: Math.random() * 6.28,
        accent: Math.random() < 0.18,
        a: hero ? 0.6 + Math.random() * 0.25 : 0.25 + Math.random() * 0.35,
        wide: false,
      });
    }
    // Stardust: subtle micro-stars across the full canvas providing cosmic depth
    for (let i = 0; i < 110; i++) {
      stars.push({
        x: Math.random() * w,
        docY: Math.random() * span,
        r: 0.4 + Math.random() * 0.5,
        hero: false,
        depth: 0.15 + Math.random() * 0.25,
        ph: Math.random() * 6.28,
        tw: 1 + Math.random() * 2.5,
        damp: 2 + Math.random() * 3,
        dsp: 0.08 + Math.random() * 0.15,
        dph: Math.random() * 6.28,
        accent: Math.random() < 0.1,
        a: 0.15 + Math.random() * 0.15,
        wide: true,
      });
    }
    // Real constellations: Taurus, Orion, Ursa Major, Lyra, Cassiopeia.
    // Preserves recognizable shapes with subtle rotation.
    const SHAPES = [
      {
        name: "TAURUS",
        fit: 170, // Compact horns
        pts: [
          [0.9, 0.55], // 0 Aldebaran (hero)
          [0.35, 0.3], // 1
          [-0.15, 0.05], // 2 Hyades vertex
          [0.3, 0.75], // 3 Lower arm
          [0.75, 1.05], // 4 Lower tip
          [-0.5, -0.55], // 5 Upper horn
          [-0.95, -1.25], // 6 Horn tip
          [-0.35, -0.7], // 7 Lower horn
          [-0.75, -1.35], // 8 Horn tip
          [0.55, -0.15], // 9 Forehead
        ],
        mags: [2.6, 1.3, 1.4, 1.3, 1.2, 1.2, 1.1, 1.2, 1.1, 1.2],
        links: [[2, 1], [1, 0], [2, 3], [3, 4], [1, 9], [9, 3], [1, 5], [5, 6], [9, 7], [7, 8]],
        heroes: [{ idx: 0, name: "ALDEBARAN", col: [255, 176, 102] }],
        extra: [ // Pleiades star cluster
          [1.75, -0.95], [1.6, -0.8], [1.9, -0.78],
          [1.7, -1.1], [1.85, -1.02], [1.56, -1.0],
        ],
      },
      {
        name: "ORION",
        pts: [
          [-1.0, -1.2], // 0 Betelgeuse (hero)
          [1.0, -1.05], // 1 Bellatrix
          [-0.32, -0.1], // 2 Orion belt
          [0, 0], // 3
          [0.32, 0.1], // 4
          [0.02, 0.45], // 5 Orion sword
          [0.05, 0.78], // 6 Orion sword
          [0.95, 1.3], // 7 Rigel (hero)
          [-0.9, 1.25], // 8 Saiph
        ],
        mags: [2.6, 1.6, 1.8, 1.9, 1.8, 1.2, 1.0, 2.6, 1.5],
        links: [[0, 2], [1, 4], [2, 3], [3, 4], [3, 5], [5, 6], [2, 8], [4, 7]],
        heroes: [
          { idx: 0, name: "BETELGEUSE", col: [255, 120, 90] },
          { idx: 7, name: "RIGEL", col: [180, 200, 255] },
        ],
      },
      {
        name: "CASSIOPEIA",
        pts: [
          [-1.3, 0.25], [-0.65, -0.35], [0, 0.25], [0.65, -0.35], [1.3, 0.25],
        ],
        mags: [1.6, 1.4, 1.9, 1.4, 1.5],
        links: [[0, 1], [1, 2], [2, 3], [3, 4]],
        heroes: [{ idx: 2, name: "GAMMA CAS", col: [190, 210, 255] }],
      },
      {
        name: "URSA MAJOR",
        pts: [
          [-1.3, -0.9], // 0 Dubhe
          [-1.35, 0.1], // 1 Merak
          [-0.35, 0.15], // 2 Phecda
          [-0.3, -0.85], // 3 Megrez
          [0.7, -0.7], // 4 Alioth
          [1.6, -0.5], // 5 Mizar
          [1.75, -0.32], // 6 Alcor (dim companion star)
          [2.4, -0.2], // 7 Alkaid
        ],
        mags: [1.8, 1.6, 1.5, 1.4, 1.7, 1.8, 0.8, 1.7],
        links: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 7], [5, 6]],
        heroes: [],
      },
      {
        name: "LYRA",
        pts: [
          [0, -1.0], // 0 Vega (hero)
          [0.45, -0.25], // 1 Epsilon
          [0.35, 0.45], // 2 Sheliak
          [-0.35, 0.45], // 3 Sulafat
          [-0.45, -0.25], // 4 Delta
        ],
        mags: [2.8, 1.3, 1.4, 1.4, 1.3],
        links: [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4]],
        heroes: [{ idx: 0, name: "VEGA", col: [190, 210, 255] }],
      },
    ];
    SHAPES.forEach((shape, k) => {
      const side = k % 2 === 0 ? 0 : 1;
      const ang = (Math.random() - 0.5) * 0.5; // Subtle rotation: easily recognizable
      // Auto-scale: limit constellation size to prevent content overlap
      const bxs = shape.pts.map((p) => p[0]);
      const bys = shape.pts.map((p) => p[1]);
      const dim = Math.max(
        Math.max(...bxs) - Math.min(...bxs),
        Math.max(...bys) - Math.min(...bys),
        0.001,
      );
      const sc = Math.min(75 + Math.random() * 30, (shape.fit || 200) / dim);
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const cx = laneX(side) + (Math.random() - 0.5) * Math.max(30, margin - 260);
      const cyy = (span * (k + 0.5)) / SHAPES.length + (Math.random() - 0.5) * 140;
      const heroIdx = new Set(shape.heroes.map((hh) => hh.idx));
      const pts = shape.pts.map(([px, py], idx) => [
        cx + (px * cosA - py * sinA) * sc,
        cyy + (px * sinA + py * cosA) * sc,
        heroIdx.has(idx) ? 2.3 : 0.9 + shape.mags[idx] * 0.35,
      ]);
      constels.push({
        name: shape.name,
        pts,
        links: shape.links,
        heroes: shape.heroes,
        extra: (shape.extra || []).map(([px, py]) => [
          cx + (px * cosA - py * sinA) * sc,
          cyy + (px * sinA + py * cosA) * sc,
        ]),
        depth: 0.35 + Math.random() * 0.2,
        a: 0.22 + Math.random() * 0.12,
      });
    });
    // Distant galaxies: soft diffuse nebulae breathing slowly.
    // Andromeda positioned in the lateral upper third.
    const G = ["241,165,160", "120,150,255", "90,200,190"];
    const nG = 5 + Math.floor(Math.random() * 2);
    const andSide = Math.random() < 0.5 ? 0 : 1;
    for (let i = 0; i < nG; i++) {
      const isAnd = i === 0;
      galaxies.push({
        x: isAnd
          ? laneX(andSide) + (Math.random() - 0.5) * 80
          : Math.random() * w,
        docY: isAnd ? span * (0.18 + Math.random() * 0.12) : Math.random() * span,
        rad: isAnd ? 230 + Math.random() * 90 : 140 + Math.random() * 240,
        depth: 0.12 + Math.random() * 0.18,
        col: G[i % G.length],
        a: isAnd ? 0.13 + Math.random() * 0.05 : 0.09 + Math.random() * 0.07,
        ph: Math.random() * 6.28,
        name: isAnd ? "ANDROMEDA" : null,
      });
    }
    // Deep space planets: bright pinpoints
    const PLANETS = [
      { name: "KEPLER-186 f", col: [170, 200, 255] },
      { name: "TRAPPIST-1 e", col: [255, 220, 170] },
    ];
    PLANETS.forEach((p, i) => {
      const side = i % 2 === 0 ? 0 : 1;
      wanderers.push({
        x: laneX(side) + (Math.random() - 0.5) * Math.max(30, margin - 160),
        docY: Math.random() * span,
        depth: 0.45 + Math.random() * 0.15,
        r: 1.6 + Math.random() * 0.5,
        col: p.col,
        ph: Math.random() * 6.28,
        tw: 1 + Math.random() * 2,
        name: p.name,
      });
    });
    // Crab Pulsar: cosmic lighthouse with rotating light beams in the mid lateral area
    const psSide = Math.random() < 0.5 ? 0 : 1;
    pulsar = {
      x: laneX(psSide) + (Math.random() - 0.5) * Math.max(30, margin - 220),
      docY: span * (0.4 + Math.random() * 0.2),
      depth: 0.45,
      r: 2.4,
      ph: Math.random() * 6.28,
      spin: 0.7 + Math.random() * 0.5,
      name: "CRAB PULSAR",
    };
    // Console celestial atlas coordinates
    try {
      console.info(
        "[cosmos] " +
          constels.map((c) => `${c.name}@${Math.round(c.pts[0][1])}`).join(" · ") +
          ` · ANDROMEDA@${Math.round(galaxies[0].docY)}` +
          ` · ${pulsar.name}@${Math.round(pulsar.docY)}` +
          " (docY px, con paralaje aparecen al hacer scroll)",
      );
    } catch (_) {
      /* console unavailable: continue rendering */
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildCosmos();
  };

  const colFor = (d) => {
    if (d.accent) return dark ? "241,165,160" : "200,100,95";
    return dark ? "200,200,215" : "70,60,85";
  };

  // Pre-rendered sprites: gradients baked once, using fast drawImage per frame
  const glowCache = {};
  const glowSprite = (col, rad) => {
    const r = Math.max(2, Math.round(rad));
    const key = `${col}@${r}`;
    let spr = glowCache[key];
    if (!spr) {
      if (Object.keys(glowCache).length > 24) {
        for (const k in glowCache) delete glowCache[k];
      }
      spr = document.createElement("canvas");
      spr.width = r * 2;
      spr.height = r * 2;
      const c = spr.getContext("2d");
      const grad = c.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, `rgba(${col},0.9)`);
      grad.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, r * 2, r * 2);
      glowCache[key] = spr;
    }
    return spr;
  };

  const paint = (boost) => {
    const y = window.scrollY || 0;
    ctx.clearRect(0, 0, w, h);
    spots.length = 0; // Tooltip candidate entities this frame
    // Additive blend mode: overlapping glows combine naturally
    if (dark) ctx.globalCompositeOperation = "lighter";
    // Galaxies: large breathing sprites
    galaxies.forEach((g) => {
      const sy = g.docY - y * g.depth;
      if (sy < -g.rad || sy > h + g.rad) return;
      const breathe = 0.8 + 0.2 * Math.sin(t * 0.35 + g.ph);
      ctx.globalAlpha = Math.min(1, (g.a + boost * 0.3) * breathe * 1.2);
      ctx.drawImage(glowSprite(g.col, g.rad), g.x - g.rad, sy - g.rad);
      ctx.globalAlpha = 1;
      if (g.name) spots.push({ x: g.x, y: sy, rad: Math.min(80, g.rad * 0.4), text: g.name });
    });
    const margin = (w - COL) / 2;
    if (margin < 120) {
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    // Constellations: lines + magnitude nodes + colored hero stars
    constels.forEach((c) => {
      const off = y * c.depth;
      let vis = false;
      const sp = c.pts.map(([px, py]) => {
        const sy = py - off;
        if (sy > -30 && sy < h + 30) vis = true;
        return [px, sy];
      });
      if (!vis) return;
      ctx.strokeStyle = `rgba(180,190,220, ${c.a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      c.links.forEach(([a, b]) => {
        ctx.moveTo(sp[a][0], sp[a][1]);
        ctx.lineTo(sp[b][0], sp[b][1]);
      });
      ctx.stroke();
      // Pleiades: cluster of loose stars without connector lines
      (c.extra || []).forEach(([px, py]) => {
        const sy = py - off;
        if (sy < -6 || sy > h + 6) return;
        ctx.beginPath();
        ctx.arc(px, sy, 0.9, 0, 6.2832);
        ctx.fillStyle = "rgba(235,240,255, 0.7)";
        ctx.fill();
      });
      const heroByIdx = {};
      (c.heroes || []).forEach((hh) => {
        heroByIdx[hh.idx] = hh;
      });
      sp.forEach(([px, sy, m], k) => {
        if (sy < -8 || sy > h + 8) return;
        const hh = heroByIdx[k];
        if (hh) {
          ctx.beginPath();
          ctx.arc(px, sy, 2.3, 0, 6.2832);
          ctx.fillStyle = `rgba(${hh.col[0]},${hh.col[1]},${hh.col[2]},0.95)`;
          ctx.fill();
          spots.push({ x: px, y: sy, rad: 30, text: hh.name });
        } else {
          ctx.beginPath();
          ctx.arc(px, sy, m, 0, 6.2832);
          ctx.fillStyle = `rgba(235,240,255, ${Math.min(0.95, c.a + 0.5)})`;
          ctx.fill();
          spots.push({ x: px, y: sy, rad: 22, text: c.name });
        }
      });
    });
    // Deep space planets: bright pinpoints
    wanderers.forEach((p) => {
      const sy = p.docY - y * p.depth;
      if (sy < -12 || sy > h + 12) return;
      const twk = 0.75 + 0.25 * Math.sin(t * p.tw + p.ph);
      ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]}, ${0.14 * twk})`;
      ctx.beginPath();
      ctx.arc(p.x, sy, 8, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]}, ${0.22 * twk})`;
      ctx.beginPath();
      ctx.arc(p.x, sy, 4, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, sy, p.r, 0, 6.2832);
      ctx.fillStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]}, ${0.95 * twk})`;
      ctx.fill();
      spots.push({ x: p.x, y: sy, rad: 24, text: p.name });
    });
    // Pulsar: flashing core + rotating dual beacon beams
    if (pulsar) {
      const ps = pulsar;
      const sy = ps.docY - y * ps.depth;
      if (sy > -130 && sy < h + 130) {
        const ang = t * ps.spin + ps.ph;
        const blink = 0.6 + 0.4 * Math.sin(t * 6 + ps.ph);
        // Beams first (behind the core)
        ctx.save();
        ctx.translate(ps.x, sy);
        ctx.rotate(ang);
        const beamLen = 70;
        for (const s of [1, -1]) {
          const grad = ctx.createLinearGradient(0, 0, s * beamLen, 0);
          grad.addColorStop(0, `rgba(190,215,255, ${0.35 * blink})`);
          grad.addColorStop(1, "rgba(190,215,255, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, -2.5);
          ctx.lineTo(s * beamLen, -9);
          ctx.lineTo(s * beamLen, 9);
          ctx.lineTo(0, 2.5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        // Halo + core
        const halo = ctx.createRadialGradient(ps.x, sy, 0, ps.x, sy, 16);
        halo.addColorStop(0, `rgba(220,232,255, ${0.5 * blink})`);
        halo.addColorStop(1, "rgba(220,232,255, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(ps.x, sy, 16, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ps.x, sy, ps.r, 0, 6.2832);
        ctx.fillStyle = `rgba(240,246,255, ${0.95 * blink})`;
        ctx.fill();
        spots.push({ x: ps.x, y: sy, rad: 60, text: ps.name });
      }
    }
    // Stars: anchored to celestial coordinates with slow drift and twinkling
    stars.forEach((d) => {
      const sy =
        d.docY - y * d.depth + Math.cos(t * d.dsp * 0.8 + d.dph) * d.damp;
      if (sy < -8 || sy > h + 8) return;
      const sx = d.x + Math.sin(t * d.dsp + d.dph) * d.damp;
      const twk = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * d.tw + d.ph));
      const alpha = Math.min(0.95, (d.a + boost) * twk);
      if (d.hero) {
        ctx.fillStyle = `rgba(${colFor(d)}, ${alpha * 0.1})`;
        ctx.beginPath();
        ctx.arc(sx, sy, d.r * 4, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = `rgba(${colFor(d)}, ${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(sx, sy, d.r * 2.4, 0, 6.2832);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, d.r, 0, 6.2832);
      ctx.fillStyle = `rgba(${colFor(d)}, ${alpha})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  };

  // Meteor: glowing head + gradient tail at random diagonal angle
  const spawnMeteor = () => {
    const ang = Math.PI / 4 + (Math.random() - 0.5) * 0.6; // ~45° ± 17°
    const dir = Math.random() < 0.5 ? 1 : -1; // Trajectory angled left or right
    const speed = 9 + Math.random() * 7;
    meteors.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.7, // Spawns across celestial field
      vx: Math.cos(ang) * speed * dir,
      vy: Math.abs(Math.sin(ang)) * speed * 0.9 + 2,
      life: 1,
      decay: 0.008 + Math.random() * 0.01,
      len: speed * (9 + Math.random() * 5),
      wid: 1.2 + Math.random() * 1.2,
    });
    if (meteors.length > 4) meteors.shift();
  };

  const drawMeteor = (m) => {
    const mag = Math.hypot(m.vx, m.vy) || 1;
    const ux = m.vx / mag;
    const uy = m.vy / mag;
    const tx = m.x - ux * m.len;
    const ty = m.y - uy * m.len;
    const head = dark ? "235,240,255" : "70,60,90";
    const mid = dark ? "150,170,220" : "200,100,95";
    const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
    grad.addColorStop(0, `rgba(${head}, ${0.9 * m.life})`);
    grad.addColorStop(0.35, `rgba(${mid}, ${0.35 * m.life})`);
    grad.addColorStop(1, `rgba(${mid}, 0)`);
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = m.wid;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
    // Layered halo head (efficient, avoids shadowBlur overhead)
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.wid * 2.6, 0, 6.2832);
    ctx.fillStyle = `rgba(${head}, ${0.18 * m.life})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.wid * 1.2, 0, 6.2832);
    ctx.fillStyle = `rgba(${head}, ${0.95 * m.life})`;
    ctx.fill();
  };

  // Floating tooltip label for celestial entity under cursor
  const drawLabel = (sx, sy, text) => {
    ctx.save();
    ctx.letterSpacing = "2px";
    ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    const twd = ctx.measureText(text).width;
    const padX = 10;
    const padY = 7;
    const bx = Math.min(
      Math.max(sx, twd / 2 + padX + 8),
      w - twd / 2 - padX - 8,
    );
    const by = Math.max(34, sy - 34);
    ctx.fillStyle = dark ? "rgba(8,8,16,0.78)" : "rgba(255,255,255,0.9)";
    ctx.strokeStyle = dark
      ? "rgba(241,165,160,0.4)"
      : "rgba(200,100,95,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(bx - twd / 2 - padX, by - padY, twd + padX * 2, 22, 11);
    } else {
      ctx.rect(bx - twd / 2 - padX, by - padY, twd + padX * 2, 22);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = dark ? "#f3eff2" : "#1a1620";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx, by + 4);
    ctx.restore();
  };

  const draw = () => {
    t += 0.016;
    // Scroll direction vector
    const y = window.scrollY || 0;
    const vel = y - prevY;
    prevY = y;
    sVel += (vel - sVel) * 0.12;
    mouse.x += (mouse.tx - mouse.x) * 0.25;
    mouse.y += (mouse.ty - mouse.y) * 0.25;
    // Static sky: scroll subtly enhances meteor and twinkle rate
    const boost = Math.min(0.4, Math.abs(sVel) * 0.015);
    paint(boost);
    // Random meteors spawning periodically (max 3 concurrent)
    const now = performance.now();
    if (now >= nextMeteor) {
      spawnMeteor();
      nextMeteor = now + 1200 + Math.random() * 3800; // Interval: 1-5s
    }
    meteors = meteors.filter(
      (m) => m.life > 0 && m.x > -300 && m.x < w + 300 && m.y < h + 300,
    );
    meteors.forEach((m) => {
      m.x += m.vx;
      m.y += m.vy + sVel * 0.05; // Scroll slightly increases meteor frequency
      m.life -= m.decay;
      if (m.life > 0) drawMeteor(m);
    });
    // Tooltip: closest named entity to cursor
    let best = null;
    let bestD = 1e9;
    spots.forEach((s) => {
      const sdx = mouse.x - s.x;
      const sdy = mouse.y - s.y;
      const sd = Math.sqrt(sdx * sdx + sdy * sdy);
      if (sd < s.rad && sd < bestD) {
        bestD = sd;
        best = s;
      }
    });
    if (best) drawLabel(best.x, best.y, best.text);
    raf = requestAnimationFrame(draw);
  };

  if (prefersReducedMotion) {
    readTheme();
    resize();
    paint(0); // Single static layer
    window.addEventListener("resize", () => {
      readTheme();
      resize();
      paint(0);
    });
    return;
  }

  window.addEventListener("resize", resize);
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    },
    { passive: true },
  );
  const themeBtn = $("#themeToggle");
  if (themeBtn)
    themeBtn.addEventListener("click", () =>
      setTimeout(() => {
        readTheme();
        buildCosmos();
      }, 50),
    );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else {
      prevY = window.scrollY || 0;
      raf = requestAnimationFrame(draw);
    }
  });
  readTheme();
  resize();
  prevY = window.scrollY || 0;
  nextMeteor = performance.now() + 800; // First meteor spawns quickly after load
  raf = requestAnimationFrame(draw);
}

/* Rubber-band overscroll removed for steady feel */

/* ---------- Developer Pass Modal (click to inspect) ---------- */
function initPassModal() {
  const pass = $("#developerPass");
  const modal = $("#passModal");
  const body = $("#passModalBody");
  if (!pass || !modal || !body) return;

  let lastFocus = null;

  const open = () => {
    // Clean clone: avoids duplicate IDs and resets inline animation styles
    const clone = pass.cloneNode(true);
    clone.removeAttribute("id");
    clone.removeAttribute("style");
    clone.removeAttribute("tabindex");
    clone.removeAttribute("role");
    clone.removeAttribute("aria-haspopup");
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
    body.replaceChildren(clone);

    lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
    document.body.style.overflow = "hidden";
    if (window.__lenis) window.__lenis.stop();
  };

  const close = () => {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    if (window.__lenis) window.__lenis.start();
    window.setTimeout(() => {
      modal.hidden = true;
      body.replaceChildren();
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
    }, 320);
  };

  pass.setAttribute("tabindex", "0");
  pass.setAttribute("role", "button");
  pass.setAttribute("aria-haspopup", "dialog");
  pass.addEventListener("click", open);
  pass.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  modal.querySelector("[data-close]")?.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* ---------- UniStack Promo Modal ---------- */
function initPromoModal() {
  const modal = $("#promoModal");
  const modalImg = $("#promoModalImg");
  if (!modal) return;

  let lastFocus = null;

  const open = () => {
    lastFocus = document.activeElement;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    if (modalImg) {
      modalImg.src = isLight
        ? "assets/projects/unistack-promocional-light-4k.webp"
        : "assets/projects/unistack-promocional-4k.webp";
    }
    modal.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add("is-open"));
    });
    document.body.style.overflow = "hidden";
    if (window.__lenis) window.__lenis.stop();
  };

  const close = () => {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    if (window.__lenis) window.__lenis.start();
    window.setTimeout(() => {
      modal.hidden = true;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
    }, 320);
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("#openPromoBtn, [data-open-promo]")) {
      e.preventDefault();
      open();
      return;
    }
    if (e.target.closest("#promoModal [data-close], #promoModal .promo-modal-backdrop")) {
      close();
      return;
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

/* ---------- Typewriter: trigger on first viewport entry ---------- */
function initTypewriter() {
  const els = $$("[data-typewriter]");
  if (!els.length) return;
  if (prefersReducedMotion) return; // Show full text immediately if motion is reduced

  const typeEl = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.length) nodes.push([n, n.nodeValue]);
    }
    if (!nodes.length) return;
    nodes.forEach(([node]) => {
      node.nodeValue = "";
    });
    const caret = document.createElement("span");
    caret.className = "type-caret";
    caret.setAttribute("aria-hidden", "true");
    el.appendChild(caret);

    const total = nodes.reduce((a, [, t]) => a + t.length, 0);
    const perChar = Math.max(6, Math.min(22, 800 / Math.max(total, 1)));
    let ni = 0;
    let ci = 0;
    const tick = () => {
      if (ni >= nodes.length || !caret.isConnected) {
        caret.remove();
        return;
      }
      const [node, full] = nodes[ni];
      node.nodeValue = full.slice(0, ++ci);
      if (ci >= full.length) {
        ni++;
        ci = 0;
      }
      setTimeout(tick, perChar);
    };
    tick();
  };

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);
        el.removeAttribute("data-typewriter");
        typeEl(el);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px 120px 0px" },
  );
  els.forEach((el) => obs.observe(el));
}

/* ---------- Terminal Typewriter for Email Uplink ---------- */
function initUplinkTypewriter() {
  const mailEl = $("#uplinkMail") || $(".uplink-mail");
  if (!mailEl) return;
  if (prefersReducedMotion) return;

  const targetEmail = "srkmlo16@gmail.com";
  const caret = mailEl.querySelector(".uplink-caret");
  let textSpan = mailEl.querySelector(".uplink-text");
  if (!textSpan) {
    textSpan = document.createElement("span");
    textSpan.className = "uplink-text";
    mailEl.insertBefore(textSpan, caret);
  }

  // Initialized empty so typing begins once section enters viewport
  textSpan.textContent = "";

  let isTyping = false;
  let hasTyped = false;

  const startTypewriter = () => {
    if (isTyping) return;
    isTyping = true;
    textSpan.textContent = "";
    if (caret) caret.classList.add("is-typing");

    let i = 0;
    const typeChar = () => {
      if (i < targetEmail.length) {
        textSpan.textContent += targetEmail[i];
        i++;
        const prevChar = targetEmail[i - 1];
        // Natural slight pause on '@' and '.' characters
        const delay = (prevChar === "@" || prevChar === ".") ? 130 : 45 + Math.random() * 25;
        setTimeout(typeChar, delay);
      } else {
        isTyping = false;
        hasTyped = true;
        if (caret) caret.classList.remove("is-typing");
      }
    };

    setTimeout(typeChar, 320);
  };

  const uplinkCard = mailEl.closest(".uplink") || mailEl;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasTyped) {
          obs.unobserve(entry.target);
          startTypewriter();
        }
      });
    },
    { threshold: 0.25, rootMargin: "0px 0px -40px 0px" }
  );

  obs.observe(uplinkCard);

  // Interactive typing replay on click
  mailEl.style.cursor = "pointer";
  mailEl.addEventListener("click", () => {
    if (!isTyping) {
      startTypewriter();
    }
  });
}

/* ---------- Initialization ---------- */
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
  initCursor();
  initLens();
  initAnchors();
  initReveal();
  initWork();
  initHeatmap();
  initClock();
  initAge();
  initLanguage();
  initCopyEmail();
  initScrollBg();
  initPassModal();
  initPromoModal();
  initTypewriter();
  initUplinkTypewriter();
  initPassConstruction();
  initPageProgressiveConstruction();
});

