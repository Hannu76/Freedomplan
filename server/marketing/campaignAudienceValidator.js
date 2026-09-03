const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'registeredCustomers.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'premiumRequests.json');
const UNSUBSCRIBES_FILE = path.join(__dirname, 'data', 'marketing_unsubscribes.json');
const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'marketing_subscribers.json');

// Standard known test domains
const TEST_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'testing.com',
  'sample.com',
  'localhost',
  'tempmail.com',
  'mailinator.com',
]);

// Test prefix keywords that are not genuine customer usernames
const TEST_USERNAMES = new Set([
  'test',
  'tester',
  'testing',
  'testuser',
  'demo',
  'demouser',
  'sample',
  'dummy',
  'fake',
  'dev',
  'developer',
]);

/**
 * Validates whether an email has valid RFC syntax and real deliverable structure
 */
function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.toLowerCase().trim();
  if (clean.length < 5 || clean.length > 254) return false;
  
  // RFC 5322 standard email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) return false;

  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [user, domain] = parts;
  if (!domain.includes('.')) return false;

  // Reject single-letter or empty domain parts
  const domainParts = domain.split('.');
  if (domainParts.some(p => p.length === 0) || domainParts[domainParts.length - 1].length < 2) {
    return false;
  }

  // Reject gibberish user parts (e.g. >= 7 consonants with no vowel before @)
  if (/^[bcdfghjklmnpqrstvwxyz]{7,}$/.test(user)) {
    return false;
  }

  return true;
}

/**
 * Checks if an email is a test / fake / development account
 * CRITICAL RULE: Genuine students with 'student' in email (e.g. student.john@gmail.com) are ALLOWED.
 * Only timestamped dummy patterns (e.g. student_1788... or test...) are filtered.
 */
function isTestAccount(email) {
  if (!email) return { isTest: true, reason: 'Empty email' };
  const clean = email.toLowerCase().trim();
  const [user, domain] = clean.split('@');

  // 1. Check test domain
  if (domain && TEST_DOMAINS.has(domain)) {
    return { isTest: true, reason: `Test domain: @${domain}` };
  }

  // 2. Check exact test username
  if (user && TEST_USERNAMES.has(user)) {
    return { isTest: true, reason: `Test account keyword: '${user}'` };
  }

  // 3. Check timestamped synthetic test patterns (e.g. student_1788407614986, test_1787...)
  if (/^student_\d{6,}/.test(user)) {
    return { isTest: true, reason: 'Generated timestamp test account (student_TIMESTAMP)' };
  }
  if (/^test(_|\d)/.test(user) || /^tester(_|\d)/.test(user) || /^testuser(_|\d)/.test(user)) {
    return { isTest: true, reason: 'Test user identifier pattern' };
  }
  if (/^dummy(_|\d)/.test(user) || /^demo(_|\d)/.test(user) || /^fake(_|\d)/.test(user)) {
    return { isTest: true, reason: 'Demo/dummy user identifier pattern' };
  }
  if (clean.includes('idempotent_user') || clean.includes('live_verify') || clean.includes('brand_new_') || clean.includes('ukuser1_') || clean.includes('ukuser2_')) {
    return { isTest: true, reason: 'Development verification pattern' };
  }

  return { isTest: false, reason: null };
}

function readJSONSafe(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (err) {
    console.warn(`[AUDIENCE VALIDATOR] Could not parse ${filePath}:`, err.message);
    return defaultValue;
  }
}

/**
 * Calculates the complete validated Friday campaign audience across all genuine data sources
 */
