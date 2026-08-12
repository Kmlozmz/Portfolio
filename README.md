# Portafolio · Camilo Pineda

Sitio personal construido con HTML, CSS y JavaScript sin dependencias ni
frameworks. Identidad propia — no la de ningún proyecto que aparezca en él.

## Estructura

```
index.html        Portafolio completo
css/styles.css    Tokens, tema claro/oscuro, rejilla y adaptación
js/main.js        Menú, tema, validación, filtros y animaciones
assets/           Monograma propio (cp-mark.svg) y el símbolo de UniStack,
                   este último solo para identificar su tarjeta de proyecto
```

## Verlo

Al abrir `index.html` directamente con doble clic algunos navegadores
restringen recursos locales. Lo más cómodo es servirlo:

```bash
python -m http.server 8000
```

Y abrir <http://localhost:8000>.

## Qué hace el JavaScript

- **Tema claro/oscuro** con tres estados: elegido claro, elegido oscuro, y sin
  elegir, en cuyo caso sigue al sistema. El cambio anima un barrido circular
  desde el botón con la View Transitions API, con salida directa si el
  navegador no la soporta o el visitante pidió menos movimiento.
- **Menú hamburguesa** accesible: `aria-expanded`, cierre con Escape, al tocar
  fuera y al elegir un enlace; el foco vuelve al botón que lo abrió.
- **Validación en vivo** del formulario: al salir del campo y, si ya falló,
  mientras se escribe. Errores anunciados con `role="alert"`.
- **Filtros de proyectos** que ocultan tarjetas y anuncian el recuento.
- **Barras de habilidades y cifras** que se animan al entrar en pantalla.
- **Enlace activo** según la sección visible, con `IntersectionObserver`.
- Todo respeta `prefers-reduced-motion`.

## Proyectos relacionados

UniStack tiene su propia página de producto, en un repositorio aparte:
[UniStack-landing_page](https://github.com/Kmlozmz/UniStack-landing_page).
Este portafolio solo la enlaza desde su tarjeta de proyecto.
