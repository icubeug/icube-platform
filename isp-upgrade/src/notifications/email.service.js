const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST     || 'smtp.zoho.com',
  port:   Number(process.env.EMAIL_PORT || 465),
  secure: true,
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Called once at startup — logs SMTP status
function verifySmtp() {
  transporter.verify((err) => {
    if (err) console.error('[Email] SMTP error:', err.message);
    else     console.log('[Email] SMTP ready');
  });
}

async function sendOTPEmail(toEmail, otp) {
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
    console.warn('[Email] EMAIL_FROM / EMAIL_PASSWORD not set — skipping email delivery');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>iCube Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#111;border-radius:12px;border:1px solid #1e1e1e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:28px 40px;border-bottom:1px solid #1e1e1e;">
              <span style="font-size:22px;font-weight:800;color:#f0f0f0;letter-spacing:-0.5px;">
                i<span style="color:#2563eb;">Cube</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px;">
                Verification Code
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:#ccc;line-height:1.5;">
                Use the code below to complete your sign-in to iCube.
              </p>

              <!-- OTP box -->
              <div style="background:#0a0a0a;border:1px solid #1e3a8a;border-radius:10px;
                          padding:28px 0;text-align:center;margin-bottom:32px;">
                <span style="font-size:48px;font-weight:800;color:#2563eb;
                             letter-spacing:12px;font-family:'Courier New',monospace;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#666;text-align:center;">
                This code expires in <strong style="color:#aaa;">10 minutes</strong>.
              </p>
              <p style="margin:0;font-size:13px;color:#555;text-align:center;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e1e1e;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444;">
                iCube ISP Platform &mdash; Built for Uganda
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"iCube" <${process.env.EMAIL_FROM}>`,
    to:      toEmail,
    subject: 'Your iCube verification code',
    html,
  });
}

module.exports = { verifySmtp, sendOTPEmail };
