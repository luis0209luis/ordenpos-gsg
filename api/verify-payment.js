export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Falta el ID del pago (payment_id).' });
  }

  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      console.error('[verify-payment] ❌ MP_ACCESS_TOKEN no está definido.');
      return res.status(500).json({ error: 'Credenciales no configuradas.' });
    }

    console.log(`[verify-payment] Consultando estado del pago ${id} en Mercado Pago...`);

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[verify-payment] Error al consultar pago:', errorData);
      return res.status(response.status).json({ error: errorData.message || 'Error de Mercado Pago', details: errorData });
    }

    const paymentData = await response.json();
    console.log(`[verify-payment] ✅ Estado del pago ${id}: ${paymentData.status} (${paymentData.status_detail})`);

    // Devolvemos los datos clave del pago para la verificación en el cliente
    return res.status(200).json({
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      external_reference: paymentData.external_reference,
      transaction_amount: paymentData.transaction_amount
    });

  } catch (error) {
    console.error('[verify-payment] Error inesperado:', error);
    return res.status(500).json({ error: error.message });
  }
}
