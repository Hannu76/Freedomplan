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
const { queueWhatsAppInvitation, getLogs: getWhatsAppLogs } = require('../server/services/whatsappService.js');

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

// ─── High-Performance NodeMailer Connection Pool ──────────────────────────────
let cachedApiTransporter = null;

function getApiTransporter() {
  if (!cachedApiTransporter) {
    const user = process.env.SMTP_USER || process.env.MARKETING_SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.MARKETING_SMTP_PASS;
    const host = process.env.SMTP_HOST || process.env.MARKETING_SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || process.env.MARKETING_SMTP_PORT || 587);

    if (user && pass) {
      const cleanPass = String(pass).replace(/\s+/g, '');
      const isGmail = (host || '').includes('gmail') || user.includes('@gmail.com');

      if (isGmail) {
        cachedApiTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          keepAlive: true,
          connectionTimeout: 8000,
          greetingTimeout: 5000,
          socketTimeout: 15000,
          auth: { user: user.trim(), pass: cleanPass },
        });
      } else {
        cachedApiTransporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          keepAlive: true,
          connectionTimeout: 8000,
          greetingTimeout: 5000,
          socketTimeout: 15000,
          auth: { user: user.trim(), pass: cleanPass },
        });
      }
    } else {
      cachedApiTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: '', pass: '' },
      });
    }
  }
  return cachedApiTransporter;
}

