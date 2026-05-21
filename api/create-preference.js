export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  try {
    const { price, businessId } = req.body;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
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
          success: `${protocol}://${req.headers.host}/payments?status=success`,
          failure: `${protocol}://${req.headers.host}/payments?status=failure`,
          pending: `${protocol}://${req.headers.host}/payments?status=pending`
        },
        auto_return: "approved",
        external_reference: businessId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Error from Mercado Pago', details: errorData });
    }

    const data = await response.json();
    return res.status(200).json({ id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
