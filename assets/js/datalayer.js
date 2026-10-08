
window.AppTracking = (function() {
    window.dataLayer = window.dataLayer || [];
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
    }
    function getErroresActivos() {
        // Misma fuente que escenarios.js (preset + ?errores=): así cualquier error se puede activar suelto.
        // Antes solo se leía el preset y varios errores programados nunca se activaban.
        if (window.AppEscenarios && typeof window.AppEscenarios.getErrores === 'function') return window.AppEscenarios.getErrores();
        // Respaldo por si una página carga datalayer.js sin escenarios.js: solo el preset, como antes.
        const escenario = sessionStorage.getItem('practica_escenario');
        if (!escenario || !window.AppConfig.escenarios_presets[escenario]) return [];
        return window.AppConfig.escenarios_presets[escenario].errores;
    }
    function pushEcommerce(eventName, ecommerceData) {
        const errores = getErroresActivos();
        if (!errores.includes('sin_limpiar_ecommerce')) window.dataLayer.push({ ecommerce: null });
        let payload = {};
        if (errores.includes('clave_mayuscula')) {
            payload = { event: eventName, event_id: generateUUID(), Ecommerce: ecommerceData };
            if (payload.Ecommerce.value) { payload.Ecommerce.Value = payload.Ecommerce.value; delete payload.Ecommerce.value; }
        } else { payload = { event: eventName, event_id: generateUUID(), ecommerce: ecommerceData }; }
        if (errores.includes('moneda_minuscula') && payload.ecommerce && payload.ecommerce.currency) payload.ecommerce.currency = payload.ecommerce.currency.toLowerCase();
        if (errores.includes('push_tardio') && eventName === 'purchase') {
            window.dataLayer.push({ event: eventName, event_id: payload.event_id });
            setTimeout(() => window.dataLayer.push({ ecommerce: payload.ecommerce }), 100); return;
        }
        window.dataLayer.push(payload);
    }
    return {
        uuid: generateUUID, errores: getErroresActivos,
        viewItemList: (items, listId, listName) => pushEcommerce('view_item_list', { item_list_id: listId, item_list_name: listName, items: items }),
        selectItem: (items, listId, listName) => pushEcommerce('select_item', { item_list_id: listId, item_list_name: listName, items: items }),
        viewItem: (currency, value, items) => pushEcommerce('view_item', { currency: currency, value: value, items: items }),
        addToCart: (currency, value, items) => pushEcommerce('add_to_cart', { currency: currency, value: value, items: items }),
        removeFromCart: (currency, value, items) => pushEcommerce('remove_from_cart', { currency: currency, value: value, items: items }),
        viewCart: (currency, value, items) => pushEcommerce('view_cart', { currency: currency, value: value, items: items }),
        beginCheckout: (currency, value, coupon, items) => pushEcommerce('begin_checkout', { currency: currency, value: value, coupon: coupon, items: items }),
        addShippingInfo: (currency, value, coupon, shippingTier, items) => pushEcommerce('add_shipping_info', { currency: currency, value: value, coupon: coupon, shipping_tier: shippingTier, items: items }),
        addPaymentInfo: (currency, value, coupon, paymentType, items) => pushEcommerce('add_payment_info', { currency: currency, value: value, coupon: coupon, payment_type: paymentType, items: items }),
        purchase: (transactionId, currency, value, tax, shipping, coupon, items) => {
            const errores = getErroresActivos();
            let finalValue = value, finalTxId = transactionId;
            if (errores.includes('valor_texto')) finalValue = new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency }).format(value);
            if (errores.includes('transaction_id_repetido')) finalTxId = 'CL-19990101-ERROR0';
            const eco = { transaction_id: finalTxId, currency: currency, value: finalValue, tax: tax, shipping: shipping, coupon: coupon, items: items };
            if (window.AppEscenarios && window.AppEscenarios.tieneUserData()) eco.user_data = { email: 'comprador@example.com', phone_number: '+5491122334455' };
            pushEcommerce('purchase', eco);
        },
        formSuccess: (formId, formName, leadType) => {
            const payload = { event: 'form_success', event_id: generateUUID(), form_id: formId, form_name: formName, lead_type: leadType };
            if (window.AppEscenarios && window.AppEscenarios.tieneUserData()) payload.user_data = { email: 'contacto@example.com', phone_number: '+5491122334455' };
            window.dataLayer.push(payload);
            if (getErroresActivos().includes('doble_envio')) setTimeout(() => window.dataLayer.push(payload), 500);
        }
    };
})();
