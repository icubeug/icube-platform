// src/notifications/sms.service.js
// SMS delivery — Africa's Talking (Uganda) or Nexmo/Vonage.
// Set SMS_PROVIDER=africas_talking or nexmo in .env

const provider = process.env.SMS_PROVIDER || 'africas_talking';

async function sendSMS(phone, message) {
  if (provider === 'disabled' || provider === 'none') {
    console.log(`[SMS disabled] To: ${phone} | Message: ${message}`);
    return { status: 'disabled', phone, message };
  }

  if (!process.env.SMS_API_KEY) {
    console.log(`[SMS stub] To: ${phone} | Message: ${message}`);
    return { status: 'stub', phone, message };
  }

  if (provider === 'africas_talking') {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({
      apiKey: process.env.SMS_API_KEY,
      username: process.env.SMS_USERNAME || 'sandbox',
    });
    const sms = at.SMS;
    return sms.send({
      to: [phone],
      message,
      from: process.env.SMS_SENDER_ID || undefined,
    });
  }

  if (provider === 'nexmo') {
    const Vonage = require('@vonage/server-sdk');
    const vonage = new Vonage({ apiKey: process.env.SMS_API_KEY, apiSecret: process.env.SMS_API_SECRET });
    return new Promise((resolve, reject) => {
      vonage.message.sendSms(process.env.SMS_SENDER_ID || 'ISP', phone, message, {}, (err, res) => {
        if (err) reject(err); else resolve(res);
      });
    });
  }

  console.log(`[SMS] Unknown provider "${provider}". Message to ${phone}: ${message}`);
  return { status: 'skipped' };
}

module.exports = { sendSMS };
