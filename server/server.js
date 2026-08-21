require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { selectTheme, renderTemplate } = require('./otpEmail/emailRenderer');
const { renderPaymentLinkEmail, renderPaymentLinkPlainText, DEFAULT_PAYMENT_LINK } = require('./paymentEmail/paymentEmailRenderer');
const marketingRoutes = require('./marketing/routes');
const { initMarketingScheduler } = require('./marketing/scheduler');
const { queueWhatsAppInvitation, getLogs: getWhatsAppLogs } = require('./services/whatsappService');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Marketing Module ────────────────────────────────────────────────────────
app.use('/api/marketing', marketingRoutes);

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

// ─── Persistent Payment Requests (Temporary Manual Flow) ──────────────────────
const REQUESTS_FILE = path.join(__dirname, 'data', 'premiumRequests.json');
let premiumRequests = [];
if (fs.existsSync(REQUESTS_FILE)) {
  try {
    premiumRequests = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading premiumRequests.json:', err);
  }
}

function savePremiumRequest(request) {
  const existingIdx = premiumRequests.findIndex(r => r.email === request.email);
  if (existingIdx >= 0) {
    premiumRequests[existingIdx] = { ...premiumRequests[existingIdx], ...request, updatedAt: new Date().toISOString() };
  } else {
    premiumRequests.unshift(request);
  }
  try {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(premiumRequests, null, 2));
  } catch (err) {
    console.error('Error saving premiumRequests.json:', err);
  }
}

// ─── Google Sheets Webhook Sync Helper (Server-side only) ────────────────────
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

// ─── NodeMailer ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper for sending admin notifications using best available SMTP credentials
function getNotificationTransporter() {
  if (process.env.MARKETING_SMTP_USER && process.env.MARKETING_SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.MARKETING_SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.MARKETING_SMTP_PORT) || 587,
      auth: {
        user: process.env.MARKETING_SMTP_USER,
        pass: process.env.MARKETING_SMTP_PASS,
      },
    });
  }
  return transporter;
}

// =============================================================================
// PAYMENT ROUTES (AUTOMATIC EMAIL DELIVERY & RAZORPAY)
// =============================================================================

