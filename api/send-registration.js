import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { businessName, ownerName, phone } = req.body
  try {
    await resend.emails.send({
      from: 'ORDENPOS <no-reply@tudominio.com>',
      to: 'tu_correo_admin@tudominio.com',
      subject: `Nuevo Registro - ${businessName}`,
      html: `<p>Se ha registrado un nuevo negocio:</p>
             <ul>
               <li><strong>Negocio:</strong> ${businessName}</li>
               <li><strong>Dueño:</strong> ${ownerName}</li>
               <li><strong>Teléfono:</strong> ${phone}</li>
             </ul>`
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
