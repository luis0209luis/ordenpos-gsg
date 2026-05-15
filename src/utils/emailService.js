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
