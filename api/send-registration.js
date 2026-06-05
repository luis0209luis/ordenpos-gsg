import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { businessName, ownerName, phone } = req.body
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'ORDENPOS <onboarding@resend.dev>'
    const adminEmail = process.env.ADMIN_EMAIL || 'gemasystemgroup@gmail.com'
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
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
