import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@vercel/kv';
import emailRenderer from '../server/otpEmail/emailRenderer.js';
const { selectTheme, renderTemplate } = emailRenderer;
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const marketingRoutes = require('../server/marketing/routes.js');
const { renderPaymentLinkEmail, renderPaymentLinkPlainText, DEFAULT_PAYMENT_LINK } = require('../server/paymentEmail/paymentEmailRenderer.js');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Marketing Module ────────────────────────────────────────────────────────
app.use('/api/marketing', marketingRoutes);

// Fallback in-memory store for local testing
const localOtpStore = new Map();

// Helper functions to manage OTP state automatically switching between KV and Map
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
    // Vercel KV / Upstash Redis
    await kv.set(`otp:${email}`, otp, { px: expiresInMs });
  } else {
    // Local memory fallback
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
    if (data) localOtpStore.delete(email); // Clean up expired
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

// Configure NodeMailer (If no credentials, it will just log to console)
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

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with 5-minute expiration
    await storeOtp(normalizedEmail, otp, 5 * 60 * 1000);

    console.log(`[OTP GENERATED] Email: ${normalizedEmail} | OTP: ${otp} (Using ${getKVClient() ? 'Vercel KV/Upstash' : 'Local Memory'})`);

    // If SMTP credentials are provided, send an actual email
    if (process.env.SMTP_USER) {
      // Build dynamic request metadata in IST
      const now = new Date();
      const requestDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });
      const requestTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
      const currentYear = now.getFullYear();
      const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

      // ── Accent theme selection (True RGB Randomization) ──────────────
      const selectedTheme = selectTheme(normalizedEmail);

      const emailHtml = renderTemplate({
        otp,
        user: normalizedEmail,
        requestTime: `${requestDate} ${requestTime} IST`,
        device: 'Web Browser',
        theme: selectedTheme,
        appUrl
      });
      // ────────────────────────────────────────────────────────────────

      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: 'Your FreedomPlan Security Code',
        text: `Your login code is: ${otp}. It will expire in 5 minutes. Never share this code with anyone.`,
        html: emailHtml
      });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
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
    return res.status(400).json({ error: 'No active OTP found or it has expired. Please request a new one.' });
  }

  if (String(storedOtp) !== String(otp)) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // OTP verified successfully, remove it from store
  await deleteOtp(normalizedEmail);

  res.json({ message: 'Verified successfully' });
});

// ─── Persistent paid emails & requests store helper ─────────────────────────
const localPaidEmails = new Set();
const localRequests = [];

async function isEmailPaid(email) {
  const kv = getKVClient();
  if (kv) {
    const res = await kv.get(`paid:${email}`);
    return Boolean(res);
  }
  return localPaidEmails.has(email);
}

async function markEmailPaid(email) {
  const kv = getKVClient();
  if (kv) {
    await kv.set(`paid:${email}`, 'true');
  }
  localPaidEmails.add(email);
}

async function removeEmailPaid(email) {
  const kv = getKVClient();
  if (kv) {
    await kv.del(`paid:${email}`);
  }
  localPaidEmails.delete(email);
}

const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec';

async function syncToGoogleSheet(data) {
  try {
    if (!GOOGLE_SHEETS_WEBHOOK_URL) return;
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('[GOOGLE SHEETS SYNC NOTE]', err.message);
  }
}

app.get('/api/auth/me', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const isPremium = await isEmailPaid(normalizedEmail);

  res.json({
    email: normalizedEmail,
    isPremium,
    tier: isPremium ? 'pro' : 'basic',
  });
});

