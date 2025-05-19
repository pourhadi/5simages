import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('Email transport not configured. Skipping email.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string; }) {
  const transport = getTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('EMAIL_SEND_ERROR', err);
  }
}
