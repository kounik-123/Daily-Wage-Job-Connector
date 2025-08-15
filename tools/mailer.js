import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
});

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Mailer] SMTP not configured. Skipping email to:', to, subject);
    }
    return;
  }
  const from = process.env.MAIL_FROM || 'no-reply@dwjc.local';
  await transport.sendMail({ from, to, subject, text, html });
}
