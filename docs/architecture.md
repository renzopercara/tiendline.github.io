# Tiendline — arquitectura del sitio corporativo

## Resumen

`tiendline.github.io` es el sitio corporativo público de Tiendline, publicado con
GitHub Pages en **https://www.tiendline.com/** (archivo `CNAME`). Es un sitio
estático: HTML, CSS y JavaScript sin framework, sin `package.json` y sin etapa de
build. Los archivos se publican tal como están en la rama principal.

## Estructura

| Ruta | Propósito |
| --- | --- |
| `index.html` | Landing corporativa, única página indexable |
| `404.html` | Página de error, `noindex` |
| `assets/css/styles.css` | Sistema de diseño completo (mobile-first) |
| `assets/js/main.js` | Navegación, i18n, scrollspy, animaciones y carrusel |
| `assets/lang/es.json` | Diccionario español (idioma por defecto) |
| `assets/lang/en.json` | Diccionario inglés (idioma secundario opcional) |
| `assets/images/brand/` | Logos, favicons, iconos de app y assets sociales |
| `assets/images/projects/` | Capturas de proyectos (PNG original + WebP 480/960) |
| `robots.txt` | Directivas de rastreo y referencia al sitemap |
| `sitemap.xml` | Sitemap del sitio corporativo |
| `docs/` | Documentación interna |

## Idioma

- El HTML se entrega en **español (`lang="es-AR"`)**. El contenido español está
  escrito en el documento, por lo que es visible para crawlers sin ejecutar
  JavaScript.
- El inglés es secundario y opcional. Se activa con el botón `ES / EN`, se guarda
  en `localStorage` y se aplica desde `assets/lang/en.json`.
- Nunca se usa la detección automática del navegador para elegir inglés: el
  primer ingreso siempre es en español.
- Al agregar textos nuevos, usar `lang-trans="clave"` y declarar la clave en
  **ambos** diccionarios. Para etiquetas accesibles, usar
  `data-i18n-aria-label="clave"`.

## Mejora progresiva

Un script inline mínimo agrega la clase `js` a `<html>` antes de pintar. El CSS
usa esa clase para la navegación móvil, el selector de idioma y las animaciones.
Sin JavaScript, la navegación queda visible, los enlaces y el contenido funcionan
igual y los controles que dependen de JS se ocultan.

## SEO

- Canonical único: `https://www.tiendline.com/`.
- `index.html` es indexable; `404.html` tiene `noindex, follow`.
- JSON-LD con `Organization`, `WebSite` y `ProfessionalService` en `@graph`.
- Open Graph y Twitter Card con imagen absoluta de 1200×630.
- `robots.txt` bloquea `/sites/` (demos y sitios de clientes alojados en
  subdirectorios) y `/prepros-6.config`.
- El sitemap contiene solo la home. Si se agregan páginas públicas nuevas, deben
  sumarse al sitemap y recibir canonical propio.

## Favicons

Referencias del `<head>`:

- `/favicon.ico`
- `/assets/images/brand/favicon/favicon.svg`
- `/assets/images/brand/favicon/favicon-16x16.png`
- `/assets/images/brand/favicon/favicon-32x32.png`
- `/assets/images/brand/favicon/favicon-48x48.png`
- `/assets/images/brand/web/icon-192.png`
- `/assets/images/brand/web/icon-512.png`
- `/apple-touch-icon.png`
- `/assets/images/brand/favicon/safari-pinned-tab.svg`
- `/assets/images/brand/web/site.webmanifest`

`favicon.ico` y `apple-touch-icon.png` existen también en la raíz porque los
navegadores y algunos servicios los solicitan por convención.

## Sitios de clientes y multi-tenant

Las aplicaciones de clientes viven en subdominios propios (por ejemplo
`tu-club.tiendline.com`) y no forman parte de este repositorio. Los directorios
bajo `sites/` son demos históricas alojadas en el mismo GitHub Pages: no deben
indexarse y están bloqueados en `robots.txt`.

Cada subdominio de tenant es responsable de su propia configuración de
indexación. No se deben agregar enlaces desde la home corporativa hacia rutas
privadas de aplicaciones.

## Desarrollo y validación

No hay build. Para probar localmente:

```bash
python3 -m http.server 8080
```

Validaciones aplicables:

```bash
node --check assets/js/main.js
python3 -m json.tool assets/lang/es.json
python3 -m json.tool assets/lang/en.json
python3 -m json.tool assets/images/brand/web/site.webmanifest
xmllint --noout sitemap.xml   # si xmllint está disponible
```

El sitio debe revisarse en 320, 375, 390, 430, 768, 1024, 1440 y 1920 px, con
navegación por teclado y `prefers-reduced-motion` activo.
