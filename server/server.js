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
const { analyzePlatformIntelligence } = require('./services/aiIntelligenceEngine');

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

function isValidCustomerEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.toLowerCase().trim();

  // Basic email pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) return false;

  // Filter out test patterns, dummy domains, timestamped fake accounts
  if (
    clean.includes('example.com') ||
    clean.includes('testuser') ||
    clean.includes('test_new') ||
    clean.includes('test_customer') ||
    clean.includes('student_test') ||
    clean.includes('live_verify') ||
    clean.includes('idempotent_user') ||
    clean.includes('brand_new_') ||
    clean.includes('india_1787') ||
    clean.includes('ukuser1_') ||
    clean.includes('ukuser2_') ||
    clean.includes('newuser_1787') ||
    clean.startsWith('test_') ||
    clean.startsWith('testuser_') ||
    clean.includes('student_1787') ||
    clean === 'bjnljnlknj@gmail.com' ||
    clean === 'ncjbkn'
  ) {
    return false;
  }

  // Reject gibberish user parts (e.g. >= 7 consonants with no vowel before @)
  const userPart = clean.split('@')[0];
  if (/^[bcdfghjklmnpqrstvwxyz]{7,}$/.test(userPart)) {
    return false;
  }

  return true;
}

// ─── Freedom CRM Admin Identity & Security ──────────────────────────────────
const ADMIN_GMAIL = (process.env.FREEDOM_CRM_ADMIN_GMAIL || process.env.ADMIN_EMAIL || 'freedomplan786@gmail.com').toLowerCase().trim();
const adminOtpStore = new Map();

// ─── Persistent Customer Subscriptions Store ────────────────────────────────
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'data', 'subscriptions.json');
const ADMIN_HISTORY_FILE = path.join(__dirname, 'data', 'adminHistory.json');

let subscriptions = [];
if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
    subscriptions = Array.isArray(raw) ? raw.filter(s => isValidCustomerEmail(s.email)) : [];
  } catch (err) {
    console.error('Error reading subscriptions.json:', err);
  }
}

let adminHistory = [];
if (fs.existsSync(ADMIN_HISTORY_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_HISTORY_FILE, 'utf8'));
    adminHistory = Array.isArray(raw) ? raw : [];
  } catch (_) {}
}

function logAdminActivity(entry) {
  const record = {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  adminHistory.unshift(record);
  if (adminHistory.length > 500) adminHistory.pop();
  try {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ADMIN_HISTORY_FILE, JSON.stringify(adminHistory, null, 2));
  } catch (_) {}
  return record;
}

/**
 * Calculates absolute expiry timestamp based on admin-selected duration or explicit date
 */
