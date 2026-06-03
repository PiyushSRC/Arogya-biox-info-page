import type { VercelRequest, VercelResponse } from '@vercel/node';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 254;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: VercelRequest): string {
  // Vercel sets x-real-ip to the trustworthy client IP. The leftmost
  // x-forwarded-for value is client-supplied and spoofable, so prefer x-real-ip.
  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  const xff = request.headers['x-forwarded-for'];
  const list = Array.isArray(xff) ? xff : (typeof xff === 'string' ? xff.split(',') : []);
  const last = list[list.length - 1]?.trim();
  return last || request.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(request: VercelRequest): boolean {
  const ip = getClientIp(request);
  const now = Date.now();

  // Bound the map so a flood of distinct IPs can't grow it without limit.
  if (rateLimitMap.size > 10_000) {
    for (const [key, value] of rateLimitMap) {
      if (value.resetAt < now) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  entry.count++;
  return entry.count <= 5;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return response.status(500).json({ error: 'Server configuration error' });
    }

    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(request)) {
      return response.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const body = request.body;

    if (!body || typeof body !== 'object') {
      return response.status(400).json({ error: 'Invalid request body' });
    }

    const { name, email, phone, message } = body;

    if (!name || !email || !phone || !message) {
      return response.status(400).json({ error: 'Missing required fields' });
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof phone !== 'string' ||
      typeof message !== 'string'
    ) {
      return response.status(400).json({ error: 'Invalid field types' });
    }

    if (!validateEmail(email)) {
      return response.status(400).json({ error: 'Invalid email format' });
    }

    if (name.length > 200 || phone.length > 15 || message.length > 5000) {
      return response.status(400).json({ error: 'Field length exceeds limit' });
    }

    const EMAIL_TO = process.env.EMAIL_TO || 'contact@arogyabiox.com';
    const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const escaped = {
      name: escapeHtml(name),
      email: escapeHtml(email),
      phone: escapeHtml(phone),
      message: escapeHtml(message),
    };

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      replyTo: email,
      subject: `New Inquiry from ${escaped.name}`,
      html: `
        <div>
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escaped.name}</p>
          <p><strong>Email:</strong> ${escaped.email}</p>
          <p><strong>Phone:</strong> ${escaped.phone}</p>
          <p><strong>Message:</strong></p>
          <p>${escaped.message}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return response.status(500).json({ error: 'Failed to send email. Please try again.' });
    }

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