const transporter = {
  sendMail: (options) => {
    const t = getApiTransporter();
    return t ? t.sendMail(options) : Promise.reject(new Error('No email transporter available'));
  }
};

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

    // If SMTP credentials are provided, send an actual email in background
    if (process.env.SMTP_USER || process.env.MARKETING_SMTP_USER) {
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

      const fromAddress = (process.env.SMTP_USER || process.env.MARKETING_SMTP_USER)
        ? `"Freedom Plan" <${(process.env.SMTP_USER || process.env.MARKETING_SMTP_USER).trim()}>`
        : '"Freedom Plan" <FreedomPlan786@gmail.com>';

      try {
        await Promise.race([
          transporter.sendMail({
            from: fromAddress,
            to: normalizedEmail,
            subject: 'Your FreedomPlan Security Code',
            text: `Your login code is: ${otp}. It will expire in 15 minutes.`,
            html: emailHtml,
            priority: 'high',
            headers: {
              'X-Priority': '1 (Highest)',
              'X-MSMail-Priority': 'High',
              'Importance': 'High',
              'Auto-Submitted': 'auto-generated'
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP dispatch timeout (async continuing)')), 4000))
        ]).then(info => {
          console.log(`[OTP EMAIL DELIVERED] Dispatched to ${normalizedEmail} (ID: ${info?.messageId || 'ok'})`);
        });
      } catch (mailErr) {
        console.warn('[OTP EMAIL DISPATCH NOTE]', mailErr.message);
      }
    }

    res.json({ message: 'OTP sent successfully', email: normalizedEmail });
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
  const cleanEnteredOtp = String(otp).replace(/\D/g, '').trim();
  const storedOtp = await getStoredOtp(normalizedEmail);

  if (!storedOtp) {
    return res.status(400).json({ error: 'No active OTP found or it has expired. Please request a new one.' });
  }

  if (String(storedOtp).trim() !== cleanEnteredOtp) {
    return res.status(400).json({ error: 'Invalid OTP. Please check your email.' });
  }

  // OTP verified successfully, remove it from store
  await deleteOtp(normalizedEmail);

  const existing = await lookupCustomer(normalizedEmail);
  const isPaid = (await isEmailPaid(normalizedEmail)) || existing?.isPremium;
  const isPro = !!(isPaid || existing?.tier === 'pro');
  const plan = isPro ? 'premium' : 'free';

  const customer = existing ? {
    ...existing,
    tier: isPro ? 'pro' : 'basic',
    isPremium: isPro,
    plan,
  } : {
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0],
    tier: isPro ? 'pro' : 'basic',
    isPremium: isPro,
    plan,
  };

  console.log(`[CUSTOMER LOGIN VERIFIED] Email: ${normalizedEmail} | Plan: ${plan}`);

  res.json({
    success: true,
    message: 'Verified successfully',
    email: normalizedEmail,
    plan,
    isPremium: isPro,
    customer,
  });
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

// ─── Google Sheet Existing Customers Seed Map ──────────────────────────────
const GOOGLE_SHEET_EXISTING_CUSTOMERS = new Map([
  ['naveedmd78600@gmail.com', { name: 'Naveed', phone: '', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['hannu786464@gmail.com', { name: 'Hannu', phone: '', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['jashujaswanth050@gmail.com', { name: 'Jashu Jaswanth', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['hannu464@gmail.com', { name: 'Hannu 464', phone: '', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['renuka.yam.b19@gmail.com', { name: 'Renuka', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['anasurrahmansheik@gmail.com', { name: 'Anasur Rahman Sheik', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['pallapua954@gmail.com', { name: 'Pallapu', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['harshadpashask@gmail.com', { name: 'Harshad Pasha', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['nagireddy7678@gmail.com', { name: 'Nagireddy', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['naveedmd00@gmail.com', { name: 'Naveed MD', phone: '', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['hannu4@outlook.com', { name: 'Hannu Outlook', phone: '', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['bindu@leoglobaloverseas.co', { name: 'Bindu Dasari', phone: '918341644532', loanAmount: 3500000, isOutsideUK: true, tier: 'basic' }],
  ['jakeerhussian7@gmail.com', { name: 'jakeer', phone: '917093797051', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['jakeerhussian76@gmail.com', { name: 'jakeer hussina', phone: '447993144249', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
]);

const localCustomers = new Map();

async function lookupCustomer(email) {
  if (!email) return null;
  const clean = email.toLowerCase().trim();
  const isPaid = await isEmailPaid(clean);

  if (GOOGLE_SHEET_EXISTING_CUSTOMERS.has(clean)) {
    const seed = GOOGLE_SHEET_EXISTING_CUSTOMERS.get(clean);
    return {
      email: clean,
      name: seed.name,
      phone: seed.phone,
      loanAmount: seed.loanAmount,
      isOutsideUK: seed.isOutsideUK,
      tier: isPaid ? 'pro' : seed.tier || 'basic',
      isPremium: isPaid,
    };
  }

  const kv = getKVClient();
  if (kv) {
    try {
      const cust = await kv.get(`cust:${clean}`);
      if (cust) {
        const parsed = typeof cust === 'string' ? JSON.parse(cust) : cust;
        return {
          ...parsed,
          tier: isPaid ? 'pro' : (parsed.tier || 'basic'),
          isPremium: isPaid,
        };
      }
    } catch (_) {}
  }

  if (localCustomers.has(clean)) {
    const parsed = localCustomers.get(clean);
    return {
      ...parsed,
      tier: isPaid ? 'pro' : (parsed.tier || 'basic'),
      isPremium: isPaid,
    };
  }

  return null;
}

async function saveCustomer(cust) {
  const clean = cust.email.toLowerCase().trim();
  localCustomers.set(clean, cust);
  const kv = getKVClient();
  if (kv) {
    try {
      await kv.set(`cust:${clean}`, JSON.stringify(cust));
    } catch (_) {}
  }
}

app.get('/api/auth/me', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const customer = await lookupCustomer(normalizedEmail);
  const isPremium = (await isEmailPaid(normalizedEmail)) || customer?.isPremium;

  res.json({
    email: normalizedEmail,
    isPremium,
    customer,
    tier: isPremium ? 'pro' : 'basic',
  });
});

app.post('/api/auth/check-customer', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await lookupCustomer(normalizedEmail);

    if (existing) {
      const isPro = !!(existing.isPremium || existing.tier === 'pro' || (await isEmailPaid(normalizedEmail)));
      const plan = isPro ? 'premium' : 'free';

      const otp = crypto.randomInt(100000, 999999).toString();
      await storeOtp(normalizedEmail, otp, 10 * 60 * 1000);

      console.log(`[EXISTING CUSTOMER RECOGNIZED] Email: ${normalizedEmail} | Name: ${existing.name || 'User'} | Plan: ${plan} | Generated OTP: ${otp}`);

      if (process.env.SMTP_USER) {
        try {
          const selectedTheme = selectTheme(normalizedEmail);
          const emailHtml = renderTemplate({
            otp,
            user: normalizedEmail,
            requestTime: new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            }),
            device: 'Web Browser',
            theme: selectedTheme
          });

          const fromAddress = (process.env.SMTP_USER || process.env.MARKETING_SMTP_USER)
            ? `"Freedom Plan" <${(process.env.SMTP_USER || process.env.MARKETING_SMTP_USER).trim()}>`
            : '"Freedom Plan" <FreedomPlan786@gmail.com>';

          try {
            await Promise.race([
              transporter.sendMail({
                from: fromAddress,
                to: normalizedEmail,
                subject: 'Your Login Security Code',
                text: `Your FreedomPlan login verification code is: ${otp}. It will expire in 10 minutes.`,
                html: emailHtml,
                priority: 'high',
                headers: {
                  'X-Priority': '1 (Highest)',
                  'X-MSMail-Priority': 'High',
                  'Importance': 'High',
                  'Auto-Submitted': 'auto-generated'
                }
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP dispatch timeout (async continuing)')), 4000))
            ]).then(info => {
              console.log(`[EXISTING CUSTOMER OTP EMAIL DELIVERED] Dispatched to ${normalizedEmail} (ID: ${info?.messageId || 'ok'})`);
            });
          } catch (mailErr) {
            console.warn('[OTP EMAIL DISPATCH NOTE]', mailErr.message);
          }
        } catch (templateErr) {
          console.warn('[OTP EMAIL TEMPLATE WARNING]', templateErr.message);
        }
      }

      return res.json({
        exists: true,
        plan,
        isPremium: isPro,
        message: 'Existing customer found. Login security code sent.',
        customer: {
          email: normalizedEmail,
          name: existing.name || normalizedEmail.split('@')[0],
          phone: existing.phone || '',
          loanAmount: existing.loanAmount || 0,
          isOutsideUK: existing.isOutsideUK ?? null,
          tier: isPro ? 'pro' : 'basic',
          isPremium: isPro,
          plan,
        },
        otpSent: true,
      });
    }

    console.log(`[NEW CUSTOMER DETECTED] Email: ${normalizedEmail}`);
    return res.json({
      exists: false,
      plan: 'free',
      isPremium: false,
      email: normalizedEmail,
      message: 'New customer registration required.',
    });
  } catch (err) {
    console.error('[CHECK CUSTOMER ERROR]', err);
    res.status(500).json({ error: 'Failed to verify customer status' });
  }
});

const localProcessedRegistrations = new Map();

async function checkAndMarkRegistration(key, ttlMs = 5 * 60 * 1000) {
  const kv = getKVClient();
  if (kv) {
    try {
      const existing = await kv.get(`proc_reg:${key}`);
      if (existing) return true;
      await kv.set(`proc_reg:${key}`, '1', { px: ttlMs });
      return false;
    } catch (_) {}
  }
  const existing = localProcessedRegistrations.get(key);
  if (existing && Date.now() - existing < ttlMs) return true;
  localProcessedRegistrations.set(key, Date.now());
  return false;
}

app.post('/api/auth/register-customer', async (req, res) => {
  try {
    const { name, email, phone, loanAmount, isOutsideUK, whatsappUpdates, registrationId } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanName = (name || normalizedEmail.split('@')[0]).trim();
    const numLoan = Number(loanAmount) || 0;
    const isOutside = isOutsideUK ?? false;
    const isWhatsAppEnabled = whatsappUpdates !== false;
    const regId = registrationId || `reg_${normalizedEmail}_${Date.now()}`;
    const idempotencyKey = `reg_${normalizedEmail}`;

    // ── Idempotency Guard ─────────────────────────────────────────────
    // Prevent duplicate registrations within a 5-minute window
    const isDuplicate = await checkAndMarkRegistration(idempotencyKey, 5 * 60 * 1000);
    if (isDuplicate) {
      console.log(`[IDEMPOTENCY DUPLICATE PREVENTED] Registration for ${normalizedEmail} was already executed recently. Skipping duplicate Google Sheet write and email.`);
      const existing = await lookupCustomer(normalizedEmail);
      return res.json({
        success: true,
        message: 'Customer registration already processed (duplicate prevented).',
        isDuplicate: true,
        customer: existing || {
          email: normalizedEmail,
          name: cleanName,
          phone: phone || '',
          loanAmount: numLoan,
          isOutsideUK: isOutside,
          tier: 'basic',
          isPremium: false,
        },
      });
    }

    // ── Check if email is already an existing customer in DB / Seed Map ───
    const existingCust = await lookupCustomer(normalizedEmail);
    if (existingCust) {
      console.log(`[EXISTING CUSTOMER BLOCKED FROM NEW REGISTRATION] Email: ${normalizedEmail}`);
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in using your security code.',
        exists: true,
        customer: existingCust,
      });
    }

    // Validate and format phone number
    let cleanPhone = (phone || '').trim();
    if (isOutside) {
      const clean = cleanPhone.replace(/[\s\-()]/g, '');
      if (!clean.startsWith('+')) {
        return res.status(400).json({ error: 'Please enter your phone number with your country code.' });
      }
      const digits = clean.slice(1).replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        return res.status(400).json({ error: 'Please enter a valid international phone number with country code.' });
      }
      cleanPhone = `+${digits}`;
    } else {
      let clean = cleanPhone.replace(/[\s\-()]/g, '');
      if (clean.startsWith('+44')) {
        clean = clean.slice(3);
      } else if (clean.startsWith('0044')) {
        clean = clean.slice(4);
      } else if (clean.startsWith('44') && clean.length > 10) {
        clean = clean.slice(2);
      }
      if (clean.startsWith('0')) {
        clean = clean.slice(1);
      }
      const digits = clean.replace(/\D/g, '');
      cleanPhone = digits ? `+44${digits}` : '';
    }

    const customer = {
      name: cleanName,
      email: normalizedEmail,
      phone: cleanPhone,
      loanAmount: numLoan,
      isOutsideUK: isOutside,
      whatsappUpdates: isWhatsAppEnabled,
      tier: 'basic',
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCustomer(customer);

    // Sync to Google Sheets (Backend authoritative sync - exactly ONCE)
    syncToGoogleSheet({
      'Name': cleanName,
      'Email': normalizedEmail,
      'Phone': cleanPhone,
      'Loan Amount': numLoan,
      'UK Status': isOutside ? 'Outside the UK' : 'Inside the UK',
      'WhatsApp Updates': isWhatsAppEnabled ? 'Enabled' : 'Disabled',
      'Registered At': new Date().toLocaleString('en-GB'),
      'Source': 'FreedomPlan Registration',
      name: cleanName,
      email: normalizedEmail,
      phone: cleanPhone,
      mobile: cleanPhone,
      loanAmount: numLoan,
      loan_amount: numLoan,
      amount: numLoan,
      ukStatus: isOutside ? 'Outside the UK' : 'Inside the UK',
      isOutsideUK: isOutside ? 'Outside the UK' : 'Inside the UK',
      status: isOutside ? 'Outside the UK' : 'Inside the UK',
      whatsapp: isWhatsAppEnabled ? 'Enabled' : 'Disabled',
      timestamp: new Date().toISOString(),
    }).catch(sheetErr => {
      console.warn('[GOOGLE SHEETS REGISTRATION SYNC NOTE]', sheetErr.message);
    });

    // WhatsApp Invitation Queue
    if (isWhatsAppEnabled && cleanPhone) {
      queueWhatsAppInvitation({
        phone: cleanPhone,
        name: cleanName,
        email: normalizedEmail,
        loanAmount: numLoan,
        whatsappUpdatesEnabled: true,
      }).catch(err => console.error('[WHATSAPP NOTIFY ERROR]', err));
    }

    // Admin Email Notification (Sent ONCE on first registration)
    if (process.env.SMTP_USER) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'FreedomPlan786@gmail.com';
      transporter.sendMail({
        from: '"Freedom Plan" <FreedomPlan786@gmail.com>',
        to: adminEmail,
        subject: `New Freedom Plan Customer: ${cleanName} (${normalizedEmail})`,
        text: `A new user has registered:\n\nName: ${cleanName}\nEmail: ${normalizedEmail}\nPhone: ${cleanPhone}\nLoan Amount: ₹${numLoan}\nUK Status: ${isOutside ? 'Outside UK' : 'In UK'}\nDate: ${new Date().toLocaleString()}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #E2E8F0;border-radius:12px;">
            <h2 style="color:#0F172A;">New Customer Registration 🎉</h2>
            <p><strong>Name:</strong> ${cleanName}</p>
            <p><strong>Email:</strong> ${normalizedEmail}</p>
            <p><strong>Phone:</strong> ${cleanPhone}</p>
            <p><strong>Loan Amount:</strong> ₹${numLoan.toLocaleString('en-IN')}</p>
            <p><strong>UK Status:</strong> ${isOutside ? 'Outside the UK' : 'Inside the UK'}</p>
          </div>
        `,
      }).catch(err => console.warn('[ADMIN NOTIFICATION WARNING]', err.message));
    }

    console.log(`[CUSTOMER REGISTERED SUCCESSFULLY] Email: ${normalizedEmail} | Name: ${cleanName} (NO OTP REQUIRED)`);

    res.json({
      success: true,
      message: 'Registration completed successfully.',
      customer: {
        email: normalizedEmail,
        name: cleanName,
        phone: cleanPhone,
        loanAmount: numLoan,
        isOutsideUK: isOutside,
        tier: 'basic',
        isPremium: false,
      },
    });
  } catch (err) {
    console.error('[REGISTER CUSTOMER ERROR]', err);
    res.status(500).json({ error: 'Failed to register customer' });
  }
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

// ─── ADMIN PORTAL & SUBSCRIPTION MANAGEMENT ROUTES ──────────────────────────
const ADMIN_GMAIL = (process.env.FREEDOM_CRM_ADMIN_GMAIL || process.env.ADMIN_EMAIL || 'freedomplan786@gmail.com').toLowerCase().trim();
const localAdminOtpStore = new Map();

async function storeAdminOtp(email, otp, expiresInMs) {
  const kv = getKVClient();
  if (kv) {
    await kv.set(`admin_otp:${email}`, otp, { px: expiresInMs });
  } else {
    localAdminOtpStore.set(email, { otp, expiresAt: Date.now() + expiresInMs });
  }
}

async function getStoredAdminOtp(email) {
  const kv = getKVClient();
  if (kv) {
    return await kv.get(`admin_otp:${email}`);
  } else {
    const data = localAdminOtpStore.get(email);
    if (data && Date.now() <= data.expiresAt) return data.otp;
    return null;
  }
}

async function deleteAdminOtp(email) {
  const kv = getKVClient();
  if (kv) {
    await kv.del(`admin_otp:${email}`);
  } else {
    localAdminOtpStore.delete(email);
  }
}

app.post('/api/admin/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail !== ADMIN_GMAIL) {
      console.warn(`[ADMIN ACCESS DENIED] Unauthorized admin login attempt with: ${normalizedEmail}`);
      return res.status(403).json({
        error: 'Access Denied: You are not authorized as a Freedom CRM administrator.',
        isAuthorized: false,
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await storeAdminOtp(normalizedEmail, otp, 10 * 60 * 1000);

    console.log(`[ADMIN OTP GENERATED] Admin: ${normalizedEmail} | OTP: ${otp}`);

    if (process.env.SMTP_USER || process.env.MARKETING_SMTP_USER) {
      try {
        await transporter.sendMail({
          from: process.env.MARKETING_FROM_EMAIL || '"FreedomPlan Security" <FreedomPlan786@gmail.com>',
          to: normalizedEmail,
          subject: '🔒 Freedom CRM Admin Access Code',
          text: `Your Freedom CRM Admin verification code is: ${otp}. This code will expire in 10 minutes.`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px;background:#ffffff;border-radius:14px;border:1px solid #E5E7EB;">
              <h2 style="color:#0F172A;margin-top:0;">Freedom CRM Admin Security 🔐</h2>
              <p style="color:#475569;font-size:14px;">Use the verification code below to access the Premium Subscription Management console:</p>
              <div style="background:#F1F5F9;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
                <span style="font-size:32px;font-weight:900;letter-spacing:6px;color:#0F172A;font-family:monospace;">${otp}</span>
              </div>
              <p style="color:#64748B;font-size:12px;">This code expires in 10 minutes. If you did not request this, please verify your account security immediately.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('[ADMIN OTP EMAIL WARNING]', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Admin verification OTP dispatched to authorized email.',
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('[ADMIN SEND OTP ERROR]', err);
    res.status(500).json({ error: 'Failed to dispatch admin OTP.' });
  }
});

app.post('/api/admin/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail !== ADMIN_GMAIL) {
      return res.status(403).json({ error: 'Access Denied: Not an authorized admin.' });
    }

    const cleanEnteredOtp = String(otp).replace(/\D/g, '').trim();
    const storedOtp = await getStoredAdminOtp(normalizedEmail);

    if (!storedOtp) {
      return res.status(400).json({ error: 'No active OTP request found. Please click "Resend Code" to receive a new OTP.' });
    }

    if (String(storedOtp).trim() !== cleanEnteredOtp) {
      return res.status(400).json({ error: 'Invalid admin verification code. Please check your latest email.' });
    }

    await deleteAdminOtp(normalizedEmail);

    const token = 'admin_jwt_' + Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64');

    console.log(`[ADMIN LOGIN SUCCESSFUL] Authorized Admin: ${normalizedEmail}`);

    res.json({
      success: true,
      token,
      adminEmail: normalizedEmail,
      message: 'Admin authorization successful.',
    });
  } catch (err) {
    console.error('[ADMIN VERIFY OTP ERROR]', err);
    res.status(500).json({ error: 'Internal server error verifying admin OTP.' });
  }
});

app.get('/api/admin/subscriptions', async (req, res) => {
  try {
    const customerMap = new Map();

    GOOGLE_SHEET_EXISTING_CUSTOMERS.forEach((seed, email) => {
      customerMap.set(email, {
        email,
        name: seed.name,
        phone: seed.phone || '',
        plan: localPaidEmails.has(email) ? 'Premium' : (seed.tier === 'pro' ? 'Premium' : 'Free'),
        isPremium: localPaidEmails.has(email) || seed.tier === 'pro',
        updatedAt: new Date().toISOString(),
      });
    });

    localCustomers.forEach((cust, email) => {
      const isPaid = localPaidEmails.has(email) || cust.isPremium;
      customerMap.set(email, {
        email,
        name: cust.name || email.split('@')[0],
        phone: cust.phone || '',
        plan: isPaid ? 'Premium' : (cust.tier === 'pro' ? 'Premium' : 'Free'),
        isPremium: isPaid,
        updatedAt: cust.updatedAt || new Date().toISOString(),
      });
    });

    localRequests.forEach(r => {
      const existing = customerMap.get(r.email) || {};
      const isPaid = localPaidEmails.has(r.email);
      customerMap.set(r.email, {
        email: r.email,
        name: r.name || existing.name || r.email.split('@')[0],
        phone: r.phone || existing.phone || '',
        plan: isPaid ? 'Premium' : (existing.plan || 'Free'),
        isPremium: isPaid,
        updatedAt: existing.updatedAt || r.createdAt || new Date().toISOString(),
      });
    });

    localPaidEmails.forEach(email => {
      const existing = customerMap.get(email) || {};
      customerMap.set(email, {
        email,
        name: existing.name || email.split('@')[0],
        phone: existing.phone || '',
        plan: 'Premium',
        isPremium: true,
        updatedAt: existing.updatedAt || new Date().toISOString(),
      });
    });

    res.json({
      success: true,
      adminEmail: ADMIN_GMAIL,
      customers: Array.from(customerMap.values()),
    });
  } catch (err) {
    console.error('[GET SUBSCRIPTIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to load customer subscriptions.' });
  }
});

app.post('/api/admin/set-subscription', async (req, res) => {
  try {
    const { email, plan, name } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid customer email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isPremium = plan === 'Premium' || plan === 'pro';

    if (isPremium) {
      await markEmailPaid(normalizedEmail);
    } else {
      await removeEmailPaid(normalizedEmail);
    }

    const customer = (await lookupCustomer(normalizedEmail)) || { email: normalizedEmail, name: name || normalizedEmail.split('@')[0] };
    customer.tier = isPremium ? 'pro' : 'basic';
    customer.isPremium = isPremium;
    customer.updatedAt = new Date().toISOString();
    await saveCustomer(customer);

    res.json({
      success: true,
      message: `Customer ${normalizedEmail} subscription updated to ${isPremium ? 'Premium' : 'Free'}.`,
      customer,
    });
  } catch (err) {
    console.error('[SET SUBSCRIPTION ERROR]', err);
    res.status(500).json({ error: 'Failed to update customer subscription.' });
  }
});

app.get('/api/admin/premium-requests', (req, res) => {
  res.json({
    requests: localRequests,
    paidEmails: [...localPaidEmails],
  });
});

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

  // 1. WhatsApp Invitation Queue (Async - Non-blocking)
  const isWhatsAppEnabled = data.whatsappUpdates !== false && data.whatsapp_updates_enabled !== false;
  if (isWhatsAppEnabled && data.phone) {
    queueWhatsAppInvitation({
      phone: data.phone,
      name: data.name,
      email: data.email,
      loanAmount: data.loanAmount,
      whatsappUpdatesEnabled: true,
    }).catch(err => console.error('[WHATSAPP NOTIFY ERROR]', err));
  } else {
    console.log(`[WHATSAPP SKIPPED] User ${data.email} opted out or missing phone number.`);
  }

  // 2. Admin Email Notification (Async)
  try {
    if (process.env.SMTP_USER) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: adminEmail,
        subject: 'New Freedom Plan Registration',
        text: `A new user has registered:\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nWhatsApp Updates: ${isWhatsAppEnabled ? 'Enabled' : 'Disabled'}\nLoan Amount: ₹${data.loanAmount || 0}\nTier: ${data.tier}\nTime: ${data.timestamp}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>New Customer Registration</h2>
            <ul>
              <li><strong>Name:</strong> ${data.name}</li>
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Phone:</strong> ${data.phone}</li>
              <li><strong>WhatsApp Updates:</strong> ${isWhatsAppEnabled ? '✅ Enabled' : '❌ Disabled'}</li>
              <li><strong>Loan Amount:</strong> ₹${(data.loanAmount || 0).toLocaleString('en-IN')}</li>
              <li><strong>Tier:</strong> ${data.tier}</li>
              <li><strong>Time:</strong> ${data.timestamp}</li>
            </ul>
            <p>This user has been saved to your Google Sheets.</p>
          </div>
        `,
      });
    }
    res.json({ message: 'Notification processed', whatsappQueued: isWhatsAppEnabled });
  } catch (err) {
    console.error('Error sending registration notification:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ─── WhatsApp Logs (Admin) ──────────────────────────────────────────────────
app.get('/api/whatsapp/logs', (req, res) => {
  res.json({ logs: getWhatsAppLogs() });
});

// ─── Authoritative Analytics Calculation Endpoint ────────────────────────────
app.post('/api/analytics/dashboard', (req, res) => {
  try {
    const {
      originalLoanAmount = 2500000,
      totalPrincipalRepaid = 0,
      monthlyIncome = 900,
      monthlySavingsTarget = 180,
      rent = 310,
      billsAndExpenses = 260,
      interestRate = 11.7,
      termMonths = 36,
    } = req.body;

    const loanOriginal = Number(originalLoanAmount) || 0;
    const repaid = Number(totalPrincipalRepaid) || 0;
    // Current Loan Balance = Original Disbursed Amount - Total Principal Repaid
    const currentLoanBalance = Math.max(0, loanOriginal - repaid);

    const income = Number(monthlyIncome) || 900;
    const rentVal = Number(rent) || 310;
    const savingsVal = Number(monthlySavingsTarget) || 180;
    const expensesVal = Number(billsAndExpenses) || 260;
    const bufferVal = Math.max(0, income - rentVal - savingsVal - expensesVal);

    const categories = [
      { id: 'rent', name: 'Rent', amount: rentVal, percentage: Number(((rentVal / income) * 100).toFixed(1)) },
      { id: 'savings', name: 'Target Savings', amount: savingsVal, percentage: Number(((savingsVal / income) * 100).toFixed(1)) },
      { id: 'expenses', name: 'Bills & Utilities', amount: expensesVal, percentage: Number(((expensesVal / income) * 100).toFixed(1)) },
      { id: 'buffer', name: 'Buffer & Discretionary', amount: bufferVal, percentage: Number(((bufferVal / income) * 100).toFixed(1)) },
    ];

    res.json({
      loan: {
        originalAmount: loanOriginal,
        totalPrincipalRepaid: repaid,
        currentBalance: currentLoanBalance,
        interestRate,
        termMonths,
      },
      monthlyBudget: {
        income,
        categories,
      },
      projectedNetDebt: currentLoanBalance,
    });
  } catch (err) {
    console.error('[ANALYTICS CALC ERROR]', err);
    res.status(500).json({ error: 'Failed to calculate analytics metrics' });
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
