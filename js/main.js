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

/* ---------- Carrusel y Showcase de proyectos ---------- */
const WORK = [
  {
    title: "UniStack",
    kicker: "ANDROID APP",
    desc: "Academic lifecycle companion for students: modular terms, weighted GPA calculations, offline-first persistence with 1-file backup/restore, custom OTA in-app updates, and 28 dynamic themes.",
    highlights: [
      "Offline-first SQLite/Room persistence engine",
      "Full data & media attachments single-file backup/restore",
      "28 dynamic themes & typography pairings",
      "Automated in-app OTA update verification",
    ],
    made: ["Kotlin", "Jetpack Compose", "Coroutines & Flow", "Room DB", "Hilt"],
    badge: "RELEASED v1.0.1",
    done: true,
    link: "https://github.com/Kmlozmz/UniStack-releases",
    linkText: "DOWNLOAD APK (v1.0.1) ↗",
    windowTitle: "UniStack for Android · v1.0.1 Stable",
    views: {
      preview: `
        <div class="sim-app">
          <div class="sim-header">
            <div class="sim-header-info">
              <h4>Semester VI · Active Term</h4>
              <p>Academic Performance Overview</p>
            </div>
            <span class="sim-gpa-badge">★ 4.62 / 5.0 GPA</span>
          </div>
          <div class="sim-modules-list">
            <div class="sim-module-card">
              <span class="sim-module-name">
                <span class="sim-module-tag">CORE</span>
                Software Architecture &amp; Patterns
              </span>
              <span class="sim-module-grade">Grade: 4.8</span>
            </div>
            <div class="sim-module-card">
              <span class="sim-module-name">
                <span class="sim-module-tag">DATA</span>
                Database Systems &amp; Persistence
              </span>
              <span class="sim-module-grade">Grade: 4.5</span>
            </div>
            <div class="sim-module-card">
              <span class="sim-module-name">
                <span class="sim-module-tag">MOBILE</span>
                Reactive Concurrency &amp; Flow
              </span>
              <span class="sim-module-grade">Grade: 4.7</span>
            </div>
          </div>
          <div class="sim-footer-bar">
            <span>💾 1-File Backup: Ready</span>
            <span>🎨 28 Themes: Active</span>
            <span>🚀 OTA: Up to date</span>
          </div>
        </div>
      `,
      arch: `
        <div class="sim-arch-grid">
          <div class="sim-arch-row">
            <span class="sim-arch-label">UI LAYER</span>
            <p class="sim-arch-desc">Jetpack Compose UI, Material 3 Expressive, UDF StateFlow, Single Activity Architecture.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">DOMAIN</span>
            <p class="sim-arch-desc">Modular GPA calculation engine, attendance absence thresholds, OTA release verification.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">DATA LAYER</span>
            <p class="sim-arch-desc">Offline-first SQLite via Room DB, Encrypted SharedPreferences, DocumentProvider file streams.</p>
          </div>
        </div>
      `,
      specs: `
        <div class="sim-specs-grid">
          <div class="sim-spec-box">
            <p class="sim-spec-key">RELEASE STATUS</p>
            <p class="sim-spec-val">v1.0.1 Production Stable</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">MINIMUM SDK</p>
            <p class="sim-spec-val">Android 8.0 (API Level 26+)</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">PERSISTENCE</p>
            <p class="sim-spec-val">100% Offline SQLite Engine</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">THEMING</p>
            <p class="sim-spec-val">28 Dynamic Color Schemes</p>
          </div>
        </div>
      `,
    },
  },
  {
    title: "UniStack Landing Page",
    kicker: "WEB SHOWCASE",
    desc: "Dedicated product showcase for UniStack. Built with semantic markup, responsive grid layouts, SVG animations, and performance-first architecture to drive direct downloads.",
    highlights: [
      "Custom responsive layout for mobile and desktop",
      "SVG icon assets and clean typography hierarchy",
      "Direct APK download links and release notes",
      "Sub-second cold load with zero framework overhead",
    ],
    made: ["Web Standards", "Responsive Layout", "SVG Animations", "UX Craft"],
    badge: "LIVE",
    done: true,
    link: "https://kmlozmz.github.io/UniStack-landing_page/",
    linkText: "VISIT LANDING PAGE ↗",
    windowTitle: "kmlozmz.github.io/UniStack-landing_page",
    views: {
      preview: `
        <div class="sim-browser">
          <div class="sim-browser-bar">
            <span class="sim-browser-url">https://kmlozmz.github.io/UniStack-landing_page/</span>
          </div>
          <div class="sim-browser-hero">
            <h4 class="sim-browser-title">Academic Life in One App</h4>
            <p class="sim-browser-sub">The offline-first student companion engineered for focus, clarity, and control.</p>
            <div class="sim-browser-pills">
              <span class="sim-pill">Download APK v1.0.1</span>
              <span class="sim-pill">View Docs</span>
            </div>
          </div>
          <div class="sim-footer-bar">
            <span>⚡ Sub-Second Load</span>
            <span>📱 100% Responsive</span>
            <span>🔒 Privacy First</span>
          </div>
        </div>
      `,
      arch: `
        <div class="sim-arch-grid">
          <div class="sim-arch-row">
            <span class="sim-arch-label">MARKUP</span>
            <p class="sim-arch-desc">Semantic HTML5 with full accessible landmarks and screen-reader navigable attributes.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">STYLING</span>
            <p class="sim-arch-desc">Modular CSS Custom Properties, fluid typography clamp(), and responsive CSS Grid / Flexbox.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">DELIVERY</span>
            <p class="sim-arch-desc">Zero external runtime dependencies. Lightweight compressed SVG assets and optimized WebP media.</p>
          </div>
        </div>
      `,
      specs: `
        <div class="sim-specs-grid">
          <div class="sim-spec-box">
            <p class="sim-spec-key">HOSTING</p>
            <p class="sim-spec-val">GitHub Pages CDN</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">PERFORMANCE</p>
            <p class="sim-spec-val">100 / 100 Lighthouse Target</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">DEPENDENCIES</p>
            <p class="sim-spec-val">Zero Runtime Dependencies</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">RESPONSIVE RANGE</p>
            <p class="sim-spec-val">320px to 4K Ultrawide</p>
          </div>
        </div>
      `,
    },
  },
  {
    title: "Design Tokens & Tooling",
    kicker: "SYSTEMS & LINTER",
    desc: "Comprehensive token architecture for color, shape, and motion. Custom Gradle verification tasks analyze code and fail the build if hardcoded styles leak into UI screens.",
    highlights: [
      "Strict build-fail verification rules for hardcoded colors",
      "28 synchronized dark and light dynamic themes",
      "Automated compilation to Jetpack Compose tokens",
      "Python scripts for continuous asset optimization",
    ],
    made: ["Design Systems", "Compose Theming", "Gradle Automation", "CI Rules"],
    badge: "ACTIVE",
    done: true,
    link: "https://github.com/Kmlozmz",
    linkText: "VIEW GITHUB ↗",
    windowTitle: "Design System & Build Verification Pipeline",
    views: {
      preview: `
        <div class="sim-app">
          <div class="sim-swatch-strip">
            <div class="sim-swatch-box">
              <div class="sim-swatch-color" style="background:#2e3440;"></div>
              <span>Slate</span>
            </div>
            <div class="sim-swatch-box">
              <div class="sim-swatch-color" style="background:#10b981;"></div>
              <span>Mint</span>
            </div>
            <div class="sim-swatch-box">
              <div class="sim-swatch-color" style="background:#f59e0b;"></div>
              <span>Amber</span>
            </div>
            <div class="sim-swatch-box">
              <div class="sim-swatch-color" style="background:#F1A5A0;"></div>
              <span>Coral</span>
            </div>
          </div>
          <div class="sim-module-card">
            <span class="sim-module-name">
              <span class="sim-module-tag">LINTER</span>
              Gradle Token Verification Task
            </span>
            <span class="sim-module-grade" style="color:var(--ok);">PASSED (0 leaks)</span>
          </div>
          <div class="sim-footer-bar">
            <span>✓ Compile-Time Checks</span>
            <span>✓ 28 Color Schemes</span>
            <span>✓ Zero Hardcoded Hex</span>
          </div>
        </div>
      `,
      arch: `
        <div class="sim-arch-grid">
          <div class="sim-arch-row">
            <span class="sim-arch-label">TOKENS</span>
            <p class="sim-arch-desc">Abstract multi-platform design token definitions for colors, typography scales, and corner radii.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">PARSER</span>
            <p class="sim-arch-desc">Custom Gradle plugin inspecting AST to detect raw color literals in Compose UI files.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">CI GATE</span>
            <p class="sim-arch-desc">Fails ./gradlew assembleRelease builds automatically if unverified styles leak into production code.</p>
          </div>
        </div>
      `,
      specs: `
        <div class="sim-specs-grid">
          <div class="sim-spec-box">
            <p class="sim-spec-key">VERIFIED THEMES</p>
            <p class="sim-spec-val">28 Balanced Schemes</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">ENFORCEMENT</p>
            <p class="sim-spec-val">Compile-Time Static Guard</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">TOOLING</p>
            <p class="sim-spec-val">Custom Gradle Plugin</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">COLOR LEAKS</p>
            <p class="sim-spec-val">0 Allowed in Release</p>
          </div>
        </div>
      `,
    },
  },
  {
    title: "Interactive Portfolio",
    kicker: "FRONTEND & UX",
    desc: "Bento grid personal portfolio. Engineered with circular View Transitions API theme toggling, custom physics-based dual cursor, seeded contribution heatmap, and live Bogota timekeeper.",
    highlights: [
      "View Transitions API circular theme toggle reveal",
      "Physics-based lerp dual cursor with hover states",
      "53-week deterministic seeded contribution heatmap",
      "Lenis inertial smooth scrolling normalization",
    ],
    made: ["View Transitions API", "CSS Architecture", "Canvas & Physics", "Lenis"],
    badge: "SHIPPED",
    done: true,
    link: "https://github.com/Kmlozmz/Portafolio-JC",
    linkText: "VIEW SOURCE ↗",
    windowTitle: "kmlozmz.github.io/Portafolio-JC",
    views: {
      preview: `
        <div class="sim-app">
          <div class="sim-modules-list">
            <div class="sim-module-card">
              <span class="sim-module-name">
                <span class="sim-module-tag">API</span>
                View Transitions Circular Reveal
              </span>
              <span class="sim-module-grade" style="color:var(--ok);">ACTIVE</span>
            </div>
            <div class="sim-module-card">
              <span class="sim-module-name">
                <span class="sim-module-tag">PHYSICS</span>
                Dual Cursor Lerp Interpolation
              </span>
              <span class="sim-module-grade" style="color:var(--ok);">0.15 DAMPING</span>
            </div>
            <div class="sim-module-card">
              <span class="sim-module-name">
                <span class="sim-module-tag">CANVAS</span>
                Seeded 53-Week Contribution Matrix
              </span>
              <span class="sim-module-grade" style="color:var(--ok);">SEED 129</span>
            </div>
          </div>
          <div class="sim-footer-bar">
            <span>● 4 / 4 Systems Online</span>
            <span>✦ Inspired by Ayan</span>
            <span>⚡ High Contrast</span>
          </div>
        </div>
      `,
      arch: `
        <div class="sim-arch-grid">
          <div class="sim-arch-row">
            <span class="sim-arch-label">CORE</span>
            <p class="sim-arch-desc">Vanilla Modern ES6+ JavaScript. Modular function lifecycle with zero heavy frameworks.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">ANIMATION</span>
            <p class="sim-arch-desc">RequestAnimationFrame loops for physics cursor and Lenis inertial smooth scroll normalization.</p>
          </div>
          <div class="sim-arch-row">
            <span class="sim-arch-label">THEMING</span>
            <p class="sim-arch-desc">Synchronized light/dark CSS custom properties with native circular mask view transition.</p>
          </div>
        </div>
      `,
      specs: `
        <div class="sim-specs-grid">
          <div class="sim-spec-box">
            <p class="sim-spec-key">DESIGN CONCEPT</p>
            <p class="sim-spec-val">Inspired by notayan.in</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">ACCESSIBILITY</p>
            <p class="sim-spec-val">Reduced Motion & High Contrast</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">BUNDLE SIZE</p>
            <p class="sim-spec-val">Lightweight Zero-Bloat</p>
          </div>
          <div class="sim-spec-box">
            <p class="sim-spec-key">VIEW TRANSITIONS</p>
            <p class="sim-spec-val">Native Chrome & Fallback</p>
          </div>
        </div>
      `,
    },
  },
];

