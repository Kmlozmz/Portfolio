"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/* -- Menú hamburguesa --*/
function initMenu() {
  const burger = $("#burger");
  const nav = $("#primaryNav");
  if (!burger || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    // Bloquear el fondo solo en móvil, que es donde el menú lo tapa
    document.body.classList.toggle(
      "is-locked",
      open && window.innerWidth <= 760,
    );
  };

  const isOpen = () => nav.classList.contains("is-open");

  burger.addEventListener("click", () => setOpen(!isOpen()));

  // Al elegir destino, el menú estorba
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      burger.focus(); // el foco vuelve a quien abrió
    }
  });

  document.addEventListener("click", (e) => {
    if (isOpen() && !nav.contains(e.target) && !burger.contains(e.target))
      setOpen(false);
  });

  // Al pasar a escritorio el panel deja de existir: hay que soltar el bloqueo
  window.addEventListener("resize", () => {
    if (window.innerWidth > 760 && isOpen()) setOpen(false);
  });
}

/* -- Cabecera: sombra al desplazar y barra de progreso -- */
function initHeader() {
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-stuck", window.scrollY > 8);

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = `${pct}%`;
    }
  };

  // passive: el navegador no espera a este manejador para desplazar
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* -- Enlace activo según la sección visible -- */
function initScrollSpy() {
  const links = $$(".nav-link");
  const sections = links
    .map((link) => $(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  const mark = (id) => {
    links.forEach((link) => {
      link.classList.toggle(
        "is-current",
        link.getAttribute("href") === `#${id}`,
      );
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      // La sección más cercana al centro gana, no la primera que entra
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) mark(visible.target.id);
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
  );

  sections.forEach((section) => observer.observe(section));
}

/* -- Revelado de bloques al entrar en pantalla -- */
function initReveal() {
  const items = $$(".reveal");
  if (!items.length) return;

  if (prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        // Escalonado corto: se lee como una secuencia, no como un parpadeo
        entry.target.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target); // una vez revelado, deja de observarse
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
  );

  items.forEach((el) => observer.observe(el));
}

/* -- Barras de habilidades --
   La barra existe, pero no muestra un porcentaje: un «87%» no lo
   determina nadie. Se declaran tres niveles y cada uno ocupa una
   fracción fija, así que la barra compara entre sí y el texto dice
   el nivel con palabras. Quien usa lector de pantalla oye el nivel,
   no el número, porque el número no significa nada.                */
const SKILL_TIERS = {
  solido: { fill: 92, label: "Sólido" },
  practica: { fill: 66, label: "En práctica" },
  explorando: { fill: 38, label: "Explorando" },
};

function initSkills() {
  const skills = $$(".skill");
  if (!skills.length) return;

  const fill = (skill) => {
    const tier = SKILL_TIERS[skill.dataset.tier] || SKILL_TIERS.explorando;
    const bar = $(".bar", skill);
    const fillEl = $("i", bar);
    const label = $(".skill-tier", skill);

    bar.setAttribute("aria-valuetext", tier.label);
    fillEl.style.width = `${tier.fill}%`;

    if (!label) return;

    if (prefersReducedMotion) {
      label.textContent = tier.label;
      return;
    }

    // El texto entra cuando la barra ya recorrió lo suyo, para que se lea
    // como consecuencia del llenado y no como dos cosas a la vez.
    label.textContent = tier.label;
    label.classList.add("is-in");
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        fill(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );

  skills.forEach((skill) => observer.observe(skill));
}

/* -- Cifras de la portada -- */
function initCounters() {
  const counters = $$("[data-count]");
  if (!counters.length) return;

  const run = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";

    if (prefersReducedMotion) {
      el.textContent = `${target}${suffix}`;
      return;
    }

    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.6 },
  );

  counters.forEach((el) => observer.observe(el));
}

/* -- Filtros de proyectos --
   Manipulación directa del DOM: se ocultan las tarjetas que no
   coinciden y se anuncia el recuento por región viva.              */
function initFilters() {
  const buttons = $$(".chip-btn");
  const cards = $$("#projects .card");
  const count = $("#filterCount");
  if (!buttons.length || !cards.length) return;

  const apply = (filter) => {
    let shown = 0;

    cards.forEach((card) => {
      const tags = (card.dataset.tags || "").split(" ");
      const match = filter === "todos" || tags.includes(filter);
      card.classList.toggle("is-hidden", !match);
      if (match) shown += 1;
    });

    if (count) {
      count.textContent =
        shown === cards.length
          ? `Mostrando los ${shown} proyectos`
          : `Mostrando ${shown} de ${cards.length} proyectos`;
    }
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((other) => {
        const active = other === btn;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", String(active));
      });
      apply(btn.dataset.filter);
    });
  });

  apply("todos");
}

