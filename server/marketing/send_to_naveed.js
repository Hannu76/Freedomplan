const { sendTestPromotion } = require('./scheduler');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function sendToUser() {
  const targetEmail = 'naveedmd78600@gmail.com';
  console.log(`Sending promotional email to: ${targetEmail}...`);
  console.log(`SMTP User configured: ${process.env.MARKETING_SMTP_USER || process.env.SMTP_USER || 'None (Simulation mode)'}`);

  const res = await sendTestPromotion({
    testEmail: targetEmail,
    recipientName: 'Naveed',
  });

  console.log('Result:', JSON.stringify(res, null, 2));
}

sendToUser().catch(console.error);