async function handlePaymentLinkRequest(req, res) {
  try {
    const { name, email, phone, plan = 'FreedomPlan Premium', amount = 499, userId = null } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanName = (name || 'Valued Customer').trim();
    const cleanPhone = (phone || '').trim();
    const now = new Date().toISOString();
    const paymentLink = process.env.RAZORPAY_PAYMENT_LINK || DEFAULT_PAYMENT_LINK;
    const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL || 'https://freedomplan.com');

    const requestData = {
      name: cleanName,
      email: normalizedEmail,
      phone: cleanPhone,
      plan,
      amount: Number(amount) || 499,
      status: 'payment_link_sent',
      userId: userId || null,
      createdAt: now,
    };

    localRequests.unshift(requestData);
    const kv = getKVClient();
    if (kv) {
      await kv.set(`req:${normalizedEmail}`, JSON.stringify(requestData));
    }

    console.log(`[PAYMENT LINK REQUEST] ${cleanName} (${normalizedEmail}) - Sending automatic email...`);

    const customerHtml = renderPaymentLinkEmail({
      name: cleanName,
      email: normalizedEmail,
      amount: Number(amount) || 499,
      plan,
      paymentLink,
      appUrl,
      useCid: false,
    });

    const customerText = renderPaymentLinkPlainText({
      name: cleanName,
      email: normalizedEmail,
      amount: Number(amount) || 499,
      plan,
      paymentLink,
    });

    let emailSent = false;

    // Send automatic email to customer if SMTP configured
    if (process.env.SMTP_USER || process.env.MARKETING_SMTP_USER) {
      try {
        await transporter.sendMail({
          from: process.env.MARKETING_FROM_EMAIL || '"FreedomPlan" <FreedomPlan786@gmail.com>',
          to: normalizedEmail,
          replyTo: 'FreedomPlan786@gmail.com',
          subject: 'FreedomPlan Premium — Your Payment Link',
          text: customerText,
          html: customerHtml,
        });
        emailSent = true;
        console.log(`[PAYMENT EMAIL SENT] Successfully sent payment email to ${normalizedEmail}`);
      } catch (mailErr) {
        console.error(`[PAYMENT EMAIL ERROR] Failed to send email to ${normalizedEmail}:`, mailErr.message);
      }

      // Send email alert to admin/owner
      const adminEmail = process.env.ADMIN_EMAIL || process.env.MARKETING_SMTP_USER || process.env.SMTP_USER;
      if (adminEmail) {
        try {
          await transporter.sendMail({
            from: process.env.MARKETING_FROM_EMAIL || '"FreedomPlan" <FreedomPlan786@gmail.com>',
            to: adminEmail,
            subject: `🔔 New FreedomPlan Premium Request: ${cleanName} (${normalizedEmail})`,
            text: `New Premium Payment Request:\n\nName: ${cleanName}\nEmail: ${normalizedEmail}\nPhone: ${cleanPhone}\nPlan: ${plan}\nPrice: ₹${amount}\nPayment Link: ${paymentLink}\nEmail Sent: ${emailSent ? 'Yes' : 'No'}\nDate: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
            html: `
              <div style="font-family:sans-serif;max-width:540px;margin:auto;padding:28px;background:#ffffff;border-radius:14px;border:1px solid #E5E7EB;">
                <h2 style="color:#111827;margin-top:0;">New Premium Payment Request ⚡</h2>
                <p style="color:#4B5563;font-size:14px;line-height:1.5;">A customer has requested the official payment link for <strong>FreedomPlan Premium</strong>.</p>
                <div style="background:#F9FAFB;border-radius:10px;padding:16px 20px;margin:20px 0;border:1px solid #E5E7EB;font-size:14px;line-height:1.8;">
                  <div><strong>Name:</strong> ${cleanName}</div>
                  <div><strong>Email:</strong> <a href="mailto:${normalizedEmail}" style="color:#2563EB;">${normalizedEmail}</a></div>
                  <div><strong>Phone:</strong> ${cleanPhone || 'Not provided'}</div>
                  <div><strong>Plan:</strong> ${plan}</div>
                  <div><strong>Amount:</strong> ₹${amount}</div>
                  <div><strong>Payment Link Sent:</strong> ${emailSent ? '✅ Yes' : '❌ Failed'}</div>
                  <div><strong>Date:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                </div>
              </div>
            `,
          });
        } catch (adminMailErr) {
          console.warn('[ADMIN NOTIFICATION WARNING]', adminMailErr.message);
        }
      }
    }

    // Secure backend sync to Google Sheets
    syncToGoogleSheet({
      'Name': cleanName,
      'Email': normalizedEmail,
      'Phone': cleanPhone,
      'Plan': plan,
      'Amount': amount,
      'Payment Status': 'Payment Link Sent',
      'Premium Status': 'Pending',
      'Requested At': now,
      'Approved At': '',
    });

    res.json({
      success: true,
      message: 'Payment link sent successfully',
      email: normalizedEmail,
      emailSent,
      data: requestData,
    });
  } catch (err) {
    console.error('[REQUEST LINK ERROR]', err);
    res.status(500).json({ error: 'Failed to submit payment request. Please try again.' });
  }
}

app.post('/api/request-payment-link', handlePaymentLinkRequest);
app.post('/api/payment/request-link', handlePaymentLinkRequest);

app.post('/api/admin/approve-premium', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    await markEmailPaid(normalizedEmail);

    const now = new Date().toISOString();

    syncToGoogleSheet({
      'Name': 'Customer',
      'Email': normalizedEmail,
      'Plan': 'FreedomPlan Premium',
      'Amount': 499,
      'Payment Status': 'Verified',
      'Premium Status': 'Active',
      'Requested At': now,
      'Approved At': now,
    });

    res.json({
      success: true,
      email: normalizedEmail,
      isPremium: true,
      message: `Premium activated for ${normalizedEmail}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve premium.' });
  }
});

app.post('/api/admin/revoke-premium', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    await removeEmailPaid(normalizedEmail);

    res.json({
      success: true,
      email: normalizedEmail,
      isPremium: false,
      message: `Premium revoked for ${normalizedEmail}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke premium.' });
  }
});

app.post('/api/auth/register-notify', async (req, res) => {
  const data = req.body;

  console.log('[NEW REGISTRATION NOTIFICATION]', data);

  try {
    if (process.env.SMTP_USER) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: adminEmail,
        subject: 'New Freedom Plan Registration',
        text: `A new user has registered:\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nTier: ${data.tier}\nTime: ${data.timestamp}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>New Customer Registration</h2>
            <ul>
              <li><strong>Name:</strong> ${data.name}</li>
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Phone:</strong> ${data.phone}</li>
              <li><strong>Tier:</strong> ${data.tier}</li>
              <li><strong>Time:</strong> ${data.timestamp}</li>
            </ul>
            <p>This user has been saved to your Google Sheets.</p>
          </div>
        `,
      });
    }
    res.json({ message: 'Notification sent' });
  } catch (err) {
    console.error('Error sending registration notification:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Export the Express API for Vercel Serverless
export default app;

// Start server locally if not running in Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Auth API Server running locally on port ${PORT}`);
  });
}