function getValidatedCampaignAudience({ additionalRecords = [] } = {}) {
  // 1. Read persistent customer stores
  const registered = readJSONSafe(CUSTOMERS_FILE, []);
  const subscriptions = readJSONSafe(SUBSCRIPTIONS_FILE, []);
  const requests = readJSONSafe(REQUESTS_FILE, []);
  const subscribers = readJSONSafe(SUBSCRIBERS_FILE, []);
  const unsubscribesList = readJSONSafe(UNSUBSCRIBES_FILE, []);
  const unsubscribedSet = new Set(unsubscribesList.map(u => (u.email || '').toLowerCase().trim()));

  // 2. Index auxiliary subscription & payment records by email for metadata enrichment
  const subMap = new Map();
  subscriptions.forEach(s => {
    const em = (s.email || '').toLowerCase().trim();
    if (em) subMap.set(em, s);
  });

  const reqMap = new Map();
  requests.forEach(r => {
    const em = (r.email || '').toLowerCase().trim();
    if (em) reqMap.set(em, r);
  });

  // 3. Combine customer identity sources (registered customers, marketing subscribers, live Google Sheets)
  const candidatePool = [
    ...registered.map(r => ({ ...r, source: r.source || 'registeredCustomers' })),
    ...subscribers.map(sub => ({ ...sub, source: 'marketingSubscribers' })),
    ...additionalRecords.map(a => ({ ...a, source: a.source || 'googleSheetsLive' })),
  ];

  // If any email exists ONLY in subscriptions or requests, also consider it as a customer candidate
  subscriptions.forEach(s => {
    const em = (s.email || '').toLowerCase().trim();
    if (em && !candidatePool.some(c => (c.email || '').toLowerCase().trim() === em)) {
      candidatePool.push({ ...s, source: 'subscriptions' });
    }
  });

  requests.forEach(q => {
    const em = (q.email || '').toLowerCase().trim();
    if (em && !candidatePool.some(c => (c.email || '').toLowerCase().trim() === em)) {
      candidatePool.push({ ...q, source: 'paymentRequests' });
    }
  });

  const totalRawCount = candidatePool.length;
  const validAudience = [];
  const excludedRecords = [];
  const seenEmails = new Map();

  let invalidEmailCount = 0;
  let testAccountCount = 0;
  let duplicateCount = 0;
  let unsubscribedCount = 0;

  for (const record of candidatePool) {
    const rawEmail = record.email || record.Email || record.customerEmail || '';
    const cleanEmail = (rawEmail || '').toLowerCase().trim();
    const name = record.name || record.Name || cleanEmail.split('@')[0];

    // Check: Empty or invalid email format
    if (!cleanEmail || !isValidEmailFormat(cleanEmail)) {
      invalidEmailCount++;
      excludedRecords.push({
        email: rawEmail || 'EMPTY',
        name,
        category: 'INVALID_EMAIL',
        reason: 'Invalid or missing email syntax',
        source: record.source,
      });
      continue;
    }

    // Check: Test account detection
    const testCheck = isTestAccount(cleanEmail);
    if (testCheck.isTest) {
      testAccountCount++;
      excludedRecords.push({
        email: cleanEmail,
        name,
        category: 'TEST_ACCOUNT',
        reason: testCheck.reason,
        source: record.source,
      });
      continue;
    }

    // Check: Unsubscribed
    if (unsubscribedSet.has(cleanEmail)) {
      unsubscribedCount++;
      excludedRecords.push({
        email: cleanEmail,
        name,
        category: 'UNSUBSCRIBED',
        reason: 'Customer previously unsubscribed from promotional broadcasts',
        source: record.source,
      });
      continue;
    }

    // Check: True Duplicate detection within customer candidate pool
    if (seenEmails.has(cleanEmail)) {
      duplicateCount++;
      excludedRecords.push({
        email: cleanEmail,
        name,
        category: 'DUPLICATE',
        reason: `Duplicate entry from ${record.source} (already registered via ${seenEmails.get(cleanEmail).source})`,
        source: record.source,
      });
      continue;
    }

    // Enrich with subscription & payment link details
    const subInfo = subMap.get(cleanEmail) || {};
    const reqInfo = reqMap.get(cleanEmail) || {};

    const validatedCustomer = {
      email: cleanEmail,
      name,
      phone: record.phone || subInfo.phone || reqInfo.phone || '',
      tier: record.tier || (subInfo.isPremium ? 'pro' : 'basic'),
      isPremium: Boolean(record.isPremium || subInfo.isPremium || subInfo.plan === 'Premium'),
      source: record.source,
      loanAmount: record.loanAmount || 0,
      createdAt: record.createdAt || new Date().toISOString(),
      paymentStatus: reqInfo.paymentStatus || subInfo.paymentStatus || 'None',
    };

    seenEmails.set(cleanEmail, validatedCustomer);
    validAudience.push(validatedCustomer);
  }

  return {
    summary: {
      totalRecords: totalRawCount,
      validCustomers: validAudience.length,
      invalidEmails: invalidEmailCount,
      testAccounts: testAccountCount,
      duplicates: duplicateCount,
      unsubscribed: unsubscribedCount,
      finalAudienceCount: validAudience.length,
    },
    validAudience,
    excludedRecords,
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = {
  isValidEmailFormat,
  isTestAccount,
  getValidatedCampaignAudience,
};