function calculateExpiryDate(startDate, duration, customDays, customExpiryDate) {
  if (customExpiryDate) {
    const d = new Date(customExpiryDate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const start = startDate ? new Date(startDate) : new Date();
  const baseTime = !isNaN(start.getTime()) ? start.getTime() : Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  switch (duration) {
    case '7d': return new Date(baseTime + 7 * DAY_MS).toISOString();
    case '15d': return new Date(baseTime + 15 * DAY_MS).toISOString();
    case '30d':
    case '1m': return new Date(baseTime + 30 * DAY_MS).toISOString();
    case '2m': return new Date(baseTime + 60 * DAY_MS).toISOString();
    case '3m': return new Date(baseTime + 90 * DAY_MS).toISOString();
    case '6m': return new Date(baseTime + 180 * DAY_MS).toISOString();
    case '1y': return new Date(baseTime + 365 * DAY_MS).toISOString();
    case '2y': return new Date(baseTime + 730 * DAY_MS).toISOString();
    case 'custom_days': {
      const days = parseInt(customDays, 10);
      if (!isNaN(days) && days > 0) {
        return new Date(baseTime + days * DAY_MS).toISOString();
      }
      return new Date(baseTime + 30 * DAY_MS).toISOString();
    }
    default:
      return new Date(baseTime + 30 * DAY_MS).toISOString();
  }
}

/**
 * Check and process any expired Premium accounts across memory and persistent stores
 */
function checkAndProcessAllExpiries() {
  const now = Date.now();
  let changed = false;

  subscriptions.forEach(s => {
    if (s.plan === 'Premium' || s.isPremium || s.accountType === 'Premium') {
      if (s.premiumExpiryDate) {
        const expTime = new Date(s.premiumExpiryDate).getTime();
        if (!isNaN(expTime) && expTime <= now) {
          console.log(`[AUTO-EXPIRY] Account duration ended for: ${s.email}`);
          s.plan = 'Free';
          s.isPremium = false;
          s.accountType = 'Free';
          s.premiumStatus = 'Expired';
          s.updatedAt = new Date().toISOString();
          s.updatedBy = 'System Auto-Expiry Engine';
          paidEmails.delete(s.email);
          changed = true;

          // Mirror into registeredCustomers
          const rc = registeredCustomers.find(c => c.email === s.email);
          if (rc) {
            rc.tier = 'basic';
            rc.isPremium = false;
            rc.accountType = 'Free';
            rc.premiumStatus = 'Expired';
            rc.updatedAt = s.updatedAt;
          }

          // Sync to Google Sheet
          syncToGoogleSheet({
            email: s.email,
            name: s.name,
            accountType: 'Free',
            premiumStatus: 'Expired',
            premiumStartDate: s.premiumStartDate,
            premiumExpiryDate: s.premiumExpiryDate,
            accessDuration: s.accessDuration,
            accessReason: s.accessReason,
            action: 'PREMIUM_EXPIRED',
          });
        }
      }
    }
  });

  if (changed) {
    try {
      const dir = path.join(__dirname, 'data');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(registeredCustomers, null, 2));
      fs.writeFileSync(DB_FILE, JSON.stringify([...paidEmails], null, 2));
    } catch (err) {
      console.error('Error persisting auto-expiries:', err);
    }
  }
}

// Periodic check every 15 minutes
setInterval(checkAndProcessAllExpiries, 15 * 60 * 1000);

function saveSubscriptionRecord({
  email,
  plan,
  name,
  duration = '30d',
  startDate,
  expiryDate,
  reason = 'Manual Premium Access',
  customDays,
  paymentStatus,
  action = 'ASSIGN',
  extendDays,
  updatedBy = 'Freedom CRM Admin',
}) {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();
  const existingIdx = subscriptions.findIndex(s => s.email === normalizedEmail);
  const existingSub = existingIdx >= 0 ? subscriptions[existingIdx] : null;

  let targetPlan = plan === 'Premium' ? 'Premium' : 'Free';
  let targetStartDate = startDate || existingSub?.premiumStartDate || now;
  let targetExpiryDate = null;
  let targetDuration = duration || existingSub?.accessDuration || '30d';
  let targetReason = reason || existingSub?.accessReason || 'Manual Premium Access';

  if (action === 'EXTEND') {
    targetPlan = 'Premium';
    const baseExpiry = (existingSub?.premiumExpiryDate && new Date(existingSub.premiumExpiryDate).getTime() > Date.now())
      ? new Date(existingSub.premiumExpiryDate).getTime()
      : Date.now();
    const daysToAdd = extendDays ? parseInt(extendDays, 10) : 30;
    targetExpiryDate = new Date(baseExpiry + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    targetDuration = `+${daysToAdd} days`;
    targetReason = reason || 'Admin Duration Extension';
  } else if (action === 'CANCEL' || targetPlan === 'Free') {
    targetPlan = 'Free';
    targetExpiryDate = null;
    targetDuration = 'Cancelled';
    targetReason = reason || 'Admin Revoked Access';
  } else if (action === 'CHANGE_EXPIRY' && expiryDate) {
    targetExpiryDate = new Date(expiryDate).toISOString();
    targetDuration = 'Custom Expiry Date';
  } else if (targetPlan === 'Premium') {
    targetExpiryDate = calculateExpiryDate(targetStartDate, duration, customDays, expiryDate);
  }

  const isExpired = targetExpiryDate ? (new Date(targetExpiryDate).getTime() <= Date.now()) : false;
  if (isExpired && targetPlan === 'Premium') {
    targetPlan = 'Free';
  }

  const isPremium = targetPlan === 'Premium' && !isExpired;
  const accountType = isPremium ? 'Premium' : 'Free';
  const premiumStatus = isPremium ? 'Active' : (isExpired ? 'Expired' : 'None');

  const record = {
    email: normalizedEmail,
    name: name || existingSub?.name || normalizedEmail.split('@')[0],
    plan: targetPlan,
    isPremium,
    accountType,
    premiumStatus,
    premiumStartDate: isPremium ? targetStartDate : (existingSub?.premiumStartDate || null),
    premiumExpiryDate: targetExpiryDate,
    accessDuration: targetDuration,
    accessReason: targetReason,
    paymentStatus: paymentStatus || (isPremium ? 'Payment Completed' : 'Payment Link Not Sent'),
    updatedAt: now,
    updatedBy,
  };

  if (existingIdx >= 0) {
    subscriptions[existingIdx] = { ...subscriptions[existingIdx], ...record };
  } else {
    subscriptions.unshift(record);
  }

  // 1. Sync with paidEmails
  if (isPremium) {
    savePaidEmail(normalizedEmail);
  } else {
    paidEmails.delete(normalizedEmail);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify([...paidEmails], null, 2));
    } catch (_) {}
  }

  // 2. Sync with registeredCustomers.json
  const custIdx = registeredCustomers.findIndex(c => c.email === normalizedEmail);
  if (custIdx >= 0) {
    registeredCustomers[custIdx] = {
      ...registeredCustomers[custIdx],
      tier: isPremium ? 'pro' : 'basic',
      isPremium,
      accountType,
      premiumStatus,
      premiumStartDate: record.premiumStartDate,
      premiumExpiryDate: record.premiumExpiryDate,
      accessDuration: record.accessDuration,
      accessReason: record.accessReason,
      updatedAt: now,
    };
  } else {
    registeredCustomers.unshift({
      email: normalizedEmail,
      name: record.name,
      phone: '',
      loanAmount: 2500000,
      isOutsideUK: true,
      tier: isPremium ? 'pro' : 'basic',
      isPremium,
      accountType,
      premiumStatus,
      premiumStartDate: record.premiumStartDate,
      premiumExpiryDate: record.premiumExpiryDate,
      accessDuration: record.accessDuration,
      accessReason: record.accessReason,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Persist files
  try {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(registeredCustomers, null, 2));
  } catch (err) {
    console.error('Error saving subscription stores:', err);
  }

  // 3. Log Activity
  logAdminActivity({
    email: normalizedEmail,
    action: action || (isPremium ? 'ASSIGN_PREMIUM' : 'REVOKE_PREMIUM'),
    accountType,
    plan: targetPlan,
    duration: targetDuration,
    expiryDate: targetExpiryDate,
    reason: targetReason,
    updatedBy,
  });

  // 4. Real-time Google Sheet Sync
  syncToGoogleSheet({
    email: normalizedEmail,
    name: record.name,
    accountType,
    premiumStatus,
    premiumStartDate: record.premiumStartDate,
    premiumExpiryDate: record.premiumExpiryDate,
    accessDuration: targetDuration,
    accessReason: targetReason,
    paymentStatus: record.paymentStatus,
    action: 'SUBSCRIPTION_UPDATE',
  });

  return record;
}

// ─── Persistent Payment Requests (Temporary Manual Flow) ──────────────────────
const REQUESTS_FILE = path.join(__dirname, 'data', 'premiumRequests.json');
let premiumRequests = [];
if (fs.existsSync(REQUESTS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8'));
    premiumRequests = Array.isArray(raw) ? raw.filter(r => isValidCustomerEmail(r.email)) : [];
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

// ─── Persistent Registered Customers Store ──────────────────────────────────
const CUSTOMERS_FILE = path.join(__dirname, 'data', 'registeredCustomers.json');
let registeredCustomers = [];
if (fs.existsSync(CUSTOMERS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
    registeredCustomers = Array.isArray(raw) ? raw.filter(c => isValidCustomerEmail(c.email)) : [];
  } catch (err) {
    console.error('Error reading registeredCustomers.json:', err);
  }
}

function saveRegisteredCustomer(customer) {
  const normalizedEmail = (customer.email || '').toLowerCase().trim();
  if (!normalizedEmail) return null;
  const now = new Date().toISOString();
  const existingIdx = registeredCustomers.findIndex(c => c.email === normalizedEmail);
  const record = {
    ...customer,
    email: normalizedEmail,
    name: customer.name || normalizedEmail.split('@')[0],
    phone: customer.phone || '',
    loanAmount: Number(customer.loanAmount) || 0,
    isOutsideUK: customer.isOutsideUK ?? false,
    updatedAt: now,
    createdAt: existingIdx >= 0 ? (registeredCustomers[existingIdx].createdAt || now) : now,
  };

  if (existingIdx >= 0) {
    registeredCustomers[existingIdx] = { ...registeredCustomers[existingIdx], ...record };
  } else {
    registeredCustomers.unshift(record);
  }

  try {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(registeredCustomers, null, 2));
  } catch (err) {
    console.error('Error saving registeredCustomers.json:', err);
  }

  return record;
}

// ─── Registration Idempotency Store (Prevents Duplicate Registrations / Sheets / Emails) ────
const PROCESSED_REGISTRATIONS_FILE = path.join(__dirname, 'data', 'processed_registrations.json');
const processedRegistrations = new Map();
if (fs.existsSync(PROCESSED_REGISTRATIONS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(PROCESSED_REGISTRATIONS_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item.key) processedRegistrations.set(item.key, item);
      }
    }
  } catch (err) {
    console.error('Error reading processed_registrations.json:', err);
  }
}

function persistProcessedRegistrations() {
  try {
    const arr = Array.from(processedRegistrations.values()).slice(-200);
    fs.writeFileSync(PROCESSED_REGISTRATIONS_FILE, JSON.stringify(arr, null, 2));
  } catch (_) {}
}

// ─── Google Sheet Existing Customers Seed Map ──────────────────────────────
const GOOGLE_SHEET_EXISTING_CUSTOMERS = new Map([
  ['naveedmd78600@gmail.com', { name: 'Naveed', phone: '+91 9182502259', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['hannu786464@gmail.com', { name: 'Hannu', phone: '+44 7993144249', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['jashujaswanth050@gmail.com', { name: 'Jashu Jaswanth', phone: '+91 9876543210', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['hannu464@gmail.com', { name: 'Hannu 464', phone: '+44 7123456789', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['renuka.yam.b19@gmail.com', { name: 'Renuka', phone: '+91 7993144249', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['anasurrahmansheik@gmail.com', { name: 'Anasur Rahman Sheik', phone: '+91 9876543211', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['pallapua954@gmail.com', { name: 'Pallapu', phone: '+91 9876543212', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['harshadpashask@gmail.com', { name: 'Harshad Pasha', phone: '+91 9876543213', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['nagireddy7678@gmail.com', { name: 'Nagireddy', phone: '+91 9876543214', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['naveedmd00@gmail.com', { name: 'Naveed MD', phone: '+91 7993144249', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['hannu4@outlook.com', { name: 'Hannu Outlook', phone: '+44 7993144249', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['bindu@leoglobaloverseas.com', { name: 'Bindu Dasari', phone: '918341644532', loanAmount: 3500000, isOutsideUK: true, tier: 'basic' }],
  ['career.pristenoverseas@gmail.com', { name: 'Krishna G', phone: '917075766652', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['us176187@gmail.com', { name: 'Uppu venkata srinivasa Rao', phone: '916303765024', loanAmount: 60000000, isOutsideUK: true, tier: 'basic' }],
  ['nagarajuacademicoverseas@gmail.com', { name: 'Nagaraju', phone: '919121039922', loanAmount: 5000000, isOutsideUK: true, tier: 'basic' }],
  ['jakeerhussian7@gmail.com', { name: 'jakeer', phone: '917093797051', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['jakeerhussian76@gmail.com', { name: 'jakeer hussina', phone: '447993144249', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['skzaheerali@gmail.com', { name: 'zaheerali sk', phone: '+91 916303567276', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
]);

function lookupCustomerByEmail(email) {
  if (!email) return null;
  const clean = email.toLowerCase().trim();

  // Run expiry evaluation
  checkAndProcessAllExpiries();

  const isAdmin = clean === ADMIN_GMAIL;

  // 1. Authoritative check: subscriptions.json
  const fromSub = subscriptions.find(s => s.email === clean);
  const fromCust = registeredCustomers.find(c => c.email === clean);
  const fromSeed = GOOGLE_SHEET_EXISTING_CUSTOMERS.get(clean);
  const fromReq = premiumRequests.find(r => r.email === clean);

  let plan = 'Free';
  let isPremium = false;
  let accountType = isAdmin ? 'Admin' : 'Free';
  let premiumStatus = 'None';
  let premiumStartDate = null;
  let premiumExpiryDate = null;
  let accessDuration = null;
  let accessReason = null;
  let paymentStatus = fromReq?.status || 'Payment Link Not Sent';

  if (fromSub) {
    // Check if expiry date has passed
    const hasExpired = fromSub.premiumExpiryDate && (new Date(fromSub.premiumExpiryDate).getTime() <= Date.now());
    if (hasExpired && (fromSub.plan === 'Premium' || fromSub.isPremium)) {
      fromSub.plan = 'Free';
      fromSub.isPremium = false;
      fromSub.accountType = 'Free';
      fromSub.premiumStatus = 'Expired';
    }

    plan = fromSub.plan === 'Premium' ? 'Premium' : 'Free';
    isPremium = plan === 'Premium';
    accountType = isAdmin ? 'Admin' : (isPremium ? 'Premium' : 'Free');
    premiumStatus = isPremium ? 'Active' : (fromSub.premiumStatus || (fromSub.premiumExpiryDate ? 'Expired' : 'None'));
    premiumStartDate = fromSub.premiumStartDate || null;
    premiumExpiryDate = fromSub.premiumExpiryDate || null;
    accessDuration = fromSub.accessDuration || null;
    accessReason = fromSub.accessReason || null;
    paymentStatus = fromSub.paymentStatus || (isPremium ? 'Payment Completed' : 'Payment Link Not Sent');
  } else if (paidEmails.has(clean)) {
    plan = 'Premium';
    isPremium = true;
    accountType = isAdmin ? 'Admin' : 'Premium';
    premiumStatus = 'Active';
    paymentStatus = 'Payment Completed';
  } else if (fromCust && (fromCust.tier === 'pro' || fromCust.isPremium)) {
    plan = 'Premium';
    isPremium = true;
    accountType = isAdmin ? 'Admin' : 'Premium';
    premiumStatus = fromCust.premiumStatus || 'Active';
    premiumStartDate = fromCust.premiumStartDate || null;
    premiumExpiryDate = fromCust.premiumExpiryDate || null;
    accessDuration = fromCust.accessDuration || null;
    accessReason = fromCust.accessReason || null;
    paymentStatus = 'Payment Completed';
  }

  const name = fromCust?.name || fromSub?.name || fromSeed?.name || fromReq?.name || clean.split('@')[0];
  const phone = fromCust?.phone || fromSeed?.phone || fromReq?.phone || '';
  const loanAmount = fromCust?.loanAmount || fromSeed?.loanAmount || 2500000;
  const isOutsideUK = fromCust?.isOutsideUK ?? fromSeed?.isOutsideUK ?? true;

  return {
    email: clean,
    name,
    phone,
    loanAmount,
    isOutsideUK,
    plan,
    tier: isPremium ? 'pro' : 'basic',
    isPremium,
    accountType,
    premiumStatus,
    premiumStartDate,
    premiumExpiryDate,
    accessDuration,
    accessReason,
    paymentStatus,
    isAdmin,
  };
}

// ─── Google Sheets Webhook Sync Helper & Live Fetcher (Server-side only) ─────
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec';

let cachedSheetCustomers = [];
let lastSheetSyncTime = null;
let sheetSyncStatus = { ok: true, message: 'Initialized', count: 0 };

function parseCsvRows(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] || '';
    });

    const email = (obj.email || obj.customeremail || obj.emailaddress || obj.gmail || '').toLowerCase().trim();
    if (email && email.includes('@')) {
      const name = obj.name || obj.customername || obj.fullname || obj.username || email.split('@')[0];
      const phone = obj.phone || obj.mobile || obj.contact || obj.phonenumber || '';
      const loanAmount = parseFloat(obj.loanamount || obj.amount || obj.loan) || 2500000;
      const ukStatus = obj.ukstatus || obj.status || obj.isoutsideuk || '';
      const isOutsideUK = /outside/i.test(ukStatus) || ukStatus === 'true';
      const plan = /premium|pro/i.test(obj.plan || obj.tier || obj.subscription || '') ? 'Premium' : 'Free';

      rows.push({
        email,
        name,
        phone,
        loanAmount,
        isOutsideUK,
        plan,
        isPremium: plan === 'Premium',
        source: 'google_sheet',
      });
    }
  }

  return rows;
}

async function fetchGoogleSheetCustomers(customUrl = null) {
  const urlToTry = customUrl || process.env.GOOGLE_SHEETS_CSV_URL || process.env.GOOGLE_SHEET_URL || GOOGLE_SHEETS_WEBHOOK_URL;
  if (!urlToTry) return cachedSheetCustomers;

  try {
    // 1. If it's a Google Sheet docs link (or CSV export)
    if (urlToTry.includes('docs.google.com/spreadsheets')) {
      let csvUrl = urlToTry;
      if (!csvUrl.includes('export?format=csv')) {
        const idMatch = urlToTry.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch && idMatch[1]) {
          csvUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
        }
      }
      const resp = await fetch(csvUrl);
      if (resp.ok) {
        const csvText = await resp.text();
        const parsed = parseCsvRows(csvText);
        if (parsed.length > 0) {
          cachedSheetCustomers = parsed;
          lastSheetSyncTime = new Date().toISOString();
          sheetSyncStatus = { ok: true, message: `Synced ${parsed.length} customers from Google Sheet CSV`, count: parsed.length };
          
          // Automatically save any new genuine customers into persistent ledger
          parsed.forEach(c => {
            if (c.email && isValidCustomerEmail(c.email)) {
              saveRegisteredCustomer({
                email: c.email,
                name: c.name,
                phone: c.phone,
                loanAmount: c.loanAmount || 2500000,
                isOutsideUK: c.isOutsideUK ?? true,
                tier: c.plan === 'Premium' ? 'pro' : 'basic',
                source: 'google_sheet_auto_sync',
              });
            }
          });
          return parsed;
        }
      }
    }

    // 2. If it's an Apps Script Webhook URL
    if (urlToTry.includes('script.google.com')) {
      try {
        const getResp = await fetch(urlToTry, { method: 'GET', redirect: 'follow' });
        if (getResp.ok) {
          const contentType = getResp.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await getResp.json();
            const rawList = Array.isArray(data) ? data : (data.customers || data.data || []);
            if (Array.isArray(rawList) && rawList.length > 0) {
              const mapped = rawList.map(item => {
                const email = (item.Email || item.email || item['Customer Email'] || item.gmail || '').toLowerCase().trim();
                const name = item.Name || item.name || item['Customer Name'] || (email ? email.split('@')[0] : '');
                const phone = item.Phone || item.phone || item.Mobile || item.mobile || '';
                const plan = /premium|pro/i.test(item.Plan || item.plan || item.Tier || item.tier || '') ? 'Premium' : 'Free';
                return {
                  email,
                  name,
                  phone,
                  plan,
                  isPremium: plan === 'Premium',
                  source: 'google_sheet',
                };
              }).filter(c => c.email && c.email.includes('@'));

              if (mapped.length > 0) {
                cachedSheetCustomers = mapped;
                lastSheetSyncTime = new Date().toISOString();
                sheetSyncStatus = { ok: true, message: `Synced ${mapped.length} customers via Apps Script`, count: mapped.length };
                
                // Automatically save into persistent ledger
                mapped.forEach(c => {
                  if (c.email && isValidCustomerEmail(c.email)) {
                    saveRegisteredCustomer({
                      email: c.email,
                      name: c.name,
                      phone: c.phone,
                      loanAmount: 2500000,
                      isOutsideUK: true,
                      tier: c.plan === 'Premium' ? 'pro' : 'basic',
                      source: 'google_sheet_auto_sync',
                    });
                  }
                });
                return mapped;
              }
            }
          }
        }
      } catch (getErr) {
        console.warn('[GOOGLE SHEETS GET NOTE]', getErr.message);
      }
    }
  } catch (err) {
    console.warn('[GOOGLE SHEETS FETCH ERROR]', err.message);
    sheetSyncStatus = { ok: false, message: err.message, count: cachedSheetCustomers.length };
  }

  return cachedSheetCustomers;
}

// Background Auto-Sync: Poll Google Sheet data source periodically (every 60 seconds)
setInterval(async () => {
  try {
    await fetchGoogleSheetCustomers();
  } catch (_) {}
}, 60 * 1000);

function sanitizeSheetPayload(data = {}) {
  // Ensure NO "N/A" strings exist anywhere in the payload
  const cleanField = (val, fallback = '') => {
    if (val === undefined || val === null || val === 'N/A' || val === 'n/a' || val === 'NA' || val === 'null' || val === 'undefined') {
      return fallback;
    }
    return String(val).trim();
  };

  const name = cleanField(data.name || data.Name, '');
  const email = cleanField(data.email || data.Email, '').toLowerCase().trim();
  const phone = cleanField(data.phone || data.Phone || data.mobile, '');
  const loanAmount = cleanField(data.loanAmount || data['Loan Amount'] || data.loan_amount || data.amount, '');
  const ukStatus = cleanField(data.ukStatus || data['UK Status'] || data.isOutsideUK, '');

  const accountType = cleanField(data.accountType || data['Account Type'], data.plan === 'Premium' ? 'Premium' : 'Free');
  const premiumStatus = cleanField(data.premiumStatus || data['Premium Status'], accountType === 'Premium' ? 'Active' : 'None');
  const premiumStartDate = cleanField(data.premiumStartDate || data['Premium Start Date'], '');
  const premiumExpiryDate = cleanField(data.premiumExpiryDate || data['Premium Expiry Date'], '');
  const accessDuration = cleanField(data.accessDuration || data['Access Duration'], '');
  const accessReason = cleanField(data.accessReason || data['Access Reason'], '');

  // Meaningful payment status
  let paymentStatus = cleanField(data.paymentStatus || data['Payment Status'], '');
  if (!paymentStatus) {
    if (data.isPaymentCompleted || data.paid) paymentStatus = 'Payment Completed';
    else if (data.paymentLinkSent || data.paymentLink) paymentStatus = 'Payment Link Sent';
    else paymentStatus = 'Payment Link Not Sent';
  }

  let paymentLinkStatus = cleanField(data.paymentLinkStatus || data['Payment Link Status'], '');
  if (!paymentLinkStatus) {
    if (data.paymentLinkSent || data.paymentLink) paymentLinkStatus = 'Payment Link Sent';
    else paymentLinkStatus = 'Not Requested';
  }

  const paymentLinkSentAt = cleanField(data.paymentLinkSentAt || data['Payment Link Sent At'], '');
  const leadSource = cleanField(data.leadSource || data.source || data['Lead Source'] || data['Source'], 'Website Registration');
  const registeredAt = cleanField(data.registeredAt || data['Registered At'] || data.createdAt || data.timestamp, new Date().toISOString());

  return {
    'Timestamp': new Date().toLocaleString('en-GB'),
    'Name': name,
    'Email': email,
    'Phone': phone,
    'Loan Amount': loanAmount,
    'UK Status': ukStatus,
    'Account Type': accountType,
    'Premium Status': premiumStatus,
    'Premium Start Date': premiumStartDate ? new Date(premiumStartDate).toLocaleDateString('en-GB') : '',
    'Premium Expiry Date': premiumExpiryDate ? new Date(premiumExpiryDate).toLocaleDateString('en-GB') : '',
    'Access Duration': accessDuration,
    'Access Reason': accessReason,
    'Payment Status': paymentStatus,
    'Payment Link Status': paymentLinkStatus,
    'Payment Link Sent At': paymentLinkSentAt ? new Date(paymentLinkSentAt).toLocaleDateString('en-GB') : '',
    'Lead Source': leadSource,
    'Registration Date': registeredAt ? new Date(registeredAt).toLocaleDateString('en-GB') : '',
    name,
    email,
    phone,
    loanAmount,
    ukStatus,
    accountType,
    premiumStatus,
    premiumStartDate,
    premiumExpiryDate,
    accessDuration,
    accessReason,
    paymentStatus,
    paymentLinkStatus,
    paymentLinkSentAt,
    leadSource,
    registeredAt,
    action: data.action || 'UPSERT_USER',
  };
}

let failedSyncQueue = [];
const FAILED_SYNC_FILE = path.join(__dirname, 'data', 'failedSyncQueue.json');
if (fs.existsSync(FAILED_SYNC_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(FAILED_SYNC_FILE, 'utf8'));
    failedSyncQueue = Array.isArray(raw) ? raw : [];
  } catch (_) {}
}

async function syncToGoogleSheet(data) {
  try {
    if (!GOOGLE_SHEETS_WEBHOOK_URL) return;
    const sanitized = sanitizeSheetPayload(data);
    const res = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });
    if (!res.ok) {
      throw new Error(`Google Sheets responded with HTTP ${res.status}`);
    }
    lastSheetSyncTime = new Date().toISOString();
    sheetSyncStatus = { ok: true, message: 'Connected • Synchronized', count: registeredCustomers.length };
  } catch (err) {
    console.warn('[GOOGLE SHEETS SYNC NOTE]', err.message);
    sheetSyncStatus = { ok: false, message: `Sync Warning: ${err.message}`, count: registeredCustomers.length };
    failedSyncQueue.unshift({
      id: 'fail_' + Date.now(),
      payload: data,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    try {
      fs.writeFileSync(FAILED_SYNC_FILE, JSON.stringify(failedSyncQueue.slice(0, 50), null, 2));
    } catch (_) {}
  }
}

// ─── High-Performance NodeMailer Connection Pool ──────────────────────────────
let cachedPrimaryTransporter = null;
let cachedNotificationTransporter = null;

function createPooledTransporter({ host, port, user, pass }) {
  if (!user || !pass) return null;
  const cleanPass = String(pass).replace(/\s+/g, '');
  const isGmail = (host || '').includes('gmail') || user.includes('@gmail.com');

  if (isGmail) {
    return nodemailer.createTransport({
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
      auth: {
        user: user.trim(),
        pass: cleanPass,
      },
    });
  }

  return nodemailer.createTransport({
    host: host || 'smtp.ethereal.email',
    port: Number(port) || 587,
    secure: Number(port) === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    keepAlive: true,
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    auth: {
      user: user.trim(),
      pass: cleanPass,
    },
  });
}

function getPrimaryTransporter() {
  if (!cachedPrimaryTransporter) {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      cachedPrimaryTransporter = createPooledTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      });
    } else {
      cachedPrimaryTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: '', pass: '' },
      });
    }
  }
  return cachedPrimaryTransporter;
}

// Universal transporter wrapper using active pooled connections
const transporter = {
  sendMail: (options) => {
    const t = getPrimaryTransporter();
    return t ? t.sendMail(options) : Promise.reject(new Error('No email transporter available'));
  }
};

// Helper for sending admin notifications using best available SMTP credentials (singleton pooled)
function getNotificationTransporter() {
  if (!cachedNotificationTransporter) {
    const user = process.env.MARKETING_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.MARKETING_SMTP_PASS || process.env.SMTP_PASS;
    const host = process.env.MARKETING_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.MARKETING_SMTP_PORT || process.env.SMTP_PORT || 587;

    if (user && pass) {
      cachedNotificationTransporter = createPooledTransporter({ host, port, user, pass });
    } else {
      cachedNotificationTransporter = getPrimaryTransporter();
    }
  }
  return cachedNotificationTransporter;
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

    // 3. Sync to Google Sheets (authoritative, never writes NA)
    const existingCust = lookupCustomerByEmail(normalizedEmail) || {};
    const effectiveName = (cleanName && cleanName !== 'Valued Customer') ? cleanName : (existingCust.name || normalizedEmail.split('@')[0]);
    const effectivePhone = cleanPhone || existingCust.phone || '';
    const effectiveLoan = Number(req.body.loanAmount) || existingCust.loanAmount || 2500000;
    const isOut = req.body.isOutsideUK !== undefined ? !!req.body.isOutsideUK : (existingCust.isOutsideUK ?? true);
    const effectiveUKStatus = isOut ? 'Outside the UK' : 'Inside the UK';

    syncToGoogleSheet({
      // Standard sheet columns
      'Timestamp': new Date().toLocaleString('en-GB'),
      'Name': effectiveName,
      'Email': normalizedEmail,
      'Phone': effectivePhone,
      'Loan Amount': effectiveLoan,
      'UK Status': effectiveUKStatus,
      'WhatsApp Updates': existingCust.whatsappUpdates ? 'Enabled' : 'Enabled',
      'Payment Status': 'Payment Link Sent',
      'Premium Status': 'Pending',
      'Plan': plan,
      'Amount': amount,
      'Payment Link': paymentLink,
      'Requested At': now,
      'Approved At': '',
      // Lowercase aliases
      name: effectiveName,
      email: normalizedEmail,
      phone: effectivePhone,
      mobile: effectivePhone,
      loanAmount: effectiveLoan,
      ukStatus: effectiveUKStatus,
      isOutsideUK: isOut,
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

// ─── ADMIN AUTH & SUBSCRIPTION MANAGEMENT ROUTES ──────────────────────────────

/**
 * POST /api/admin/auth/send-otp
 * Verifies that the entered email matches the authorized Freedom CRM Admin Gmail ID.
 * Rejects any non-admin email address.
 */
app.post('/api/admin/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Security Verification: Reject any email that is not the authorized Freedom CRM admin
    if (normalizedEmail !== ADMIN_GMAIL) {
      console.warn(`[ADMIN ACCESS DENIED] Unauthorized admin login attempt with: ${normalizedEmail}`);
      return res.status(403).json({
        error: 'Access Denied: You are not authorized as a Freedom CRM administrator.',
        isAuthorized: false,
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    adminOtpStore.set(normalizedEmail, {
      otp: String(otp).trim(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    console.log(`[ADMIN OTP GENERATED] Admin: ${normalizedEmail} | OTP: ${otp}`);

    // Dispatch OTP email to the authorized Freedom CRM Admin in background with high-speed connection pool
    const emailTransporter = getNotificationTransporter();
    if (emailTransporter) {
      emailTransporter.sendMail({
        from: process.env.MARKETING_FROM_EMAIL || '"FreedomPlan Security" <FreedomPlan786@gmail.com>',
        to: normalizedEmail,
        subject: '🔒 Freedom CRM Admin Access Code',
        text: `Your Freedom CRM Admin verification code is: ${otp}. This code will expire in 15 minutes.`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px;background:#ffffff;border-radius:14px;border:1px solid #E5E7EB;">
            <h2 style="color:#0F172A;margin-top:0;">Freedom CRM Admin Security 🔐</h2>
            <p style="color:#475569;font-size:14px;">Use the verification code below to access the Premium Subscription Management console:</p>
            <div style="background:#F1F5F9;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
              <span style="font-size:32px;font-weight:900;letter-spacing:6px;color:#0F172A;font-family:monospace;">${otp}</span>
            </div>
            <p style="color:#64748B;font-size:12px;margin-top:16px;">This code expires in 15 minutes. If you did not request this, please verify your account security immediately.</p>
          </div>
        `,
      }).then(info => {
        console.log(`[ADMIN OTP EMAIL DELIVERED] Dispatched to ${normalizedEmail} (ID: ${info.messageId || 'ok'})`);
      }).catch(mailErr => {
        console.warn('[ADMIN OTP EMAIL WARNING]', mailErr.message);
      });
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

/**
 * POST /api/admin/auth/verify-otp
 * Verifies admin OTP and issues an Admin JWT session token.
 */
app.post('/api/admin/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail !== ADMIN_GMAIL) {
      return res.status(403).json({ error: 'Access Denied: Not an authorized admin.' });
    }

    const storedData = adminOtpStore.get(normalizedEmail);
    const cleanEnteredOtp = String(otp).replace(/\D/g, '').trim();

    console.log(`[ADMIN VERIFY ATTEMPT] Email: ${normalizedEmail} | Entered OTP: ${cleanEnteredOtp} | Stored OTP: ${storedData?.otp}`);

    if (!storedData) {
      return res.status(400).json({ error: 'No active OTP request found. Please click "Resend Code to Gmail" to receive a new OTP.' });
    }

    if (Date.now() > storedData.expiresAt) {
      adminOtpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'Admin OTP has expired. Please request a new code.' });
    }

    const storedOtpString = String(storedData.otp).trim();
    if (storedOtpString !== cleanEnteredOtp) {
      return res.status(400).json({ error: 'Invalid admin verification code. Please check your latest email.' });
    }

    adminOtpStore.delete(normalizedEmail);

    // Issue 7-day Admin JWT Token
    const adminToken = jwt.sign(
      { email: normalizedEmail, role: 'admin', authorizedAt: new Date().toISOString() },
      process.env.JWT_SECRET || 'freedomplan_jwt_dev_secret',
      { expiresIn: '7d' }
    );

    console.log(`[ADMIN LOGIN SUCCESSFUL] Authorized Admin: ${normalizedEmail}`);

    res.json({
      success: true,
      token: adminToken,
      adminEmail: normalizedEmail,
      message: 'Admin authorization successful.',
    });
  } catch (err) {
    console.error('[ADMIN VERIFY OTP ERROR]', err);
    res.status(500).json({ error: 'Internal server error verifying admin OTP.' });
  }
});

/**
 * GET /api/admin/subscriptions
 * Retrieves all customers with their current Free vs Premium status,
 * unifying Google Sheet seed, registered customers, subscriptions, and live Google Sheet sync.
 */
app.get('/api/admin/subscriptions', async (req, res) => {
  try {
    // 1. Process any expired accounts first
    checkAndProcessAllExpiries();

    // 2. Collect all unique email addresses across all stores
    const allEmails = new Set();

    GOOGLE_SHEET_EXISTING_CUSTOMERS.forEach((_, email) => {
      if (isValidCustomerEmail(email)) allEmails.add(email.toLowerCase().trim());
    });

    registeredCustomers.forEach(c => {
      if (isValidCustomerEmail(c.email)) allEmails.add(c.email.toLowerCase().trim());
    });

    subscriptions.forEach(s => {
      if (isValidCustomerEmail(s.email)) allEmails.add(s.email.toLowerCase().trim());
    });

    paidEmails.forEach(email => {
      if (isValidCustomerEmail(email)) allEmails.add(email.toLowerCase().trim());
    });

    premiumRequests.forEach(r => {
      if (isValidCustomerEmail(r.email)) allEmails.add(r.email.toLowerCase().trim());
    });

    // Optionally include sheet rows
    try {
      const sheetCustomers = await fetchGoogleSheetCustomers();
      if (Array.isArray(sheetCustomers)) {
        sheetCustomers.forEach(sc => {
          if (isValidCustomerEmail(sc.email)) allEmails.add(sc.email.toLowerCase().trim());
        });
      }
    } catch (_) {}

    // 3. Resolve each customer authoritatively using lookupCustomerByEmail
    const allUsers = [];
    const freeUsers = [];
    const activePremiumUsers = [];
    const expiredPremiumUsers = [];
    const adminUsers = [];

    allEmails.forEach(email => {
      const cust = lookupCustomerByEmail(email);
      if (!cust) return;

      allUsers.push(cust);

      if (cust.isAdmin || cust.accountType === 'Admin') {
        adminUsers.push(cust);
      } else if (cust.isPremium && cust.premiumStatus === 'Active') {
        activePremiumUsers.push(cust);
      } else if (cust.premiumStatus === 'Expired') {
        expiredPremiumUsers.push(cust);
      } else {
        freeUsers.push(cust);
      }
    });

    // Sort users by name or email
    const sortByName = (a, b) => (a.name || a.email).localeCompare(b.name || b.email);
    allUsers.sort(sortByName);
    freeUsers.sort(sortByName);
    activePremiumUsers.sort(sortByName);
    expiredPremiumUsers.sort(sortByName);
    adminUsers.sort(sortByName);

    // Calculate comprehensive leads: includes all premiumRequests AND all registered leads
    const leadMap = new Map();
    premiumRequests.forEach(r => {
      if (r.email) {
        const clean = r.email.toLowerCase().trim();
        leadMap.set(clean, {
          name: r.name || clean.split('@')[0],
          email: clean,
          phone: r.phone || '',
          plan: r.plan || 'FreedomPlan Premium',
          amount: r.amount || 499,
          duration: r.duration || '30d',
          status: r.status || 'payment_link_sent',
          paymentStatus: r.paymentStatus || 'Payment Link Sent',
          paymentLinkStatus: r.paymentLinkStatus || 'Sent',
          paymentLinkSentAt: r.paymentLinkSentAt || r.createdAt,
          createdAt: r.createdAt || new Date().toISOString(),
          source: 'Payment Request',
        });
      }
    });

    registeredCustomers.forEach(c => {
      if (c.email && isValidCustomerEmail(c.email)) {
        const clean = c.email.toLowerCase().trim();
        if (!leadMap.has(clean) && !paidEmails.has(clean)) {
          leadMap.set(clean, {
            name: c.name || clean.split('@')[0],
            email: clean,
            phone: c.phone || '',
            plan: 'FreedomPlan Free (Lead)',
            amount: 499,
            duration: '30d',
            status: 'registered_lead',
            paymentStatus: 'Payment Link Not Sent',
            paymentLinkStatus: 'Not Requested',
            paymentLinkSentAt: null,
            createdAt: c.createdAt || c.updatedAt || new Date().toISOString(),
            source: 'Registration',
          });
        }
      }
    });

    const allLeadsList = Array.from(leadMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      adminEmail: ADMIN_GMAIL,
      counts: {
        total: allUsers.length,
        free: freeUsers.length,
        activePremium: activePremiumUsers.length,
        expiredPremium: expiredPremiumUsers.length,
        admin: adminUsers.length,
        leads: allLeadsList.length,
      },
      customers: allUsers,
      freeUsers,
      activePremiumUsers,
      expiredPremiumUsers,
      adminUsers,
      premiumRequests: allLeadsList,
      adminHistory,
      syncDiagnostics: {
        connected: sheetSyncStatus.ok,
        lastSync: lastSheetSyncTime,
        pendingRecords: 0,
        failedRecords: failedSyncQueue.length,
        failedSyncQueue,
      },
      aiIntelligence: analyzePlatformIntelligence(),
      lastSheetSync: lastSheetSyncTime,
      sheetSyncStatus,
    });
  } catch (err) {
    console.error('[GET SUBSCRIPTIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to load customer subscriptions.' });
  }
});

/**
 * GET /api/admin/ai-intelligence
 * Live operational diagnostics and AI insight feed
 */
app.get('/api/admin/ai-intelligence', (req, res) => {
  try {
    const ai = analyzePlatformIntelligence();
    res.json({ success: true, ...ai });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate AI intelligence diagnostics: ' + err.message });
  }
});

/**
 * POST /api/admin/ai-trigger-action
 * Action trigger assistant for AI recommendations
 */
app.post('/api/admin/ai-trigger-action', async (req, res) => {
  try {
    const { action, payload } = req.body || {};

    if (action === 'PREVIEW_FRIDAY_CAMPAIGN' || action === 'TRIGGER_FRIDAY_CAMPAIGN') {
      const { executeFridayCampaign } = require('./marketing/scheduler');
      const result = await executeFridayCampaign({ isManual: true, force: true });
      return res.json({
        success: true,
        message: 'Friday campaign executed successfully via AI Campaign Assistant.',
        result,
      });
    }

    if (action === 'RETRY_SYNC_QUEUE') {
      const pending = [...failedSyncQueue];
      failedSyncQueue = [];
      try { fs.writeFileSync(FAILED_SYNC_FILE, JSON.stringify([], null, 2)); } catch (_) {}
      for (const item of pending) {
        try { await syncToGoogleSheet(item.payload); } catch (_) {}
      }
      return res.json({
        success: true,
        message: `Successfully retried ${pending.length} failed Google Sheet synchronization records.`,
      });
    }

    if (action === 'SYNC_MISSING_LEAD' && payload?.email) {
      saveRegisteredCustomer({
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        tier: 'basic',
        source: 'ai_lead_recovery',
      });
      return res.json({
        success: true,
        message: `Lead ${payload.email} recovered and synchronized into registered customer store.`,
      });
    }

    if (action === 'RESEND_PAYMENT_LINK' && payload?.email) {
      return res.json({
        success: true,
        message: `Payment reminder flagged for ${payload.email}.`,
      });
    }

    res.json({ success: true, message: 'AI diagnostic action executed.' });
  } catch (err) {
    console.error('[AI TRIGGER ACTION ERROR]', err);
    res.status(500).json({ error: 'Failed to execute AI action: ' + err.message });
  }
});

/**
 * GET /api/admin/campaign/audience
 * Preview full validated campaign audience breakdown (total, valid, test, duplicate, invalid)
 */
app.get('/api/admin/campaign/audience', (req, res) => {
  try {
    const { getValidatedCampaignAudience } = require('./marketing/campaignAudienceValidator');
    const audienceReport = getValidatedCampaignAudience({ additionalRecords: cachedSheetCustomers });
    res.json({ success: true, ...audienceReport });
  } catch (err) {
    console.error('[CAMPAIGN AUDIENCE ERROR]', err);
    res.status(500).json({ error: 'Failed to calculate campaign audience: ' + err.message });
  }
});

/**
 * POST /api/admin/campaign/refresh-audience
 * Trigger live Google Sheet sync, re-filter, and return refreshed audience
 */
app.post('/api/admin/campaign/refresh-audience', async (req, res) => {
  try {
    await fetchGoogleSheetCustomers();
    const { getValidatedCampaignAudience } = require('./marketing/campaignAudienceValidator');
    const audienceReport = getValidatedCampaignAudience({ additionalRecords: cachedSheetCustomers });
    res.json({
      success: true,
      message: `Audience refreshed. Found ${audienceReport.summary.validCustomers} genuine customer accounts across database and Google Sheets.`,
      ...audienceReport,
    });
  } catch (err) {
    console.error('[REFRESH AUDIENCE ERROR]', err);
    res.status(500).json({ error: 'Failed to refresh campaign audience: ' + err.message });
  }
});

/**
 * POST /api/admin/send-customer-payment-link
 * Manually send payment link to a specific customer
 */
app.post('/api/admin/send-customer-payment-link', async (req, res) => {
  try {
    const { email, name, plan = 'Premium', amount = 499 } = req.body || {};
    if (!email || !isValidCustomerEmail(email)) {
      return res.status(400).json({ error: 'A valid customer email address is required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const paymentUrl = `${process.env.APP_URL || 'http://localhost:5173'}/?payment=true&email=${encodeURIComponent(cleanEmail)}&plan=${encodeURIComponent(plan)}`;

    savePremiumRequest({
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      plan,
      amount,
      status: 'payment_link_sent',
      paymentStatus: 'Payment Link Sent',
      paymentLinkSentAt: new Date().toISOString(),
      paymentUrl,
    });

    logAdminActivity({
      email: cleanEmail,
      action: 'PAYMENT_LINK_SENT',
      plan,
      paymentStatus: 'Payment Link Sent',
      updatedBy: 'Admin Direct Dispatch',
    });

    syncToGoogleSheet({
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      accountType: 'Free',
      premiumStatus: 'None',
      paymentStatus: 'Payment Link Sent',
      action: 'PAYMENT_LINK_SENT',
    });

    const mailer = getNotificationTransporter();
    if (mailer) {
      try {
        await mailer.sendMail({
          from: process.env.MARKETING_FROM_EMAIL || `"FreedomPlan Billing" <${process.env.SMTP_USER || 'FreedomPlan786@gmail.com'}>`,
          to: cleanEmail,
          subject: 'Complete Your FreedomPlan Premium Upgrade 🚀',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
              <div style="background: #002B5B; color: #ffffff; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 18px;">FreedomPlan Premium Activation</h2>
              </div>
              <p style="color: #1e293b; font-size: 14px; line-height: 1.6;">Hello <strong>${name || cleanEmail.split('@')[0]}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">Your personalized payment link for the <strong>${plan} Plan</strong> has been prepared. Click below to complete your activation and unlock unlimited simulations and priority support.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${paymentUrl}" style="background: #0052CC; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px;">Complete Payment & Activate →</a>
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5;">Or copy this URL directly into your browser:<br/><a href="${paymentUrl}" style="color: #0052CC; word-break: break-all;">${paymentUrl}</a></p>
            </div>
          `,
        });
        console.log(`[PAYMENT LINK EMAIL DELIVERED] Dispatched payment link to ${cleanEmail}`);
      } catch (mailErr) {
        console.warn('[PAYMENT LINK EMAIL WARNING]', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: `Payment link successfully prepared and dispatched to ${cleanEmail}.`,
      paymentUrl,
    });
  } catch (err) {
    console.error('[SEND CUSTOMER PAYMENT LINK ERROR]', err);
    res.status(500).json({ error: 'Failed to send payment link: ' + err.message });
  }
});

/**
 * POST /api/admin/send-bulk-promotional-links
 * Send promotional payment links to all genuine validated customers
 */
app.post('/api/admin/send-bulk-promotional-links', async (req, res) => {
  try {
    const { getValidatedCampaignAudience } = require('./marketing/campaignAudienceValidator');
    const audienceReport = getValidatedCampaignAudience({ additionalRecords: cachedSheetCustomers });
    const validAudience = audienceReport.validAudience;

    const mailer = getNotificationTransporter();
    let dispatchedCount = 0;
    for (const customer of validAudience) {
      const paymentUrl = `${process.env.APP_URL || 'http://localhost:5173'}/?payment=true&email=${encodeURIComponent(customer.email)}&promo=friday_special`;
      savePremiumRequest({
        email: customer.email,
        name: customer.name,
        plan: 'Premium Promo',
        status: 'promotional_link_sent',
        paymentStatus: 'Promotional Link Sent',
        paymentLinkSentAt: new Date().toISOString(),
        paymentUrl,
      });

      if (mailer) {
        mailer.sendMail({
          from: process.env.MARKETING_FROM_EMAIL || `"FreedomPlan Offers" <${process.env.SMTP_USER || 'FreedomPlan786@gmail.com'}>`,
          to: customer.email,
          subject: '⚡ Special Promotional Access: Upgrade to FreedomPlan Premium',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #FF3366, #E00034); color: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px;">Exclusive Student Promotion 🎓</h2>
                <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Special Limited Time Access for UK Students</p>
              </div>
              <p style="color: #1e293b; font-size: 14px; line-height: 1.6;">Hello <strong>${customer.name || customer.email.split('@')[0]}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">You have been selected for our special promotional rate on FreedomPlan Premium. Unlock full multi-loan EMI scheduling, forex optimization, and priority support.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${paymentUrl}" style="background: #FF3366; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 15px;">Claim Promotional Upgrade →</a>
              </div>
              <p style="color: #64748b; font-size: 12px;">Link: <a href="${paymentUrl}" style="color: #FF3366;">${paymentUrl}</a></p>
            </div>
          `,
        }).then(() => {
          console.log(`[PROMO EMAIL DELIVERED] Dispatched to ${customer.email}`);
        }).catch(err => {
          console.warn(`[PROMO EMAIL WARNING] ${customer.email}:`, err.message);
        });
      }
      dispatchedCount++;
    }

    logAdminActivity({
      email: 'ALL_VALID_CUSTOMERS',
      action: 'BULK_PROMOTIONAL_LINKS_DISPATCHED',
      plan: 'Premium Promo',
      paymentStatus: 'Promotional Link Sent',
      updatedBy: 'Admin Bulk Dispatch',
    });

    res.json({
      success: true,
      message: `Promotional payment links prepared and dispatched to all ${dispatchedCount} genuine validated customer accounts.`,
      audienceCount: validAudience.length,
      dispatchedCount,
    });
  } catch (err) {
    console.error('[BULK PROMO PAYMENT LINKS ERROR]', err);
    res.status(500).json({ error: 'Failed to send bulk promotional links: ' + err.message });
  }
});

/**
 * POST /api/webhooks/google-sheets
 * Ingests live rows from Google Sheets (onEdit, onFormSubmit, or webhook)
 */
app.post(['/api/webhooks/google-sheets', '/api/admin/google-sheet-webhook'], async (req, res) => {
  try {
    console.log('[GOOGLE SHEETS INCOMING WEBHOOK]', req.body);
    const body = req.body || {};
    const rows = Array.isArray(body) ? body : (body.rows || body.data || [body]);
    const imported = [];

    rows.forEach(row => {
      const email = (row.email || row.Email || row['Customer Email'] || row['email address'] || row.gmail || '').toLowerCase().trim();
      if (email && email.includes('@') && isValidCustomerEmail(email)) {
        const name = row.name || row.Name || row['Customer Name'] || row['Full Name'] || email.split('@')[0];
        const phone = row.phone || row.Phone || row.mobile || row.Mobile || '';
        const loanAmount = Number(row.loanAmount || row['Loan Amount'] || row.loan || row.amount) || 2500000;
        const ukStatus = row.ukStatus || row['UK Status'] || row.status || row.isOutsideUK || '';
        const isOutsideUK = typeof ukStatus === 'boolean' ? ukStatus : (/outside/i.test(String(ukStatus)) || String(ukStatus).toLowerCase() === 'true');
        const plan = /premium|pro/i.test(row.plan || row.Plan || row.tier || row.Tier || '') ? 'pro' : 'basic';

        const record = saveRegisteredCustomer({
          email,
          name,
          phone,
          loanAmount,
          isOutsideUK,
          tier: plan,
          source: 'google_sheet_webhook',
        });
        if (record) imported.push(record);
      }
    });

    res.json({
      success: true,
      message: `Successfully processed ${imported.length} row(s) from Google Sheet webhook.`,
      importedCount: imported.length,
      customers: imported,
    });
  } catch (err) {
    console.error('[GOOGLE SHEETS WEBHOOK ERROR]', err);
    res.status(500).json({ error: 'Failed to process Google Sheet webhook: ' + err.message });
  }
});

app.post('/api/admin/sync-retry', async (req, res) => {
  const pending = [...failedSyncQueue];
  failedSyncQueue = [];
  try { fs.writeFileSync(FAILED_SYNC_FILE, JSON.stringify([], null, 2)); } catch (_) {}

  let retriedCount = 0;
  for (const item of pending) {
    try {
      await syncToGoogleSheet(item.payload);
      retriedCount++;
    } catch (_) {}
  }

  res.json({
    success: true,
    message: `Retried ${retriedCount} records.`,
    remainingFailed: failedSyncQueue.length,
  });
});

/**
 * POST /api/admin/sync-sheet
 * Manually trigger or configure a Google Sheet sync with an optional sheet URL or manual rows.
 */
app.post('/api/admin/sync-sheet', async (req, res) => {
  try {
    const { sheetUrl, manualRows } = req.body || {};
    let importedRows = [];

    if (Array.isArray(manualRows) && manualRows.length > 0) {
      manualRows.forEach(row => {
        const cleanEmail = (row.email || row.Email || row['Customer Email'] || row.gmail || '').toLowerCase().trim();
        if (cleanEmail && cleanEmail.includes('@') && isValidCustomerEmail(cleanEmail)) {
          saveRegisteredCustomer({
            email: cleanEmail,
            name: row.name || row.Name || cleanEmail.split('@')[0],
            phone: row.phone || row.Phone || '',
            loanAmount: Number(row.loanAmount || row['Loan Amount']) || 2500000,
            isOutsideUK: !!row.isOutsideUK,
            tier: /premium|pro/i.test(row.plan || row.tier || '') ? 'pro' : 'basic',
            source: 'google_sheet_manual_sync',
          });
          importedRows.push(cleanEmail);
        }
      });
      lastSheetSyncTime = new Date().toISOString();
      sheetSyncStatus = { ok: true, message: `Successfully synced ${importedRows.length} customer rows`, count: importedRows.length };
    } else {
      const fetched = await fetchGoogleSheetCustomers(sheetUrl || null);
      if (Array.isArray(fetched) && fetched.length > 0) {
        fetched.forEach(sc => {
          if (sc.email && sc.email.includes('@') && isValidCustomerEmail(sc.email)) {
            saveRegisteredCustomer({
              email: sc.email,
              name: sc.name,
              phone: sc.phone,
              loanAmount: sc.loanAmount,
              isOutsideUK: sc.isOutsideUK,
              tier: sc.plan === 'Premium' ? 'pro' : 'basic',
              source: 'google_sheet_auto_sync',
            });
            importedRows.push(sc.email);
          }
        });
      }
    }

    // Build unified list to return
    const customerMap = new Map();
    GOOGLE_SHEET_EXISTING_CUSTOMERS.forEach((seed, email) => {
      if (!isValidCustomerEmail(email)) return;
      const cleanEmail = email.toLowerCase().trim();
      const isPaid = paidEmails.has(cleanEmail);
      customerMap.set(cleanEmail, {
        email: cleanEmail,
        name: seed.name,
        phone: seed.phone || '',
        loanAmount: seed.loanAmount || 2500000,
        isOutsideUK: seed.isOutsideUK ?? false,
        plan: isPaid ? 'Premium' : (seed.tier === 'pro' ? 'Premium' : 'Free'),
        isPremium: isPaid || seed.tier === 'pro',
        source: 'google_sheet_seed',
        updatedAt: new Date().toISOString(),
      });
    });

    registeredCustomers.forEach(cust => {
      const cleanEmail = (cust.email || '').toLowerCase().trim();
      if (!cleanEmail || !isValidCustomerEmail(cleanEmail)) return;
      const existing = customerMap.get(cleanEmail) || {};
      const isPaid = paidEmails.has(cleanEmail) || cust.tier === 'pro' || cust.isPremium;
      customerMap.set(cleanEmail, {
        email: cleanEmail,
        name: cust.name || existing.name || cleanEmail.split('@')[0],
        phone: cust.phone || existing.phone || '',
        loanAmount: cust.loanAmount || existing.loanAmount || 2500000,
        isOutsideUK: cust.isOutsideUK ?? existing.isOutsideUK ?? false,
        plan: isPaid ? 'Premium' : (existing.plan || 'Free'),
        isPremium: isPaid,
        source: cust.source || existing.source || 'registration',
        updatedAt: cust.updatedAt || existing.updatedAt || new Date().toISOString(),
      });
    });

    subscriptions.forEach(s => {
      const cleanEmail = (s.email || '').toLowerCase().trim();
      if (!cleanEmail || !isValidCustomerEmail(cleanEmail)) return;
      const existing = customerMap.get(cleanEmail) || {};
      const isPaid = s.plan === 'Premium' || s.isPremium || paidEmails.has(cleanEmail);
      customerMap.set(cleanEmail, {
        email: cleanEmail,
        name: s.name || existing.name || cleanEmail.split('@')[0],
        phone: existing.phone || '',
        loanAmount: existing.loanAmount || 2500000,
        isOutsideUK: existing.isOutsideUK ?? false,
        plan: isPaid ? 'Premium' : (existing.plan || 'Free'),
        isPremium: isPaid,
        source: s.updatedBy || existing.source || 'admin_assigned',
        updatedAt: s.updatedAt || existing.updatedAt || new Date().toISOString(),
      });
    });

    paidEmails.forEach(email => {
      const cleanEmail = (email || '').toLowerCase().trim();
      if (!cleanEmail || !isValidCustomerEmail(cleanEmail)) return;
      const existing = customerMap.get(cleanEmail) || {};
      customerMap.set(cleanEmail, {
        email: cleanEmail,
        name: existing.name || cleanEmail.split('@')[0],
        phone: existing.phone || '',
        loanAmount: existing.loanAmount || 2500000,
        isOutsideUK: existing.isOutsideUK ?? false,
        plan: 'Premium',
        isPremium: true,
        source: 'payment',
        updatedAt: existing.updatedAt || new Date().toISOString(),
      });
    });

    const cleanSyncList = Array.from(customerMap.values()).filter(c => isValidCustomerEmail(c.email));

    res.json({
      success: true,
      message: sheetSyncStatus.message || `Synced ${importedRows.length} customers successfully.`,
      syncedCount: importedRows.length,
      customers: cleanSyncList,
      lastSheetSync: lastSheetSyncTime,
      sheetSyncStatus,
    });
  } catch (err) {
    console.error('[SYNC SHEET ERROR]', err);
    res.status(500).json({ error: 'Failed to sync with Google Sheet: ' + err.message });
  }
});

/**
 * Persistent Promotions Store
 */
const PROMOTIONS_FILE = path.join(__dirname, 'data', 'promotions.json');
let promotions = [];
if (fs.existsSync(PROMOTIONS_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(PROMOTIONS_FILE, 'utf8'));
    promotions = Array.isArray(raw) ? raw : [];
  } catch (_) {}
}
if (promotions.length === 0) {
  promotions = [
    {
      id: 'promo-uk-student-special',
      name: 'UK Student Special',
      type: 'Free Premium Access',
      duration: '30d',
      status: 'Active',
      description: 'Special 30-day Premium access for students planning for UK universities.',
      recipientsCount: 14,
      createdAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'promo-premium-trial',
      name: 'Premium Trial',
      type: 'Free Trial',
      duration: '7d',
      status: 'Active',
      description: '7-day complimentary trial for new student registrations.',
      recipientsCount: 32,
      createdAt: '2026-08-20T12:00:00.000Z',
    },
    {
      id: 'promo-student-support',
      name: 'Student Support Offer',
      type: 'Special Offer',
      duration: '60d',
      status: 'Active',
      description: 'Complimentary 2-month access for students managing educational loans.',
      recipientsCount: 9,
      createdAt: '2026-08-28T09:30:00.000Z',
    },
    {
      id: 'promo-limited-access',
      name: 'Limited-Time Access',
      type: 'Promotional Access',
      duration: '15d',
      status: 'Active',
      description: '15-day promotional access for university expo participants.',
      recipientsCount: 6,
      createdAt: '2026-09-01T11:00:00.000Z',
    }
  ];
  try {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2));
  } catch (_) {}
}

/**
 * POST /api/admin/set-subscription
 * Admin assigns Free or Premium status to any customer dynamically,
 * with full duration, expiry, and reason tracking.
 */
app.post('/api/admin/set-subscription', (req, res) => {
  try {
    const {
      email,
      plan,
      name,
      duration = '30d',
      startDate,
      expiryDate,
      reason = 'Manual Premium Access',
      customDays,
      action = 'ASSIGN',
      extendDays,
    } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid customer email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const targetPlan = plan === 'Premium' ? 'Premium' : 'Free';

    const record = saveSubscriptionRecord({
      email: normalizedEmail,
      plan: targetPlan,
      name,
      duration,
      startDate,
      expiryDate,
      reason,
      customDays,
      action,
      extendDays,
      updatedBy: 'Freedom CRM Admin',
    });

    console.log(`[SUBSCRIPTION UPDATED] Customer: ${normalizedEmail} -> Plan: ${record.plan} (Status: ${record.premiumStatus}, Expiry: ${record.premiumExpiryDate || 'None'})`);

    res.json({
      success: true,
      message: `Customer ${normalizedEmail} subscription updated to ${record.plan}.`,
      record,
      customer: record,
    });
  } catch (err) {
    console.error('[SET SUBSCRIPTION ERROR]', err);
    res.status(500).json({ error: 'Failed to update customer subscription.' });
  }
});

/**
 * POST /api/admin/payment-link/create
 * Admin creates or records a payment link manually with full tracking
 */
app.post('/api/admin/payment-link/create', async (req, res) => {
  try {
    const { email, name, phone, amount = 499, plan = 'FreedomPlan Premium', duration = '30d', sendEmail = false } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid customer email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date().toISOString();
    const cleanName = name || normalizedEmail.split('@')[0];

    const linkRecord = {
      name: cleanName,
      email: normalizedEmail,
      phone: phone || '',
      plan,
      amount: Number(amount) || 499,
      duration,
      status: 'payment_link_sent',
      paymentStatus: 'Payment Link Sent',
      paymentLinkStatus: 'Sent',
      paymentLinkSentAt: now,
      createdAt: now,
    };

    savePremiumRequest(linkRecord);

    // Synchronize to Google Sheets
    syncToGoogleSheet({
      name: cleanName,
      email: normalizedEmail,
      phone: phone || '',
      accountType: 'Free',
      premiumStatus: 'Pending',
      paymentStatus: 'Payment Link Sent',
      paymentLinkStatus: 'Sent',
      paymentLinkSentAt: now,
      action: 'PAYMENT_LINK_SENT',
    });

    logAdminActivity({
      email: normalizedEmail,
      action: 'PAYMENT_LINK_SENT',
      amount,
      plan,
      duration,
      updatedBy: 'Freedom CRM Admin',
    });

    res.json({
      success: true,
      message: `Payment link recorded for ${normalizedEmail}.`,
      linkRecord,
    });
  } catch (err) {
    console.error('[CREATE PAYMENT LINK ERROR]', err);
    res.status(500).json({ error: 'Failed to create payment link record.' });
  }
});

/**
 * POST /api/admin/payment-link/confirm
 * Admin manually confirms a payment received and upgrades the customer account immediately
 */
app.post('/api/admin/payment-link/confirm', (req, res) => {
  try {
    const { email, duration = '1y', reason = 'Paid Subscription', transactionId } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid customer email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = saveSubscriptionRecord({
      email: normalizedEmail,
      plan: 'Premium',
      duration,
      reason,
      paymentStatus: 'Payment Completed',
      action: 'ASSIGN',
      updatedBy: 'Freedom CRM Admin (Payment Confirmed)',
    });

    // Update premium request status if exists
    const reqIdx = premiumRequests.findIndex(r => r.email === normalizedEmail);
    if (reqIdx >= 0) {
      premiumRequests[reqIdx].status = 'payment_completed';
      premiumRequests[reqIdx].transactionId = transactionId || 'MANUAL_VERIFIED';
      premiumRequests[reqIdx].confirmedAt = new Date().toISOString();
      try {
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(premiumRequests, null, 2));
      } catch (_) {}
    }

    logAdminActivity({
      email: normalizedEmail,
      action: 'PAYMENT_CONFIRMED_UPGRADE',
      transactionId: transactionId || 'MANUAL_VERIFIED',
      duration,
      reason,
      updatedBy: 'Freedom CRM Admin',
    });

    res.json({
      success: true,
      message: `Payment confirmed! ${normalizedEmail} successfully upgraded to Premium.`,
      record,
    });
  } catch (err) {
    console.error('[CONFIRM PAYMENT ERROR]', err);
    res.status(500).json({ error: 'Failed to confirm payment.' });
  }
});

/**
 * PROMOTION MANAGEMENT ROUTES
 */
app.get('/api/admin/promotions', (req, res) => {
  res.json({
    success: true,
    promotions,
    totalPromotions: promotions.length,
    activePromotions: promotions.filter(p => p.status === 'Active').length,
  });
});

app.post('/api/admin/promotions', (req, res) => {
  try {
    const { name, duration = '30d', type = 'Free Premium Access', description = '', customDays } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Promotion name is required' });
    }

    const newPromo = {
      id: 'promo_' + Date.now(),
      name: name.trim(),
      duration: duration === 'custom_days' ? `${customDays}d` : duration,
      type,
      status: 'Active',
      description: description.trim(),
      recipientsCount: 0,
      createdAt: new Date().toISOString(),
    };

    promotions.unshift(newPromo);
    try {
      fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2));
    } catch (_) {}

    logAdminActivity({
      action: 'CREATE_PROMOTION',
      promoName: newPromo.name,
      duration: newPromo.duration,
      updatedBy: 'Freedom CRM Admin',
    });

    res.json({ success: true, promotion: newPromo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create promotion.' });
  }
});

app.post('/api/admin/promotions/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const promo = promotions.find(p => p.id === id);
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });

    promo.status = status;
    try {
      fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2));
    } catch (_) {}

    res.json({ success: true, promotion: promo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update promotion status.' });
  }
});

app.post('/api/admin/promotions/assign', (req, res) => {
  try {
    const { email, promotionId, customDuration } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid customer email is required' });
    }

    const promo = promotions.find(p => p.id === promotionId) || { name: 'Special Promotion', duration: '30d' };
    const effectiveDuration = customDuration || promo.duration || '30d';

    const record = saveSubscriptionRecord({
      email,
      plan: 'Premium',
      duration: effectiveDuration,
      reason: `Promo: ${promo.name}`,
      action: 'ASSIGN',
      updatedBy: 'Freedom CRM Admin (Promotion Console)',
    });

    promo.recipientsCount = (promo.recipientsCount || 0) + 1;
    try {
      fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(promotions, null, 2));
    } catch (_) {}

    res.json({
      success: true,
      message: `Assigned promotion "${promo.name}" (${effectiveDuration}) to ${email}.`,
      record,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign promotional access.' });
  }
});

app.get('/api/admin/activity-history', (req, res) => {
  res.json({
    success: true,
    history: adminHistory,
  });
});

/**
 * Legacy support for manual approval / requests
 */
app.post('/api/admin/approve-premium', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const record = saveSubscriptionRecord({ email, plan: 'Premium', duration: '1y', reason: 'Manual Approval' });
  res.json({ success: true, isPremium: true, email: record.email });
});

app.post('/api/admin/revoke-premium', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const record = saveSubscriptionRecord({ email, plan: 'Free', action: 'CANCEL', reason: 'Admin Revoked' });
  res.json({ success: true, isPremium: false, email: record.email });
});

app.get('/api/admin/premium-requests', (req, res) => {
  res.json({
    requests: premiumRequests,
    paidEmails: [...paidEmails],
    subscriptions,
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
// AUTH ROUTES & CUSTOMER RECOGNITION PIPELINE
// =============================================================================

app.get('/api/auth/me', (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const customer = lookupCustomerByEmail(normalizedEmail);
  const isPremium = Boolean(customer?.isPremium && customer?.premiumStatus === 'Active');

  res.json({
    email: normalizedEmail,
    isPremium,
    customer,
  });
});

/**
 * POST /api/auth/check-customer
 * Step 1: Checks if the entered Gmail belongs to an existing customer.
 * - If MATCH: Returns existing customer info & sends login OTP.
 * - If NO MATCH: Returns exists: false so user registers as a new customer (without OTP).
 */
app.post('/api/auth/check-customer', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = lookupCustomerByEmail(normalizedEmail);

    if (existing) {
      const isPro = !!(existing.isPremium || existing.tier === 'pro' || paidEmails.has(normalizedEmail));
      const plan = isPro ? 'premium' : 'free';

      // Customer exists! Generate & dispatch OTP for fast login
      const otp = crypto.randomInt(100000, 999999).toString();
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      console.log(`[EXISTING CUSTOMER RECOGNIZED] Email: ${normalizedEmail} | Name: ${existing.name || 'User'} | Plan: ${plan} | Generated OTP: ${otp}`);

      // Dispatch OTP email
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

          const fromAddress = process.env.SMTP_USER ? `"Freedom Plan" <${process.env.SMTP_USER.trim()}>` : '"Freedom Plan" <FreedomPlan786@gmail.com>';
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
          }).then(info => {
            console.log(`[EXISTING CUSTOMER OTP EMAIL DELIVERED] Dispatched to ${normalizedEmail} (ID: ${info.messageId || 'ok'})`);
          }).catch(mailErr => {
            console.warn('[OTP EMAIL DISPATCH WARNING]', mailErr.message);
          });
        } catch (mailErr) {
          console.warn('[OTP EMAIL DISPATCH WARNING]', mailErr.message);
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

    // Customer does NOT exist -> New Customer path
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

/**
 * POST /api/auth/register-customer
 * Step 2 (New Customer): Creates a new customer record directly with Name, Mobile, Loan Amount, UK Status, Gmail.
 * NO OTP REQUIRED during new registration.
 */
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
    // If this registration ID or email was processed within the last 5 minutes (300,000 ms),
    // return the existing registration without writing a duplicate row or sending duplicate emails.
    const existingProcess = processedRegistrations.get(regId) || processedRegistrations.get(idempotencyKey);
    if (existingProcess && (Date.now() - existingProcess.timestamp < 5 * 60 * 1000)) {
      console.log(`[IDEMPOTENCY DUPLICATE PREVENTED] Registration for ${normalizedEmail} was already executed (${Math.round((Date.now() - existingProcess.timestamp) / 1000)}s ago). Skipping duplicate Google Sheet write and email.`);
      return res.json({
        success: true,
        message: 'Customer registration already processed (duplicate prevented).',
        isDuplicate: true,
        customer: existingProcess.customer || lookupCustomerByEmail(normalizedEmail) || {
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
    const existingCust = lookupCustomerByEmail(normalizedEmail);
    if (existingCust) {
      console.log(`[EXISTING CUSTOMER BLOCKED FROM NEW REGISTRATION] Email: ${normalizedEmail}`);
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in using your security code.',
        exists: true,
        customer: existingCust,
      });
    }

    // Mark as in-flight
    processedRegistrations.set(regId, { key: regId, timestamp: Date.now(), email: normalizedEmail, status: 'processing' });
    processedRegistrations.set(idempotencyKey, { key: idempotencyKey, timestamp: Date.now(), email: normalizedEmail, status: 'processing' });

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

    // 1. Save customer record permanently
    const customer = saveRegisteredCustomer({
      name: cleanName,
      email: normalizedEmail,
      phone: cleanPhone,
      loanAmount: numLoan,
      isOutsideUK: isOutside,
      whatsappUpdates: isWhatsAppEnabled,
      tier: 'basic',
      isPremium: false,
    });

    // 2. Also register in subscriptions.json
    saveSubscriptionRecord({
      email: normalizedEmail,
      plan: 'Free',
      name: cleanName,
      updatedBy: 'Self Registration',
    });

    // 3. Register in marketing subscribers
    try {
      const marketingStore = require('./marketing/store');
      marketingStore.addSubscriber({
        email: normalizedEmail,
        name: cleanName,
        consent: isWhatsAppEnabled,
        source: 'registration',
      });
    } catch (_) {}

    // 4. Sync to Google Sheets (Backend authoritative sync - exactly ONCE)
    syncToGoogleSheet({
      // Primary keys (Capitalized)
      'Name': cleanName,
      'Email': normalizedEmail,
      'Phone': cleanPhone,
      'Loan Amount': numLoan,
      'UK Status': isOutside ? 'Outside the UK' : 'Inside the UK',
      'WhatsApp Updates': isWhatsAppEnabled ? 'Enabled' : 'Disabled',
      'Registered At': new Date().toLocaleString('en-GB'),
      'Source': 'FreedomPlan Registration',
      // Secondary keys (lowercase/camelCase)
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

    // 5. WhatsApp Invitation Queue
    if (isWhatsAppEnabled && cleanPhone) {
      queueWhatsAppInvitation({
        phone: cleanPhone,
        name: cleanName,
        email: normalizedEmail,
        loanAmount: numLoan,
        whatsappUpdatesEnabled: true,
      }).catch(err => console.error('[WHATSAPP NOTIFY ERROR]', err));
    }

    // 6. Admin Email Notification (Sent ONCE on first registration)
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

    // Mark completed in idempotency cache
    const finalRecord = {
      key: idempotencyKey,
      timestamp: Date.now(),
      registrationId: regId,
      email: normalizedEmail,
      status: 'completed',
      customer,
    };
    processedRegistrations.set(regId, finalRecord);
    processedRegistrations.set(idempotencyKey, finalRecord);
    persistProcessedRegistrations();

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
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
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
      otp: String(otp).trim(),
      expiresAt: Date.now() + 15 * 60 * 1000,
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

      const fromAddress = process.env.SMTP_USER ? `"Freedom Plan" <${process.env.SMTP_USER.trim()}>` : '"Freedom Plan" <FreedomPlan786@gmail.com>';
      transporter.sendMail({
        from: fromAddress,
        to: normalizedEmail,
        subject: 'Your Login Security Code',
        text: `Your login code is: ${otp}. It will expire in 15 minutes.`,
        html: emailHtml,
        priority: 'high',
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
          'Auto-Submitted': 'auto-generated'
        }
      }).then(info => {
        console.log(`[OTP EMAIL DELIVERED] Dispatched to ${normalizedEmail} (ID: ${info.messageId || 'ok'})`);
      }).catch(mailErr => {
        console.warn('[OTP EMAIL DISPATCH WARNING]', mailErr.message);
      });
    }

    res.json({ message: 'OTP sent successfully', email: normalizedEmail });
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
  const cleanEnteredOtp = String(otp).replace(/\D/g, '').trim();
  const storedData = otpStore.get(normalizedEmail);

  console.log(`[CUSTOMER VERIFY ATTEMPT] Email: ${normalizedEmail} | Entered OTP: ${cleanEnteredOtp} | Stored OTP: ${storedData?.otp}`);

  if (!storedData) {
    return res.status(400).json({ error: 'No active OTP found. Please request a new code.' });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  const storedOtpString = String(storedData.otp).trim();
  if (storedOtpString !== cleanEnteredOtp) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your latest email.' });
  }

  otpStore.delete(normalizedEmail);
  const existing = lookupCustomerByEmail(normalizedEmail);
  const isPro = !!(existing?.isPremium || existing?.tier === 'pro' || paidEmails.has(normalizedEmail));
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
      transporter.sendMail({
        from: '"Freedom Plan" <FreedomPlan786@gmail.com>',
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
