import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { to, ownerName, businessName, cedula } = req.body
  try {
    await resend.emails.send({
      from: 'ORDENPOS <onboarding@resend.dev>',
      to,
      subject: `¡Bienvenido a ORDENPOS, ${ownerName}!`,
      html: `
        <h2>Hola ${ownerName}, ¡bienvenido a ORDENPOS!</h2>
        <p>Tu empresa <strong>${businessName}</strong> ha sido registrada exitosamente.</p>
        <p>Instrucciones: Ingresa a <a href="https://ordenpos-gsg.vercel.app">ordenpos-gsg.vercel.app</a>, escribe el nombre de tu empresa, luego usa estas credenciales:</p>
        <ul>
          <li><strong>Usuario:</strong> admin</li>
          <li><strong>Contraseña inicial:</strong> ${cedula}</li>
        </ul>
        <p><em>Aviso importante: Debes cambiar tu contraseña al primer ingreso por motivos de seguridad.</em></p>
      `
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
