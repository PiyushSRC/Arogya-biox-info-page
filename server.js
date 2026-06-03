
import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3001',
    'https://arogyabiox.com',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json({ limit: '100kb' }));

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_TO = process.env.EMAIL_TO || 'contact@arogyabiox.com';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function validateEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 254;
}

function validateLength(str, max = 1000) {
    return typeof str === 'string' && str.length > 0 && str.length <= max;
}

// Simple in-memory rate limiter
const rateLimitMap = new Map();
function rateLimit(ip, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now - entry.start > windowMs) {
        rateLimitMap.set(ip, { start: now, count: 1 });
        return true;
    }
    entry.count++;
    return entry.count <= maxRequests;
}

app.post('/api/send-email', async (req, res) => {
    if (!rateLimit(req.ip)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validateLength(name, 200) || !validateLength(phone, 15) || !validateLength(message, 5000)) {
        return res.status(400).json({ error: 'Field length exceeds limit' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: EMAIL_TO,
            replyTo: email,
            subject: `New Inquiry from ${escapeHtml(name)}`,
            html: `
        <div>
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message)}</p>
        </div>
      `,
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(500).json({ error: 'Failed to send email. Please try again.' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/request-demo', async (req, res) => {
    if (!rateLimit(req.ip)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { fullName, email, labName, address, city, contact, selectedSlot } = req.body;

    if (!fullName || !email || !labName || !address || !city || !contact || !selectedSlot) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validateLength(fullName, 200) || !validateLength(labName, 300) || !validateLength(address, 500) || !validateLength(city, 100) || !validateLength(contact, 15) || !validateLength(selectedSlot, 50)) {
        return res.status(400).json({ error: 'Field length exceeds limit' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: EMAIL_TO,
            replyTo: email,
            subject: `New Demo Request from ${escapeHtml(fullName)}`,
            html: `
        <div>
          <h2>New Demo Request</h2>
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>HOSPITAL/Laboratory Name:</strong> ${escapeHtml(labName)}</p>
          <p><strong>Address:</strong> ${escapeHtml(address)}</p>
          <p><strong>City:</strong> ${escapeHtml(city)}</p>
          <p><strong>Contact:</strong> ${escapeHtml(contact)}</p>
          <p><strong>Requested Time Slot:</strong> ${escapeHtml(selectedSlot)}</p>
        </div>
      `,
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(500).json({ error: 'Failed to send email. Please try again.' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Local API server running at http://localhost:${port}`);
});
