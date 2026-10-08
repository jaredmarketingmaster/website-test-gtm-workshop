
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search); if (urlParams.get('panel') === '0') return;
    const panelHTML = `<div id="practica-panel-btn" data-practica-panel="true">Panel de Práctica</div><div id="practica-panel" data-practica-panel="true" style="display: none;"><div class="panel-header" data-practica-panel="true"><strong data-practica-panel="true">Diagnóstico GTM</strong><button id="panel-close" data-practica-panel="true">&times;</button></div><div class="panel-body" data-practica-panel="true"><div class="panel-section" data-practica-panel="true"><p data-practica-panel="true"><strong>Contenedor:</strong> <span id="panel-gtm-id" data-practica-panel="true">-</span></p><p data-practica-panel="true"><strong>Estado:</strong> <span id="panel-gtm-status" data-practica-panel="true">Verificando...</span></p><p data-practica-panel="true" id="panel-error-msg" class="panel-error" style="display:none;"></p><button id="btn-copy-url" data-practica-panel="true" class="panel-btn">Copiar mi URL</button></div><div class="panel-section" data-practica-panel="true"><strong data-practica-panel="true">Data Layer (En vivo)</strong> <label data-practica-panel="true" style="font-size: 12px;"><input type="checkbox" id="filter-gtm" data-practica-panel="true" checked> Ocultar gtm.*</label><div id="panel-datalayer" data-practica-panel="true"></div><button id="btn-clear-dl-view" data-practica-panel="true" class="panel-btn">Limpiar vista</button></div><div class="panel-section" data-practica-panel="true"><strong data-practica-panel="true">Herramientas</strong><br><button id="btn-sim-gclid" data-practica-panel="true" class="panel-btn">Simular Google Ads (gclid)</button> <button id="btn-sim-fbclid" data-practica-panel="true" class="panel-btn">Simular Meta (fbclid)</button> <button id="btn-reset-session" data-practica-panel="true" class="panel-btn panel-btn-danger">Reiniciar sesión</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', panelHTML);
    const btn = document.getElementById('practica-panel-btn'), panel = document.getElementById('practica-panel'), closeBtn = document.getElementById('panel-close'), dlContainer = document.getElementById('panel-datalayer'), filterGtm = document.getElementById('filter-gtm');
    btn.addEventListener('click', () => { panel.style.display = 'flex'; btn.style.display = 'none'; }); closeBtn.addEventListener('click', () => { panel.style.display = 'none'; btn.style.display = 'block'; });
    document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') { if (panel.style.display === 'none') btn.click(); else closeBtn.click(); } });
    const gtmId = localStorage.getItem('practica_gtm_id'); document.getElementById('panel-gtm-id').textContent = gtmId || 'Ninguno';
    setTimeout(() => {
        const statusEl = document.getElementById('panel-gtm-status'), errEl = document.getElementById('panel-error-msg');
        if (!gtmId) { statusEl.textContent = 'No configurado'; statusEl.style.color = 'gray'; } else if (window.__gtm_load_error) { statusEl.textContent = 'Error de carga'; statusEl.style.color = '#D35400'; errEl.textContent = 'El script falló o el contenedor está vacío.'; errEl.style.display = 'block'; } else if (window.google_tag_manager && window.google_tag_manager[gtmId]) { statusEl.textContent = 'Cargado y activo'; statusEl.style.color = 'green'; } else { statusEl.textContent = 'Script en DOM, Tag Manager no detectado'; statusEl.style.color = 'orange'; }
    }, 1500);
    document.getElementById('btn-copy-url').addEventListener('click', function() { const url = new URL(window.location.origin + window.location.pathname); if (gtmId) url.searchParams.set('gtm', gtmId); navigator.clipboard.writeText(url.toString()); this.textContent = '¡Copiada!'; setTimeout(() => this.textContent = 'Copiar mi URL', 2000); });
    let dlLength = 0;
    function renderDataLayer() {
        if (!window.dataLayer) return;
        if (window.dataLayer.length > dlLength) {
            const hideGtm = filterGtm.checked;
            for (let i = dlLength; i < window.dataLayer.length; i++) {
                const item = window.dataLayer[i]; if (!item) continue;
                const isGtm = item.event && typeof item.event === 'string' && item.event.startsWith('gtm.');
                const div = document.createElement('div'); div.className = 'dl-item'; div.setAttribute('data-practica-panel', 'true'); if (isGtm && hideGtm) div.style.display = 'none'; if (isGtm) div.classList.add('dl-item-gtm');
                const eventName = item.event || '(Mensaje)';
                div.innerHTML = `<div class="dl-item-header" data-practica-panel="true"><span data-practica-panel="true">#${i} ${eventName}</span></div><pre data-practica-panel="true">${JSON.stringify(item, null, 2)}</pre>`;
                dlContainer.appendChild(div);
            }
            dlLength = window.dataLayer.length; dlContainer.scrollTop = dlContainer.scrollHeight;
        }
    }
    setInterval(renderDataLayer, 500);
    filterGtm.addEventListener('change', () => { document.querySelectorAll('.dl-item-gtm').forEach(el => el.style.display = filterGtm.checked ? 'none' : 'block'); });
    document.getElementById('btn-clear-dl-view').addEventListener('click', () => { dlContainer.innerHTML = ''; dlLength = window.dataLayer ? window.dataLayer.length : 0; });
    document.getElementById('btn-sim-gclid').addEventListener('click', () => { const url = new URL(window.location.href); url.searchParams.set('gclid', 'Cj0KCQj_prueba_didactica_123'); window.location.href = url.toString(); });
    document.getElementById('btn-sim-fbclid').addEventListener('click', () => { const url = new URL(window.location.href); url.searchParams.set('fbclid', 'IwAR2_prueba_didactica_456'); window.location.href = url.toString(); });
    // Confirmación dentro del propio panel en lugar de confirm(), que bloquea la página y la Vista previa de GTM:
    // el primer clic cambia el texto a «¿Seguro? Confirmar» durante 4 s; un segundo clic dentro de ese plazo reinicia.
    let resetPendiente = null;
    document.getElementById('btn-reset-session').addEventListener('click', function () {
        if (!resetPendiente) {
            const btnReset = this, textoReposo = btnReset.textContent;
            btnReset.textContent = '¿Seguro? Confirmar';
            resetPendiente = setTimeout(() => { resetPendiente = null; btnReset.textContent = textoReposo; }, 4000);
            return;
        }
        clearTimeout(resetPendiente);
        { localStorage.removeItem('practica_carrito'); sessionStorage.clear(); const cookies = document.cookie.split(";"); for (let i = 0; i < cookies.length; i++) { const cookie = cookies[i]; const eqPos = cookie.indexOf("="); const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim(); document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"; } window.location.reload(); } });
});
