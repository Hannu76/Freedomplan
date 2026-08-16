require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const marketingStore = require('./marketingStore');
const { renderPromotionalTemplate } = require('./emailRenderer');
const { sendPromotionalEmail } = require('./mailer');

/**
 * WAVE 1: INITIAL PRODUCTION LAUNCH CAMPAIGN
 * 
 * Target: 8 Unique Verified Existing Customers
 * Subject: Turn Your Reach Into Real Rewards 💙 | FreedomPlan
 * Sender: FreedomPlan786@gmail.com
 */
async function executeWave1Launch() {
  console.log('================================================================');
  console.log('🚀 FREEDOMPLAN MARKETING ENGINE — WAVE 1 LIVE CAMPAIGN LAUNCH');
  console.log('================================================================');

  // 1. Raw customer list provided
  const rawExistingCustomers = [
    'naveedmd78600@gmail.com',
    'hannu786464@gmail.com',
    'jashujaswanth050@gmail.com',
    'Hannu464@gmail.com',
    'Hannu4@outlook.com',
    'renuka.yam.b19@gmail.com',
    'naveedmd00@gmail.com',
    'anasurrahmansheik@gmail.com'
  ];

  console.log(`[WAVE 1] Ingesting & deduplicating ${rawExistingCustomers.length} customer records...`);

  // 2. Normalize and deduplicate
  const uniqueEmails = Array.from(
    new Set(rawExistingCustomers.map(e => e.toLowerCase().trim()))
  ).filter(e => e && e.includes('@') && e !== 'n/a');

  console.log(`[WAVE 1] Clean audience count: ${uniqueEmails.length} unique customers.`);

  // 3. Register into marketing store
  uniqueEmails.forEach(email => {
    marketingStore.addOrUpdateSubscriber({
      email,
      name: email.split('@')[0],
      consent: true,
      source: 'existing_customer_wave1',
    });
  });

  // 4. Resolve eligible audience
  const eligibleAudience = uniqueEmails
    .filter(email => !marketingStore.isUnsubscribed(email))
    .map(email => ({ email, name: email.split('@')[0] }));

  console.log(`[WAVE 1] Eligible recipients ready for dispatch: ${eligibleAudience.length}`);

  const campaignId = `wave-1-launch-${new Date().toISOString().split('T')[0]}`;
  const campaignName = 'Wave 1: Existing Customer Launch Campaign';
  const campaignSubject = 'Turn Your Reach Into Real Rewards 💙 | FreedomPlan';

  // 5. Create campaign record
  marketingStore.createCampaign({
    id: campaignId,
    name: campaignName,
    subject: campaignSubject,
    recipientCount: eligibleAudience.length,
    sentCount: 0,
    failedCount: 0,
    status: 'sending',
  });

  let sentCount = 0;
  let failedCount = 0;
  const deliverySummary = [];

  for (let i = 0; i < eligibleAudience.length; i++) {
    const recipient = eligibleAudience[i];
    console.log(`\n[${i + 1}/${eligibleAudience.length}] Dispatching to: ${recipient.email}...`);

    try {
      const template = renderPromotionalTemplate({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        campaignTitle: campaignSubject,
      });

      const sendResult = await sendPromotionalEmail({
        to: recipient.email,
        subject: campaignSubject,
        html: template.html,
        text: template.text,
        unsubscribeUrl: template.unsubscribeUrl,
        campaignId,
      });

      if (sendResult.success) {
        sentCount++;
        console.log(`✅ Sent to ${recipient.email} | MessageId: ${sendResult.messageId || 'OK'}`);
        marketingStore.recordRecipientLog({
          campaignId,
          email: recipient.email,
          status: 'sent',
          messageId: sendResult.messageId || null,
        });
        deliverySummary.push({ email: recipient.email, status: 'DELIVERED', messageId: sendResult.messageId });
      } else {
        failedCount++;
        console.warn(`❌ Failed for ${recipient.email}: ${sendResult.error}`);
        marketingStore.recordRecipientLog({
          campaignId,
          email: recipient.email,
          status: 'failed',
          error: sendResult.error,
        });
        deliverySummary.push({ email: recipient.email, status: 'FAILED', error: sendResult.error });
      }
    } catch (err) {
      failedCount++;
      console.error(`❌ Error sending to ${recipient.email}:`, err.message);
      marketingStore.recordRecipientLog({
        campaignId,
        email: recipient.email,
        status: 'failed',
        error: err.message,
      });
      deliverySummary.push({ email: recipient.email, status: 'ERROR', error: err.message });
    }

    // Polite rate limiting (1 second delay between deliveries to maintain high SMTP reputation)
    if (i < eligibleAudience.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 6. Finalize campaign record
  marketingStore.updateCampaign(campaignId, {
    sentCount,
    failedCount,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });

  console.log('\n================================================================');
  console.log(`🎉 WAVE 1 CAMPAIGN COMPLETE! Sent: ${sentCount}, Failed: ${failedCount}`);
  console.log('================================================================');
  console.table(deliverySummary);

  return {
    campaignId,
    sentCount,
    failedCount,
    deliverySummary,
  };
}

if (require.main === module) {
  executeWave1Launch()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal launch error:', err);
      process.exit(1);
    });
}

module.exports = { executeWave1Launch };
