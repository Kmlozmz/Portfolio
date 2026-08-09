# Portafolio · Camilo Pineda

Sitio personal construido con HTML, CSS y JavaScript sin dependencias ni
frameworks.

## Estructura

```
index.html        Portafolio completo
banner.html       Banner de UniStack, suelto y con proporción ajustable
css/styles.css    Tokens, rejilla y adaptación
js/main.js        Menú, validación, filtros y animaciones
assets/           Símbolo de marca en SVG
```

## Verlo

Abrir `index.html` directamente con doble clic

## Qué hace el JavaScript

- **Menú hamburguesa** accesible: `aria-expanded`, cierre con Escape, al tocar
  fuera y al elegir un enlace; el foco vuelve al botón que lo abrió.
- **Validación en vivo** del formulario: al salir del campo y, si ya falló,
  mientras se escribe. Errores anunciados con `role="alert"`.
- **Filtros de proyectos** que ocultan tarjetas y anuncian el recuento.
- **Barras de habilidades y cifras** que se animan al entrar en pantalla.
- **Enlace activo** según la sección visible, con `IntersectionObserver`.
- Todo respeta `prefers-reduced-motion`.

## Banner

`banner.html` es una pieza aparte, pensada para capturarla como recurso
gráfico. Los botones cambian la proporción (franja ancha, 16:9, 3:1, cuadrado)
y el contenido escala con el ancho mediante *container queries*.
