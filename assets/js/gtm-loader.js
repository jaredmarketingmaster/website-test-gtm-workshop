
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    let gtmId = urlParams.get('gtm');
    if (gtmId) {
        gtmId = gtmId.trim().toUpperCase();
        if (/^GTM-[A-Z0-9]{4,12}$/i.test(gtmId)) localStorage.setItem('practica_gtm_id', gtmId);
        else gtmId = null;
    }
    if (!gtmId) gtmId = localStorage.getItem('practica_gtm_id');
    let baseRef = ''; const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) { if (scripts[i].getAttribute('src') && scripts[i].getAttribute('src').includes('assets/js/gtm-loader.js')) { baseRef = scripts[i].getAttribute('src').split('assets/js/gtm-loader.js')[0]; break; } }
    if (!baseRef) baseRef = './';
    const currentPath = window.location.pathname;
    const isExempt = currentPath.includes('/empezar/') || currentPath.includes('/como-usar/') || currentPath.includes('/agenda-widget/');
    if (!gtmId && !isExempt) { sessionStorage.setItem('practica_redirect', window.location.href); window.location.href = baseRef + 'empezar/index.html'; return; }
    if (!gtmId) return;
    window.dataLayer = window.dataLayer || [];
    const escenario = sessionStorage.getItem('practica_escenario');
    // Preset + ?errores= (como en datalayer.js); si no está escenarios.js, solo el preset, como antes.
    const isDoubleSnippet = (window.AppEscenarios && typeof window.AppEscenarios.getErrores === 'function')
        ? window.AppEscenarios.getErrores().includes('snippet_doble')
        : window.AppConfig.escenarios_presets[escenario]?.errores.includes('snippet_doble');
    if (window.__gtm_loader_fired && !isDoubleSnippet) return;
    window.__gtm_loader_fired = true;
    const auth = urlParams.get('gtm_auth'), preview = urlParams.get('gtm_preview'), cookiesWin = urlParams.get('gtm_cookies_win');
    let envParams = '';
    if (auth && preview && /^[a-zA-Z0-9-_]+$/.test(auth) && /^env-[0-9]+$/.test(preview)) envParams = `&gtm_auth=${encodeURIComponent(auth)}&gtm_preview=${encodeURIComponent(preview)}&gtm_cookies_win=${encodeURIComponent(cookiesWin || 'x')}`;
    let gtmDomain = 'https://www.googletagmanager.com';
    const customHost = sessionStorage.getItem('practica_gtm_host');
    if (customHost) {
        if (window.AppConfig.dominios.gtm_whitelist.includes(customHost)) gtmDomain = customHost;
        else console.error(`Bloqueo de seguridad: Dominio ${customHost} no permitido.`);
    }
    (function(w,d,s,l,i){
        w[l]=w[l]||[]; w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
        var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l='+l : ''; j.async = true;
        j.src = gtmDomain + '/gtm.js?id=' + i + dl + envParams;
        j.onerror = function() { w.__gtm_load_error = true; };
        f.parentNode.insertBefore(j,f);
        if (isDoubleSnippet) { var j2 = d.createElement(s); j2.async = true; j2.src = j.src; f.parentNode.insertBefore(j2,f); }
    })(window, document, 'script', 'dataLayer', gtmId);
})();
