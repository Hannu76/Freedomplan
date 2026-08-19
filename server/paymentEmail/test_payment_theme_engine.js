const assert = require('assert');
const {
  PAYMENT_THEMES,
  selectPaymentTheme,
  getContrastRatio,
  validateThemeAccessibility,
} = require('./themes');
const {
  renderPaymentLinkEmail,
  renderPaymentLinkPlainText,
  DEFAULT_PAYMENT_LINK,
} = require('./paymentEmailRenderer');

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING PAYMENT THEME ENGINE & ACCESSIBILITY TEST SUITE');
  console.log('================================================================\n');

  // Test 1: Validate all 7 themes for WCAG AA compliance
  console.log('1. Validating WCAG AA Contrast Ratios for all 7 Themes:');
  PAYMENT_THEMES.forEach((theme) => {
    const report = validateThemeAccessibility(theme);
    console.log(`   - Theme "${theme.name}" (${theme.id}):`);
    console.log(`     • Body contrast:    ${report.bodyContrast}:1 (min 4.5:1)`);
    console.log(`     • Heading contrast: ${report.headingContrast}:1 (min 3.0:1)`);
    console.log(`     • Button contrast:  ${report.buttonContrast}:1 (min 4.5:1)`);
    console.log(`     • Link contrast:    ${report.linkContrast}:1 (min 3.5:1)`);

    assert(report.valid, `Theme ${theme.id} failed accessibility checks: ${report.issues.join(', ')}`);
    assert(!['#000000', '#030B17', '#080E18', '#0B0F19'].includes(theme.canvasBg.toUpperCase()), `${theme.id} must not use pitch-black canvas`);
    assert(theme.cardBg.toUpperCase() === '#FFFFFF', `${theme.id} cardBg must be clean pure white`);
  });
  console.log('   ✅ All 7 themes passed strict WCAG AA contrast validation!\n');

  // Test 2: Deterministic Hash Consistency
  console.log('2. Validating Deterministic Hash Selection:');
  const testEmail = 'alex.johnson@example.com';
  const theme1 = selectPaymentTheme(testEmail);
  const theme2 = selectPaymentTheme(testEmail);
  const theme3 = selectPaymentTheme('ALEX.JOHNSON@EXAMPLE.COM');
  assert.strictEqual(theme1.id, theme2.id, 'Theme selection must be deterministic for identical input');
  assert.strictEqual(theme1.id, theme3.id, 'Theme selection must be case-insensitive');
  console.log(`   - Email "${testEmail}" deterministically resolved to: "${theme1.name}"`);
  console.log('   ✅ Deterministic selection verified!\n');

  // Test 3: Render HTML Template & Verify Structure
  console.log('3. Validating Rendered HTML Quality & Structure:');
  const html = renderPaymentLinkEmail({
    name: 'Alex',
    email: testEmail,
    amount: 499,
    paymentLink: DEFAULT_PAYMENT_LINK,
    useCid: true,
  });

  // Verify HTML contains required elements
  assert(html.includes('FreedomPlan'), 'HTML must include FreedomPlan branding');
  assert(html.includes('₹499'), 'HTML must include correct price point');
  assert(html.includes(DEFAULT_PAYMENT_LINK), 'HTML must include the Razorpay payment link');
  assert(html.includes('cid:freedomplan-premium-payment'), 'HTML must reference inline flyer CID');
  assert(html.includes('HOW TO PROCEED'), 'HTML must include step instructions');
  assert(html.includes('Fast 1-Hour Activation Guarantee'), 'HTML must include guarantee text');

  // Verify black/dark header removal & blue button styling
  assert(!html.includes('background-color: #030B17'), 'HTML must not have pitch black background');
  assert(!html.includes('background-color: #020617'), 'HTML must not have pitch black footer');
  assert(!html.includes('Unlock Your Financial Freedom'), 'Duplicate text header banner must be removed');
  assert(!html.includes('Direct Link:'), 'Direct link text below button must be removed');
  assert(html.includes('#2563EB') || html.includes('#1D4ED8'), 'Button must use blue styling');

  console.log('   ✅ HTML structure verified — clean, light-mode, zero duplicate headers, blue CTA button, and no raw direct link!\n');

  // Test 4: Plain Text Fallback
  console.log('4. Validating Plain Text Rendering:');
  const plainText = renderPaymentLinkPlainText({
    name: 'Naveed',
    email: testEmail,
    amount: 499,
  });
  assert(plainText.includes('FreedomPlan Premium'), 'Plain text must include plan name');
  assert(plainText.includes('₹499'), 'Plain text must include price');
  assert(plainText.includes(DEFAULT_PAYMENT_LINK), 'Plain text must include payment link');
  console.log('   ✅ Plain text template verified!\n');

  console.log('================================================================');
  console.log('🎉 ALL PAYMENT THEME ENGINE TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});