/**
 * Handle Payment Link Request & Send Automatic Email
 */
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

    // Save to persistent server records
    savePremiumRequest(requestData);

    console.log(`[PAYMENT LINK REQUEST] ${cleanName} (${normalizedEmail}) - Sending automatic email...`);

    const emailTransporter = getNotificationTransporter();

    // Prepare promotional flyer image attachment
    const flyerPath = path.join(__dirname, 'assets', 'freedomplan-premium-payment.png');
    const attachments = [];
    if (fs.existsSync(flyerPath)) {
      attachments.push({
        filename: 'freedomplan-premium-payment.png',
        path: flyerPath,
        cid: 'freedomplan-premium-payment',
      });
    }

    const customerHtml = renderPaymentLinkEmail({
      name: cleanName,
      email: normalizedEmail,
      amount: Number(amount) || 499,
      plan,
      paymentLink,
      useCid: attachments.length > 0,
    });

    const customerText = renderPaymentLinkPlainText({
      name: cleanName,
      email: normalizedEmail,
      amount: Number(amount) || 499,
      plan,
      paymentLink,
    });

    // 1. Send automatic email to the customer
    let emailSent = false;
    try {
      await emailTransporter.sendMail({
        from: process.env.MARKETING_FROM_EMAIL || '"FreedomPlan" <FreedomPlan786@gmail.com>',
        to: normalizedEmail,
        replyTo: 'FreedomPlan786@gmail.com',
        subject: 'FreedomPlan Premium — Your Payment Link',
        text: customerText,
        html: customerHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      emailSent = true;
      console.log(`[PAYMENT EMAIL SENT] Successfully sent payment email to ${normalizedEmail}`);
    } catch (mailErr) {
      console.error(`[PAYMENT EMAIL ERROR] Failed to send email to ${normalizedEmail}:`, mailErr.message);
    }

    // 2. Send email alert to admin/owner asynchronously
    const adminEmail = process.env.ADMIN_EMAIL || process.env.MARKETING_SMTP_USER || process.env.SMTP_USER || 'FreedomPlan786@gmail.com';
    emailTransporter.sendMail({
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
    }).catch(adminMailErr => {
      console.warn('[ADMIN NOTIFICATION WARNING]', adminMailErr.message);
    });

    // 3. Sync to Google Sheets (non-blocking)
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
    }).catch(sheetErr => {
      console.warn('[GOOGLE SHEETS WARNING]', sheetErr.message);
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

// ─── ADMIN APPROVAL ROUTES ───────────────────────────────────────────────────

/**
 * POST /api/admin/approve-premium
 * Owner manually approves an email after verifying customer payment.
 */
app.post('/api/admin/approve-premium', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    savePaidEmail(normalizedEmail);

    const now = new Date().toISOString();

    // Update premiumRequests record if present
    const reqItem = premiumRequests.find(r => r.email === normalizedEmail);
    if (reqItem) {
      reqItem.status = 'payment_verified';
      reqItem.premiumStatus = 'Active';
      reqItem.approvedAt = now;
      try {
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(premiumRequests, null, 2));
      } catch (_) {}
    }

    // Sync to Google Sheet as Active
    syncToGoogleSheet({
      'Name': reqItem ? reqItem.name : 'Customer',
      'Email': normalizedEmail,
      'Phone': reqItem ? reqItem.phone : '',
      'Plan': 'FreedomPlan Premium',
      'Amount': 499,
      'Payment Status': 'Verified',
      'Premium Status': 'Active',
      'Requested At': reqItem ? reqItem.createdAt : now,
      'Approved At': now,
    });

    console.log(`[PREMIUM APPROVED] Email: ${normalizedEmail}`);

    res.json({
      success: true,
      email: normalizedEmail,
      isPremium: true,
      message: `Premium activated for ${normalizedEmail}`,
    });
  } catch (err) {
    console.error('[APPROVE PREMIUM ERROR]', err);
    res.status(500).json({ error: 'Failed to approve premium.' });
  }
});

/**
 * POST /api/admin/revoke-premium
 * Owner revokes premium access for an email if needed.
 */
app.post('/api/admin/revoke-premium', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    paidEmails.delete(normalizedEmail);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify([...paidEmails], null, 2));
    } catch (_) {}

    const reqItem = premiumRequests.find(r => r.email === normalizedEmail);
    if (reqItem) {
      reqItem.premiumStatus = 'Revoked';
      try {
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(premiumRequests, null, 2));
      } catch (_) {}
    }

    console.log(`[PREMIUM REVOKED] Email: ${normalizedEmail}`);

    res.json({
      success: true,
      email: normalizedEmail,
      isPremium: false,
      message: `Premium revoked for ${normalizedEmail}`,
    });
  } catch (err) {
    console.error('[REVOKE PREMIUM ERROR]', err);
    res.status(500).json({ error: 'Failed to revoke premium.' });
  }
});

/**
 * GET /api/admin/premium-requests
 * Owner can retrieve all requested leads and approved status.
 */
app.get('/api/admin/premium-requests', (req, res) => {
  res.json({
    requests: premiumRequests,
    paidEmails: [...paidEmails],
  });
});

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

      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: 'Your Login Security Code',
        text: `Your login code is: ${otp}. It will expire in 5 minutes.`,
        html: emailHtml,
        attachments: [{
          filename: 'freedomplan-female.png',
          path: path.join(__dirname, 'otpEmail', 'assets', 'freedomplan-female.png'),
          cid: 'hero-female'
        }]
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
      projectedNetDebt: currentLoanBalance, // Base net debt before accumulated savings
    });
  } catch (err) {
    console.error('[ANALYTICS CALC ERROR]', err);
    res.status(500).json({ error: 'Failed to calculate analytics metrics' });
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
  initMarketingScheduler();
});
