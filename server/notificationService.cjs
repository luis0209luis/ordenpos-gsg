const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Configure Nodemailer for Gmail
// Nota: Usa una "Contraseña de Aplicación" de Google, no tu contraseña real.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tu_correo@gmail.com', // Reemplazar con el correo emisor
    pass: 'tu_app_password'      // Reemplazar con la contraseña de aplicación
  }
});

app.post('/api/send-email', async (req, res) => {
  const { to, businessName, amount, days } = req.body;

  try {
    const mailOptions = {
      from: '"ORDENPOS Admin" <tu_correo@gmail.com>',
      to: to,
      subject: `Nuevo Pago Recibido - ${businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          <div style="background: linear-gradient(to right, #B8860B, #FFD700); padding: 20px; text-align: center;">
            <h1 style="color: #000; margin: 0; font-size: 28px; letter-spacing: 2px;">ORDENPOS</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #FFD700; margin-top: 0;">¡Ingreso Recibido Exitosamente!</h2>
            <p style="color: #cccccc; font-size: 16px; line-height: 1.5;">El negocio <strong>${businessName}</strong> acaba de realizar un pago para renovar su suscripción.</p>
            
            <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #333;">
              <p style="margin: 5px 0; color: #aaa;">Monto Pagado:</p>
              <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 24px;">$${Number(amount).toLocaleString('es-CO')} COP</h3>
              
              <p style="margin: 5px 0; color: #aaa;">Días Añadidos:</p>
              <h3 style="margin: 0; color: #4CAF50; font-size: 20px;">+${days} Días</h3>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
              Este es un mensaje automático del sistema administrativo ORDENPOS.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado con éxito: %s', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/send-registration', async (req, res) => {
  const { businessName, ownerName, phone } = req.body;

  try {
    const mailOptions = {
      from: '"ORDENPOS Landing" <tu_correo@gmail.com>', // Configura en transport
      to: 'gemasystemgroup@gmail.com', // Correo destino
      subject: `Nueva Postulación ORDENPOS - ${businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #121212; color: #fff; border-radius: 12px; border: 1px solid #333;">
          <h2 style="color: #FFD700; text-align: center;">Nueva Solicitud de Registro</h2>
          <div style="background-color: #1e1e1e; padding: 20px; border-radius: 8px; border: 1px solid #333; margin-top: 20px;">
            <p style="margin: 10px 0;"><strong style="color: #aaa;">Negocio:</strong> <span style="font-size: 18px;">${businessName}</span></p>
            <p style="margin: 10px 0;"><strong style="color: #aaa;">Titular:</strong> <span style="font-size: 18px;">${ownerName}</span></p>
            <p style="margin: 10px 0;"><strong style="color: #aaa;">WhatsApp:</strong> <span style="font-size: 18px;">${phone}</span></p>
          </div>
          <p style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">Notificación automática de ORDENPOS Landing Page</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo de registro enviado: %s', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error al enviar el correo de registro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/create-preference', async (req, res) => {
  const { price, businessId } = req.body;

  if (!price || !businessId) {
    return res.status(400).json({ success: false, error: 'Missing price or businessId' });
  }

  try {
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    if (!mpAccessToken) {
      console.error('Error: MP_ACCESS_TOKEN is not defined in the local environment variables.');
      return res.status(500).json({ success: false, error: 'Mercado Pago credentials not configured on the local server.' });
    }

    const preferenceBody = {
      items: [
        {
          title: "Mensualidad Sistema ORDENPOS",
          quantity: 1,
          unit_price: parseFloat(price),
          currency_id: "COP"
        }
      ],
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: []
      },
      back_urls: {
        // En local, redirigimos a localhost:5173
        success: `http://localhost:5173/payments?status=success`,
        failure: `http://localhost:5173/payments?status=failure`,
        pending: `http://localhost:5173/payments?status=pending`
      },
      external_reference: businessId
    };

    // Petición HTTP nativa al API de Mercado Pago
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API returned an error:', errorData);
      return res.status(response.status).json({ success: false, error: errorData });
    }

    const data = await response.json();
    return res.status(200).json({ 
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });

  } catch (error) {
    console.error('Exception in local create-preference:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend de Notificaciones ORDENPOS ejecutándose en http://localhost:${PORT}`);
});
