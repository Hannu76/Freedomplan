import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@vercel/kv';

const app = express();
app.use(cors());
app.use(express.json());

const localOtpStore = new Map();

function getKVClient() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return createClient({ url, token });
  }
  return null;
}

async function storeOtp(email, otp, expiresInMs) {
  const kv = getKVClient();
  if (kv) {
    await kv.set(`otp:${email}`, otp, { px: expiresInMs });
  } else {
    localOtpStore.set(email, { otp, expiresAt: Date.now() + expiresInMs });
  }
}

async function getStoredOtp(email) {
  const kv = getKVClient();
  if (kv) {
    return await kv.get(`otp:${email}`);
  } else {
    const data = localOtpStore.get(email);
    if (data && Date.now() <= data.expiresAt) return data.otp;
    if (data) localOtpStore.delete(email);
    return null;
  }
}

async function deleteOtp(email) {
  const kv = getKVClient();
  if (kv) {
    await kv.del(`otp:${email}`);
  } else {
    localOtpStore.delete(email);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otp = crypto.randomInt(100000, 999999).toString();
    
    await storeOtp(normalizedEmail, otp, 5 * 60 * 1000);

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: 'Your Login Security Code',
        text: `Your login code is: ${otp}. It will expire in 5 minutes.`,
        html: `<h2>Your OTP is: ${otp}</h2>`,
      });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const storedOtp = await getStoredOtp(normalizedEmail);

  if (!storedOtp) {
    return res.status(400).json({ error: 'No active OTP found or it has expired.' });
  }

  if (String(storedOtp) !== String(otp)) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  await deleteOtp(normalizedEmail);
  res.json({ message: 'Verified successfully' });
});

export default app;

