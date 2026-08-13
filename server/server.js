require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Razorpay Instance ────────────────────────────────────────────────────────
// Using raw fetch for API requests to avoid Razorpay SDK bugs.

// ─── In-memory OTP Store ──────────────────────────────────────────────────────
// Key: email (lowercase), Value: { otp: string, expiresAt: number }
const otpStore = new Map();

// ─── Persistent paid emails (prevents duplicate payment processing) ─────────────
const DB_FILE = path.join(__dirname, 'paidEmails.json');
let paidEmails = new Set();
if (fs.existsSync(DB_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    paidEmails = new Set(data);
  } catch (err) {
    console.error('Error reading paidEmails.json:', err);
  }
}

function savePaidEmail(email) {
  paidEmails.add(email);
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify([...paidEmails], null, 2));
  } catch (err) {
    console.error('Error saving paidEmails.json:', err);
  }
}

// ─── NodeMailer ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// =============================================================================
// PAYMENT ROUTES
// =============================================================================

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order and returns the order_id to the frontend.
 * The frontend uses the order_id to initialise the Razorpay checkout.
 */
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { email, amount = 49900 } = req.body; // amount in paise (₹499 default)

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const options = {
      amount: Number(amount),          // in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        email: email.toLowerCase().trim(),
        product: 'FreedomPlan Premium',
      },
    };

    // Use raw fetch instead of the Razorpay SDK to avoid its 'undefined status' parse bug on 429s/network errors
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'),
      },
      body: JSON.stringify(options)
    });

    const order = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error('[RAZORPAY API ERROR]', order);
      return res.status(rzpRes.status).json({ error: order?.error?.description || 'Failed to create payment order.' });
    }

    console.log(`[ORDER CREATED] ID: ${order.id} | Email: ${email} | Amount: $${amount / 100}`);

    res.json({
      order_id: order.id,
      currency: order.currency,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[CREATE ORDER ERROR]', err);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

/**
 * POST /api/payment/verify
 * Verifies the Razorpay payment signature using HMAC-SHA256.
 * On success, issues a JWT token that the frontend stores to persist premium access.
 */
app.post('/api/payment/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !email) {
      return res.status(400).json({ error: 'Missing required payment fields.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Duplicate payment guard ──────────────────────────────────────────────
    if (paidEmails.has(normalizedEmail)) {
      console.log(`[DUPLICATE PAYMENT] Email: ${normalizedEmail} — already processed`);
      // Still issue the token so the user gets their premium access
      const token = jwt.sign(
        { email: normalizedEmail, tier: 'pro', payment_id: razorpay_payment_id },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }
      );
      return res.json({ verified: true, token, message: 'Payment already verified.' });
    }

    // ── Signature verification ───────────────────────────────────────────────
    // Razorpay signs: `${order_id}|${payment_id}` with the Key Secret
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`[SIGNATURE MISMATCH] Email: ${normalizedEmail}`);
      return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    // ── Mark as paid ─────────────────────────────────────────────────────────
    savePaidEmail(normalizedEmail);

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const token = jwt.sign(
      {
        email: normalizedEmail,
        tier: 'pro',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        verified_at: new Date().toISOString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    console.log(`[PAYMENT VERIFIED] Email: ${normalizedEmail} | Payment: ${razorpay_payment_id}`);

    // ── Send confirmation email ───────────────────────────────────────────────
    if (process.env.SMTP_USER) {
      transporter.sendMail({
        from: '"FreedomPlan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: '🎉 Welcome to FreedomPlan Premium!',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;">
            <h2 style="color:#161C2D;margin:0 0 16px">Welcome to FreedomPlan Premium 🎉</h2>
            <p style="color:#667085;">Your payment was successful and your premium access is now active.</p>
            <div style="background:#161C2D;border-radius:12px;padding:16px 20px;margin:24px 0;">
              <p style="color:#B6F36A;font-weight:700;margin:0;">Payment ID: <span style="color:#fff;">${razorpay_payment_id}</span></p>
            </div>
            <p style="color:#667085;font-size:13px;">Visit <a href="https://freedomplan.vercel.app" style="color:#4A7BFF;">freedomplan.vercel.app</a> to access all premium features.</p>
            <p style="color:#667085;font-size:12px;margin-top:24px;">© ${new Date().getFullYear()} FreedomPlan. All rights reserved.</p>
          </div>
        `,
      }).catch(err => console.error('[EMAIL ERROR]', err));
    }

    res.json({ verified: true, token });
  } catch (err) {
    console.error('[VERIFY ERROR]', err);
    res.status(500).json({ error: 'Internal server error during payment verification.' });
  }
});

// =============================================================================
// AUTH ROUTES & USER STATUS
// =============================================================================

app.get('/api/auth/me', (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const isPremium = paidEmails.has(normalizedEmail);

  res.json({
    email: normalizedEmail,
    isPremium,
  });
});

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otp = crypto.randomInt(100000, 999999).toString();

    otpStore.set(normalizedEmail, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`[OTP GENERATED] Email: ${normalizedEmail} | OTP: ${otp}`);

    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: 'Your Login Security Code',
        text: `Your login code is: ${otp}. It will expire in 5 minutes.`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FBFD; margin: 0; padding: 40px 20px; color: #161C2D;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #EEF2F7;">
              <tr>
                <td align="center" style="padding: 32px 20px 20px;">
                  <h2 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #161C2D;">Freedom Plan</h2>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 32px;">
                  <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 800; text-align: center;">Secure Login Verification</h3>
                  <p style="margin: 0 0 24px; font-size: 14px; color: #667085; line-height: 1.6;">Use the One-Time Password below to continue.</p>
                  <div style="background-color: #161C2D; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <h1 style="margin: 0 0 8px; font-size: 42px; font-weight: 900; letter-spacing: 6px; color: #B6F36A;">${otp}</h1>
                    <p style="margin: 0; font-size: 12px; color: #8d8d8d; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Valid for 5 minutes.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #161C2D; padding: 32px 24px; text-align: center;">
                  <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 900; color: #ffffff;">Freedom Plan</h2>
                  <p style="margin: 0; font-size: 12px; color: #8d8d8d;">© ${new Date().getFullYear()} Freedom Plan. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const storedData = otpStore.get(normalizedEmail);

  if (!storedData) {
    return res.status(400).json({ error: 'No active OTP found for this email. Please request a new one.' });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (storedData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  otpStore.delete(normalizedEmail);
  res.json({ message: 'Verified successfully' });
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

// =============================================================================
// START SERVER
// =============================================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[FreedomPlan Server] Running on port ${PORT}`);
  console.log(`[Razorpay] Key ID: ${process.env.RAZORPAY_KEY_ID ? '✅ Set' : '❌ NOT SET — add to server/.env'}`);
  console.log(`[Razorpay] Key Secret: ${process.env.RAZORPAY_KEY_SECRET ? '✅ Set' : '❌ NOT SET — add to server/.env'}`);
  console.log(`[JWT]      Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET — add to server/.env'}`);
});
