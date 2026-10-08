# Café Laboratorio: documentación del desarrollo

Sitio estático de práctica para el workshop de Google Tag Manager. Simula una tienda de café con catálogo, carrito, checkout y formularios, y genera eventos en el `dataLayer`. Sirve para practicar activadores, variables, ecommerce de GA4, consent mode y depuración de errores de tracking.

No tiene proceso de build ni dependencias: es HTML, CSS y JavaScript sin frameworks, y se sirve tal cual desde la raíz del repositorio.

> Todo lo que describe este documento se comprobó contra el código o se probó en Chromium (Playwright). Cuando algo se dedujo solo de leer el código, se aclara. La sección [Verificación realizada](#10-verificación-realizada) detalla qué se probó y qué no.

## Índice

1. [Cómo levantarlo](#1-cómo-levantarlo)
2. [Estructura de archivos](#2-estructura-de-archivos)
3. [Arquitectura](#3-arquitectura)
4. [Páginas](#4-páginas)
5. [Eventos del dataLayer](#5-eventos-del-datalayer)
6. [Parámetros de URL](#6-parámetros-de-url)
7. [Escenarios de error](#7-escenarios-de-error)
8. [Catálogo y cálculos](#8-catálogo-y-cálculos)
9. [Historial del desarrollo](#9-historial-del-desarrollo)
10. [Verificación realizada](#10-verificación-realizada)
11. [Problemas conocidos](#11-problemas-conocidos)
12. [Correcciones a lo informado durante el desarrollo](#12-correcciones-a-lo-informado-durante-el-desarrollo)

---

## 1. Cómo levantarlo

Necesitás Node.js. No hace falta Python.

```bash
git clone https://github.com/jaredmarketingmaster/website-test-gtm-workshop.git
cd website-test-gtm-workshop
npx http-server . -p 8000 -c-1 -a 127.0.0.1
```

Después abrí `http://localhost:8000`.

- `-c-1` desactiva la caché, así ves los cambios al recargar.
- `-a 127.0.0.1` hace que solo tu computadora pueda abrir el sitio. Es importante porque, al servir la raíz del repositorio, `http-server` también entrega la carpeta `.git` (se probó: `/.git/config` responde 200). La opción `--no-dotfiles` **no** lo evita.
- **No uses `npx serve`.** Con `serve` 14.2.6, `/producto/index.html?id=CL-001` redirige a `/producto/index` y **descarta los parámetros de la URL**. Resultado: `?gtm=` se pierde y te manda a `/empezar/`, y la ficha de producto queda vacía. El CSS y las rutas relativas sí funcionan.

### Primeros pasos

1. La primera vez, casi todas las páginas te redirigen a `/empezar/` para que cargues tu ID de contenedor (`GTM-XXXX`). Podés escribirlo o pegar el snippet de instalación. También sirve entrar con `?gtm=GTM-XXXX` en la URL.
2. El ID queda guardado en `localStorage`, así que no hace falta repetirlo.
3. Abajo a la izquierda está el **Panel de Práctica** (también se abre y cierra con `Ctrl+Shift+P`). Tiene:
   - el estado del contenedor (se revisa 1,5 s después de cargar);
   - el `dataLayer` en vivo (oculta los eventos `gtm.*` por defecto);
   - un botón para copiar tu URL con el `?gtm=`;
   - botones para simular tráfico de Google Ads (`gclid`) y Meta (`fbclid`);
   - "Reiniciar sesión": borra carrito, `sessionStorage` y cookies, pero conserva tu ID de GTM.

---

## 2. Estructura de archivos

```
/
├── index.html               Inicio: zona de pruebas de clics
├── 404.html
├── robots.txt               Disallow: / (pide a los buscadores no rastrear el sitio)
├── README.md
├── DESARROLLO.md            Este documento
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── config.js        Configuración: tienda, productos, escenarios
│   │   ├── escenarios.js    Lee parámetros de escenario e inyecta errores de carga
│   │   ├── consent.js       Banner de cookies y consent mode
│   │   ├── gtm-loader.js    Carga el contenedor GTM
│   │   ├── datalayer.js     Funciones de tracking (window.AppTracking)
│   │   ├── carrito.js       Carrito en localStorage (window.AppCarrito)
│   │   ├── ui.js            Rediseño v2 y botón de WhatsApp
│   │   └── panel.js         Panel de Práctica
│   └── files/catalogo-cafe-laboratorio.pdf
├── empezar/  como-usar/  productos/  producto/  carrito/  checkout/
├── pasarela/  gracias-compra/  contacto/  gracias-contacto/  agenda-widget/
└── registro/  buscar/  guia-de-cafe/  app/          (cada una con su index.html)
```

En total son 28 archivos del sitio, más `README.md` y este documento.

---

## 3. Arquitectura

### 3.1 Orden de carga de los scripts

En casi todas las páginas, el `<head>` carga los scripts en este orden:

1. `config.js`: define `window.AppConfig`.
2. `escenarios.js`: guarda los parámetros de escenario y, si corresponde, inyecta GA4 o Meta Pixel duplicados.
3. `consent.js`: define `gtag()` y, en modo `?consent=gtag`, envía el estado de consentimiento por defecto **antes** de GTM.
4. Un `<script>` en línea que hace `dataLayer.push({ page_type: ... })`.
5. `datalayer.js` y `carrito.js`, solo en las páginas que los necesitan.
6. `gtm-loader.js`: carga el contenedor; si no hay ID guardado, redirige a `/empezar/`.

Al final del `<body>` se cargan `ui.js`, `panel.js` y el script propio de la página.

| Página | Scripts que carga |
|---|---|
| `/productos/`, `/producto/`, `/carrito/`, `/checkout/`, `/gracias-compra/` | config, escenarios, consent, datalayer, carrito, gtm-loader, ui, panel |
| `/contacto/` | config, escenarios, consent, datalayer, gtm-loader, ui, panel |
| `/pasarela/` | config, escenarios, consent; datalayer y gtm-loader **solo** con `tipo=propia` (vía `document.write`). No carga ui ni panel |
| `/`, `/como-usar/`, `/gracias-contacto/`, `/registro/`, `/buscar/`, `/guia-de-cafe/`, `/app/` | config, escenarios, consent, gtm-loader, ui, panel |
| `/empezar/` | solo config |
| `/agenda-widget/`, `/404.html` | ninguno |

### 3.2 Módulos

| Archivo | Expone | Qué hace |
|---|---|---|
| `config.js` | `window.AppConfig` | Datos de la tienda, dominios, lista blanca de hosts de GTM, 6 productos, el evento "ciego" de `/registro/` y los presets de escenarios |
| `escenarios.js` | `window.AppEscenarios` (`getErrores`, `tieneUserData`) | Guarda `escenario`, `errores`, `user_data` y `gtm_host` en `sessionStorage`. Aplica `ga4_duplicado`, `pixel_duplicado` y `datalayer_reset` |
| `consent.js` | `gtag()` global | Banner de cookies (Aceptar / Rechazar / Configurar), cookie `practica_consent` por 365 días, modos `gtag` y `datalayer` |
| `gtm-loader.js` | — | Valida el ID (`GTM-` + 4 a 12 caracteres), lo guarda, arma la URL de `gtm.js` con entornos opcionales y host personalizado (si está en la lista blanca) |
| `datalayer.js` | `window.AppTracking` | Una función por evento de ecommerce más `formSuccess`. Antes de cada evento de ecommerce empuja `{ ecommerce: null }` y agrega un `event_id` (UUID) |
| `carrito.js` | `window.AppCarrito` | Carrito en `localStorage`, cálculo en centavos (envío, IVA, cupón) y formato de moneda `es-AR` |
| `ui.js` | — | Con `?diseno=v2` cambia la clase `.btn-primario` por `.cta-main` y algunos textos. Agrega el botón flotante de WhatsApp |
| `panel.js` | — | Panel de diagnóstico (ver [Primeros pasos](#primeros-pasos)). Se oculta con `?panel=0` |

### 3.3 Datos guardados en el navegador

| Dónde | Clave | Contenido |
|---|---|---|
| `localStorage` | `practica_gtm_id` | ID del contenedor |
| `localStorage` | `practica_carrito` | Ítems, cupón, `shipping_tier`, `payment_type` |
| `sessionStorage` | `practica_escenario` | Preset activo (`k4`, `m7`, `r2`, `x9`) |
| `sessionStorage` | `practica_errores_custom` | Lista de `?errores=` |
| `sessionStorage` | `practica_user_data` | `1` si `?user_data=1` |
| `sessionStorage` | `practica_gtm_host` | Host de GTM personalizado |
| `sessionStorage` | `practica_consent_mode` | `gtag` o `datalayer` |
| `sessionStorage` | `practica_region_consent` | Con `concedido`, el estado por defecto es "granted" |
| `sessionStorage` | `practica_diseno` | `v2` |
| `sessionStorage` | `practica_redirect` | Página a la que volver después de `/empezar/` |
| Cookie | `practica_consent` | Elección de consentimiento (JSON) |

Como `sessionStorage` dura lo que dura la pestaña, los escenarios se mantienen mientras navegás y se pierden al cerrarla.

---

## 4. Páginas

| Ruta | `page_type` | Eventos | Propósito indicado en la página | Cómo se llega |
|---|---|---|---|---|
| `/` | `inicio` (+ `site_version`, `site_domain_role`) | — | Zona de pruebas de clics: botón con `id` y `data-track`, enlace de ancla, botón con ícono SVG, enlace externo | Menú |
| `/empezar/` | — | — | Conectar el contenedor por ID o analizando el snippet | Redirección automática sin ID |
| `/como-usar/` | `guia` | — | Instrucciones breves | Menú "Guía" |
| `/productos/` | `listado` | `view_item_list` al cargar; `select_item` al hacer clic en una tarjeta | Listado de ecommerce | Menú |
| `/producto/?id=CL-00X` | `producto` | `view_item` al cargar; `add_to_cart` con el botón | Ficha de producto | Tarjeta del listado |
| `/carrito/` | `carrito` | `view_cart` (si hay ítems); `remove_from_cart` con "Quitar" | Carrito | Enlace "Carrito (n)" |
| `/checkout/` | `checkout` | `begin_checkout` al cargar; `add_payment_info` al pagar | Prueba de cross-domain | "Iniciar Compra". Con el carrito vacío redirige a `/productos/` |
| `/pasarela/?tipo=…` | `pasarela` (solo `propia`) | — | Pasarela propia (con GTM) o externa (sin GTM) | "Ir a Pagar" |
| `/gracias-compra/` | `gracias_compra` | `purchase`; después vacía el carrito | Confirmación de compra | "Aprobar Transacción simulada" |
| `/contacto/` | `contacto` | `form_success` (formulario AJAX) | Formulario clásico, formulario AJAX e iframe | Menú |
| `/gracias-contacto/` | `gracias_contacto` | — | Confirmación del formulario clásico (llega con `?form_id=contacto_clasico`) | Envío del formulario clásico |
| `/agenda-widget/` | — | `postMessage` a la página padre | Iframe de reservas | Iframe dentro de `/contacto/` |
| `/registro/` | `registro` | `nl_alta_v2` (500 ms después de enviar) | "Registro ciego": evento con estructura no estándar | Solo escribiendo la URL |
| `/buscar/?q=…` | `busqueda` | — | Término de búsqueda en la URL | Solo escribiendo la URL |
| `/guia-de-cafe/` | `articulo` | — | Scroll (2000 px de contenido) y visibilidad de elemento (`#oferta` aparece a los 5 s) | Solo escribiendo la URL |
| `/app/` | `app` | — | Mini app con History API (`pushState` a `?paso=N`) | Solo escribiendo la URL |

---

## 5. Eventos del dataLayer

Todos los eventos de ecommerce llevan `event_id` (UUID) y van precedidos por `{ ecommerce: null }`, salvo con el error `sin_limpiar_ecommerce`. La moneda es siempre `ARS`.

| Evento | Contenido de `ecommerce` (o del evento) |
|---|---|
| `view_item_list` | `item_list_id: 'L-001'`, `item_list_name: 'Catálogo General'`, `items` (con `index`) |
| `select_item` | Igual que el anterior, con un solo ítem |
| `view_item` | `currency`, `value` (precio unitario), `items` (sin `quantity`) |
| `add_to_cart` | `currency`, `value` = precio × cantidad, `items` con `quantity` |
| `remove_from_cart` | `currency`, `value` = precio × cantidad del ítem, `items` |
| `view_cart` | `currency`, `value`, `items` |
| `begin_checkout` | `currency`, `value`, `coupon`, `items` |
| `add_payment_info` | Lo anterior más `payment_type`: `propia` o `externa` |
| `purchase` | `transaction_id` (`CL-` + caracteres aleatorios, por ejemplo `CL-8QHX05`), `currency`, `value`, `tax`, `shipping`, `coupon`, `items`. Con `?user_data=1` agrega `user_data` |
| `form_success` | Fuera de `ecommerce`: `form_id: 'presupuesto'`, `form_name: 'Pedí tu presupuesto'`, `lead_type: 'presupuesto'`. Con `?user_data=1` agrega `user_data` |
| `nl_alta_v2` | `alta: { plan: 'club_pro', valor: 4990, moneda: 'ARS', origen: 'pie_de_pagina' }` |
| `cookie_consent_update` | En modo `gtag` va después de `gtag('consent', 'update', …)`. En modo `datalayer` lleva `consent_state` |

El widget de agenda no escribe en el `dataLayer`. Envía a la página padre un `postMessage` con `{ origen: 'agenda-practica', evento: 'reserva_confirmada', servicio, fecha }`. Para capturarlo hace falta un listener en GTM, por ejemplo una etiqueta HTML personalizada.

---

## 6. Parámetros de URL

| Parámetro | Valores | Efecto | ¿Persiste? |
|---|---|---|---|
| `gtm` | `GTM-XXXX` | ID del contenedor | Sí, en `localStorage` |
| `gtm_auth`, `gtm_preview`, `gtm_cookies_win` | Valores del entorno de GTM | Carga un entorno (requiere `gtm_auth` y `gtm_preview=env-N`) | **No**: solo aplica en la página que los tiene en la URL |
| `gtm_host` | URL o `ninguno` | Host alternativo para `gtm.js`; solo se usa si está en `gtm_whitelist` | `sessionStorage` |
| `escenario` | `k4`, `m7`, `r2`, `x9` o `ninguno` | Activa un preset de errores. `ninguno` borra el preset y `errores` | `sessionStorage` |
| `errores` | Lista separada por comas | Errores sueltos (ver [limitación](#73-errores-que-hoy-no-se-pueden-activar)) | `sessionStorage` |
| `user_data` | `1` u otro valor | Agrega `user_data` a `purchase` y `form_success` | `sessionStorage` |
| `consent` | `gtag`, `datalayer`, `off` o `ninguno` | Activa el banner y el modo de consentimiento | `sessionStorage` |
| `region_consent` | `concedido` | Estado por defecto "granted" si todavía no hay elección guardada | `sessionStorage` |
| `ga4` | `G-XXXX` | ID para el error `ga4_duplicado` | No |
| `pixel` | Solo números | ID para el error `pixel_duplicado` | No |
| `diseno` | `v2` u otro valor | Rediseño que rompe activadores por clase o texto | `sessionStorage` |
| `panel` | `0` | Oculta el Panel de Práctica | No |
| `id` | `CL-001` … `CL-006` | Producto en `/producto/` | No |
| `q` | Texto | Término en `/buscar/` | No |
| `paso` | Número | Paso en `/app/` | No |
| `tipo` | `propia` o `externa` | Tipo de pasarela | No |
| `d` | Base64 | Lo agrega `/checkout/`, pero **ninguna página lo lee** | No |

---

## 7. Escenarios de error

### 7.1 Presets (definidos en `config.js`)

| Preset | Errores que activa | Resultado comprobado |
|---|---|---|
| `k4` | `valor_texto`, `doble_envio` | `purchase.value` llega como texto: `"$ 18.500,00"`. `form_success` se envía 2 veces |
| `m7` | `sin_limpiar_ecommerce`, `transaction_id_repetido` | No se envía `{ ecommerce: null }`. `transaction_id` siempre es `CL-19990101-ERROR0` |
| `r2` | `ga4_duplicado`, `valor_texto`, `cross_domain_js` | Con `&ga4=G-XXXX` se inserta `gtag.js` aparte de GTM. En el checkout, el enlace "Ir a Pagar" se reemplaza por un botón que navega con JavaScript |
| `x9` | `datalayer_reset` | A los 3 s, `window.dataLayer` se reemplaza por un array vacío (de 2 elementos pasó a 0) |

### 7.2 Errores que se pueden activar sueltos con `?errores=`

Solo tres errores se pueden activar con `?errores=`, porque son los que aplica `escenarios.js`, el único archivo que lee ese parámetro: `ga4_duplicado`, `pixel_duplicado` y `datalayer_reset`. Se probó `?errores=pixel_duplicado&pixel=123456`: se inserta el código base de Meta Pixel (`window.fbq` queda definido). `pixel_duplicado` no está en ningún preset, así que esta es la única forma de activarlo.

### 7.3 Errores que hoy no se pueden activar

El código maneja cinco errores más: `clave_mayuscula`, `moneda_minuscula`, `push_tardio`, `recarga_gracias` y `snippet_doble`. Ninguno está en un preset, y los archivos que los aplican (`datalayer.js`, `gtm-loader.js` y `/gracias-compra/`) **solo leen el preset**, no `?errores=`.

Se probó `?errores=clave_mayuscula`: `escenarios.js` lo registra, pero `AppTracking.errores()` devuelve `[]` y el evento sigue usando `ecommerce` en minúscula. Para usarlos hay que agregarlos a un preset en `config.js`.

| Error | Qué haría |
|---|---|
| `clave_mayuscula` | Envía `Ecommerce` y `Value` con mayúscula |
| `moneda_minuscula` | `currency` en minúscula (`ars`) |
| `push_tardio` | En `purchase`, envía el evento primero y los datos de `ecommerce` 100 ms después |
| `recarga_gracias` | No vacía el carrito, así que recargar la página de gracias repite la compra |
| `snippet_doble` | Inserta `gtm.js` dos veces |

---

## 8. Catálogo y cálculos

| ID | Producto | Marca | Categoría | Precio (ARS) |
|---|---|---|---|---|
| CL-001 | Colombia Finca El Paraíso | Café Laboratorio | Café en grano | 18.500 |
| CL-002 | Etiopía Yirgacheffe | Café Laboratorio | Café en grano | 21.000 |
| CL-003 | Blend Espresso House | Café Laboratorio | Café en grano | 15.000 |
| CL-004 | Prensa Francesa Bodum 1L | Bodum | Accesorios | 45.000 |
| CL-005 | Filtros V60 (100 un.) | Hario | Accesorios | 8.500 |
| CL-006 | Balanza de precisión con timer | Timemore | Accesorios | 65.000 |

Los precios se guardan en centavos (`precio_centavos`) para evitar errores de redondeo, y se dividen por 100 al enviarlos.

- **`value`**: suma de precio × cantidad. **No incluye el envío.**
- **`shipping`**: fijo, 3.500 ARS.
- **`tax`**: IVA del 21 % ya incluido en el precio, calculado como `value × 21/121`. Ejemplo con 18.500: `18.500 × 21 / 121 = 3.210,74`. Coincide con lo que envió `purchase` en la prueba.
- **Cupón `PRACTICA10`**: 10 % de descuento por unidad. Existe en `carrito.js`, pero **no hay ningún campo en el sitio para ingresarlo** (ver [problemas conocidos](#11-problemas-conocidos)).

---

## 9. Historial del desarrollo

| Paso | Qué se hizo | Commit |
|---|---|---|
| 1 | El punto de partida fue un script de Python que actuaba como empaquetador: un diccionario `archivos` con la ruta y el contenido de cada archivo. Como no había Python disponible, los archivos se extrajeron a mano | — |
| 2 | Al leer el script apareció un error de sintaxis: el diccionario se cerraba (`}`) antes de la entrada `carrito.js`, así que Python no habría generado nada. `carrito.js` se incluyó igual porque lo usan 5 páginas | — |
| 3 | Se crearon los 27 archivos del diccionario en `public/`. Hubo un error de transcripción en el ícono de WhatsApp de `ui.js` (`12.050` en vez de `12.05`) que se corrigió antes del commit | — |
| 4 | Se creó el PDF con los bytes del script, después de comprobar que los offsets de su tabla `xref` (9, 52, 101, 147) son correctos. `pdfinfo` lo reconoce como PDF válido de 1 página | — |
| 5 | Sitio en `public/` | `df1e5f3` |
| 6 | Se movió todo a la raíz con `git mv` (28 renombres, 0 líneas cambiadas) y se eliminó `public/`. No hizo falta tocar ningún archivo porque todas las rutas son relativas | `17afbaf` |
| 7 | [Pull Request #1](https://github.com/jaredmarketingmaster/website-test-gtm-workshop/pull/1) hacia `main`. Sin conflictos y sin CI configurado. Se fusionó con un commit de merge | `082fc65` |
| 8 | Este documento | — |

**Decisiones tomadas:**

- **`http-server` en vez de `serve`**: `serve` descarta los parámetros de la URL al redirigir (ver [sección 1](#1-cómo-levantarlo)).
- **`git mv` para mover los archivos**: Git los registra como renombres, así se conserva el historial de cada archivo.
- **Commit de merge en vez de squash**: conserva por separado los dos pasos (crear el sitio y moverlo).
- **El código se dejó exactamente como venía en el script**: los problemas encontrados se documentan acá pero no se corrigieron, porque el pedido fue reproducir el contenido exacto.

---

## 10. Verificación realizada

**Probado:**

- `node --check` sin errores de sintaxis en los 8 archivos JS.
- Con `http-server`, todas las rutas probadas devuelven 200 con el tipo de contenido correcto, y una ruta inexistente devuelve `404.html`.
- En `index.html`, los colores calculados por el navegador coinciden con `styles.css`: fondo `#FAF7F2`, logo y botones `#D35400`, banner `#F1C40F`.
- **Compra completa**: catálogo (6 tarjetas) → producto → carrito (total 18.500) → checkout → pasarela → gracias, con `purchase` en el `dataLayer` y sin errores de JS.
- Los 4 presets, `?errores=`, `?user_data=1`, `?consent=gtag` (estado por defecto `denied` y actualización a `granted` al aceptar), `?gtm_host=` bloqueado, `?diseno=v2`, pasarela propia y externa, `/registro/`, el `postMessage` de la agenda, `/app/` y el elemento demorado de `/guia-de-cafe/`.

**No probado:**

- **La carga real de un contenedor GTM.** El entorno donde se desarrolló bloquea `googletagmanager.com`, así que todas las pruebas usaron un ID ficticio (`GTM-TEST123`) sin contenedor real. Falta probar con tu contenedor y Tag Assistant.
- Consent mode en modo `datalayer`, `region_consent`, entornos de GTM (`gtm_auth`/`gtm_preview`) y la vista en celulares. Lo que dice este documento sobre esos puntos sale de leer el código.

---

## 11. Problemas conocidos

Todos están confirmados. Ninguno se corrigió, porque el código se mantuvo igual al original.

1. **El analizador de `/empezar/` falla si pegás solo el `<noscript>`.** Muestra "✅ ID encontrado: null. Entrando..." y tira un error de JavaScript (`Cannot read properties of null (reading 'trim')`). No se guarda nada. Con el snippet del `<head>` funciona bien.
2. **Cinco errores de escenario no se pueden activar** sin editar `config.js` (ver [7.3](#73-errores-que-hoy-no-se-pueden-activar)).
3. **El botón "Descargar Catálogo PDF" no descarga nada.** Ninguna página enlaza al PDF; solo se abre con la URL directa `/assets/files/catalogo-cafe-laboratorio.pdf`. Además, el PDF tiene una página de 3 × 3 puntos (más o menos 1 mm), prácticamente invisible.
4. **Hay código que no se usa:**
   - `AppTracking.addShippingInfo` (el evento `add_shipping_info` nunca se envía);
   - `AppCarrito.aplicarCupon` / `quitarCupon` (no hay campo para el cupón);
   - `AppCarrito.actualizarCantidad` y `obtenerCrudo`;
   - el parámetro `d` del checkout.
5. **`gtm_host` no permite ningún host de server-side.** La lista blanca `gtm_whitelist` solo incluye `https://www.googletagmanager.com`, así que cualquier otro host se bloquea con un error en la consola. Para practicar GTM server-side hay que agregar tu dominio a esa lista en `config.js`.
6. **Los parámetros de entorno (`gtm_auth`, `gtm_preview`) no se guardan.** Solo aplican en la página que los tiene en la URL. Tampoco los agregan el enlace del checkout ni el botón "Copiar mi URL" del panel.
7. **Cuatro páginas no tienen enlaces:** `/registro/`, `/buscar/`, `/guia-de-cafe/` y `/app/`. Solo se abren escribiendo la URL.
8. **La pasarela no tiene Panel de Práctica** (no carga `ui.js` ni `panel.js`).
9. **El enlace de `404.html` falla en rutas con subcarpetas.** Usa `./index.html`, que en una ruta como `/a/b` apunta a `/a/index.html` (otra página inexistente). Además, la 404 no carga GTM, así que las páginas no encontradas no se registran.

---

## 12. Correcciones a lo informado durante el desarrollo

- **Sobre `npx serve`:** durante el desarrollo se dijo que `serve` "puede romper las rutas relativas". **Eso era incorrecto y no se había probado.** Al probarlo, las rutas relativas y el CSS funcionan bien. El problema real es que `serve` descarta los parámetros de la URL al redirigir. La recomendación de usar `http-server` se mantiene, pero por este motivo.
- **Sobre la cantidad de páginas que usan `carrito.js`:** durante el desarrollo se dijo que lo usan 4 páginas. **Son 5:** `/productos/`, `/producto/`, `/carrito/`, `/checkout/` y `/gracias-compra/`.
