export async function sendPaymentEmail({ to, businessName, amount, days }) {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, businessName, amount, days })
  })
  return res.json()
}

export async function sendRegistrationEmail({ businessName, ownerName, phone }) {
  const res = await fetch('/api/send-registration', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName, ownerName, phone })
  })
  return res.json()
}

export async function sendWelcomeEmail({ to, ownerName, businessName, cedula }) {
  console.log('--- PREPARANDO FETCH A /api/send-welcome ---')
  console.log('Datos:', { to, ownerName, businessName, cedula })
  try {
    const res = await fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, ownerName, businessName, cedula })
    })
    const json = await res.json()
    console.log('--- RESPUESTA DEL FETCH ---', json)
    return json
  } catch (e) {
    console.error('--- ERROR EN EL FETCH A /api/send-welcome ---', e)
    throw e
  }
}