/* -- Formulario de contacto -- */
function initForm() {
  const form = $("#contactForm");
  if (!form) return;

  const status = $("#formStatus");
  const submitBtn = $("#submitBtn");

  const rules = {
    nombre: (value) => {
      if (!value.trim()) return "Escribe tu nombre.";
      if (value.trim().length < 2) return "Al menos 2 caracteres.";
      if (!/^[\p{L}\s'’-]+$/u.test(value.trim()))
        return "Solo letras, espacios y guiones.";
      return "";
    },
    correo: (value) => {
      if (!value.trim()) return "Escribe tu correo.";
      // Suficiente para atajar erratas; la comprobación real es enviar el correo
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()))
        return "Ese correo no parece válido.";
      return "";
    },
    asunto: (value) => (value ? "" : "Elige un asunto."),
    mensaje: (value) => {
      const text = value.trim();
      if (!text) return "Cuéntame algo.";
      if (text.length < 15)
        return `Un poco más: faltan ${15 - text.length} caracteres.`;
      return "";
    },
  };

  const fieldOf = (input) => input.closest(".field");
  const errorOf = (input) => $(`#err-${input.name}`);

  const validate = (input, { silent = false } = {}) => {
    const rule = rules[input.name];
    if (!rule) return true;

    const message = rule(input.value);
    const field = fieldOf(input);
    const errorEl = errorOf(input);

    if (message) {
      if (!silent) {
        field.classList.add("is-invalid");
        field.classList.remove("is-valid");
        if (errorEl) errorEl.textContent = message;
        input.setAttribute("aria-invalid", "true");
      }
      return false;
    }

    field.classList.remove("is-invalid");
    field.classList.add("is-valid");
    if (errorEl) errorEl.textContent = "";
    input.removeAttribute("aria-invalid");
    return true;
  };

  const inputs = $$("input, select, textarea", form);

  inputs.forEach((input) => {
    // Al salir del campo: es el momento en que el usuario dio por terminado
    input.addEventListener("blur", () => validate(input));

    // Mientras escribe: solo si ya había un error, para verlo desaparecer
    input.addEventListener("input", () => {
      if (fieldOf(input).classList.contains("is-invalid")) validate(input);
      if (status) {
        status.textContent = "";
        status.className = "form-status";
      }
    });

    // Los desplegables no tienen «escribir»: cuentan al cambiar
    if (input.tagName === "SELECT") {
      input.addEventListener("change", () => validate(input));
    }
  });

  // Contador de caracteres
  const message = $("#mensaje");
  const charCount = $("#charCount");
  if (message && charCount) {
    const max = Number(message.getAttribute("maxlength")) || 600;
    message.addEventListener("input", () => {
      const used = message.value.length;
      charCount.textContent = String(used);
      charCount.parentElement.classList.toggle("is-near", used > max * 0.9);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const results = inputs.map((input) => validate(input));
    const firstInvalid = inputs.find((input, i) => !results[i]);

    if (firstInvalid) {
      if (status) {
        status.textContent = "Revisa los campos marcados.";
        status.className = "form-status is-err";
      }
      firstInvalid.focus(); // llevar al usuario al problema
      firstInvalid.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      return;
    }

    // No hay servidor detrás: se simula el envío para que el estado sea honesto
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    if (status) {
      status.textContent = "";
      status.className = "form-status";
    }

    window.setTimeout(() => {
      const nombre = $("#nombre").value.trim().split(" ")[0];
      if (status) {
        status.textContent = `¡Gracias, ${nombre}! Te respondo pronto.`;
        status.className = "form-status is-ok";
      }
      form.reset();
      $$(".field", form).forEach((field) =>
        field.classList.remove("is-valid", "is-invalid"),
      );
      if (charCount) charCount.textContent = "0";
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar mensaje";
    }, 900);
  });
}

/* -- Tema claro / oscuro --
   Tres estados, no dos: elegido claro, elegido oscuro, y sin elegir. Mientras
   no se toque el botón manda el sistema, así que si cambia de tema por la
   noche la página cambia con él. En cuanto se pulsa, la elección gana y se
   guarda; el CSS lo resuelve con :root[data-theme] contra la media query.     */
function initTheme() {
  const btn = $("#themeToggle");
  const root = document.documentElement;
  const KEY = "tema";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  const isDark = () => {
    const chosen = root.getAttribute("data-theme");
    return chosen ? chosen === "dark" : systemDark.matches;
  };

  const syncButton = () => {
    if (!btn) return;
    const dark = isDark();
    btn.setAttribute("aria-pressed", String(dark));
    btn.setAttribute(
      "aria-label",
      dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
    );
  };

  // Lo guardado se aplica antes de nada
  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    stored = null; // modo privado: se sigue sin persistencia
  }
  if (stored === "dark" || stored === "light") root.setAttribute("data-theme", stored);
  syncButton();

  // Sin elección propia, se sigue al sistema
  systemDark.addEventListener("change", () => {
    if (!root.getAttribute("data-theme")) syncButton();
  });

  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* sin persistencia, pero el cambio se aplica igual */
    }
    syncButton();
  });
}

/* -- Año del pie -- */
function initYear() {
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

/* -- Arranque -- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMenu();
  initHeader();
  initScrollSpy();
  initReveal();
  initSkills();
  initCounters();
  initFilters();
  initForm();
  initYear();
});
