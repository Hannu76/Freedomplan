const { generateUnsubscribeToken } = require('./security');

/**
 * Render Bright, Premium, High-Impact FreedomPlan Promotional HTML Email
 * Highlights the core value proposition:
 * "Promote FreedomPlan across your content & earn cash payouts based on your reach (£35+ starting rate)"
 */
function renderPromotionalTemplate({
  recipientEmail,
  recipientName = 'Valued Partner',
  campaignTitle = 'Turn Your Reach Into Real Rewards 💙 | FreedomPlan',
  customCtaUrl,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://freedomplan.vercel.app',
}) {
  const token = generateUnsubscribeToken(recipientEmail);
  const cleanAppUrl = appUrl.replace(/\/$/, '');
  const unsubscribeUrl = `${cleanAppUrl}/api/marketing/unsubscribe?token=${token}`;
  const actionUrl = customCtaUrl || `${cleanAppUrl}?utm_source=weekly_promo&utm_medium=email&utm_campaign=creator_earnings_promo`;
  const flyerWebUrl = `${cleanAppUrl}/images/freedomplan-promo-flyer.jpg`;

  const displayName = recipientName && recipientName !== recipientEmail.split('@')[0]
    ? recipientName
    : 'there';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${campaignTitle}</title>
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
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@1,500;1,600&display=swap');

    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #F8F6F0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-spacing: 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      display: block;
    }
    a {
      text-decoration: none;
    }
    .cursive-quote {
      font-family: 'Playfair Display', Georgia, 'Times New Roman', 'Brush Script MT', cursive, serif !important;
    }
    @media only screen and (max-width: 620px) {
      .container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin-bottom: 12px !important;
      }
      .hero-title {
        font-size: 28px !important;
        line-height: 34px !important;
      }
      .padding-mobile {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; color: #1E293B;">
  <!-- PREHEADER -->
  <div style="display: none; font-size: 1px; color: #F8F6F0; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Promote FreedomPlan &amp; Turn Your Reach Into Real Earnings. Starting from £35+ per milestone.
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F6F0;">
    <tr>
      <td align="center" style="padding: 28px 10px;">
        <!-- MAIN CARD CONTAINER -->
        <table role="presentation" class="container" width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 24px; overflow: hidden; box-shadow: 0 14px 40px rgba(15, 23, 42, 0.07);">
          
          <!-- TOP HEADER BRANDING -->
          <tr>
            <td style="padding: 20px 30px 18px; background: #FFFFFF; border-bottom: 1px solid #F3EFE6;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- BRAND LOGO -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="background: #0034DE; width: 32px; height: 32px; border-radius: 8px; text-align: center; line-height: 32px; font-weight: 900; font-size: 18px; color: #FFFFFF;">F</div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 10px;">
                          <span style="font-size: 20px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">Freedom<span style="color: #0034DE;">Plan</span></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background: #EEF4FF; border: 1px solid #C7D9FF; color: #0034DE; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
                      🔥 Official Partner Program
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO SECTION -->
          <tr>
            <td class="padding-mobile" style="padding: 32px 32px 24px; text-align: center; background: #FFFFFF;">
              
              <!-- VALUE BADGE (VERY VISIBLE IN GMAIL TOP VIEW) -->
              <div style="display: inline-block; background: #FFFBEB; border: 1.5px solid #FCD34D; padding: 6px 16px; border-radius: 100px; margin-bottom: 16px;">
                <span style="color: #B45309; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px;">
                  ✨ PROMOTE FREEDOMPLAN &bull; EARN CASH PAYOUTS
                </span>
              </div>

              <!-- MAIN BOLD HEADLINE -->
              <h1 class="hero-title" style="margin: 0 0 12px; font-size: 34px; line-height: 40px; font-weight: 900; color: #0F172A; letter-spacing: -1px;">
                TURN YOUR REACH<br><span style="color: #0034DE;">INTO REAL EARNINGS</span>
              </h1>
              
              <!-- CLEAR VALUE PROPOSITION EXPLANATION BOX -->
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px 18px; max-width: 480px; margin: 0 auto 20px; text-align: center;">
                <p style="margin: 0 0 4px; font-size: 14px; line-height: 22px; color: #0F172A; font-weight: 700;">
                  Hello ${displayName}, promote FreedomPlan across your content and social channels to get paid for every view &amp; audience referral.
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #475569;">
                  The more reach and engagement your content delivers, the higher your reward payouts.
                </p>
              </div>

              <!-- MAIN FLYER VISUAL -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                <tr>
                  <td align="center">
                    <div style="border-radius: 18px; overflow: hidden; border: 1px solid #EAE6DF; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);">
                      <a href="${actionUrl}" target="_blank" style="display: block;">
                        <img src="cid:promo-hero-flyer" alt="FreedomPlan — Turn Your Reach Into Earnings" width="516" style="width: 100%; max-width: 516px; height: auto; display: block; border: 0;" onerror="this.onerror=null;this.src='${flyerWebUrl}';" />
                      </a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- HIGH IMPACT PAYOUT RATE BOX -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #0034DE 0%, #001C80 100%); border-radius: 16px; margin: 0 auto 24px; max-width: 490px; box-shadow: 0 8px 24px rgba(0, 52, 222, 0.25);">
                <tr>
                  <td style="padding: 18px 20px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #93C5FD; margin-bottom: 4px;">
                      STARTING BENEFIT PAYOUT
                    </div>
                    <div style="font-size: 34px; font-weight: 900; color: #FFFFFF; line-height: 38px; margin-bottom: 4px;">
                      £35<span style="font-size: 20px; color: #FDE047; font-weight: 800;">.00+</span> <span style="font-size: 13px; font-weight: 700; color: #BFDBFE; vertical-align: middle;">/ milestone</span>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #E0E7FF; font-weight: 500;">
                      10K+ Views = £35+ &nbsp;|&nbsp; Higher Reach = Higher Rewards &nbsp;|&nbsp; Fast Direct Transfers
                    </p>
                  </td>
                </tr>
              </table>

              <!-- SIGNATURE CAPSULE CTA BUTTON -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="#0034DE">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">START EARNING NOW &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${actionUrl}" target="_blank" style="background: #0034DE; color: #FFFFFF; display: inline-block; font-size: 14px; font-weight: 900; line-height: 50px; text-align: center; text-decoration: none; padding: 0 38px; -webkit-text-size-adjust: none; border-radius: 100px; box-shadow: 0 6px 20px rgba(0, 52, 222, 0.32); letter-spacing: 0.8px; text-transform: uppercase; mso-hide: all;">
                      START EARNING NOW &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 PILLARS BENEFITS SECTION -->
          <tr>
            <td style="padding: 30px 30px 26px; background: #FAF8F2; border-top: 1px solid #F0ECE1; border-bottom: 1px solid #F0ECE1;">
              <p style="margin: 0 0 18px; text-align: center; font-size: 11px; font-weight: 900; color: #64748B; text-transform: uppercase; letter-spacing: 1.8px;">
                FREEDOMPLAN BENEFITS
              </p>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- PILLAR 1: EARN -->
                  <td class="mobile-stack" width="31%" style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 14px; padding: 18px 12px; text-align: center; vertical-align: top;">
                    <div style="font-size: 22px; margin-bottom: 6px;">⚡</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Earn</div>
                    <div style="font-size: 12px; line-height: 18px; color: #64748B;">Turn reach into measurable cash rewards.</div>
                  </td>
                  <td width="3%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  
                  <!-- PILLAR 2: GROW -->
                  <td class="mobile-stack" width="32%" style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 14px; padding: 18px 12px; text-align: center; vertical-align: top;">
                    <div style="font-size: 22px; margin-bottom: 6px;">📈</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Grow</div>
                    <div style="font-size: 12px; line-height: 18px; color: #64748B;">Build more reach. Unlock more potential.</div>
                  </td>
                  <td width="3%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  
                  <!-- PILLAR 3: CONTROL -->
                  <td class="mobile-stack" width="31%" style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 14px; padding: 18px 12px; text-align: center; vertical-align: top;">
                    <div style="font-size: 22px; margin-bottom: 6px;">🎯</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Control</div>
                    <div style="font-size: 12px; line-height: 18px; color: #64748B;">Track performance with total clarity.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- A LITTLE FREEDOMPLAN WISDOM (EDITORIAL CURSIVE SECTION) -->
          <tr>
            <td style="padding: 34px 30px 30px; background: #FFFFFF; text-align: center;">
              <p style="margin: 0 0 14px; font-size: 11px; font-weight: 900; color: #0034DE; text-transform: uppercase; letter-spacing: 2px;">
                A LITTLE FREEDOMPLAN WISDOM
              </p>
              
              <!-- ELEGANT CURSIVE QUOTE -->
              <p class="cursive-quote" style="margin: 0 0 8px; font-family: 'Playfair Display', Georgia, 'Times New Roman', 'Brush Script MT', cursive, serif; font-style: italic; font-size: 24px; line-height: 32px; color: #0F172A; font-weight: 500;">
                &ldquo;Small steps today. Bigger freedom tomorrow.&rdquo;
              </p>
              <p style="margin: 0 0 18px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">
                — FREEDOMPLAN COMMUNITY
              </p>

              <!-- SECONDARY SHORT QUOTE -->
              <div style="background: #FFFDF5; border-left: 3px solid #F59E0B; padding: 12px 18px; max-width: 440px; margin: 0 auto; text-align: left; border-radius: 0 10px 10px 0;">
                <p class="cursive-quote" style="margin: 0; font-family: 'Playfair Display', Georgia, 'Times New Roman', cursive, serif; font-style: italic; font-size: 16px; line-height: 22px; color: #334155;">
                  &ldquo;Build your reach. Build your future.&rdquo;
                </p>
              </div>
            </td>
          </tr>

          <!-- PLAN SMART. LIVE CONFIDENT. SECTION -->
          <tr>
            <td style="padding: 30px 30px 34px; background: #FAF8F2; border-top: 1px solid #F0ECE1; text-align: center;">
              <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: 900; color: #0F172A; letter-spacing: -0.4px;">
                PLAN SMART. LIVE CONFIDENT.
              </h3>
              <p style="margin: 0 auto 18px; max-width: 420px; font-size: 14px; line-height: 22px; color: #64748B;">
                Build your financial future with FreedomPlan.
              </p>

              <!-- EXPLORE BUTTON -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" target="_blank" style="background: #FFFFFF; color: #0034DE; border: 1.5px solid #0034DE; display: inline-block; font-size: 13px; font-weight: 800; line-height: 42px; text-align: center; text-decoration: none; padding: 0 28px; border-radius: 100px;">
                      Explore FreedomPlan &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #94A3B8;">
                <a href="${cleanAppUrl}" style="color: #64748B; text-decoration: none;">freedomplan.com</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 22px 30px; background: #FFFFFF; border-top: 1px solid #F3EFE6; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 800; color: #0F172A;">
                FreedomPlan
              </p>
              <p style="margin: 0 0 10px; font-size: 12px; color: #64748B; font-style: italic;">
                Plan Smart. Live Confident.
              </p>
              <p style="margin: 0 0 12px; font-size: 11px; color: #94A3B8;">
                <a href="${cleanAppUrl}" style="color: #0034DE; text-decoration: none; font-weight: 600;">Website</a> &nbsp;·&nbsp;
                <a href="mailto:FreedomPlan786@gmail.com" style="color: #0034DE; text-decoration: none; font-weight: 600;">Support</a> &nbsp;·&nbsp;
                <a href="${cleanAppUrl}" style="color: #0034DE; text-decoration: none; font-weight: 600;">Privacy</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                <a href="${unsubscribeUrl}" style="color: #EF4444; font-weight: 600; text-decoration: underline;">Unsubscribe from Promotional Emails</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `FreedomPlan — Plan Smart. Live Confident.
PROMOTE FREEDOMPLAN & EARN CASH PAYOUTS
Turn Your Reach Into Real Earnings

Hello ${displayName},

Promote FreedomPlan across your content and social channels to get paid for every view & audience referral.
Starting from £35+ per milestone.

10K+ Views = £35+ | Higher Reach = Higher Rewards | Fast Direct Transfers

FREEDOMPLAN BENEFITS:
- Earn: Turn reach into measurable cash rewards.
- Grow: Build more reach. Unlock more potential.
- Control: Track performance with total clarity.

A LITTLE FREEDOMPLAN WISDOM:
"Small steps today. Bigger freedom tomorrow." — FreedomPlan Community
"Build your reach. Build your future."

PLAN SMART. LIVE CONFIDENT.
Build your financial future with FreedomPlan.

Start Earning Now: ${actionUrl}
Website: ${cleanAppUrl}

--------------------------------------------------
To unsubscribe: ${unsubscribeUrl}
FreedomPlan, FreedomPlan786@gmail.com.
`;

  return { html, text, unsubscribeUrl, actionUrl };
}

module.exports = {
  renderPromotionalTemplate,
};
