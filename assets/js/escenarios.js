
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('escenario')) {
        const esc = urlParams.get('escenario');
        if (esc.toLowerCase() === 'ninguno') { sessionStorage.removeItem('practica_escenario'); sessionStorage.removeItem('practica_errores_custom'); sessionStorage.removeItem('practica_ga4'); sessionStorage.removeItem('practica_pixel'); }
        else { sessionStorage.setItem('practica_escenario', esc); }
    }
    if (urlParams.has('errores')) sessionStorage.setItem('practica_errores_custom', urlParams.get('errores'));
    if (urlParams.has('user_data')) {
        if (urlParams.get('user_data') === '1') sessionStorage.setItem('practica_user_data', '1');
        else sessionStorage.removeItem('practica_user_data');
    }
    // ga4 y pixel se guardan en la sesión: así el código duplicado sigue presente al navegar (antes desaparecía
    // en la página siguiente) y también en el dominio B, que los recibe en la URL desde el checkout.
    if (urlParams.has('ga4') && /^G-[A-Z0-9]+$/i.test(urlParams.get('ga4'))) sessionStorage.setItem('practica_ga4', urlParams.get('ga4').toUpperCase());
    if (urlParams.has('pixel') && /^\d+$/.test(urlParams.get('pixel'))) sessionStorage.setItem('practica_pixel', urlParams.get('pixel'));
    window.AppEscenarios = window.AppEscenarios || {};
    window.AppEscenarios.tieneUserData = function() { return sessionStorage.getItem('practica_user_data') === '1' || urlParams.get('user_data') === '1'; };
    if (urlParams.has('gtm_host')) {
        const host = urlParams.get('gtm_host');
        if (host === 'ninguno') sessionStorage.removeItem('practica_gtm_host');
        else sessionStorage.setItem('practica_gtm_host', host);
    }
    window.AppEscenarios.getErrores = function() {
        let activos = [];
        const preset = sessionStorage.getItem('practica_escenario');
        if (preset && window.AppConfig.escenarios_presets[preset]) activos = activos.concat(window.AppConfig.escenarios_presets[preset].errores);
        const custom = sessionStorage.getItem('practica_errores_custom');
        if (custom) activos = activos.concat(custom.split(','));
        return activos;
    };
    const erroresActivos = window.AppEscenarios.getErrores();
    if (erroresActivos.includes('ga4_duplicado')) {
        const ga4Id = sessionStorage.getItem('practica_ga4');
        if (ga4Id && /^G-[A-Z0-9]+$/i.test(ga4Id)) {
            const script1 = document.createElement('script'); script1.async = true; script1.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga4Id.toUpperCase(); document.head.appendChild(script1);
            const script2 = document.createElement('script'); script2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${ga4Id.toUpperCase()}');`; document.head.appendChild(script2);
        }
    }
    if (erroresActivos.includes('pixel_duplicado')) {
        const pixelId = sessionStorage.getItem('practica_pixel');
        if (pixelId && /^\d+$/.test(pixelId)) {
            const fbScript = document.createElement('script'); fbScript.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixelId}');fbq('track', 'PageView');`; document.head.appendChild(fbScript);
        }
    }
    if (erroresActivos.includes('datalayer_reset')) { setTimeout(() => { window.dataLayer = []; }, 3000); }
})();
