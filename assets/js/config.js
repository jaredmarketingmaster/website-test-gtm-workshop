
window.AppConfig = {
  tienda: {
    nombre: 'Café Laboratorio', moneda: 'ARS',
    telefono_mostrar: '0800-555-CAFE (2233)', telefono_link: 'tel:+5491100000000',
    whatsapp_link: 'https://wa.me/5491100000000', email: 'hola@example.com'
  },
  dominios: {
    // Base del dominio A (el sitio principal, donde se guarda el carrito y se dispara el purchase).
    // URL absoluta, con barra final y con la subruta si la hay (GitHub Pages publica en /<repo>/).
    // Antes se usaba window.location.hostname, que en la pasarela vale el dominio B: por eso la compra terminaba en B.
    principal_url: 'https://jaredmarketingmaster.github.io/website-test-gtm-workshop/',
    // Base del dominio B (el checkout/pasarela). VACÍO = misma URL que el principal (clases 1, 2 y 4).
    // Jared lo completa antes de la clase 3, con el sitio ya publicado en un segundo dominio.
    checkout_url: '',
    gtm_whitelist: ['https://www.googletagmanager.com']
  },
  productos: [
    { item_id: 'CL-001', item_name: 'Colombia Finca El Paraíso', item_brand: 'Café Laboratorio', item_category: 'Café en grano', precio_centavos: 1850000, imagen_svg: 'icono-cafe-grano' },
    { item_id: 'CL-002', item_name: 'Etiopía Yirgacheffe', item_brand: 'Café Laboratorio', item_category: 'Café en grano', precio_centavos: 2100000, imagen_svg: 'icono-cafe-grano' },
    { item_id: 'CL-003', item_name: 'Blend Espresso House', item_brand: 'Café Laboratorio', item_category: 'Café en grano', precio_centavos: 1500000, imagen_svg: 'icono-cafe-grano' },
    { item_id: 'CL-004', item_name: 'Prensa Francesa Bodum 1L', item_brand: 'Bodum', item_category: 'Accesorios', precio_centavos: 4500000, imagen_svg: 'icono-prensa' },
    { item_id: 'CL-005', item_name: 'Filtros V60 (100 un.)', item_brand: 'Hario', item_category: 'Accesorios', precio_centavos: 850000, imagen_svg: 'icono-filtro' },
    { item_id: 'CL-006', item_name: 'Balanza de precisión con timer', item_brand: 'Timemore', item_category: 'Accesorios', precio_centavos: 6500000, imagen_svg: 'icono-balanza' }
  ],
  dataLayerCiego: {
    event: 'nl_alta_v2', payload: { alta: { plan: 'club_pro', valor: 4990, moneda: 'ARS', origen: 'pie_de_pagina' } }
  },
  escenarios_presets: {
    'k4': { errores: ['valor_texto', 'doble_envio'] },
    'm7': { errores: ['sin_limpiar_ecommerce', 'transaction_id_repetido'] },
    'r2': { errores: ['ga4_duplicado', 'valor_texto', 'cross_domain_js'] },
    'x9': { errores: ['datalayer_reset'] }
  }
};
