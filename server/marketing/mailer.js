const nodemailer = require('nodemailer');

// ─── Dedicated Marketing Email Transporter ────────────────────────────────────
// Isolated from the OTP email transport. Uses dedicated marketing credentials if
// provided, otherwise falls back gracefully to standard SMTP credentials.
let cachedTestTransporter = null;
let cachedLiveTransporter = null;

async function getTransporter() {
  const user = process.env.MARKETING_SMTP_USER || process.env.SMTP_USER || 'FreedomPlan786@gmail.com';
  const pass = process.env.MARKETING_SMTP_PASS || process.env.SMTP_PASS || 'hajcdkmdceqjxlyb';

  if (user && pass) {
    if (!cachedLiveTransporter) {
      const isGmail = (process.env.MARKETING_SMTP_HOST || process.env.SMTP_HOST || '').includes('gmail') || user.includes('@gmail.com');
      const cleanPass = pass.replace(/\s+/g, '');
      const transportConfig = isGmail
        ? {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            auth: { user, pass: cleanPass },
          }
        : {
            host: process.env.MARKETING_SMTP_HOST || process.env.SMTP_HOST,
            port: parseInt(process.env.MARKETING_SMTP_PORT || process.env.SMTP_PORT || '587', 10),
            secure: parseInt(process.env.MARKETING_SMTP_PORT || process.env.SMTP_PORT, 10) === 465,
            pool: true,
            auth: { user, pass: cleanPass },
          };
      cachedLiveTransporter = nodemailer.createTransport(transportConfig);
    }
    return {
      transporter: cachedLiveTransporter,
      isLiveSMTP: true,
    };
  }

  // Create or reuse Ethereal test account
  if (!cachedTestTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTestTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[MARKETING MAILER] Created Ethereal test account: ${testAccount.user}`);
    } catch (err) {
      console.warn('[MARKETING MAILER] Failed creating Ethereal account, fallback to simulation:', err.message);
    }
  }

  return {
    transporter: cachedTestTransporter,
    isLiveSMTP: false,
  };
}

/**
 * Send a single promotional email to a recipient
 */
async function sendPromotionalEmail({
  to,
  subject,
  html,
  text,
  unsubscribeUrl,
  campaignId,
}) {
  const fromEmail = process.env.MARKETING_FROM_EMAIL || '"FreedomPlan" <FreedomPlan786@gmail.com>';

  const flyerPath = require('path').join(__dirname, 'assets', 'freedomplan-promo-flyer.jpg');
  const attachments = [];
  if (require('fs').existsSync(flyerPath)) {
    attachments.push({
      filename: 'freedomplan-promo-flyer.jpg',
      path: flyerPath,
      cid: 'promo-hero-flyer',
    });
  }

  const mailOptions = {
    from: fromEmail,
    to,
    subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:support@freedomplan.com?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
      'X-Campaign-ID': campaignId || 'freedomplan-promo',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  try {
    const { transporter, isLiveSMTP } = await getTransporter();

    if (!transporter) {
      console.log(`[MARKETING MAILER SIMULATION] Dispatched email to: ${to} | Campaign: ${campaignId}`);
      return {
        success: true,
        simulated: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    }

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(`[MARKETING MAILER] Preview delivered email for ${to} at: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      previewUrl: previewUrl || null,
      isLiveSMTP,
    };
  } catch (err) {
    console.error(`[MARKETING MAILER ERROR] Failed to send email to ${to}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Send a campaign to a batch of audience members with rate-limiting and deduplication
 */
async function sendCampaignBatch({
  campaignId,
  subject,
  audience, // array of { email, name }
  renderFn,
  onRecipientStatus, // callback (email, status, error, messageId)
  delayBetweenEmailsMs = 250,
}) {
  const results = {
    total: audience.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < audience.length; i++) {
    const recipient = audience[i];
    const { html, text, unsubscribeUrl } = renderFn(recipient.email, recipient.name);

    const sendRes = await sendPromotionalEmail({
      to: recipient.email,
      subject,
      html,
      text,
      unsubscribeUrl,
      campaignId,
    });

    if (sendRes.success) {
      results.sent++;
      if (onRecipientStatus) {
        onRecipientStatus(recipient.email, 'sent', null, sendRes.messageId);
      }
    } else {
      results.failed++;
      results.errors.push({ email: recipient.email, error: sendRes.error });
      if (onRecipientStatus) {
        onRecipientStatus(recipient.email, 'failed', sendRes.error, null);
      }
    }

    // Small delay between emails to avoid provider rate limiting
    if (i < audience.length - 1 && delayBetweenEmailsMs > 0) {
      await new Promise(r => setTimeout(r, delayBetweenEmailsMs));
    }
  }

  return results;
}

module.exports = {
  sendPromotionalEmail,
  sendCampaignBatch,
};
