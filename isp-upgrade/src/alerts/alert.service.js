// src/alerts/alert.service.js
// Unified alerting: email (Zoho SMTP), WhatsApp webhook, SMS (Africa's Talking).
// Callers use: alert({ severity, title, body, tenant_id? })

const nodemailer = require('nodemailer');
const axios      = require('axios').default;

const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.SMTP_FROM || 'alerts@icubeug.net';
const ALERT_TO    = (process.env.ALERT_TO || 'admin@icubeug.net').split(',').map(s => s.trim());

// ── Zoho SMTP ─────────────────────────────────────────────────────────────────
function getTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || process.env.EMAIL_HOST || 'smtp.zoho.com',
    port:   parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_FROM || process.env.SMTP_FROM,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendEmail({ severity, title, body }) {
  // Support both SMTP_PASS (new) and EMAIL_PASSWORD (prod server naming)
  if (!process.env.SMTP_PASS && !process.env.EMAIL_PASSWORD)
    return { skipped: true, reason: 'SMTP credentials not set' };
  try {
    const subject = `[iCube ${severity.toUpperCase()}] ${title}`;
    await getTransport().sendMail({
      from:    ALERT_EMAIL,
      to:      ALERT_TO.join(', '),
      subject,
      text:    body,
      html:    `<pre style="font-family:monospace">${body}</pre>`,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// ── WhatsApp via webhook (360dialog / Twilio / Meta Cloud API) ────────────────
async function sendWhatsApp({ severity, title, body }) {
  const url = process.env.WHATSAPP_WEBHOOK_URL;
  if (!url) return { skipped: true, reason: 'WHATSAPP_WEBHOOK_URL not set' };
  try {
    await axios.post(url, {
      text: `*[iCube ${severity.toUpperCase()}]* ${title}\n\n${body}`,
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 8000 });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// ── Africa's Talking SMS ──────────────────────────────────────────────────────
async function sendSMS({ severity, title }) {
  const key = process.env.SMS_API_KEY;
  if (!key || !process.env.ALERT_PHONE) return { skipped: true, reason: 'SMS_API_KEY or ALERT_PHONE not set' };
  try {
    const AT = require('africastalking')({ apiKey: key, username: process.env.SMS_USERNAME || 'sandbox' });
    await AT.SMS.send({
      to:      process.env.ALERT_PHONE.split(',').map(s => s.trim()),
      message: `[iCube ${severity.toUpperCase()}] ${title}`,
      from:    process.env.SMS_SENDER_ID || 'iCube',
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

// ── Public interface ──────────────────────────────────────────────────────────

const CRITICAL_SEVERITIES = new Set(['critical', 'high']);

async function alert({ severity = 'medium', title, body, tenant_id } = {}) {
  const fullBody = [
    `Severity : ${severity.toUpperCase()}`,
    `Title    : ${title}`,
    tenant_id ? `Tenant   : ${tenant_id}` : null,
    `Time     : ${new Date().toISOString()}`,
    '',
    body,
  ].filter(Boolean).join('\n');

  const tasks = [sendEmail({ severity, title, body: fullBody })];

  if (CRITICAL_SEVERITIES.has(severity)) {
    tasks.push(sendWhatsApp({ severity, title, body: fullBody }));
    tasks.push(sendSMS({ severity, title }));
  }

  const results = await Promise.allSettled(tasks);
  return results.map(r => r.value || r.reason);
}

module.exports = { alert };
