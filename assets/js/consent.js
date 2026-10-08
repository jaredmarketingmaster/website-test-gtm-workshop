
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('consent')) {
        const c = urlParams.get('consent');
        if (c === 'ninguno' || c === 'off') sessionStorage.removeItem('practica_consent_mode');
        else sessionStorage.setItem('practica_consent_mode', c);
    }
    const mode = sessionStorage.getItem('practica_consent_mode') || 'off';
    if (urlParams.has('region_consent')) sessionStorage.setItem('practica_region_consent', urlParams.get('region_consent'));
    const region = sessionStorage.getItem('practica_region_consent');
    if (mode === 'off') return;
    const COOKIE_NAME = 'practica_consent';
    function setCookie(value) {
        const d = new Date(); d.setTime(d.getTime() + (365*24*60*60*1000));
        document.cookie = COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(value)) + "; expires=" + d.toUTCString() + "; path=/";
    }
    function getCookie() {
        const nameEQ = COOKIE_NAME + "="; const ca = document.cookie.split(';');
        for(let i=0; i < ca.length; i++) {
            let c = ca[i]; while (c.charAt(0) === ' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) === 0) return JSON.parse(decodeURIComponent(c.substring(nameEQ.length,c.length)));
        }
        return null;
    }
    let storedChoices = getCookie();
    const CAT_MAPPING = { analytics: ['analytics_storage'], ads: ['ad_storage', 'ad_user_data'], personalization: ['ad_personalization'], preferences: ['functionality_storage', 'personalization_storage'] };
    let defaultState = { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', functionality_storage: 'denied', personalization_storage: 'denied', security_storage: 'granted' };
    if (!storedChoices && region === 'concedido') { Object.keys(defaultState).forEach(k => defaultState[k] = 'granted'); }
    if (mode === 'gtag') { gtag('consent', 'default', { ...defaultState, wait_for_update: 500 }); if (storedChoices) gtag('consent', 'update', storedChoices); }
    // Un solo nombre de evento para los tres modos (gtag, cmp, datalayer); se define en config.js.
    const EVENTO_CONSENT = (window.AppConfig && window.AppConfig.consent && window.AppConfig.consent.evento) || 'consent_update';
    // Modo cmp: el sitio se comporta como un CMP real y NO emite el default (lo crea el alumno en GTM).
    // En una visita con elección guardada, reenvía update + evento recién cuando el contenedor está inicializado,
    // para que lleguen después del default del alumno. Se consulta cada 100 ms y, si a los 5 s no apareció
    // (contenedor bloqueado o sin ID), se envía igual.
    // SUPUESTO A VERIFICAR CON UN CONTENEDOR REAL: que, cuando existe window.google_tag_manager[ID],
    // las etiquetas de Consent Initialization ya se ejecutaron.
    if (mode === 'cmp' && storedChoices) {
        let intentos = 0;
        const espera = setInterval(() => {
            const gtmId = localStorage.getItem('practica_gtm_id');
            const contenedorListo = gtmId && window.google_tag_manager && window.google_tag_manager[gtmId];
            if (contenedorListo || ++intentos >= 50) {
                clearInterval(espera);
                gtag('consent', 'update', storedChoices);
                window.dataLayer.push({ event: EVENTO_CONSENT });
            }
        }, 100);
    }
    document.addEventListener('DOMContentLoaded', () => {
        const css = `.cmp-overlay { position: fixed; bottom: 0; left: 0; width: 100%; background: #2C3E50; color: white; padding: 20px; box-shadow: 0 -5px 15px rgba(0,0,0,0.2); z-index: 10000; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; } .cmp-text { max-width: 800px; text-align: center; margin-bottom: 15px; font-size: 14px; } .cmp-buttons { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; } .cmp-btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; } .cmp-btn-main { background: #27AE60; color: white; } .cmp-btn-main:hover { background: #1E8449; } .cmp-btn-alt { background: #34495E; color: white; border: 1px solid #BDC3C7; } .cmp-btn-alt:hover { background: #2C3E50; } .cmp-modal { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; color: #333; padding: 30px; border-radius: 8px; z-index: 10001; width: 90%; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); } .cmp-backdrop { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; } .cmp-switch { margin: 15px 0; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px;} .cmp-footer-link { position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; z-index: 9999; }`;
        const style = document.createElement('style'); style.innerHTML = css; document.head.appendChild(style);
        // Barra fija abajo a la derecha que agrupa «Borrar mi elección» y «Preferencias de cookies» (este último queda en el mismo lugar).
        style.innerHTML += ' .cmp-footer-bar { position: fixed; bottom: 10px; right: 10px; display: flex; gap: 6px; z-index: 9999; } .cmp-footer-bar .cmp-footer-link { position: static; }';
        const html = `<div id="cmp-banner" class="cmp-overlay" style="display: ${storedChoices ? 'none' : 'flex'};"><div class="cmp-text"><strong>Privacidad y Cookies (Simulación)</strong><br>Usamos cookies para fines analíticos y publicidad.</div><div class="cmp-buttons"><button id="cmp-accept-all" class="cmp-btn cmp-btn-main">Aceptar todo</button><button id="cmp-reject-all" class="cmp-btn cmp-btn-main" style="background:#E74C3C;">Rechazar todo</button><button id="cmp-config" class="cmp-btn cmp-btn-alt">Configurar</button></div></div><div id="cmp-backdrop" class="cmp-backdrop"></div><div id="cmp-modal" class="cmp-modal"><h3 style="margin-top:0;">Configurar Cookies</h3><div class="cmp-switch"><span>Necesarias</span> <strong>Siempre activas</strong></div><div class="cmp-switch"><span>Analítica</span> <input type="checkbox" id="chk-analytics"></div><div class="cmp-switch"><span>Publicidad</span> <input type="checkbox" id="chk-ads"></div><div class="cmp-switch"><span>Publicidad Personalizada</span> <input type="checkbox" id="chk-personalization"></div><div class="cmp-switch"><span>Preferencias</span> <input type="checkbox" id="chk-preferences"></div><button id="cmp-save" class="cmp-btn cmp-btn-main" style="width: 100%; margin-top: 20px;">Guardar Preferencias</button></div><div class="cmp-footer-bar"><div id="cmp-clear-trigger" class="cmp-footer-link">Borrar mi elección</div><div id="cmp-footer-trigger" class="cmp-footer-link">Preferencias de cookies</div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        function procesarEleccion(eleccionObj) {
            document.getElementById('cmp-banner').style.display = 'none'; document.getElementById('cmp-modal').style.display = 'none'; document.getElementById('cmp-backdrop').style.display = 'none';
            let newState = { security_storage: 'granted' };
            Object.keys(CAT_MAPPING).forEach(cat => { let status = eleccionObj[cat] ? 'granted' : 'denied'; CAT_MAPPING[cat].forEach(key => newState[key] = status); });
            setCookie(newState);
            // gtag y cmp: el banner hace el update como un CMP real y después avisa con el evento (en ese orden).
            if (mode === 'gtag' || mode === 'cmp') { gtag('consent', 'update', newState); window.dataLayer.push({ event: EVENTO_CONSENT }); }
            else if (mode === 'datalayer') { window.dataLayer.push({ event: EVENTO_CONSENT, consent_state: newState }); }
        }
        document.getElementById('cmp-accept-all').addEventListener('click', () => procesarEleccion({ analytics: true, ads: true, personalization: true, preferences: true }));
        document.getElementById('cmp-reject-all').addEventListener('click', () => procesarEleccion({ analytics: false, ads: false, personalization: false, preferences: false }));
        document.getElementById('cmp-config').addEventListener('click', () => { document.getElementById('cmp-modal').style.display = 'block'; document.getElementById('cmp-backdrop').style.display = 'block'; });
        document.getElementById('cmp-footer-trigger').addEventListener('click', () => { document.getElementById('cmp-banner').style.display = 'flex'; });
        // Borra solo la cookie de la elección y recarga. El modo (?consent=) vive en sessionStorage y no se toca,
        // así que al recargar vuelve a aparecer el banner con el mismo modo.
        document.getElementById('cmp-clear-trigger').addEventListener('click', () => { document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; window.location.reload(); });
        document.getElementById('cmp-save').addEventListener('click', () => procesarEleccion({ analytics: document.getElementById('chk-analytics').checked, ads: document.getElementById('chk-ads').checked, personalization: document.getElementById('chk-personalization').checked, preferences: document.getElementById('chk-preferences').checked }));
    });
})();
