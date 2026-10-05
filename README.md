# Portfolio · Camilo Pineda

Personal and professional portfolio built with semantic HTML5, modern CSS custom properties, and standards-based JavaScript. Designed with an editorial bento grid aesthetic, deliberate typography, and high-fidelity micro-interactions.

## Highlights & Features

- **Theme Transition**: Circular wipe transition between light and dark modes built with the `View Transitions API` and dynamic `clip-path` calculations centered on the toggle button. Fully respects `prefers-reduced-motion`.
- **Custom Dual-Cursor**: Two-tier cursor with an immediate pinpoint target, a smooth physics trail (*lerp* interpolation), and an expanding ripple animation on click.
- **Hero Lens Effect**: Radial gradient masking lens with reactive magnification over the hero media.
- **Interactive Project Carousel**: Features dynamic background chromatic glows, pill badges for tech stacks, and live product release cards.
- **GitHub Heatmap**: Multi-tiered contribution grid with custom stepped contrast palettes for both light and dark modes.
- **Live Local Clock**: Synchronized live timekeeping with the `America/Bogota` time zone.
- **Fluid Inertial Scrolling**: Powered by Lenis for modern smooth scrolling.

## Architecture

```
index.html              Semantic page structure & accessible landmarks
css/styles.css          Design tokens, dark/light themes, bento grid & transitions
js/main.js              Custom cursor, lens effect, carousel, heatmap & theme toggle
assets/
  fonts/AspektaVF.woff2 Self-hosted variable font
  hero.gif              Hero visual banner
  pfp.webp              Profile avatar
  unistack-mark.svg     UniStack brand mark
```

## Related Projects

- [UniStack](https://github.com/Kmlozmz/UniStack): Main source code repository for the UniStack Android application.
- [UniStack-releases](https://github.com/Kmlozmz/UniStack-releases): Official releases repository and APK downloads for UniStack.
- [UniStack-landing_page](https://github.com/Kmlozmz/UniStack-landing_page): Dedicated product landing page for UniStack.

