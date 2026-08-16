const { generateUnsubscribeToken } = require('./security');

/**
 * Render Bright, Premium, High-Impact FreedomPlan Promotional HTML Email
 * Highlights the core value proposition:
 * "Turn Your Reach Into Rewards" — Service overview, trust signals, and clear CTA.
 */
function renderPromotionalTemplate({
  recipientEmail,
  recipientName = 'Valued Partner',
  campaignTitle = 'Turn Your Reach Into Rewards 💙 | FreedomPlan',
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
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

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
      .mobile-stack-half {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin-bottom: 10px !important;
      }
      .hero-title {
        font-size: 26px !important;
        line-height: 32px !important;
      }
      .padding-mobile {
        padding: 22px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6F0; color: #1E293B;">
  <!-- PREHEADER -->
  <div style="display: none; font-size: 1px; color: #F8F6F0; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Turn Your Reach Into Rewards with FreedomPlan — Starting from £25+ to £35+ per milestone.
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F6F0;">
    <tr>
      <td align="center" style="padding: 24px 10px;">
        <!-- MAIN CARD CONTAINER -->
        <table role="presentation" class="container" width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; width: 100%; background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 24px; overflow: hidden; box-shadow: 0 14px 40px rgba(15, 23, 42, 0.07);">
          
          <!-- 1. TOP HEADER / FREEDOMPLAN BRANDING -->
          <tr>
            <td style="padding: 20px 28px 18px; background: #FFFFFF; border-bottom: 1px solid #F3EFE6;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- BRAND LOGO -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="background: #0034DE; width: 34px; height: 34px; border-radius: 9px; text-align: center; line-height: 34px; font-weight: 900; font-size: 19px; color: #FFFFFF;">F</div>
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

          <!-- 2. NEW PROMOTIONAL IMAGE SECTION -->
          <tr>
            <td class="padding-mobile" style="padding: 28px 28px 20px; text-align: center; background: #FFFFFF;">
              
              <!-- VALUE BADGE -->
              <div style="display: inline-block; background: #EFF6FF; border: 1.5px solid #BFDBFE; padding: 5px 16px; border-radius: 100px; margin-bottom: 14px;">
                <span style="color: #1D4ED8; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.1px;">
                  ✨ TURN YOUR REACH INTO REWARDS
                </span>
              </div>

              <!-- MAIN BOLD HEADLINE -->
              <h1 class="hero-title" style="margin: 0 0 10px; font-size: 30px; line-height: 36px; font-weight: 900; color: #0F172A; letter-spacing: -0.8px;">
                TURN YOUR REACH<br><span style="color: #0034DE;">INTO REWARDS</span>
              </h1>

              <p style="margin: 0 auto 18px; font-size: 14px; line-height: 22px; color: #475569; max-width: 480px;">
                Hello <strong>${displayName}</strong>, the more people you reach and the more qualifying referrals you generate, the greater your potential <strong>FreedomPlan</strong> reward.
              </p>

              <!-- PROMOTIONAL IMAGE VISUAL -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                <tr>
                  <td align="center">
                    <div style="border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.09);">
                      <a href="${actionUrl}" target="_blank" style="display: block;">
                        <img src="cid:promo-hero-flyer" alt="FreedomPlan — Turn Your Reach Into Rewards" width="524" style="width: 100%; max-width: 524px; height: auto; display: block; border: 0;" onerror="this.onerror=null;this.src='${flyerWebUrl}';" />
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3. SERVICE EXPLANATION SECTION -->
          <tr>
            <td class="padding-mobile" style="padding: 24px 28px 24px; background: #FAF9F6; border-top: 1px solid #F0ECE1; border-bottom: 1px solid #F0ECE1;">
              
              <div style="text-align: center; margin-bottom: 18px;">
                <span style="font-size: 11px; font-weight: 900; color: #0034DE; text-transform: uppercase; letter-spacing: 1.6px;">
                  FREEDOMPLAN BENEFITS &amp; SERVICES
                </span>
                <h2 style="margin: 6px 0 0; font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px;">
                  Smart Planning for International Students in the UK
                </h2>
              </div>

              <!-- SERVICE CARDS -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td class="mobile-stack" width="48%" style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 14px; padding: 18px 16px; vertical-align: top;">
                    <div style="font-size: 20px; margin-bottom: 8px;">🇬🇧</div>
                    <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">UK Financial Roadmap</div>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748B;">
                      Master living costs, tuition milestones, accommodation budgeting, and banking before your first day in the UK.
                    </p>
                  </td>
                  <td width="4%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td class="mobile-stack" width="48%" style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 14px; padding: 18px 16px; vertical-align: top;">
                    <div style="font-size: 20px; margin-bottom: 8px;">💷</div>
                    <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Creator Rewards Program</div>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748B;">
                      Earn cash payouts starting from £25+ to £35+ by sharing your study abroad journey and referring fellow students.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 4. TRUSTED / CREDIBILITY SECTION & 5. TRUSTED CARDS -->
          <tr>
            <td class="padding-mobile" style="padding: 30px 28px 26px; background: #FFFFFF;">
              
              <!-- TRUSTED HEADING -->
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; background: #F0FDF4; border: 1px solid #BBF7D0; color: #16A34A; padding: 3px 12px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
                  ⭐ Social Proof
                </div>
                <h3 style="margin: 0 0 6px; font-size: 22px; font-weight: 900; color: #0F172A; letter-spacing: -0.4px;">
                  Trusted by 500+ top students
                </h3>
                <p style="margin: 0; font-size: 13px; color: #64748B;">
                  Built with transparency, security, and proven student success.
                </p>
              </div>

              <!-- 6 TRUSTED CARDS (2x3 GRID) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <!-- ROW 1 -->
                <tr>
                  <td class="mobile-stack-half" width="48%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 14px; vertical-align: top;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; font-size: 18px;">🎓</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">Trusted by Students</div>
                          <div style="font-size: 11px; line-height: 16px; color: #64748B;">Designed specifically for international students navigating life in the UK.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td class="mobile-stack-half" width="48%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 14px; vertical-align: top;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; font-size: 18px;">🔒</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">Secure &amp; Reliable</div>
                          <div style="font-size: 11px; line-height: 16px; color: #64748B;">Bank-grade data privacy and dependable weekly reward payouts.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td colspan="3" style="height: 10px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
                
                <!-- ROW 2 -->
                <tr>
                  <td class="mobile-stack-half" width="48%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 14px; vertical-align: top;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; font-size: 18px;">💎</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">Transparent Rewards</div>
                          <div style="font-size: 11px; line-height: 16px; color: #64748B;">Clear milestone tiers (£25+ / £35+) based directly on your reach.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td class="mobile-stack-half" width="48%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 14px; vertical-align: top;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; font-size: 18px;">📊</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">Easy Performance Tracking</div>
                          <div style="font-size: 11px; line-height: 16px; color: #64748B;">Seamless screenshot submissions and straightforward verification.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td colspan="3" style="height: 10px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>

                <!-- ROW 3 -->
                <tr>
                  <td class="mobile-stack-half" width="48%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 14px; vertical-align: top;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; font-size: 18px;">✅</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">Verified Rewards</div>
                          <div style="font-size: 11px; line-height: 16px; color: #64748B;">Weekly verification with prompt credit directly to your account.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td class="mobile-stack-half" width="48%" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 14px; vertical-align: top;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 10px; font-size: 18px;">🌟</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">Creator-Focused</div>
                          <div style="font-size: 11px; line-height: 16px; color: #64748B;">High-growth opportunities tailored for student creators and influencers.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 6. MAIN CTA SECTION -->
          <tr>
            <td style="padding: 24px 28px 32px; background: linear-gradient(180deg, #FFFFFF 0%, #FAF8F2 100%); text-align: center; border-top: 1px solid #F0ECE1;">
              
              <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #0F172A;">
                Ready to turn your reach into rewards?
              </p>

              <!-- GET STARTED BUTTON -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="50%" stroke="f" fillcolor="#0034DE">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Get Started &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${actionUrl}" target="_blank" style="background: #0034DE; color: #FFFFFF; display: inline-block; font-size: 15px; font-weight: 900; line-height: 52px; text-align: center; text-decoration: none; padding: 0 44px; -webkit-text-size-adjust: none; border-radius: 100px; box-shadow: 0 8px 24px rgba(0, 52, 222, 0.35); letter-spacing: 0.5px; mso-hide: all;">
                      Get Started &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #64748B;">
                No upfront fees &bull; Instant access &bull; Weekly reward cycles
              </p>
            </td>
          </tr>

          <!-- 7. FOOTER -->
          <tr>
            <td style="padding: 24px 28px; background: #FFFFFF; border-top: 1px solid #F3EFE6; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 14px; font-weight: 800; color: #0F172A;">
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
TURN YOUR REACH INTO REWARDS

Hello ${displayName},

The more people you reach and the more qualifying referrals you generate, the greater your potential FreedomPlan reward.

WHAT FREEDOMPLAN PROVIDES:
- UK Financial Roadmap: Master living costs, tuition milestones, and accommodation budgeting before your first day in the UK.
- Creator Rewards Program: Earn cash payouts starting from £25+ to £35+ by sharing your study abroad journey.

TRUSTED BY 500+ TOP STUDENTS:
- Trusted by students: Built specifically for international students navigating life in the UK.
- Secure & reliable: Bank-grade data privacy and dependable weekly reward payouts.
- Transparent rewards: Clear milestone tiers (£25+ / £35+) based directly on your reach.
- Easy performance tracking: Seamless screenshot submissions and straightforward verification.
- Verified rewards: Weekly verification with prompt credit directly to your account.
- Creator-focused opportunities: High-growth opportunities tailored for student creators.

Get Started: ${actionUrl}
Website: ${cleanAppUrl}

--------------------------------------------------
To unsubscribe from weekly promotions:
${unsubscribeUrl}

FreedomPlan • Support: FreedomPlan786@gmail.com
`;

  return { html, text, unsubscribeUrl, actionUrl };
}

module.exports = {
  renderPromotionalTemplate,
};
