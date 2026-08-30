/**
 * Meta WhatsApp Business Cloud API Service
 * Official Cloud API integration for FreedomPlan user onboarding & community invitations.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'whatsapp_logs.json');

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read log history
function getLogs() {
  ensureDataDir();
  if (fs.existsSync(LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch (_) {
      return [];
    }
  }
  return [];
}

// Append log entry
function saveLog(entry) {
  ensureDataDir();
  const logs = getLogs();
  logs.unshift({ ...entry, timestamp: new Date().toISOString() });
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 500), null, 2));
  } catch (err) {
    console.error('[WHATSAPP LOG ERROR]', err.message);
  }
}

/**
 * Format international phone number for WhatsApp Cloud API (e.g. "447123456789" or "919876543210")
 */
function sanitizePhoneNumber(phone) {
  if (!phone) return null;
  // Strip non-digit characters except leading +
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Send WhatsApp Message using Meta Cloud API
 * @param {Object} params
 * @param {string} params.to - Customer phone number
 * @param {string} params.name - Customer name
 * @param {string} [params.customMessage] - Optional custom message body
 */
async function sendWhatsAppWelcomeInvite({ to, name, customMessage }) {
  const token = process.env.META_WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const templateName = process.env.META_WA_TEMPLATE_NAME || 'freedomplan_welcome_community';
  const inviteLink = process.env.META_WA_COMMUNITY_INVITE_LINK || 'https://chat.whatsapp.com/C0LgZSttstQK14lgFHSdWA';

  const recipientPhone = sanitizePhoneNumber(to);
  if (!recipientPhone) {
    const errorMsg = `Invalid phone number format: ${to}`;
    console.warn(`[WHATSAPP SKIPPED] ${errorMsg}`);
    saveLog({ phone: to, name, status: 'FAILED', error: errorMsg });
    return { success: false, status: 'FAILED', error: errorMsg };
  }

  // If credentials are not configured (e.g. dev/local), log simulation gracefully
  if (!token || !phoneNumberId) {
    console.log(`[WHATSAPP SIMULATION] Meta Cloud API credentials not configured. Message for ${name} (${recipientPhone}) queued successfully.`);
    saveLog({
      phone: recipientPhone,
      name,
      status: 'SENT',
      simulated: true,
      note: 'Simulated dispatch (add META_WA_ACCESS_TOKEN & META_WA_PHONE_NUMBER_ID to server/.env for live dispatch)',
      inviteLink
    });
    return { success: true, status: 'SENT', simulated: true };
  }

  const endpoint = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  // Payload for official WhatsApp Cloud API
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en_GB' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: name || 'Valued Customer' },
            { type: 'text', text: inviteLink }
          ]
        }
      ]
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || 'Meta Cloud API rejected request';
      console.error('[WHATSAPP API ERROR]', data);
      saveLog({ phone: recipientPhone, name, status: 'FAILED', error: errorMsg, raw: data });
      return { success: false, status: 'FAILED', error: errorMsg };
    }

    console.log(`[WHATSAPP DELIVERED] Cloud API Message sent to ${recipientPhone} (ID: ${data.messages?.[0]?.id})`);
    saveLog({
      phone: recipientPhone,
      name,
      status: 'SENT',
      messageId: data.messages?.[0]?.id,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      status: 'SENT',
      messageId: data.messages?.[0]?.id
    };
  } catch (networkErr) {
    console.error('[WHATSAPP NETWORK ERROR]', networkErr.message);
    saveLog({ phone: recipientPhone, name, status: 'FAILED', error: networkErr.message });
    return { success: false, status: 'FAILED', error: networkErr.message };
  }
}

/**
 * Async Non-blocking Queue for WhatsApp Invitation
 */
function queueWhatsAppInvitation({ phone, name, email, loanAmount, whatsappUpdatesEnabled }) {
  if (whatsappUpdatesEnabled === false) {
    console.log(`[WHATSAPP] User ${email} opted OUT of WhatsApp Updates. Skipping.`);
    saveLog({ email, phone, name, status: 'OPTED_OUT' });
    return Promise.resolve({ status: 'OPTED_OUT' });
  }

  // Fire and forget in background without blocking registration response
  return new Promise((resolve) => {
    setImmediate(async () => {
      try {
        const result = await sendWhatsAppWelcomeInvite({ to: phone, name });
        resolve(result);
      } catch (err) {
        console.error('[WHATSAPP QUEUE ERROR]', err);
        resolve({ success: false, status: 'FAILED', error: err.message });
      }
    });
  });
}

module.exports = {
  sendWhatsAppWelcomeInvite,
  queueWhatsAppInvitation,
  getLogs,
  sanitizePhoneNumber
};
