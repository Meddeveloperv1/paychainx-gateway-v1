require('dotenv').config();
const https = require('https');
const crypto = require('crypto');

const merchantId = process.env.CYBERSOURCE_MERCHANT_ID;
const keyId = process.env.CYBERSOURCE_KEY_ID;
const secret = process.env.CYBERSOURCE_KEY_SECRET;

const host = 'apitest.cybersource.com';
const path = '/pts/v2/payments';
const method = 'POST';

const body = JSON.stringify({
  clientReferenceInformation: { code: 'probe-1001' },
  processingInformation: { capture: true },
  paymentInformation: {
    card: {
      number: '4111111111111111',
      expirationMonth: '12',
      expirationYear: '2031'
    }
  },
  orderInformation: {
    amountDetails: {
      totalAmount: '25.99',
      currency: 'USD'
    },
    billTo: {
      firstName: 'John',
      lastName: 'Doe',
      address1: '1 Market St',
      locality: 'San Francisco',
      administrativeArea: 'CA',
      postalCode: '94105',
      country: 'US',
      email: 'test@example.com'
    }
  }
});

const date = new Date().toUTCString();
const digest = 'SHA-256=' + crypto.createHash('sha256').update(body, 'utf8').digest('base64');

const signatureString = [
  `host: ${host}`,
  `date: ${date}`,
  `(request-target): ${method.toLowerCase()} ${path}`,
  `digest: ${digest}`,
  `v-c-merchant-id: ${merchantId}`
].join('\n');

const signature = crypto
  .createHmac('sha256', Buffer.from(secret, 'base64'))
  .update(signatureString, 'utf8')
  .digest('base64');

const signatureHeader =
  `keyid="${keyId}", algorithm="HmacSHA256", headers="host date (request-target) digest v-c-merchant-id", signature="${signature}"`;

console.log('\nMERCHANT:', merchantId);
console.log('KEY ID:', keyId);
console.log('SECRET LEN:', secret.length);
console.log('\nSIGNATURE STRING:\n' + signatureString);
console.log('\nSIGNATURE HEADER:\n' + signatureHeader);

const req = https.request({
  hostname: host,
  path,
  method,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Date': date,
    'Host': host,
    'v-c-merchant-id': merchantId,
    'Digest': digest,
    'Signature': signatureHeader,
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nHTTP STATUS:', res.statusCode);
    console.log('RESPONSE BODY:\n' + data);
  });
});

req.on('error', (err) => {
  console.error('\nREQUEST ERROR:', err);
});

req.write(body);
req.end();
