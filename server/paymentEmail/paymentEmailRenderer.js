/**
 * FreedomPlan Premium — Dynamic Accessible Payment Link Email Template Generator
 * Supports WCAG AA accessible light-mode themes with deterministic hashing.
 * Fully responsive across Gmail, Apple Mail, Outlook, Android & iOS Mail.
 */

const { selectPaymentTheme, DEFAULT_THEME } = require('./themes');

const DEFAULT_PAYMENT_LINK = 'https://razorpay.me/@freedomplan?amount=n%2FUUsdogj%2F7sarE2WD13qg%3D%3D';

function renderPaymentLinkEmail({
  name = 'Valued Customer',
  email = '',
  amount = 499,
  plan = 'FreedomPlan Premium',
  paymentLink = DEFAULT_PAYMENT_LINK,
  appUrl = 'https://freedomplan.vercel.app',
  useCid = true,
  theme: customTheme = null,
}) {
  const cleanName = (name && name !== 'Customer' && name !== 'Valued Customer') ? name.split(' ')[0] : 'there';
  const effectivePaymentLink = paymentLink || process.env.RAZORPAY_PAYMENT_LINK || DEFAULT_PAYMENT_LINK;
  const imageSource = useCid ? 'cid:freedomplan-premium-payment' : `${appUrl}/images/freedomplan-premium-payment.png`;

  // Select dynamic theme (or use custom theme if provided)
  const theme = customTheme || selectPaymentTheme(email || name);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>FreedomPlan Premium — Your Official Payment Link</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${theme.canvasBg}; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${theme.bodyColor}; }
    .btn-payment {
      background-color: ${theme.buttonBg};
      color: ${theme.buttonText} !important;
      text-decoration: none;
      padding: 16px 36px;
      font-size: 16px;
      font-weight: 800;
      border-radius: 12px;
      display: inline-block;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${theme.canvasBg}; color: ${theme.bodyColor};">
  <!-- Preheader text -->
  <div style="display: none; font-size: 1px; color: ${theme.canvasBg}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your official FreedomPlan Premium payment link: ₹${amount}/Month. Complete payment to activate instant access.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.canvasBg}; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${theme.cardBg}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid ${theme.cardBorder};">
          
          <!-- Top Minimal Brand Bar -->
          <tr>
            <td style="padding: 20px 28px; background-color: #FFFFFF; border-bottom: 1px solid #F1F5F9;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: ${theme.brandHeader}; width: 28px; height: 28px; text-align: center; border-radius: 6px; color: #FFFFFF; font-weight: 800; font-size: 16px; line-height: 28px;">F</td>
                        <td style="padding-left: 10px; font-size: 19px; font-weight: 800; color: ${theme.headingColor}; letter-spacing: -0.5px;">
                          Freedom<span style="color: ${theme.accentColor};">Plan</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${theme.brandBadgeBg}; color: ${theme.brandBadgeText}; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; border: 1px solid ${theme.brandBadgeBorder}; text-transform: uppercase; letter-spacing: 0.5px;">
                      Official Payment Link
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Graphic Image -->
          <tr>
            <td align="center" style="padding: 20px 24px 10px 24px;">
              <a href="${effectivePaymentLink}" target="_blank" style="text-decoration: none; display: block;">
                <img src="${imageSource}" alt="FreedomPlan Premium — ₹${amount}/Month" width="540" style="max-width: 100%; border-radius: 12px; display: block; border: 1px solid ${theme.cardBorder}; box-shadow: 0 4px 16px rgba(0,0,0,0.06);" />
              </a>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 16px 28px 24px 28px;">
              
              <!-- Personal Greeting -->
              <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.5; color: ${theme.headingColor}; font-weight: 600;">
                Hello <strong style="color: ${theme.accentColor};">${cleanName}</strong>,
              </p>
              
              <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.6; color: ${theme.bodyColor};">
                Your request for <strong>FreedomPlan Premium</strong> is confirmed. You can now complete your one-time payment of <strong>₹${amount}</strong> using our official Razorpay checkout.
              </p>

              <!-- Primary Payment Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${effectivePaymentLink}" target="_blank" class="btn-payment" style="background-color: #2563EB; background-image: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF !important; text-decoration: none; padding: 18px 36px; font-size: 16px; font-weight: 800; border-radius: 12px; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                      👉 PAY ₹${amount} — UNLOCK PREMIUM ACCESS 👈
                    </a>
                  </td>
                </tr>
              </table>

              <!-- HOW TO PROCEED Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.stepCardBg}; border-radius: 14px; border: 1px solid ${theme.stepCardBorder}; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="text-align: center; margin-bottom: 12px;">
                      <span style="font-size: 12px; font-weight: 800; color: ${theme.headingColor}; text-transform: uppercase; letter-spacing: 1px;">
                        ⚡ HOW TO PROCEED ⚡
                      </span>
                    </div>
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; color: ${theme.bodyColor}; font-size: 14px; line-height: 1.6;">
                          <strong style="color: ${theme.stepNumberColor};">1. Click Payment Link:</strong> Tap the payment button above to open Razorpay.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: ${theme.bodyColor}; font-size: 14px; line-height: 1.6;">
                          <strong style="color: ${theme.stepNumberColor};">2. Complete Payment:</strong> Pay ₹${amount} for 1 Month using UPI, Cards, or NetBanking.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: ${theme.bodyColor}; font-size: 14px; line-height: 1.6;">
                          <strong style="color: ${theme.stepNumberColor};">3. Send Screenshot:</strong> Reply to this email with your payment confirmation screenshot.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- PAY SECURELY WITH Badges -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.stepCardBg}; border-radius: 12px; border: 1px solid ${theme.stepCardBorder}; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 14px 18px; text-align: center;">
                    <span style="display: block; font-size: 11px; font-weight: 700; color: ${theme.mutedColor}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      ✨ PAY SECURELY WITH ✨
                    </span>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${theme.bodyColor}; line-height: 1.6;">
                      💳 UPI (GPay · PhonePe · Paytm · BHIM) &nbsp;|&nbsp; 💳 Cards (VISA · Mastercard · RuPay) &nbsp;|&nbsp; 🏦 NetBanking
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fast Verification & Guarantee Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.guaranteeBg}; border-radius: 12px; border: 1px solid ${theme.guaranteeBorder}; margin-bottom: 18px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" width="24" style="padding-right: 10px; font-size: 18px;">
                          🛡️
                        </td>
                        <td style="color: ${theme.guaranteeText}; font-size: 13px; line-height: 1.5;">
                          <strong>Fast 1-Hour Activation Guarantee:</strong><br>
                          After sending your payment screenshot to <a href="mailto:FreedomPlan786@gmail.com" style="color: ${theme.guaranteeText}; font-weight: 700; text-decoration: underline;">FreedomPlan786@gmail.com</a>, our team will activate your Premium access within <strong>1 hour</strong>.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Support Help -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="text-align: center;">
                <tr>
                  <td style="padding: 6px 0; color: ${theme.mutedColor}; font-size: 13px;">
                    Have questions? Reply directly to this email or write to <a href="mailto:FreedomPlan786@gmail.com" style="color: ${theme.linkColor}; font-weight: 600;">FreedomPlan786@gmail.com</a>.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${theme.footerBg}; padding: 20px 20px; text-align: center; border-top: 1px solid ${theme.cardBorder};">
              <p style="margin: 0 0 4px 0; color: ${theme.headingColor}; font-weight: 700; font-size: 13px;">
                🔒 100% Secure Payments &nbsp;·&nbsp; Powered by Razorpay
              </p>
              <p style="margin: 0 0 4px 0; color: ${theme.mutedColor}; font-size: 11px;">
                FreedomPlan — Plan Smart. Live Confident.
              </p>
              <p style="margin: 0; color: ${theme.mutedColor}; font-size: 10px; opacity: 0.85;">
                You received this email because you requested the FreedomPlan Premium payment link.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderPaymentLinkPlainText({
  name = 'Valued Customer',
  email = '',
  amount = 499,
  plan = 'FreedomPlan Premium',
  paymentLink = DEFAULT_PAYMENT_LINK,
}) {
  const cleanName = (name && name !== 'Customer' && name !== 'Valued Customer') ? name.split(' ')[0] : 'there';
  const effectivePaymentLink = paymentLink || process.env.RAZORPAY_PAYMENT_LINK || DEFAULT_PAYMENT_LINK;

  return `FreedomPlan Premium — Your Official Payment Link

Hello ${cleanName},

Your FreedomPlan Premium payment request has been received.

Plan: ${plan}
Price: ₹${amount} / 1 Month
Access: 1 Month Full Access | All Premium Features | Cancel Anytime

Click the link below to proceed with your payment:
${effectivePaymentLink}

HOW TO PROCEED:
1. Click the payment link above to open Razorpay secure checkout.
2. Complete the payment securely (₹${amount} for 1 Month).
3. Send your payment screenshot by replying to this email or emailing FreedomPlan786@gmail.com.
4. Our team will verify your payment and activate your Premium access within 1 hour.

PAY SECURELY WITH:
- UPI (GPay, PhonePe, Paytm, BHIM)
- Cards (VISA, Mastercard, RuPay, Amex)
- NetBanking

Need help?
Simply reply to this email.

100% Secure Payments | Powered by Razorpay
FreedomPlan — Plan Smart. Live Confident.
`;
}

module.exports = {
  DEFAULT_PAYMENT_LINK,
  renderPaymentLinkEmail,
  renderPaymentLinkPlainText,
};
