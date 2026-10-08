# website-test-gtm-workshop
website de prueba para el workshop de GTM - 7/10/2026

**Café Laboratorio** es una tienda de café ficticia para practicar Google Tag Manager. Tiene catálogo, carrito, checkout, pasarela de pago, formularios, banner de cookies y un Panel de Práctica que muestra el `dataLayer` en vivo. Cada alumno lo abre con su propio contenedor (`?gtm=GTM-XXXXXXX`) y puede activar errores de tracking a propósito para aprender a detectarlos.

- Sitio publicado: https://jaredmarketingmaster.github.io/website-test-gtm-workshop/
- Es HTML, CSS y JavaScript sin dependencias ni proceso de build.
- Detalle técnico (páginas, eventos, parámetros de URL, escenarios de error, verificación): [`DESARROLLO.md`](DESARROLLO.md).

## Levantarlo en tu computadora

Necesitás Node.js (no hace falta Python). Desde la carpeta del repositorio:

```bash
npx http-server . -p 8000 -c-1 -a 127.0.0.1
```

Después abrí `http://localhost:8000`.

- **`-a 127.0.0.1`**: el servidor solo acepta conexiones de tu propia computadora. Sin esta opción, `http-server` acepta conexiones de toda tu red y, como sirve la raíz del repositorio, también entrega la carpeta `.git`.
- **`-c-1`**: desactiva la caché, así ves los cambios al recargar.
- **No uses `npx serve`**: al redirigir `/…/index.html` descarta los parámetros de la URL (`?gtm=`, `?id=`, `?consent=`…), así que el sitio te manda a `/empezar/` y la ficha de producto queda vacía.

## Publicarlo en GitHub Pages

El sitio se publica desde la raíz de la rama `main`:

1. En el repositorio, entrá a **Settings → Pages**.
2. En la fuente de publicación, elegí **Deploy from a branch**, la rama **`main`** y la carpeta **`/ (root)`**, y guardá.
3. Cada push a `main` vuelve a publicar el sitio. La URL queda con la subruta del repositorio (`/website-test-gtm-workshop/`); todas las rutas internas son relativas, así que funcionan igual.

## Segundo dominio para la clase 3 (cross-domain)

En la clase 3, la pasarela de pago tiene que estar en otro dominio. El sitio ya está preparado: solo hay que publicarlo dos veces y completar una línea.

1. Publicá **este mismo repositorio** en Cloudflare Pages o en Netlify: conectá el repositorio de GitHub, sin comando de build y con la raíz del repositorio como carpeta a publicar.
   - Un segundo repositorio en GitHub Pages del mismo usuario **no sirve**: también quedaría en `jaredmarketingmaster.github.io`, el mismo host que el sitio principal, así que no sería otro dominio.
2. En `assets/js/config.js`, completá `checkout_url` con la URL base de ese sitio, **con barra final** (por ejemplo `https://tu-sitio.pages.dev/`). Revisá que `principal_url` siga siendo `https://jaredmarketingmaster.github.io/website-test-gtm-workshop/`.
3. Hacé commit y push a `main`. Los dos sitios usan el mismo `config.js`: desde el checkout del dominio A, «Ir a Pagar» lleva a la pasarela del dominio B, y «Aprobar Transacción simulada» vuelve a `/gracias-compra/` del dominio A, donde está el carrito y se dispara el `purchase`.
4. Antes de la clase, hacé una compra completa de prueba y confirmá que terminás en el dominio A con el mensaje «¡Gracias por tu compra!».

Para las clases 1, 2 y 4, dejá `checkout_url` vacío (`''`): todo el recorrido queda en un solo dominio.
