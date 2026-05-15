import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { to, businessName, amount, days } = req.body
  try {
    await resend.emails.send({
      from: 'ORDENPOS <no-reply@tudominio.com>',
      to,
      subject: `Nuevo Pago Recibido - ${businessName}`,
      html: `<p>El negocio <strong>${businessName}</strong> pagó $${amount} por ${days} días.</p>`
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
}
