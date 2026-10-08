# Café Laboratorio: documentación del desarrollo

Sitio estático de práctica para el workshop de Google Tag Manager (4 clases). Simula una tienda de café con catálogo, carrito, checkout, pasarela de pago, formularios y banner de cookies, y genera eventos en el `dataLayer`. Sirve para practicar activadores, variables, ecommerce de GA4, cross-domain, consent mode y depuración de errores de tracking.

No tiene proceso de build ni dependencias: es HTML, CSS y JavaScript sin frameworks, y se sirve tal cual desde la raíz del repositorio. Publicado en https://jaredmarketingmaster.github.io/website-test-gtm-workshop/.

> Todo lo que describe este documento se comprobó contra el código o se probó en Chromium (Playwright). Cuando algo se dedujo solo de leer el código, se aclara. La sección [Verificación realizada](#11-verificación-realizada) detalla qué se probó y qué no.

## Índice

1. [Cómo levantarlo](#1-cómo-levantarlo)
2. [Estructura de archivos](#2-estructura-de-archivos)
3. [Arquitectura](#3-arquitectura)
4. [Páginas](#4-páginas)
5. [Eventos del dataLayer](#5-eventos-del-datalayer)
6. [Parámetros de URL](#6-parámetros-de-url)
7. [Escenarios de error](#7-escenarios-de-error)
8. [Consent Mode](#8-consent-mode)
9. [Segundo dominio (clase 3)](#9-segundo-dominio-clase-3)
10. [Catálogo y cálculos](#10-catálogo-y-cálculos)
11. [Verificación realizada](#11-verificación-realizada)
12. [Problemas conocidos](#12-problemas-conocidos)
13. [Historial del desarrollo](#13-historial-del-desarrollo)
14. [Correcciones a lo informado durante el desarrollo](#14-correcciones-a-lo-informado-durante-el-desarrollo)

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

La publicación en GitHub Pages y el segundo dominio están explicados en el [`README.md`](README.md).

### Primeros pasos

1. La primera vez, casi todas las páginas te redirigen a `/empezar/` para que cargues tu ID de contenedor (`GTM-XXXX`). Podés escribirlo o pegar el snippet de instalación (el `<head>`, el `<noscript>` o los dos). También sirve entrar con `?gtm=GTM-XXXX` en la URL.
2. El ID queda guardado en `localStorage`, así que no hace falta repetirlo.
3. Abajo a la izquierda está el **Panel de Práctica** (también se abre y cierra con `Ctrl+Shift+P`). Tiene:
   - el estado del contenedor (se revisa 1,5 s después de cargar);
   - el `dataLayer` en vivo (oculta los eventos `gtm.*` por defecto);
   - un botón para copiar tu URL con el `?gtm=`;
   - botones para simular tráfico de Google Ads (`gclid`) y Meta (`fbclid`);
   - «Reiniciar sesión»: borra carrito, `sessionStorage` y cookies, pero conserva tu ID de GTM. Pide confirmación dentro del propio panel: el primer clic cambia el texto a «¿Seguro? Confirmar» durante 4 s y el segundo clic reinicia. No usa `confirm()`, que bloquea la página y la Vista previa de GTM.

---

## 2. Estructura de archivos

```
/
├── index.html               Inicio: zona de pruebas de clics, descarga del catálogo y más páginas
├── 404.html
├── robots.txt               Disallow: / (pide a los buscadores no rastrear el sitio)
├── README.md                Qué es, cómo levantarlo, GitHub Pages y segundo dominio
├── DESARROLLO.md            Este documento
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── config.js        Configuración: tienda, dominios, evento de consentimiento, productos, escenarios
│   │   ├── escenarios.js    Lee parámetros de escenario e inyecta errores de carga
│   │   ├── consent.js       Banner de cookies y consent mode (cmp, gtag, datalayer)
│   │   ├── gtm-loader.js    Carga el contenedor GTM
│   │   ├── datalayer.js     Funciones de tracking (window.AppTracking)
│   │   ├── carrito.js       Carrito en localStorage (window.AppCarrito)
│   │   ├── ui.js            Rediseño v2 y botón de WhatsApp
│   │   └── panel.js         Panel de Práctica
│   └── files/catalogo-cafe-laboratorio.pdf   Catálogo A4 de 1 página con los 6 productos
├── empezar/  como-usar/  productos/  producto/  carrito/  checkout/
├── pasarela/  gracias-compra/  contacto/  gracias-contacto/  agenda-widget/
└── registro/  buscar/  guia-de-cafe/  app/          (cada una con su index.html)
```

En total son 28 archivos del sitio, más `README.md` y este documento.

---

## 3. Arquitectura

### 3.1 Orden de carga de los scripts

En casi todas las páginas, el `<head>` carga los scripts en este orden (no se debe cambiar):

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
| `config.js` | `window.AppConfig` | Datos de la tienda, URLs base de los dominios (`principal_url`, `checkout_url`), lista blanca de hosts de GTM, nombre del evento de consentimiento (`consent.evento`), 6 productos, el evento "ciego" de `/registro/`, los presets de escenarios y la lista `errores_validos` |
| `escenarios.js` | `window.AppEscenarios` (`getErrores`, `tieneUserData`) | Guarda `escenario`, `errores`, `user_data`, `gtm_host`, `ga4` y `pixel` en `sessionStorage`. Avisa por consola si `?errores=` trae un nombre desconocido. Aplica `ga4_duplicado`, `pixel_duplicado` y `datalayer_reset` |
| `consent.js` | `gtag()` global | Banner de cookies (Aceptar / Rechazar / Configurar), cookie `practica_consent` por 365 días, modos `cmp`, `gtag` y `datalayer`, botones «Borrar mi elección» y «Preferencias de cookies» (ver [sección 8](#8-consent-mode)) |
| `gtm-loader.js` | — | Valida el ID (`GTM-` + 4 a 12 caracteres), lo guarda, arma la URL de `gtm.js` con entornos opcionales y host personalizado (si está en la lista blanca). Aplica `snippet_doble` |
| `datalayer.js` | `window.AppTracking` | Una función por evento de ecommerce más `formSuccess`. Antes de cada evento de ecommerce empuja `{ ecommerce: null }` y agrega un `event_id` (UUID). Los errores activos salen de `AppEscenarios.getErrores()` (preset + `?errores=`) |
| `carrito.js` | `window.AppCarrito` | Carrito en `localStorage`, cálculo en centavos (envío, IVA, cupón) y formato de moneda `es-AR` |
| `ui.js` | — | Con `?diseno=v2` cambia la clase `.btn-primario` por `.cta-main` y algunos textos. Agrega el botón flotante de WhatsApp |
| `panel.js` | — | Panel de diagnóstico (ver [Primeros pasos](#primeros-pasos)). Se oculta con `?panel=0` |

### 3.3 Qué se configura en `config.js`

| Clave | Valor actual | Para qué |
|---|---|---|
| `dominios.principal_url` | `https://jaredmarketingmaster.github.io/website-test-gtm-workshop/` | URL base del dominio A (con barra final y subruta). Solo se usa cuando `checkout_url` no está vacío |
| `dominios.checkout_url` | `''` (vacío) | URL base del dominio B. **Jared lo completa antes de la clase 3** (ver [sección 9](#9-segundo-dominio-clase-3)) |
| `dominios.gtm_whitelist` | `['https://www.googletagmanager.com']` | Hosts permitidos para `?gtm_host=` |
| `consent.evento` | `'consent_update'` | Nombre del evento de consentimiento. Si se cambia, actualizar también el texto de `/como-usar/` |
| `errores_validos` | Los 13 nombres de error | Para avisar si `?errores=` trae un nombre mal escrito |

### 3.4 Datos guardados en el navegador

| Dónde | Clave | Contenido |
|---|---|---|
| `localStorage` | `practica_gtm_id` | ID del contenedor |
| `localStorage` | `practica_carrito` | Ítems, cupón, `shipping_tier`, `payment_type` |
| `sessionStorage` | `practica_escenario` | Preset activo (`k4`, `m7`, `r2`, `x9`) |
| `sessionStorage` | `practica_errores_custom` | Lista de `?errores=` |
| `sessionStorage` | `practica_ga4` | ID de GA4 para `ga4_duplicado` |
| `sessionStorage` | `practica_pixel` | ID de Meta Pixel para `pixel_duplicado` |
| `sessionStorage` | `practica_user_data` | `1` si `?user_data=1` |
| `sessionStorage` | `practica_gtm_host` | Host de GTM personalizado |
| `sessionStorage` | `practica_consent_mode` | `cmp`, `gtag` o `datalayer` |
| `sessionStorage` | `practica_region_consent` | Con `concedido`, el estado por defecto del modo `gtag` es "granted" |
| `sessionStorage` | `practica_diseno` | `v2` |
| `sessionStorage` | `practica_redirect` | Página a la que volver después de `/empezar/` |
| Cookie | `practica_consent` | Elección de consentimiento (JSON) |

`sessionStorage` dura lo que dura la pestaña y es propio de cada dominio: los escenarios se mantienen mientras navegás en la misma pestaña y se pierden al cerrarla. Al pasar al dominio B, el checkout los envía en la URL (ver [sección 9](#9-segundo-dominio-clase-3)).

---

## 4. Páginas

| Ruta | `page_type` | Eventos | Propósito indicado en la página | Cómo se llega |
|---|---|---|---|---|
| `/` | `inicio` (+ `site_version`, `site_domain_role`) | — | Zona de pruebas de clics: botón con `id` y `data-track`, enlace de ancla, enlace de descarga del catálogo (`<a download>` con `data-track="descarga-catalogo"`), enlace externo. Debajo, «Más páginas de práctica»: enlaces a la guía, la mini app y una búsqueda, y un formulario GET hacia `/buscar/` con `<input name="q">` | Menú |
| `/empezar/` | — | — | Conectar el contenedor por ID o analizando el snippet | Redirección automática sin ID |
| `/como-usar/` | `guia` | — | Instrucciones breves, incluidos los tres modos de consentimiento | Menú "Guía" |
| `/productos/` | `listado` | `view_item_list` al cargar; `select_item` al hacer clic en una tarjeta | Listado de ecommerce | Menú |
| `/producto/?id=CL-00X` | `producto` | `view_item` al cargar; `add_to_cart` con el botón | Ficha de producto | Tarjeta del listado |
| `/carrito/` | `carrito` | `view_cart` (si hay ítems); `remove_from_cart` con "Quitar" | Carrito | Enlace "Carrito (n)" |
| `/checkout/` | `checkout` | `begin_checkout` al cargar; `add_payment_info` al pagar | Prueba de cross-domain | "Iniciar Compra". Con el carrito vacío redirige a `/productos/` |
| `/pasarela/?tipo=…` | `pasarela` (solo `propia`) | — | Pasarela propia (con GTM) o externa (sin GTM). «Aprobar Transacción simulada» es un enlace `<a>` con `href` real | "Ir a Pagar" |
| `/gracias-compra/` | `gracias_compra` | `purchase`; después vacía el carrito | Confirmación de compra | "Aprobar Transacción simulada" |
| `/contacto/` | `contacto` | `form_success` (formulario AJAX) | Formulario clásico, formulario AJAX, iframe y «Otros medios»: enlace `tel:` (`data-track="llamar"`) y `mailto:` (`data-track="email"`) tomados de `config.js` | Menú |
| `/gracias-contacto/` | `gracias_contacto` | — | Confirmación del formulario clásico (llega con `?form_id=contacto_clasico`) | Envío del formulario clásico |
| `/agenda-widget/` | — | `postMessage` a la página padre | Iframe de reservas | Iframe dentro de `/contacto/` |
| `/registro/` | `registro` | `nl_alta_v2` (500 ms después de enviar) | "Registro ciego": evento con estructura no estándar | Solo escribiendo la URL (a propósito: descubrirlo es parte de un ejercicio) |
| `/buscar/?q=…` | `busqueda` | — | Término de búsqueda en la URL | Home («Más páginas de práctica» y formulario) |
| `/guia-de-cafe/` | `articulo` | — | Scroll (2000 px de contenido) y visibilidad de elemento (`#oferta` aparece a los 5 s) | Home («Más páginas de práctica») |
| `/app/` | `app` | — | Mini app con History API (`pushState` a `?paso=N`) | Home («Más páginas de práctica») |
| `/404.html` | — | — | Página no encontrada. «Volver al inicio» calcula la raíz del sitio (en `*.github.io`, la subruta del repositorio). No carga GTM | Cualquier ruta inexistente |

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
| `consent_update` | Reemplaza a `cookie_consent_update`. En los modos `cmp` y `gtag` va inmediatamente después de `gtag('consent', 'update', …)`. En modo `datalayer` lleva `consent_state`. Ver [sección 8](#8-consent-mode) |

El widget de agenda no escribe en el `dataLayer`. Envía a la página padre un `postMessage` con `{ origen: 'agenda-practica', evento: 'reserva_confirmada', servicio, fecha }`. Para capturarlo hace falta un listener en GTM, por ejemplo una etiqueta HTML personalizada.

---

## 6. Parámetros de URL

| Parámetro | Valores | Efecto | ¿Persiste? |
|---|---|---|---|
| `gtm` | `GTM-XXXX` | ID del contenedor | Sí, en `localStorage` |
| `gtm_auth`, `gtm_preview`, `gtm_cookies_win` | Valores del entorno de GTM | Carga un entorno (requiere `gtm_auth` y `gtm_preview=env-N`) | **No**: solo aplica en la página que los tiene en la URL |
| `gtm_host` | URL o `ninguno` | Host alternativo para `gtm.js`; solo se usa si está en `gtm_whitelist` | `sessionStorage` |
| `escenario` | `k4`, `m7`, `r2`, `x9` o `ninguno` | Activa un preset de errores. `ninguno` borra el preset, `errores`, `ga4` y `pixel` | `sessionStorage` |
| `errores` | Lista separada por comas | Activa cualquiera de los 13 errores (ver [sección 7](#7-escenarios-de-error)). Un nombre desconocido genera un `console.warn` con la lista válida | `sessionStorage` |
| `user_data` | `1` u otro valor | Agrega `user_data` a `purchase` y `form_success` | `sessionStorage` |
| `consent` | `cmp`, `gtag`, `datalayer`, `off` o `ninguno` | Activa el banner y el modo de consentimiento (ver [sección 8](#8-consent-mode)) | `sessionStorage` |
| `region_consent` | `concedido` | En modo `gtag`, estado por defecto "granted" si todavía no hay elección guardada | `sessionStorage` |
| `ga4` | `G-XXXX` | ID para el error `ga4_duplicado` | Sí, en `sessionStorage` (`practica_ga4`) |
| `pixel` | Solo números | ID para el error `pixel_duplicado` | Sí, en `sessionStorage` (`practica_pixel`) |
| `diseno` | `v2` u otro valor | Rediseño que rompe activadores por clase o texto | `sessionStorage` |
| `panel` | `0` | Oculta el Panel de Práctica | No |
| `id` | `CL-001` … `CL-006` | Producto en `/producto/` | No |
| `q` | Texto | Término en `/buscar/` | No |
| `paso` | Número | Paso en `/app/` | No |
| `tipo` | `propia` o `externa` | Tipo de pasarela | No |
| `d` | Base64 | Lo agrega `/checkout/`, pero **ninguna página lo lee** | No |

El enlace «Ir a Pagar» del checkout lleva a la pasarela: `tipo`, `gtm`, `escenario`, `d` y, si están en la sesión, `errores`, `ga4`, `pixel` y `consent`. Así el dominio B se comporta igual que el A.

---

## 7. Escenarios de error

### 7.1 Presets (definidos en `config.js`)

| Preset | Errores que activa | Resultado comprobado |
|---|---|---|
| `k4` | `valor_texto`, `doble_envio` | `purchase.value` llega como texto: `"$ 18.500,00"` (con un espacio de no separación U+00A0 entre `$` y el número, como lo escribe `Intl`). `form_success` se envía 2 veces |
| `m7` | `sin_limpiar_ecommerce`, `transaction_id_repetido` | No se envía `{ ecommerce: null }`. `transaction_id` siempre es `CL-19990101-ERROR0` |
| `r2` | `ga4_duplicado`, `valor_texto`, `cross_domain_js` | Con `&ga4=G-XXXX` se inserta `gtag.js` aparte de GTM, en todas las páginas de la sesión. En el checkout, el enlace «Ir a Pagar» se reemplaza por un botón que navega con JavaScript |
| `x9` | `datalayer_reset` | A los 3 s, `window.dataLayer` se reemplaza por un array vacío |

### 7.2 Los 13 errores, sueltos con `?errores=`

Todos los errores se pueden activar sueltos con `?errores=nombre1,nombre2`. `datalayer.js`, `gtm-loader.js`, el checkout y `/gracias-compra/` leen la misma lista que `escenarios.js`: el preset más `?errores=`.

| Error | Qué hace | En un preset |
|---|---|---|
| `valor_texto` | `purchase.value` como texto con formato de moneda | `k4`, `r2` |
| `doble_envio` | `form_success` se repite 500 ms después | `k4` |
| `sin_limpiar_ecommerce` | No envía `{ ecommerce: null }` antes de cada evento | `m7` |
| `transaction_id_repetido` | `transaction_id` fijo: `CL-19990101-ERROR0` | `m7` |
| `ga4_duplicado` | Inserta `gtag.js` + `config` con el ID de `?ga4=` | `r2` |
| `cross_domain_js` | En el checkout, la ida a la pasarela es por JavaScript (sin enlace) | `r2` |
| `datalayer_reset` | A los 3 s reemplaza `window.dataLayer` por `[]` | `x9` |
| `pixel_duplicado` | Inserta el código base de Meta Pixel con el ID de `?pixel=` | — |
| `clave_mayuscula` | Envía `Ecommerce` y `Value` con mayúscula | — |
| `moneda_minuscula` | `currency` en minúscula (`ars`) | — |
| `push_tardio` | En `purchase`, envía el evento primero y los datos de `ecommerce` unos 100 ms después | — |
| `recarga_gracias` | No vacía el carrito, así que recargar `/gracias-compra/` repite la compra | — |
| `snippet_doble` | Inserta `gtm.js` dos veces | — |

**Combinaciones que se anulan entre sí** (comportamiento de siempre, no se cambió): `clave_mayuscula` deja los datos en `Ecommerce`, pero `moneda_minuscula` y `push_tardio` buscan `ecommerce` en minúscula. Por eso:

- con `clave_mayuscula,moneda_minuscula`, `currency` sigue en `ARS`;
- con `clave_mayuscula,push_tardio`, el `purchase` sale sin datos y después llega `{ ecommerce: undefined }`.

Para practicar cada error, activalos de a uno.

---

## 8. Consent Mode

El banner aparece **solo** si entrás con `?consent=` y uno de estos modos. El modo queda en `sessionStorage` (`practica_consent_mode`) y la elección, en la cookie `practica_consent`.

| Modo | Estado por defecto (`default`) | Al elegir en el banner | Visita posterior con elección guardada |
|---|---|---|---|
| `cmp` | **No lo envía el sitio**: lo crea el alumno en GTM | `gtag('consent', 'update', …)` y después `{ event: 'consent_update' }` | Sin banner. Reenvía `update` + `consent_update` cuando el contenedor está inicializado (ver abajo) |
| `gtag` | Lo envía el sitio antes de GTM: todo `denied` salvo `security_storage` (todo `granted` con `?region_consent=concedido`), con `wait_for_update: 500` | `update` y después `consent_update` | Sin banner. `default` + `update` antes de GTM, **sin** evento `consent_update` |
| `datalayer` | No | Solo `{ event: 'consent_update', consent_state: {…} }` | Sin banner y sin envíos |

El `update` siempre lleva 7 parámetros: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`, `functionality_storage`, `personalization_storage` y `security_storage: 'granted'`.

**Reenvío en el modo `cmp`:** en una visita con elección guardada, `consent.js` revisa cada 100 ms si existe `window.google_tag_manager[<ID>]`. Cuando aparece, envía `update` + `consent_update`; si a los 5 s no apareció (contenedor bloqueado o sin ID), los envía igual. **Supuesto sin verificar con un contenedor real:** que, cuando existe ese objeto, las etiquetas de *Consent Initialization* del alumno ya se ejecutaron. Con un stub que simula el contenedor, el orden fue el esperado: contenedor listo → `update` → `consent_update`.

**Botones abajo a la derecha:**

- «Borrar mi elección» borra la cookie `practica_consent` y recarga. El modo sigue en la sesión, así que vuelve a aparecer el banner.
- «Preferencias de cookies» vuelve a mostrar el banner.

---

## 9. Segundo dominio (clase 3)

Con `checkout_url` vacío, todo el recorrido queda en un dominio y usa rutas relativas, igual que siempre.

Con `checkout_url` completo, el recorrido pasa por los dos dominios:

1. El checkout del dominio A arma «Ir a Pagar» como `checkout_url + 'pasarela/index.html'`, más los parámetros de la [sección 6](#6-parámetros-de-url).
2. En el dominio B, `escenarios.js` y `consent.js` guardan esos parámetros en la sesión de B. `gtm-loader.js` toma el ID de `?gtm=`.
3. «Aprobar Transacción simulada» es un `<a>` cuyo `href` se asigna al cargar: `principal_url + 'gracias-compra/index.html'`. Es un enlace real y no una navegación por JavaScript, porque el vinculador entre dominios de GA4 solo decora enlaces y formularios. El único salto por JavaScript es el del error `cross_domain_js` en el checkout.
4. Se vuelve a `/gracias-compra/` del dominio A, donde está el carrito y se dispara el `purchase`.

Si `checkout_url` está completo pero `principal_url` está vacío, la pasarela escribe un `console.warn` y el regreso usa la ruta relativa. La pasarela externa (`tipo=externa`) no carga GTM ni `datalayer.js`, y su regreso también es un enlace real.

**Antes (error corregido):** `dominios.principal` valía `window.location.hostname`, que en la pasarela es el dominio B. La compra terminaba en `/gracias-compra/` **del dominio B**, con «No hay pedidos pendientes» y sin `purchase`. Además, las URL se armaban con `http`/`https` según si el host contenía `localhost`, se perdía el puerto y no se tenía en cuenta la subruta de GitHub Pages.

El procedimiento para publicar el dominio B está en el [`README.md`](README.md#segundo-dominio-para-la-clase-3-cross-domain).

---

## 10. Catálogo y cálculos

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
- **Cupón `PRACTICA10`**: 10 % de descuento por unidad. Existe en `carrito.js`, pero no hay ningún campo en el sitio para ingresarlo (a propósito, fuera del alcance de esta versión).

**PDF del catálogo:** se generó con `reportlab` a partir de los productos de `config.js`. Es A4, de 1 página, con el título «Catálogo Café Laboratorio» y la tabla de productos y precios. Si cambian los productos o los precios en `config.js`, hay que volver a generarlo.

---

## 11. Verificación realizada

Entorno: Chromium (Playwright), `npx http-server . -p 80 -c-1 -a 0.0.0.0`, dos dominios simulados (`a.localhost` y `b.localhost`, con `--host-resolver-rules`) y un `config.js` interceptado con `principal_url`/`checkout_url` apuntando a esos dominios. Los pedidos a `googletagmanager.com` y `connect.facebook.net` se abortaron y se usó un ID ficticio (`GTM-TEST123`).

**Resultado: 22 de 22 pruebas pasaron; las 16 rutas devuelven 200 y cargan sin errores de JavaScript.**

| # | Prueba | Resultado |
|---|---|---|
| 1 | Compra sin `checkout_url` | Pasó: termina en `/gracias-compra/` con 1 `purchase` (value 18500); el «Aprobar» usa la ruta relativa de siempre |
| 2 | Compra con A y B | Pasó: pasarela en B; «Aprobar» es `<a href="http://a.localhost/gracias-compra/index.html">`; termina en A con «¡Gracias por tu compra!» y 1 `purchase` con su ítem |
| 3 | A/B con `escenario=r2` | Pasó: aparece «Ir a pagar (JS)» (ida por JavaScript); la vuelta sigue siendo un enlace real |
| 4 | Pasarela `tipo=externa` | Pasó: solo carga config, escenarios y consent; el regreso funciona con y sin segundo dominio |
| 5 | `?consent=cmp`, primera visita | Pasó: banner visible, ninguna llamada `consent default` |
| 6 | `cmp` → «Aceptar todo» | Pasó: `update` con 7 parámetros `granted` y después `consent_update` |
| 7 | `cmp`, recarga con elección guardada | Pasó: sin banner; con GTM bloqueado, el reenvío llegó a los ~5 s; con un stub del contenedor, en orden contenedor listo → `update` → `consent_update` |
| 8 | «Borrar mi elección» | Pasó: visible con el banner cerrado; borra `practica_consent`; al recargar vuelve el banner con el modo `cmp` |
| 9 | `gtag` y `datalayer` | Pasó: `gtag` → default, update, `consent_update`; `datalayer` → `consent_update` con `consent_state`; ya no aparece `cookie_consent_update` |
| 10 | `clave_mayuscula`, `moneda_minuscula`, `push_tardio` (por separado) | Pasó: `Ecommerce.Value`; `currency: 'ars'`; evento y datos separados por ~101 ms |
| 11 | `snippet_doble` | Pasó: 2 `<script src=…gtm.js?id=…>` |
| 12 | `recarga_gracias` y recargar | Pasó: el carrito no se vacía y el `purchase` se repite |
| 13 | `?errores=inventado` | Pasó: `console.warn` con los 13 nombres válidos; la página funciona |
| 14 | `r2&ga4=G-TEST1234` en 3 páginas | Pasó: `gtag.js` duplicado en las 3 |
| 15 | `?escenario=ninguno` | Pasó: borra preset, errores, `ga4` y `pixel` |
| 16 | `/empezar/` | Pasó: solo noscript → entra avisando; IDs distintos → error sin guardar; head correcto → entra; sin excepciones |
| 17 | `/contacto/` | Pasó: `tel:+5491100000000` (`llamar`) y `mailto:hola@example.com` (`email`) |
| 18 | Descarga del catálogo | Pasó: `<a download>`; el archivo descargado tiene 1 página A4 con el título y los 6 precios (`pdfinfo`, `pdftotext`, `pypdf` estricto) |
| 19 | Enlaces en la home | Pasó: guía, app, búsqueda y formulario con `name="q"`; ningún enlace a `/registro/` |
| 20 | Panel → «Reiniciar sesión» | Pasó: sin diálogo nativo; «¿Seguro? Confirmar» por 4 s; el segundo clic reinicia y conserva el ID |
| 21 | Ruta inexistente en subdirectorio | Pasó: la 404 lleva al inicio. También se probó simulando GitHub Pages: en `/website-test-gtm-workshop/a/b/c`, el enlace apunta a `/website-test-gtm-workshop/` |
| 22 | Regresión | Pasó: los 4 presets como en la tabla 7.1; `node --check` en los 8 JS; ningún `pageerror` en toda la corrida |

**Además se verificó:**

- La compra con el dominio A en la URL real de GitHub Pages (con la subruta), servida desde el disco, y el dominio B en `b.localhost`.
- El snippet oficial de GTM (formato confirmado con el paquete `react-gtm-module`) en `/empezar/`.
- Que el enlace del catálogo se ve igual que el botón anterior: la captura en Chromium es idéntica byte a byte.
- Contra `main`: no cambió el orden de scripts de ningún `<head>`, no se perdió ningún `id`, `class` ni `data-track`, no hay pedidos nuevos a terceros y el único evento renombrado es `cookie_consent_update` → `consent_update`.

**No probado:**

- **La carga real de un contenedor GTM, la Vista previa ni Tag Assistant.** El entorno bloquea `googletagmanager.com`.
- **El supuesto del modo `cmp`** (que, cuando existe `google_tag_manager[<ID>]`, ya corrieron las etiquetas de Consent Initialization). Se verificó la lógica con un stub, no con GTM real.
- **Un segundo dominio real** (Cloudflare Pages o Netlify): se simuló con `a.localhost` y `b.localhost`.
- **Firefox y Safari.** Solo hay Chromium en el entorno. En particular, el enlace del catálogo imita la fuente de los botones con `font: -webkit-small-control`; en un navegador que no reconozca ese valor, usaría la fuente del sitio con la misma altura.
- Los entornos de GTM (`gtm_auth`/`gtm_preview`) y la vista en celulares.

---

## 12. Problemas conocidos

### Pendientes

1. **`alert("Agregado al carrito")` en `/producto/`.** Bloquea la página y la Vista previa de GTM, igual que el `confirm()` que se quitó del panel. No se cambió porque no estaba en el alcance de esta versión y los manuales podrían mencionar ese aviso.
2. **Errores que se anulan entre sí** al combinarlos (ver [7.2](#72-los-13-errores-sueltos-con-errores)).
3. **Hay código que no se usa:**
   - `AppTracking.addShippingInfo` (el evento `add_shipping_info` nunca se envía);
   - `AppCarrito.aplicarCupon` / `quitarCupon` (no hay campo para el cupón);
   - `AppCarrito.actualizarCantidad` y `obtenerCrudo`;
   - el parámetro `d` del checkout.
4. **`gtm_host` no permite ningún host de server-side.** La lista blanca `gtm_whitelist` solo incluye `https://www.googletagmanager.com`, así que cualquier otro host se bloquea con un error en la consola. Para practicar GTM server-side hay que agregar el dominio a esa lista en `config.js`.
5. **Los parámetros de entorno (`gtm_auth`, `gtm_preview`) no se guardan.** Solo aplican en la página que los tiene en la URL. Tampoco los agregan el enlace del checkout ni el botón «Copiar mi URL» del panel.
6. **La pasarela no tiene Panel de Práctica** (no carga `ui.js` ni `panel.js`).
7. **La 404 no carga GTM**, así que las páginas no encontradas no se registran (es a propósito).
8. **El texto de `/como-usar/` dice `consent_update` fijo.** Si se cambia `consent.evento` en `config.js`, hay que actualizarlo a mano.

### Resueltos en la versión final

- ~~**Con un segundo dominio, la compra terminaba en el dominio B** con el carrito vacío y sin `purchase`.**~~ Ver [sección 9](#9-segundo-dominio-clase-3).
- ~~**El analizador de `/empezar/` fallaba si pegabas solo el `<noscript>`**~~ y tampoco reconocía el snippet oficial del `<head>`.
- ~~**Cinco errores de escenario no se podían activar**~~: ahora los 13 funcionan con `?errores=`.
- ~~**`?ga4=` y `?pixel=` solo actuaban en la primera página.**~~
- ~~**El botón «Descargar Catálogo PDF» no descargaba nada** y el PDF medía 3 × 3 puntos.~~
- ~~**`/buscar/`, `/guia-de-cafe/` y `/app/` no tenían enlaces.**~~ `/registro/` sigue sin enlace a propósito.
- ~~**«Reiniciar sesión» usaba `confirm()`.**~~
- ~~**El enlace de `404.html` fallaba en rutas con subcarpetas.**~~
- ~~**El evento de consentimiento se llamaba `cookie_consent_update`** y no existía el modo `cmp` ni «Borrar mi elección».~~

---

## 13. Historial del desarrollo

### Versión inicial

| Paso | Qué se hizo | Commit |
|---|---|---|
| 1 | El punto de partida fue un script de Python que actuaba como empaquetador: un diccionario `archivos` con la ruta y el contenido de cada archivo. Como no había Python disponible, los archivos se extrajeron a mano | — |
| 2 | Al leer el script apareció un error de sintaxis: el diccionario se cerraba (`}`) antes de la entrada `carrito.js`, así que Python no habría generado nada. `carrito.js` se incluyó igual porque lo usan 5 páginas | — |
| 3 | Se crearon los 27 archivos del diccionario en `public/`. Hubo un error de transcripción en el ícono de WhatsApp de `ui.js` (`12.050` en vez de `12.05`) que se corrigió antes del commit | — |
| 4 | Se creó el PDF con los bytes del script, después de comprobar que los offsets de su tabla `xref` (9, 52, 101, 147) son correctos | — |
| 5 | Sitio en `public/` | `df1e5f3` |
| 6 | Se movió todo a la raíz con `git mv` (28 renombres, 0 líneas cambiadas) y se eliminó `public/` | `17afbaf` |
| 7 | [Pull Request #1](https://github.com/jaredmarketingmaster/website-test-gtm-workshop/pull/1) hacia `main`, fusionado con un commit de merge | `082fc65` |
| 8 | Primera versión de este documento (en la rama `claude/cafe-laboratorio-setup-0cswel`, no se fusionó) | `3d71f45` |

### Versión final (rama `claude/sitio-final`)

Un commit por sección del documento de instrucciones:

| Sección | Cambio | Commit |
|---|---|---|
| 1 | Pasarela con segundo dominio y regreso por enlace real; procedimiento en el README | `27723db` |
| 2 | Modo `cmp`, evento `consent_update`, «Borrar mi elección», texto de `/como-usar/` | `5fbfc6d` |
| 3 | `ga4` y `pixel` persisten en la sesión y viajan al dominio B | `f7653a8` |
| 4 | Los 13 errores se activan con `?errores=`; `errores_validos` y aviso por consola | `93ea02e` |
| 5 | Analizador de `/empezar/` (solo noscript, IDs distintos, snippet oficial) | `898b8ee` |
| 6 | Enlaces `tel:` y `mailto:` en `/contacto/` | `d658a0d` |
| 7 | Descarga real del catálogo y PDF A4 | `8921550` |
| 8 | «Más páginas de práctica» en la home | `fe5baa9` |
| 9 | «Reiniciar sesión» sin `confirm()` | `5ad8e5f` |
| 10 | Enlace de la 404 en subcarpetas | `08d3178` |
| 12 | `README.md` completo y este documento | commit «Sección 12» |

**Decisiones tomadas:**

- **`http-server` en vez de `serve`**: `serve` descarta los parámetros de la URL al redirigir (ver [sección 1](#1-cómo-levantarlo)).
- **`errores_validos` con 13 nombres y no 8**: el código revisa 13 nombres de error. Con una lista de 8, `?errores=valor_texto` funcionaría pero avisaría que el nombre no existe.
- **El analizador de `/empezar/` reconoce el formato oficial del `<head>`**: sin eso, quien pegara el snippet completo y correcto habría recibido el aviso de "encontré solo el noscript".
- **El botón «Buscar» de la home no usa la clase `btn-primario`**: así no suma coincidencias a los activadores de clic por clase de los ejercicios ni lo modifica el rediseño v2.
- **Diff mínimo**: el código que no se tocó conserva su formato original (líneas largas).

---

## 14. Correcciones a lo informado durante el desarrollo

- **Sobre `npx serve`:** se dijo que `serve` "puede romper las rutas relativas". **Era incorrecto y no se había probado.** Las rutas relativas y el CSS funcionan bien; el problema real es que descarta los parámetros de la URL al redirigir.
- **Sobre la cantidad de páginas que usan `carrito.js`:** se dijo que lo usan 4. **Son 5:** `/productos/`, `/producto/`, `/carrito/`, `/checkout/` y `/gracias-compra/`.
- **Sobre `/empezar/`:** la primera versión de este documento decía que, con el snippet del `<head>`, el analizador "funciona bien". **Era incorrecto:** solo funcionaba si la URL `gtm.js?id=GTM-…` estaba escrita literal. Con el snippet oficial pegado tal cual, decía "No encontré ningún código de GTM" (solo el `<head>`) o fallaba (snippet completo). Se corrigió en la sección 5.
- **Sobre la cantidad de errores:** las instrucciones de la versión final hablaban de 8 errores. El código revisa **13**: los 8 mencionados más los 5 que antes solo venían en presets.
