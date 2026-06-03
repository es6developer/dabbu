import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || process.env.SMTP_EMAIL || '',
  password: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
  fromName: process.env.EMAIL_FROM_NAME || 'Dabbu',
  fromEmail: process.env.EMAIL_FROM || process.env.SMTP_EMAIL || process.env.SMTP_USER || '',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, ''),
}));
