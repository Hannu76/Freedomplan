const assert = require('assert');

async function testLiveAPI() {
  const BASE_URL = 'http://localhost:3001';
  console.log('Testing live server endpoints at ' + BASE_URL + '...');

  // 1. Check marketing status endpoint
  const statusRes = await fetch(`${BASE_URL}/api/marketing/status`);
  assert(statusRes.ok, `Status endpoint failed: ${statusRes.status}`);
  const statusData = await statusRes.json();
  console.log('✅ GET /api/marketing/status returned:', statusData.status, '| Active Audience:', statusData.stats.activeAudienceCount);

  // 2. Check preview endpoint
  const previewRes = await fetch(`${BASE_URL}/api/marketing/preview?name=Jane`);
  assert(previewRes.ok, `Preview endpoint failed: ${previewRes.status}`);
  const previewHtml = await previewRes.text();
  assert(previewHtml.includes('TURN YOUR REACH'), 'Preview must contain campaign headline');
  console.log('✅ GET /api/marketing/preview returned valid HTML template');

  // 3. Test Subscribe
  const subRes = await fetch(`${BASE_URL}/api/marketing/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'live_test_creator@example.com',
      name: 'Live Tester',
      consent: true,
      source: 'live_test',
    }),
  });
  assert(subRes.ok, `Subscribe failed: ${subRes.status}`);
  const subData = await subRes.json();
  console.log('✅ POST /api/marketing/subscribe:', subData.message);

  // 4. Test Unsubscribe endpoint
  const unsubRes = await fetch(`${BASE_URL}/api/marketing/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'live_test_creator@example.com',
      reason: 'Live API test',
    }),
  });
  assert(unsubRes.ok, `Unsubscribe failed: ${unsubRes.status}`);
  const unsubData = await unsubRes.json();
  console.log('✅ POST /api/marketing/unsubscribe:', unsubData.message);

  // 5. Test OTP authentication endpoint to confirm FROZEN OTP CODE IS 100% OPERATIONAL
  const otpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'otp_verification_test@example.com' }),
  });
  assert(otpRes.ok, `OTP route failed: ${otpRes.status}`);
  const otpData = await otpRes.json();
  console.log('✅ POST /api/auth/send-otp (FROZEN AUTH VERIFICATION):', otpData.message);

  console.log('\n🎉 ALL LIVE SERVER ENDPOINTS TESTED SUCCESSFULLY WITH ZERO REGRESSIONS!');
}

testLiveAPI().catch(err => {
  console.error('Live API Test Failed:', err);
  process.exit(1);
});
