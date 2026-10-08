
window.AppCarrito = (function() {
    const STORAGE_KEY = 'practica_carrito'; const CURRENCY = window.AppConfig.tienda.moneda; const ENVIO_CENTAVOS = 350000;
    let estado = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { items: [], coupon: null, shipping_tier: 'estandar', payment_type: null };
    function guardar() { localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); }
    function getProductoBase(id) { return window.AppConfig.productos.find(p => p.item_id === id); }
    function calcularTotales() {
        let valueCentavos = 0; let itemsGA4 = []; const tieneCupon = estado.coupon === 'PRACTICA10';
        estado.items.forEach((item, index) => {
            const base = getProductoBase(item.item_id); if (!base) return;
            let unitPriceCent = base.precio_centavos; let discountCent = 0;
            if (tieneCupon) { discountCent = Math.round(unitPriceCent * 0.10); unitPriceCent -= discountCent; }
            valueCentavos += (unitPriceCent * item.quantity);
            let itemGA4 = { item_id: base.item_id, item_name: base.item_name, item_brand: base.item_brand, item_category: base.item_category, price: unitPriceCent / 100, quantity: item.quantity, index: index + 1 };
            if (base.item_variant) itemGA4.item_variant = base.item_variant;
            if (tieneCupon) { itemGA4.discount = discountCent / 100; itemGA4.coupon = estado.coupon; }
            itemsGA4.push(itemGA4);
        });
        const taxCentavos = Math.round(valueCentavos * (21 / 121));
        return { currency: CURRENCY, value: valueCentavos / 100, tax: taxCentavos / 100, shipping: ENVIO_CENTAVOS / 100, coupon: estado.coupon, items: itemsGA4, cantidad_total: estado.items.reduce((sum, i) => sum + i.quantity, 0), total_final_con_envio: (valueCentavos + ENVIO_CENTAVOS) / 100 };
    }
    return {
        formatearMoneda: (montoDecimal) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: CURRENCY }).format(montoDecimal),
        obtener: calcularTotales, obtenerCrudo: () => estado,
        agregar: (id, cantidad, variante) => { const existente = estado.items.find(i => i.item_id === id); if (existente) existente.quantity += cantidad; else estado.items.push({ item_id: id, quantity: cantidad, variant: variante }); guardar(); },
        actualizarCantidad: (id, cantidad) => { const item = estado.items.find(i => i.item_id === id); if (item) { item.quantity = cantidad; if (item.quantity <= 0) estado.items = estado.items.filter(i => i.item_id !== id); guardar(); } },
        quitar: (id) => { estado.items = estado.items.filter(i => i.item_id !== id); guardar(); },
        aplicarCupon: (codigo) => { if (codigo.toUpperCase() === 'PRACTICA10') { estado.coupon = 'PRACTICA10'; guardar(); return true; } return false; },
        quitarCupon: () => { estado.coupon = null; guardar(); }, vaciar: () => { estado.items = []; estado.coupon = null; guardar(); },
        actualizarContadorUI: () => { const btn = document.getElementById('cart-count'); if (btn) { const total = calcularTotales().cantidad_total; btn.textContent = total; btn.style.display = total > 0 ? 'inline-block' : 'none'; } }
    };
})();
