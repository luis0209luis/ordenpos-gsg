import handler from './api/send-welcome.js'

const req = {
  method: 'POST',
  body: {
    to: 'test@test.com',
    ownerName: 'Luis Test',
    businessName: 'Empresa Test',
    cedula: '123456789'
  }
}

const res = {
  status: (code) => {
    console.log('Status set to:', code)
    return res
  },
  json: (data) => console.log('JSON returned:', data),
  end: () => console.log('Response ended')
}

handler(req, res)
