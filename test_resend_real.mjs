import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

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
  json: (data) => console.log('JSON returned:', JSON.stringify(data, null, 2)),
  end: () => console.log('Response ended')
}

handler(req, res)
