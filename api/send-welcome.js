import { Resend } from 'resend'

export default async function handler(req, res) {
  console.log('--- EMPEZANDO ENDPOINT SEND-WELCOME ---')
  console.log('API KEY:', process.env.RESEND_API_KEY ? 'Presente' : 'Undefined')
  console.log('Method:', req.method)
  console.log('Body recibido:', req.body)

  if (req.method !== 'POST') return res.status(405).end()
  
  const { to, ownerName, businessName, cedula } = req.body
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    console.log('Instancia de Resend creada. Intentando enviar email a:', to)

    const response = await resend.emails.send({
      from: 'ORDENPOS <onboarding@resend.dev>',
      to,
      subject: `¡Bienvenido a ORDENPOS, ${ownerName}!`,
      html: `
        <div style="background-color: #0d0d0d; color: #ffffff; font-family: 'Inter', sans-serif; padding: 40px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ffd700; margin: 0; font-size: 32px; letter-spacing: 2px;">ORDENPOS</h1>
            <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Sistema Premium</p>
          </div>
          
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 20px;">Hola ${ownerName}, ¡bienvenido!</h2>
          <p style="color: #ccc; font-size: 16px; line-height: 1.5;">Tu empresa <strong style="color: #ffd700;">${businessName}</strong> ha sido registrada exitosamente en nuestra plataforma.</p>
          
          <div style="background-color: #1a1a1a; border: 1px solid #333; padding: 20px; border-radius: 12px; margin: 30px 0;">
            <p style="margin-top: 0; color: #aaa; font-size: 14px;">Tus credenciales de acceso son:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 10px;"><strong style="color: #ffd700;">Usuario:</strong> admin</li>
              <li><strong style="color: #ffd700;">Contraseña inicial:</strong> ${cedula}</li>
            </ul>
          </div>
          
          <p style="color: #ff4444; font-size: 14px; font-style: italic; margin-bottom: 30px;">Tu contraseña inicial es tu número de cédula, te recomendamos cambiarla en tu primer ingreso.</p>
          
          <div style="text-align: center;">
            <a href="https://ordenpos-gsg.vercel.app" style="display: inline-block; background: linear-gradient(90deg, #d4af37, #ffd700); color: #000; font-weight: bold; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
              Ingresar a mi cuenta
            </a>
          </div>
        </div>
      `
    })

    console.log('Respuesta de Resend:', response)

    if (response.error) {
      console.error('Error reportado por Resend:', response.error)
      return res.status(500).json({ success: false, error: response.error })
    }

    console.log('--- ENVÍO COMPLETADO CON ÉXITO ---')
    res.json({ success: true, data: response.data })
  } catch (e) {
    console.error('--- EXCEPCIÓN ATRAPADA EN SEND-WELCOME ---')
    console.error(e)
    res.status(500).json({ success: false, error: e.message })
  }
}
