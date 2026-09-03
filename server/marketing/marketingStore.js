const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'marketing_campaigns.json');
const RECIPIENTS_FILE = path.join(DATA_DIR, 'marketing_recipients.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'marketing_subscribers.json');
const UNSUBSCRIBES_FILE = path.join(DATA_DIR, 'marketing_unsubscribes.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('[MARKETING STORE] Error creating data dir:', err);
  }
}

function readJSON(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[MARKETING STORE] Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[MARKETING STORE] Error writing ${filePath}:`, err);
  }
}

/**
 * Normalizes email address
 */
function cleanEmail(email) {
  return (email || '').toLowerCase().trim();
}

/**
 * Add or update marketing subscriber
 */
function addOrUpdateSubscriber({ email, name = '', consent = true, source = 'registration' }) {
  const normEmail = cleanEmail(email);
  if (!normEmail || !normEmail.includes('@')) return null;

  const subscribers = readJSON(SUBSCRIBERS_FILE, []);
  const unsubscribes = readJSON(UNSUBSCRIBES_FILE, []);
  const isUnsub = unsubscribes.some(u => cleanEmail(u.email) === normEmail);

  const existingIdx = subscribers.findIndex(s => cleanEmail(s.email) === normEmail);
  const now = new Date().toISOString();

  const record = {
    email: normEmail,
    name: name || (existingIdx >= 0 ? subscribers[existingIdx].name : normEmail.split('@')[0]),
    consent: isUnsub ? false : Boolean(consent),
    status: isUnsub ? 'unsubscribed' : (consent ? 'active' : 'inactive'),
    source: source || (existingIdx >= 0 ? subscribers[existingIdx].source : 'registration'),
    updatedAt: now,
    createdAt: existingIdx >= 0 ? subscribers[existingIdx].createdAt : now,
  };

  if (existingIdx >= 0) {
    subscribers[existingIdx] = { ...subscribers[existingIdx], ...record };
  } else {
    subscribers.push(record);
  }

  writeJSON(SUBSCRIBERS_FILE, subscribers);
  return record;
}

/**
 * Record an unsubscribe event
 */
function recordUnsubscribe({ email, reason = 'User requested unsubscribe', ip = '' }) {
  const normEmail = cleanEmail(email);
  if (!normEmail) return false;

  const unsubscribes = readJSON(UNSUBSCRIBES_FILE, []);
  const now = new Date().toISOString();

  const existingIdx = unsubscribes.findIndex(u => cleanEmail(u.email) === normEmail);
  if (existingIdx >= 0) {
    unsubscribes[existingIdx] = {
      ...unsubscribes[existingIdx],
      reason,
      unsubscribedAt: now,
      ip: ip || unsubscribes[existingIdx].ip
    };
  } else {
    unsubscribes.push({
      email: normEmail,
      reason,
      unsubscribedAt: now,
      ip
    });
  }
  writeJSON(UNSUBSCRIBES_FILE, unsubscribes);

  // Update in subscribers file
  const subscribers = readJSON(SUBSCRIBERS_FILE, []);
  const subIdx = subscribers.findIndex(s => cleanEmail(s.email) === normEmail);
  if (subIdx >= 0) {
    subscribers[subIdx].status = 'unsubscribed';
    subscribers[subIdx].consent = false;
    subscribers[subIdx].unsubscribedAt = now;
    writeJSON(SUBSCRIBERS_FILE, subscribers);
  }

  return true;
}

/**
 * Check if an email is unsubscribed
 */
function isUnsubscribed(email) {
  const normEmail = cleanEmail(email);
  if (!normEmail) return true;
  const unsubscribes = readJSON(UNSUBSCRIBES_FILE, []);
  return unsubscribes.some(u => cleanEmail(u.email) === normEmail);
}

/**
 * Get all eligible audience members for Friday promotional send
 * Business Rule:
 * Unified pipeline pulling from registeredCustomers, subscriptions, Google Sheets, and leads,
 * filtered through rigorous RFC email validation, test-account detection, and deduplication.
 */
function getEligibleAudience(additionalRecords = []) {
  try {
    const { getValidatedCampaignAudience } = require('./campaignAudienceValidator');
    const result = getValidatedCampaignAudience({ additionalRecords });
    return result.validAudience;
  } catch (err) {
    console.error('[MARKETING STORE] Error calculating validated audience:', err);
    return [];
  }
}

/**
 * Campaign Management
 */
function getCampaign(campaignId) {
  const campaigns = readJSON(CAMPAIGNS_FILE, []);
  return campaigns.find(c => c.id === campaignId) || null;
}

function getCampaigns(limit = 50) {
  const campaigns = readJSON(CAMPAIGNS_FILE, []);
  return campaigns.slice(-limit).reverse();
}

function createCampaign({ id, name, subject, scheduledAt, totalRecipients = 0, previewText = '' }) {
  const campaigns = readJSON(CAMPAIGNS_FILE, []);
  const existing = campaigns.find(c => c.id === id);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const newCampaign = {
    id,
    name,
    subject,
    previewText,
    scheduledAt: scheduledAt || now,
    createdAt: now,
    status: 'in_progress', // 'in_progress' | 'completed' | 'failed'
    totalRecipients,
    successCount: 0,
    failedCount: 0,
    startedAt: now,
    finishedAt: null,
  };

  campaigns.push(newCampaign);
  writeJSON(CAMPAIGNS_FILE, campaigns);
  return newCampaign;
}

function updateCampaign(campaignId, updates) {
  const campaigns = readJSON(CAMPAIGNS_FILE, []);
  const idx = campaigns.findIndex(c => c.id === campaignId);
  if (idx < 0) return null;

  campaigns[idx] = {
    ...campaigns[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeJSON(CAMPAIGNS_FILE, campaigns);
  return campaigns[idx];
}

/**
 * Recipient Log Management
 */
function recordRecipientLog({ campaignId, email, status, sentAt, error = null, messageId = null }) {
  const recipients = readJSON(RECIPIENTS_FILE, []);
  const normEmail = cleanEmail(email);

  const entry = {
    id: `${campaignId}_${normEmail}`,
    campaignId,
    email: normEmail,
    status, // 'sent' | 'failed' | 'skipped' | 'unsubscribed'
    sentAt: sentAt || new Date().toISOString(),
    error: error ? String(error) : null,
    messageId,
  };

  recipients.push(entry);
  writeJSON(RECIPIENTS_FILE, recipients);
  return entry;
}

function getRecipientLogs(campaignId, limit = 200) {
  const recipients = readJSON(RECIPIENTS_FILE, []);
  if (!campaignId) return recipients.slice(-limit).reverse();
  return recipients.filter(r => r.campaignId === campaignId).slice(-limit).reverse();
}

/**
 * Audience Analytics & Statistics
 */
function getAudienceStats() {
  const subscribers = readJSON(SUBSCRIBERS_FILE, []);
  const unsubscribes = readJSON(UNSUBSCRIBES_FILE, []);
  const campaigns = readJSON(CAMPAIGNS_FILE, []);
  const eligible = getEligibleAudience();

  return {
    totalSubscribers: subscribers.length,
    activeAudienceCount: eligible.length,
    unsubscribedCount: unsubscribes.length,
    totalCampaignsCount: campaigns.length,
    lastCampaign: campaigns.length > 0 ? campaigns[campaigns.length - 1] : null,
  };
}

/**
 * Bulk import customer records (e.g. from Google Sheets, CSV, or database)
 */
function importCustomers(customerList = []) {
  let importedCount = 0;
  let skippedCount = 0;

  for (const item of customerList) {
    const email = cleanEmail(item.email || item.Email || item['Customer Email'] || item['email_address']);
    const name = item.name || item.Name || item['Customer Name'] || item['Full Name'] || item['username'] || '';
    const consent = item.consent !== undefined ? item.consent : true;

    if (email && email.includes('@')) {
      addOrUpdateSubscriber({
        email,
        name,
        consent,
        source: item.source || 'google_sheets_import',
      });
      importedCount++;
    } else {
      skippedCount++;
    }
  }

  return {
    importedCount,
    skippedCount,
    totalAudience: getEligibleAudience().length,
  };
}

module.exports = {
  addOrUpdateSubscriber,
  recordUnsubscribe,
  isUnsubscribed,
  getEligibleAudience,
  getCampaign,
  getCampaigns,
  createCampaign,
  updateCampaign,
  recordRecipientLog,
  getRecipientLogs,
  getAudienceStats,
  importCustomers,
};
