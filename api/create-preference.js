export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { price, businessId } = req.body;

    // ── 1. Validar token ─────────────────────────────────────────────────────
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      console.error('[create-preference] ❌ MP_ACCESS_TOKEN no está definido en las variables de entorno de Vercel.');
      return res.status(500).json({ error: 'Configuración de pago incompleta. Contacta al soporte.' });
    }

    // Rechazar tokens de sandbox explícitamente (evita el error "cuenta de prueba")
    if (token.startsWith('TEST-')) {
      console.error('[create-preference] ❌ Se detectó un token de SANDBOX (TEST-...). Configura el token de PRODUCCIÓN en Vercel.');
      return res.status(500).json({ error: 'El sistema está usando credenciales de prueba. Contacta al administrador.' });
    }

    // ── 2. Determinar dominio de producción ──────────────────────────────────
    // VERCEL_PROJECT_PRODUCTION_URL: variable automática de Vercel con el dominio real.
    // Fallback al host del request para entornos locales.
    const productionDomain =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||   // ej: ordenpos-gsg.vercel.app (sin https://)
      process.env.NEXT_PUBLIC_SITE_URL ||             // variable custom opcional
      req.headers.host;

    const baseUrl = `https://${productionDomain}`;
    console.log(`[create-preference] ✅ Token OK (APP_USR-...) | dominio: ${baseUrl} | precio: ${price} | negocio: ${businessId}`);

    // ── 3. Crear preferencia en Mercado Pago ─────────────────────────────────
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: "Renovación Mensual - ORDENPOS",
          quantity: 1,
          unit_price: parseFloat(price),
          currency_id: "COP"
        }],
        back_urls: {
          success: `${baseUrl}/payments?status=success`,
          failure: `${baseUrl}/payments?status=failure`,
          pending: `${baseUrl}/payments?status=pending`
        },
        auto_return: "approved",
        external_reference: businessId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[create-preference] Error de Mercado Pago:', errorData);
      return res.status(response.status).json({ error: errorData.message || 'Error de Mercado Pago', details: errorData });
    }

    const data = await response.json();
    console.log(`[create-preference] ✅ Preferencia creada: ${data.id}`);
    return res.status(200).json({ id: data.id, init_point: data.init_point });

  } catch (error) {
    console.error('[create-preference] Error inesperado:', error);
    return res.status(500).json({ error: error.message });
  }
}
