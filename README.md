# Portfolio · Camilo Pineda (Kmlo)

[![Live Site](https://img.shields.io/badge/Live_Site-Visit_Portfolio-38bdf8?style=flat-square&logo=google-chrome&logoColor=white)](https://kmlozmz.github.io/Portfolio/)
[![Language](https://img.shields.io/badge/Language-ES_%2F_EN-10b981?style=flat-square&logo=google-translate&logoColor=white)](https://kmlozmz.github.io/Portfolio/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/)
[![JavaScript ESNext](https://img.shields.io/badge/JavaScript_ESNext-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/)


Personal and engineering portfolio of **Camilo Pineda** (`Kmlozmz`). Designed with an open borderless cosmic aesthetic, deliberate typography, and high-fidelity micro-interactions. Built entirely on standard modern web technologies with zero framework overhead.

> *"La magia está en los detalles."* — Focus on craft, responsive interfaces, native mobile engineering, and making digital experiences feel tactile, immediate, and alive.

---

## ✦ Highlights & Engineering Features

### 1. Living Identity Unit (Shared Element Flight)
- **Flight Layer Animation**: A unified identity element (avatar + name) that dynamically detaches from the Hero section and flies across the viewport to dock seamlessly inside the Developer Pass upon scroll.
- **Continuous Geometry Interpolation**: Calculates exact source and target bounding rectangles with sub-pixel precision, updating layout coordinates and scaling without layout thrashing.

### 2. Interactive Hybrid Showcase (UniStack)
- **Dual Floating Phone Mockups**: Realistic native Android hardware bezels displaying production screens of UniStack (`inicio`, `academico`, `horario`, `gastos`).
- **Interactive Screen Cycling**: Tapping the secondary floating device dynamically cycles through app views with smooth cross-fade transitions.
- **Dedicated 4K Promotional Modal**: A custom dialog with a 14px backdrop blur, responsive light/dark artwork switching, keyboard escape handling, and direct lossless PNG download.
- **Official Source Code Integration**: Direct links to the native Kotlin/Compose project repository and live landing page.

### 3. Real-Time Bilingual Engine (i18n)
- **Zero-Dependency Localization**: Client-side language switcher toggling between **Spanish (ES)** and **English (EN)** without page reloads.
- **Deep DOM Synchronization**: Automatically translates text content, HTML templates, ARIA labels, dynamic tooltips, and typewriter targets via `data-es` and `data-en` attributes.
- **State Persistence**: Remembers language preference across browser sessions using `localStorage`.

### 4. Developer Pass & Live Telemetry
- **Digital ID Card**: Features custom laser-cut tear perforations, specialty chips, and personal notes.
- **Live Timekeeping**: Real-time clock synchronized to Colombia Time (`COT` / `GMT-5`), paired with location telemetry.
- **Pass Details Modal**: Interactive expanded view providing detailed insights into development methodologies and technical background.

### 5. Borderless Cosmic Canvas
- **Multi-Layer Starfield**: HTML5 Canvas particle simulation generating star clusters, glowing nebulae, and ambient cosmic depth that reacts to theme changes.
- **Borderless Spatial Design**: Replaces rigid container borders and grid dividers with soft card elevations and cosmic atmosphere.
- **Dual Themes (Dark & Nebula)**: Smooth theme switching between deep space dark mode and vibrant cosmic purple tones.

### 6. Interactive Micro-Interactions
- **Custom Dual-Tier Cursor**: Ultra-low latency pinpoint pointer paired with a spring-lerp physics trailing ring and ripple click feedback (auto-disabled on touch devices).
- **Luminous Rail Navigation**: Fixed dead-centered navigation bar featuring an elastic sliding pill indicator tracking the active section.
- **Viewport-Triggered Typewriter**: Typewriter animation that activates upon the user's first scroll encounter with major headings.
- **Inertial Smooth Scroll**: Integrated with Lenis for fluid, natural scrolling with RAF-coalesced events.

---

## 🛠️ Tech Stack & Philosophy

- **Semantic HTML5**: Full accessibility compliance (`aria-*` attributes, semantic landmarks, skip links).
- **Modern CSS3**:
  - Custom properties (design tokens) for seamless dynamic theming.
  - CSS Grid and Flexbox for fluid, fully responsive multi-device layouts.
  - Backdrop filters, GPU-accelerated transforms (`translate3d`), and fluid typography via `clamp()`.
- **Vanilla JavaScript (ESNext)**:
  - Clean modular architecture without heavy frontend frameworks or build-step dependencies.
  - IntersectionObserver API for performant scroll-triggered animations.
  - `requestAnimationFrame` throttled rendering to maintain a consistent 60fps.
- **Smooth Scroll**: Powered by `@studio-freight/lenis`.
- **Typography**: Space Grotesk, Caveat, and curated monospace font stacks.

---

## 📁 Project Architecture

```
portafolio/
├── index.html            # Semantic structure, accessible landmarks & i18n bindings
├── css/
│   └── styles.css        # Design tokens, themes, borderless layout, cards & motion
├── js/
│   └── main.js           # Core logic: cursor, star canvas, i18n, showcase, modals & pass
├── assets/
│   ├── hero.gif          # Hero banner visual
│   ├── pfp.webp          # Optimized avatar image
│   ├── unistack-mark.svg # Vector brand mark
│   ├── fonts/            # Self-hosted typography
│   └── projects/         # Production app screenshots & 4K promotional renders
│       ├── unistack-inicio.webp
│       ├── unistack-academico.webp
│       ├── unistack-horario.webp
│       ├── unistack-gastos.webp
│       ├── unistack-promocional-4k.webp
│       ├── unistack-promocional-light-4k.webp
│       └── unistack-site.jpg
├── .gitignore            # Git configuration ignoring temp & scratch artifacts
└── README.md             # Project documentation
```

---


## 👤 Author

**Camilo Pineda**
- **GitHub**: [@Kmlozmz](https://github.com/Kmlozmz)
- **Instagram**: [@andrez.p_](https://www.instagram.com/andrez.p_/)
- **Telegram**: [@Kmlo_Zzz](https://t.me/Kmlo_Zzz)
- **Email**: [srkmlo16@gmail.com](mailto:srkmlo16@gmail.com)

---

## 💡 Acknowledgements & Inspirations

- Design and interaction concepts inspired by [Ayan](https://notayan.in).
