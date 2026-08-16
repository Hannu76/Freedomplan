const assert = require('assert');
const path = require('path');
const fs = require('fs');

const marketingStore = require('./marketingStore');
const { renderPromotionalTemplate } = require('./emailRenderer');
const { generateUnsubscribeToken, verifyUnsubscribeToken } = require('./security');
const { executeFridayCampaign, sendTestPromotion, getNextFridayRun } = require('./scheduler');

async function runTestSuite() {
  console.log('=====================================================');
  console.log('🧪 RUNNING MARKETING & PROMOTIONAL SYSTEM TEST SUITE');
  console.log('=====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // ── TEST 1: Unsubscribe Token Generation & Verification ──────────────
  test('Security: Generate and verify valid HMAC unsubscribe token', () => {
    const email = 'creator1@freedomplan.test';
    const token = generateUnsubscribeToken(email);
    assert(token && typeof token === 'string', 'Token should be a non-empty string');

    const result = verifyUnsubscribeToken(token);
    assert.strictEqual(result.valid, true, 'Token should be valid');
    assert.strictEqual(result.email, email, 'Email in token should match');
  });

  test('Security: Reject tampered or forged unsubscribe tokens', () => {
    const email = 'creator2@freedomplan.test';
    const token = generateUnsubscribeToken(email);
    // Tamper with payload
    const tampered = token.substring(0, token.length - 4) + 'abcd';
    const result = verifyUnsubscribeToken(tampered);
    assert.strictEqual(result.valid, false, 'Tampered token must be rejected');
  });

  // ── TEST 2: Audience Resolution & Marketing Consent Rules ────────────
  test('Audience: New user registration with consent becomes eligible', () => {
    const user = {
      email: `john_new_${Date.now()}@example.com`,
      name: 'John Newbie',
      consent: true,
      source: 'registration_test',
    };
    marketingStore.addOrUpdateSubscriber(user);

    const audience = marketingStore.getEligibleAudience();
    const found = audience.find(a => a.email === user.email);
    assert(found, 'User with marketing consent must be present in eligible audience');
    assert.strictEqual(found.name, 'John Newbie');
  });

  test('Audience: User registering WITHOUT consent is excluded from audience', () => {
    const userNoConsent = {
      email: 'no_consent_user@example.com',
      name: 'No Consent User',
      consent: false,
      source: 'registration_test',
    };
    marketingStore.addOrUpdateSubscriber(userNoConsent);

    const audience = marketingStore.getEligibleAudience();
    const found = audience.find(a => a.email === userNoConsent.email);
    assert(!found, 'User WITHOUT consent must be excluded from eligible audience');
  });

  test('Audience: Purchase status is NOT required for marketing eligibility', () => {
    // Both paying and non-paying registered users with consent are in audience
    const freeUser = {
      email: 'free_creator@example.com',
      name: 'Free Creator',
      consent: true,
      source: 'registration_test',
    };
    marketingStore.addOrUpdateSubscriber(freeUser);

    const audience = marketingStore.getEligibleAudience();
    const found = audience.find(a => a.email === freeUser.email);
    assert(found, 'Free/non-purchasing registered user with consent must be included');
  });

  // ── TEST 3: Unsubscribe & Suppression Handling ───────────────────────
  test('Unsubscribe: Unsubscribing removes user from eligible audience immediately', () => {
    const email = `unsub_test_${Date.now()}@example.com`;
    marketingStore.addOrUpdateSubscriber({ email, name: 'Unsub Tester', consent: true });
    assert(!marketingStore.isUnsubscribed(email), 'User should not be unsubscribed initially');

    marketingStore.recordUnsubscribe({
      email,
      reason: 'Automated test unsubscribe',
    });

    assert(marketingStore.isUnsubscribed(email), 'User should now be marked unsubscribed');

    const audience = marketingStore.getEligibleAudience();
    const found = audience.find(a => a.email === email);
    assert(!found, 'Unsubscribed user must be immediately removed from marketing audience');
  });

  // ── TEST 4: Email Template Rendering ─────────────────────────────────
  test('Template: Renders FreedomPlan "Turn Your Reach Into Earnings" HTML email', () => {
    const templateData = renderPromotionalTemplate({
      recipientEmail: 'alex@example.com',
      recipientName: 'Alex Smith',
      campaignTitle: 'Turn Your Reach Into Earnings — FreedomPlan Weekly Promo',
    });

    assert(templateData.html.includes('FreedomPlan'), 'HTML must contain FreedomPlan brand');
    assert(templateData.html.includes('Alex Smith'), 'HTML must personalize recipient name');
    assert(templateData.html.includes('promo-hero-flyer') || templateData.html.includes('freedomplan-promo-flyer'), 'HTML must embed flyer image');
    assert(templateData.html.includes('FREEDOMPLAN WISDOM') || templateData.html.includes('FREEDOMPLAN BENEFITS'), 'HTML must contain wisdom/benefits section');
    assert(templateData.html.includes(templateData.unsubscribeUrl), 'HTML must contain signed unsubscribe link');
    assert(templateData.text.includes('FreedomPlan'), 'Plain-text fallback must contain brand information');
  });

  // ── TEST 5: Duplicate Campaign Prevention Guard ──────────────────────
  await asyncTest('Scheduler: Execute campaign and verify duplicate protection guard', async () => {
    // First execution
    const run1 = await executeFridayCampaign({ isManual: true, force: true });
    assert.strictEqual(run1.success, true, 'First campaign execution should succeed');

    // Second execution without force -> should be caught by duplicate guard
    const run2 = await executeFridayCampaign({ isManual: true, force: false });
    assert.strictEqual(run2.success, false, 'Second campaign on same day without force must be blocked');
    assert.strictEqual(run2.duplicate, true, 'Duplicate flag must be set to true');
  });

  // ── TEST 6: Next Friday Calculator ───────────────────────────────────
  test('Scheduler: Computes correct next Friday date & hour', () => {
    const nextFriday = getNextFridayRun(9);
    assert(nextFriday instanceof Date, 'Must return a valid Date object');
    assert.strictEqual(nextFriday.getUTCDay(), 5, 'Next scheduled day must be Friday (UTC day 5)');
    assert.strictEqual(nextFriday.getUTCHours(), 9, 'Scheduled hour must be 09:00 UTC');
  });

  // ── TEST 7: Test-send preview utility ────────────────────────────────
  await asyncTest('Mailer: Test send preview execution', async () => {
    const testResult = await sendTestPromotion({
      testEmail: 'test_admin@freedomplan.test',
      recipientName: 'Admin Tester',
    });
    assert(testResult.success, 'Test promotion send should return success');
  });

  console.log('\n=====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log('=====================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL MARKETING SYSTEM INTEGRATION TESTS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
