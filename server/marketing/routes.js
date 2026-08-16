const express = require('express');
const router = express.Router();
const marketingStore = require('./marketingStore');
const { renderPromotionalTemplate } = require('./emailRenderer');
const { executeFridayCampaign, sendTestPromotion, getNextFridayRun } = require('./scheduler');
const { verifyUnsubscribeToken, isAuthorizedAdmin } = require('./security');

/**
 * GET /api/marketing/status
 * Public or admin health & status endpoint
 */
router.get('/status', (req, res) => {
  try {
    const stats = marketingStore.getAudienceStats();
    const nextRun = getNextFridayRun();
    res.json({
      status: 'active',
      nextScheduledRun: nextRun.toISOString(),
      stats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve marketing status: ' + err.message });
  }
});

/**
 * POST /api/marketing/subscribe
 * Captures marketing consent for new or existing users
 */
router.post('/subscribe', (req, res) => {
  try {
    const { email, name, consent = true, source = 'registration' } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const subscriber = marketingStore.addOrUpdateSubscriber({
      email,
      name,
      consent: Boolean(consent),
      source,
    });

    res.json({
      message: consent ? 'Successfully subscribed to weekly promotions' : 'Marketing preference saved',
      subscriber,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save marketing subscription: ' + err.message });
  }
});

/**
 * POST /api/marketing/import-customers
 * Bulk imports customer records (e.g. from Google Sheets, CSV, or database)
 */
router.post('/import-customers', (req, res) => {
  try {
    const { customers = [] } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'Expected an array of customer objects in { customers: [...] }' });
    }

    const result = marketingStore.importCustomers(customers);

    res.json({
      success: true,
      message: `Successfully processed ${customers.length} customer records.`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import customers: ' + err.message });
  }
});

/**
 * GET /api/marketing/unsubscribe
 * Web browser one-click link or preview from email
 */
router.get('/unsubscribe', (req, res) => {
  const { token, email: rawEmail } = req.query;

  let emailToUnsub = null;
  if (token) {
    const tokenResult = verifyUnsubscribeToken(token);
    if (tokenResult.valid) {
      emailToUnsub = tokenResult.email;
    }
  } else if (rawEmail) {
    emailToUnsub = rawEmail;
  }

  if (!emailToUnsub) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Invalid Unsubscribe Request</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="font-family:sans-serif;background:#0b0f19;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="background:#111827;padding:32px;border-radius:16px;border:1px solid #374151;text-align:center;max-width:440px;">
          <h2 style="color:#ef4444;margin-top:0;">Invalid or Expired Link</h2>
          <p style="color:#9ca3af;">This unsubscribe link is invalid or has expired. Please use the link provided in your recent promotional email.</p>
          <a href="/" style="color:#3b82f6;text-decoration:none;">Return to FreedomPlan</a>
        </div>
      </body>
      </html>
    `);
  }

  // Record unsubscribe
  marketingStore.recordUnsubscribe({
    email: emailToUnsub,
    reason: 'Clicked email unsubscribe link',
    ip: req.ip || '',
  });

  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Unsubscribed Successfully — FreedomPlan</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #111827; border: 1px solid #1f293d; border-radius: 20px; max-width: 480px; width: 100%; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .icon { width: 56px; height: 56px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; color: #10b981; }
        h2 { margin: 0 0 12px; font-size: 24px; font-weight: 800; }
        p { color: #94a3b8; font-size: 15px; line-height: 22px; margin: 0 0 20px; }
        .note { background: #1e293b; border-radius: 12px; padding: 14px; font-size: 13px; color: #cbd5e1; margin-bottom: 24px; text-align: left; }
        .btn { display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✓</div>
        <h2>You are unsubscribed</h2>
        <p><strong>${emailToUnsub}</strong> will no longer receive weekly promotional or marketing emails from FreedomPlan.</p>
        <div class="note">
          🔒 <strong>Important notice:</strong> You will still receive essential transactional notifications such as security login OTPs and payment receipts.
        </div>
        <a href="/" class="btn">Return to FreedomPlan</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /api/marketing/unsubscribe
 * Programmatic unsubscribe endpoint
 */
router.post('/unsubscribe', (req, res) => {
  try {
    const { token, email, reason } = req.body;
    let targetEmail = email;

    if (token) {
      const verifyRes = verifyUnsubscribeToken(token);
      if (!verifyRes.valid) {
        return res.status(400).json({ error: verifyRes.error });
      }
      targetEmail = verifyRes.email;
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    marketingStore.recordUnsubscribe({
      email: targetEmail,
      reason: reason || 'API Unsubscribe',
      ip: req.ip || '',
    });

    res.json({
      success: true,
      message: `${targetEmail} has been successfully unsubscribed from marketing communications.`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process unsubscribe: ' + err.message });
  }
});

/**
 * GET /api/marketing/preview
 * Live browser preview of the Weekly Promotional Email HTML template
 */
router.get('/preview', (req, res) => {
  const { email = 'creator@example.com', name = 'Alex Taylor', title } = req.query;
  const { html } = renderPromotionalTemplate({
    recipientEmail: email,
    recipientName: name,
    campaignTitle: title || 'Turn Your Reach Into Earnings — Weekly FreedomPlan Rewards',
  });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/**
 * GET /api/marketing/campaigns
 * List past campaign histories (Admin protected)
 */
router.get('/campaigns', (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized. Admin authorization required.' });
  }
  const campaigns = marketingStore.getCampaigns(req.query.limit ? parseInt(req.query.limit, 10) : 50);
  res.json({ campaigns });
});

/**
 * GET /api/marketing/campaigns/:id
 * Retrieve single campaign metrics and recipient logs
 */
router.get('/campaigns/:id', (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized. Admin authorization required.' });
  }
  const campaign = marketingStore.getCampaign(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  const recipients = marketingStore.getRecipientLogs(req.params.id);
  res.json({ campaign, recipients });
});

/**
 * POST /api/marketing/campaigns/send-weekly
 * Trigger weekly campaign on-demand with duplicate prevention guard
 */
router.post('/campaigns/send-weekly', async (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized. Admin authorization required.' });
  }

  const { force = false, subject, title } = req.body || {};
  const result = await executeFridayCampaign({
    isManual: true,
    force: Boolean(force),
    customSubject: subject,
    customTitle: title,
  });

  if (!result.success && result.duplicate) {
    return res.status(409).json(result);
  }

  if (!result.success) {
    return res.status(500).json(result);
  }

  res.json(result);
});

/**
 * POST /api/marketing/campaigns/test-send
 * Send a test email to verify delivery & formatting
 */
router.post('/campaigns/test-send', async (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized. Admin authorization required.' });
  }

  const { testEmail, name } = req.body || {};
  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid test email address is required' });
  }

  const result = await sendTestPromotion({ testEmail, recipientName: name });
  if (!result.success) {
    return res.status(500).json({ error: result.error || 'Failed to send test email' });
  }

  res.json({
    success: true,
    message: `Test promotional email dispatched successfully to ${testEmail}`,
    details: result,
  });
});

module.exports = router;
