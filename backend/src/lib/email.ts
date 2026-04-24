import nodemailer from 'nodemailer';

const DEFAULT_SMTP_PORT = 587;
const DEFAULT_FROM_EMAIL = 'noreply@civicreport.local';

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getSmtpPort(): number {
  const configured = process.env.SMTP_PORT;

  if (!configured) {
    return DEFAULT_SMTP_PORT;
  }

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('SMTP_PORT must be a positive integer');
  }

  return parsed;
}

function getFromAddress(): string {
  const fromEmail = readEnv('MAIL_FROM') ?? DEFAULT_FROM_EMAIL;
  const fromName = readEnv('MAIL_FROM_NAME');

  if (!fromName) {
    return fromEmail;
  }

  // Escape quotes to keep a valid RFC5322 display-name.
  const safeName = fromName.replace(/"/g, '\\"');
  return `"${safeName}" <${fromEmail}>`;
}

function getSmtpConfig() {
  const host = readEnv('SMTP_HOST');
  const user = readEnv('SMTP_USER');
  const pass = readEnv('SMTP_PASS');

  if (!host || !user || !pass) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
  }

  const port = getSmtpPort();
  const secure = readEnv('SMTP_SECURE') === 'true' || port === 465;

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(readEnv('SMTP_HOST') && readEnv('SMTP_USER') && readEnv('SMTP_PASS'));
}

export async function sendPasswordResetEmail(input: {
  toEmail: string;
  toName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    console.log(`[forgot-password][local-reset-link] ${input.toEmail} -> ${input.resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport(getSmtpConfig());

  const greetingName = input.toName?.trim() || 'there';
  const subject = 'Reset your CivicReport password';
  const text = [
    `Hi ${greetingName},`,
    '',
    'We received a request to reset your CivicReport password.',
    `Use this link within ${input.expiresInMinutes} minutes:`,
    input.resetUrl,
    '',
    "If you didn't request this, you can ignore this email.",
  ].join('\n');

  const html = `
    <p>Hi ${greetingName},</p>
    <p>We received a request to reset your CivicReport password.</p>
    <p>Use this link within ${input.expiresInMinutes} minutes:</p>
    <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to: input.toEmail,
    subject,
    text,
    html,
  });
}