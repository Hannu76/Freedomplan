const marketingStore = require('./marketingStore');
const { renderPromotionalTemplate } = require('./emailRenderer');
const { sendCampaignBatch, sendPromotionalEmail } = require('./mailer');

let schedulerInterval = null;
let isJobRunning = false;

/**
 * Returns formatted Friday date string: YYYY-MM-DD
 */
function getCurrentFridayDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 5 = Friday
  const diff = (day === 5 ? 0 : (5 - day + 7) % 7);
  // If today is Friday, use today's date. Otherwise next Friday.
  if (day === 5) {
    return d.toISOString().split('T')[0];
  }
  const nextFriday = new Date(d);
  nextFriday.setDate(d.getDate() + diff);
  return nextFriday.toISOString().split('T')[0];
}

/**
 * Returns the exact Date object for the next upcoming Friday at scheduled hour (default 09:00 UTC)
 */
function getNextFridayRun(scheduledHourUtc = 9) {
  const now = new Date();
  const nextFriday = new Date(now);
  const currentDay = now.getUTCDay();
  let daysUntilFriday = (5 - currentDay + 7) % 7;

  // If today is Friday but the scheduled time has already passed, schedule for next Friday
  if (daysUntilFriday === 0 && now.getUTCHours() >= scheduledHourUtc) {
    daysUntilFriday = 7;
  }

  nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday);
  nextFriday.setUTCHours(scheduledHourUtc, 0, 0, 0);
  return nextFriday;
}

/**
 * Core Weekly Campaign Executor
 * Can be triggered automatically by cron or manually by Admin API
 */
async function executeFridayCampaign({ isManual = false, force = false, customSubject = null, customTitle = null } = {}) {
  if (isJobRunning) {
    return { success: false, error: 'A campaign sending process is already actively running.' };
  }

  isJobRunning = true;
  const today = new Date().toISOString().split('T')[0];
  const campaignId = `${today}-weekly-promotion`;
  const campaignName = `Weekly Promotion — ${today}`;
  const subject = customSubject || 'Turn Your Reach Into Real Rewards 💙 | FreedomPlan';

  try {
    // ── Guard: Prevent Duplicate Campaigns ─────────────────────────────────
    const existingCampaign = marketingStore.getCampaign(campaignId);
    if (existingCampaign && existingCampaign.status === 'completed' && !force) {
      console.log(`[MARKETING SCHEDULER] Duplicate guard: Campaign ${campaignId} has already been sent.`);
      return {
        success: false,
        duplicate: true,
        message: `Campaign ${campaignId} was already sent on ${existingCampaign.finishedAt || existingCampaign.createdAt}.`,
        campaign: existingCampaign,
      };
    }

    // ── Audience Selection ─────────────────────────────────────────────────
    // Registered customers + Marketing Consent = true + Not Unsubscribed
    // (Purchase status is not required)
    const audience = marketingStore.getEligibleAudience();
    console.log(`[MARKETING SCHEDULER] Starting Friday Campaign [${campaignId}]. Total eligible recipients: ${audience.length}`);

    // Create campaign record
    const campaign = marketingStore.createCampaign({
      id: campaignId,
      name: campaignName,
      subject,
      scheduledAt: new Date().toISOString(),
      totalRecipients: audience.length,
      previewText: 'Turn your reach into earnings starting from £35+ with FreedomPlan.',
    });

    if (audience.length === 0) {
      marketingStore.updateCampaign(campaignId, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
        notes: 'No eligible recipients found in audience.',
      });
      return {
        success: true,
        message: 'No eligible recipients in audience. Campaign marked complete.',
        campaignId,
        sent: 0,
      };
    }

    // ── Dispatch Batch Emails ──────────────────────────────────────────────
    const results = await sendCampaignBatch({
      campaignId,
      subject,
      audience,
      renderFn: (email, name) => renderPromotionalTemplate({
        recipientEmail: email,
        recipientName: name,
        campaignTitle: customTitle || 'Turn Your Reach Into Earnings — Weekly FreedomPlan Rewards',
      }),
      onRecipientStatus: (email, status, error, messageId) => {
        marketingStore.recordRecipientLog({
          campaignId,
          email,
          status,
          error,
          messageId,
          sentAt: new Date().toISOString(),
        });
      },
    });

    // ── Update Final Campaign Stats ────────────────────────────────────────
    const updated = marketingStore.updateCampaign(campaignId, {
      status: 'completed',
      successCount: results.sent,
      failedCount: results.failed,
      finishedAt: new Date().toISOString(),
    });

    console.log(`[MARKETING SCHEDULER] Campaign [${campaignId}] completed! Sent: ${results.sent}, Failed: ${results.failed}`);

    return {
      success: true,
      campaignId,
      sent: results.sent,
      failed: results.failed,
      total: audience.length,
      campaign: updated,
    };
  } catch (err) {
    console.error(`[MARKETING SCHEDULER ERROR] Failed executing campaign ${campaignId}:`, err);
    marketingStore.updateCampaign(campaignId, {
      status: 'failed',
      error: err.message,
      finishedAt: new Date().toISOString(),
    });
    return { success: false, error: err.message };
  } finally {
    isJobRunning = false;
  }
}

/**
 * Test Send to a specific address for verification / preview
 */
async function sendTestPromotion({ testEmail, recipientName = 'Test User' }) {
  const normEmail = (testEmail || '').toLowerCase().trim();
  if (!normEmail || !normEmail.includes('@')) {
    return { success: false, error: 'Invalid test email address' };
  }

  const { html, text, unsubscribeUrl } = renderPromotionalTemplate({
    recipientEmail: normEmail,
    recipientName,
    campaignTitle: '[TEST PREVIEW] Turn Your Reach Into Earnings — Weekly FreedomPlan Rewards',
  });

  const res = await sendPromotionalEmail({
    to: normEmail,
    subject: 'Turn Your Reach Into Real Rewards 💙 | FreedomPlan',
    html,
    text,
    unsubscribeUrl,
    campaignId: 'test-preview-send',
  });

  return res;
}

/**
 * Initialize Background Weekly Friday Scheduler
 * Checks every 15 minutes if it is Friday 09:00 UTC and campaign hasn't been sent yet.
 */
function initMarketingScheduler() {
  if (schedulerInterval) return;

  console.log('[MARKETING SCHEDULER] Initialized weekly Friday campaign scheduler.');
  console.log(`[MARKETING SCHEDULER] Next scheduled Friday run: ${getNextFridayRun().toUTCString()}`);

  schedulerInterval = setInterval(async () => {
    const now = new Date();
    // Check if day is Friday (UTC day 5) and hour is 9 UTC
    if (now.getUTCDay() === 5 && now.getUTCHours() === 9 && now.getUTCMinutes() < 20) {
      const today = now.toISOString().split('T')[0];
      const campaignId = `${today}-weekly-promotion`;
      const existing = marketingStore.getCampaign(campaignId);

      if (!existing || existing.status !== 'completed') {
        console.log('[MARKETING SCHEDULER] Triggering scheduled Friday marketing campaign...');
        await executeFridayCampaign({ isManual: false });
      }
    }
  }, 15 * 60 * 1000); // Check every 15 minutes
}

function stopMarketingScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

module.exports = {
  executeFridayCampaign,
  sendTestPromotion,
  initMarketingScheduler,
  stopMarketingScheduler,
  getNextFridayRun,
};
