# website-test-gtm-workshop
website de prueba para el workshop de GTM - 7/10/2026

## Segundo dominio para la clase 3 (cross-domain)

En la clase 3, la pasarela de pago tiene que estar en otro dominio. El sitio ya está preparado: solo hay que publicarlo dos veces y completar una línea.

1. Publicá **este mismo repositorio** en Cloudflare Pages o en Netlify: conectá el repositorio de GitHub, sin comando de build y con la raíz del repositorio como carpeta a publicar.
   - Un segundo repositorio en GitHub Pages del mismo usuario **no sirve**: también quedaría en `jaredmarketingmaster.github.io`, el mismo host que el sitio principal, así que no sería otro dominio.
2. En `assets/js/config.js`, completá `checkout_url` con la URL base de ese sitio, **con barra final** (por ejemplo `https://tu-sitio.pages.dev/`). Revisá que `principal_url` siga siendo `https://jaredmarketingmaster.github.io/website-test-gtm-workshop/`.
3. Hacé commit y push a `main`. Los dos sitios usan el mismo `config.js`: desde el checkout del dominio A, «Ir a Pagar» lleva a la pasarela del dominio B, y «Aprobar Transacción simulada» vuelve a `/gracias-compra/` del dominio A, donde está el carrito y se dispara el `purchase`.
4. Antes de la clase, hacé una compra completa de prueba y confirmá que terminás en el dominio A con el mensaje «¡Gracias por tu compra!».

Para las clases 1, 2 y 4, dejá `checkout_url` vacío (`''`): todo el recorrido queda en un solo dominio.