function initWork() {
  const count = $("#workCount");
  const title = $("#workTitle");
  const desc = $("#workDesc");
  const kicker = $("#workKicker");
  const highlights = $("#workHighlights");
  const made = $("#workMade");
  const badge = $("#workBadge");
  const link = $("#workLink");
  const windowTitle = $("#stageWindowTitle");
  const canvas = $("#stageCanvas");
  const tabs = $$("#workTabs .work-tab");
  const modeTabs = $$("#stageModeBar .stage-tab");

  if (!count || !title || !canvas) return;

  let activeIndex = 0;
  let activeMode = "preview";

  const checkSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  const renderStage = () => {
    const w = WORK[activeIndex];
    if (!w || !canvas) return;
    const content = (w.views && w.views[activeMode]) || "";
    canvas.innerHTML = content;
  };

  const render = () => {
    const w = WORK[activeIndex];
    count.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(
      WORK.length,
    ).padStart(2, "0")}`;
    title.textContent = w.title;
    desc.textContent = w.desc;
    if (kicker) kicker.textContent = w.kicker;
    if (windowTitle)
      windowTitle.textContent = w.windowTitle || `${w.title} Preview`;

    if (highlights && w.highlights) {
      highlights.innerHTML = w.highlights
        .map(
          (h) =>
            `<div class="work-highlight-item">${checkSvg}<span>${h}</span></div>`,
        )
        .join("");
    }

    if (made && w.made) {
      made.innerHTML = w.made.map((m) => `<li>${m}</li>`).join("");
    }

    if (badge) {
      badge.innerHTML = `<span class="wip-dot" aria-hidden="true"></span>${w.badge}`;
      badge.classList.toggle("is-done", w.done);
    }

    if (link) {
      link.href = w.link;
      link.textContent = w.linkText || "VIEW PROJECT ↗";
      link.setAttribute("aria-label", `View ${w.title}`);
    }

    tabs.forEach((tab, idx) => {
      const active = idx === activeIndex;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    modeTabs.forEach((tab) => {
      const mode = tab.getAttribute("data-mode");
      tab.classList.toggle("is-active", mode === activeMode);
    });

    renderStage();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const idx = Number(tab.getAttribute("data-index"));
      if (!isNaN(idx) && idx >= 0 && idx < WORK.length) {
        activeIndex = idx;
        render();
      }
    });
  });

  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeMode = tab.getAttribute("data-mode") || "preview";
      modeTabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      renderStage();
    });
  });

  $("#workPrev")?.addEventListener("click", () => {
    activeIndex = (activeIndex - 1 + WORK.length) % WORK.length;
    render();
  });

  $("#workNext")?.addEventListener("click", () => {
    activeIndex = (activeIndex + 1) % WORK.length;
    render();
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

