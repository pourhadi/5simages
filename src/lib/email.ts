export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const { EMAIL_WEBHOOK_URL, EMAIL_WEBHOOK_KEY } = process.env;
  if (!EMAIL_WEBHOOK_URL) {
    console.warn('Email service not configured. Skipping email.');
    return;
  }
  try {
    await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EMAIL_WEBHOOK_KEY ? { Authorization: `Bearer ${EMAIL_WEBHOOK_KEY}` } : {}),
      },
      body: JSON.stringify({ to, subject, text, html }),
    });
  } catch (err) {
    console.error('EMAIL_SEND_ERROR', err);
  }
}
