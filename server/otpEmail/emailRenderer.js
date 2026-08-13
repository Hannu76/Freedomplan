const themes = require('./themes');

// Keep track of last themes per email to avoid repeating the same color
const lastUserThemes = new Map();

function selectTheme(email) {
    const lastTheme = lastUserThemes.get(email);
    let availableThemes = themes;

    if (lastTheme) {
        availableThemes = themes.filter(t => t.name !== lastTheme.name);
    }

    const randomIndex = Math.floor(Math.random() * availableThemes.length);
    const selectedTheme = availableThemes[randomIndex];

    // update last theme
    lastUserThemes.set(email, selectedTheme);

    return selectedTheme;
}

function renderTemplate({ otp, user, requestTime, device, theme, appUrl = 'https://freedomplan.vercel.app' }) {
    // We break the OTP into an array to render individual boxes easily
    const otpArray = String(otp).split('');
    const otpBoxHtml = otpArray.map(num => `
        <td align="center" style="padding: 0 4px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-bottom: 3px solid ${theme.primary}; border-radius: 8px; width: 44px; height: 56px; line-height: 56px; font-size: 32px; font-weight: 700; color: #1e293b; text-align: center; font-family: 'DM Sans', -apple-system, sans-serif;">
                ${num}
            </div>
        </td>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreedomPlan Security Code</title>
    <style>
        body, table, td, p, h1, h2, h3, a { font-family: Arial, Helvetica, sans-serif; }
        body { margin: 0; padding: 0; background-color: #f0f2f5; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- 100% Wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f2f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <!-- 600px Constrained Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border: 1px solid #e5e7eb; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" class="responsive-table">
                    
                    <!-- Header Logo -->
                    <tr>
                        <td align="left" style="padding: 24px 32px; border-bottom: 1px solid #f3f4f6;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background-color: ${theme.primary}; width: 28px; height: 28px; text-align: center; border-radius: 4px; color: #ffffff; font-weight: bold; font-size: 16px; line-height: 28px;">F</td>
                                    <td style="padding-left: 10px; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">
                                        Freedom<span style="color: ${theme.primary};">Plan</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Full Width Hero Image Section (HSBC Style) -->
                    <tr>
                        <td align="center" style="background-color: ${theme.soft}; padding: 40px 32px 0 32px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <h1 style="margin: 0 0 8px; font-size: 32px; font-weight: 800; color: #111827; line-height: 1.2;">You dream it.<br><span style="color: ${theme.primary};">We plan it.</span></h1>
                                        <p style="margin: 0; font-size: 16px; color: #4b5563; font-weight: 500;">Smart financial planning for your global journey.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" valign="bottom">
                                        <!-- Centered Hero Image for reliable rendering -->
                                        <img src="https://raw.githubusercontent.com/Hannu76/Freedomplan/main/public/images/freedomplan-female.png" alt="Student" width="300" style="display: block; width: 100%; max-width: 300px; height: auto;" />
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Solid Color Block Header (HSBC Style) -->
                    <tr>
                        <td align="left" style="background-color: ${theme.primary}; padding: 12px 32px;">
                            <h2 style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">Security Check: Verify your sign-in</h2>
                        </td>
                    </tr>

                    <!-- Content Body -->
                    <tr>
                        <td align="center" style="padding: 40px 32px;">
                            
                            <p style="margin: 0 0 32px; font-size: 15px; color: #4b5563; line-height: 1.6; text-align: left;">
                                We received a request to access your Freedom Plan account. Please use the One-Time Password below to complete your secure authentication.
                            </p>

                            <!-- OTP Box (Solid Table Layout) -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                                <tr>
                                    <td align="center" style="background-color: #f9fafb; border: 2px dashed ${theme.primary}; border-radius: 12px; padding: 32px 24px;">
                                        <div style="font-size: 11px; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Your Secure OTP Code</div>
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                ${otpBoxHtml}
                                            </tr>
                                        </table>
                                        <div style="margin-top: 16px; font-size: 13px; color: #6b7280; font-weight: 600;">
                                            <span style="display:inline-block; margin-right:4px; color:${theme.primary};">&#x21BA;</span> Valid for 5 minutes only
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Request Details (2 Column strict HTML Table) -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-bottom: 32px;">
                                <tr>
                                    <td width="50%" valign="top" style="padding-right: 16px;">
                                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Time of Request</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #111827;">${requestTime || new Date().toLocaleString()}</div>
                                    </td>
                                    <td width="50%" valign="top">
                                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Device</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #111827;">${device || 'Web Browser'}</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Warnings -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${theme.soft}; border-radius: 8px;">
                                <tr>
                                    <td valign="top" style="padding: 16px 0 16px 16px; width: 32px;">
                                        <div style="width: 24px; height: 24px; background-color: ${theme.primary}; border-radius: 50%; color: #ffffff; text-align: center; line-height: 24px; font-weight: bold;">!</div>
                                    </td>
                                    <td valign="middle" style="padding: 16px 16px 16px 12px; font-size: 13px; line-height: 1.5; color: #4b5563;">
                                        <strong style="color: #111827;">Never share your OTP.</strong> Freedom Plan will never call or SMS you asking for this code.
                                    </td>
                                </tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #ffffff;"></td></tr>
                                <tr>
                                    <td valign="top" style="padding: 16px 0 16px 16px; width: 32px;">
                                        <div style="width: 24px; height: 24px; background-color: #6b7280; border-radius: 50%; color: #ffffff; text-align: center; line-height: 24px; font-weight: bold;">?</div>
                                    </td>
                                    <td valign="middle" style="padding: 16px 16px 16px 12px; font-size: 13px; line-height: 1.5; color: #4b5563;">
                                        <strong style="color: #111827;">Didn't request this?</strong> You can safely ignore this email. Your privacy is fully secured.
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Solid Color Block Header 2 -->
                    <tr>
                        <td align="center" style="background-color: ${theme.primary}; padding: 12px 32px;">
                            <h2 style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">Why students choose Freedom Plan</h2>
                        </td>
                    </tr>

                    <!-- Features Strict Grid (HSBC Style) -->
                    <tr>
                        <td align="center" style="padding: 40px 32px;">
                            
                            <!-- Row 1 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                                <tr>
                                    <!-- Feature 1 -->
                                    <td width="50%" align="center" valign="top" style="padding: 0 10px;">
                                        <div style="font-size: 24px; color: ${theme.primary}; margin-bottom: 8px;">&#9733;</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 4px;">Smart Planning</div>
                                        <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">Custom loan options personalized for you.</div>
                                    </td>
                                    <!-- Feature 2 -->
                                    <td width="50%" align="center" valign="top" style="padding: 0 10px;">
                                        <div style="font-size: 24px; color: ${theme.primary}; margin-bottom: 8px;">&#10043;</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 4px;">Lowest Rates</div>
                                        <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">We negotiate competitive plans for maximum growth.</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Row 2 -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <!-- Feature 3 -->
                                    <td width="50%" align="center" valign="top" style="padding: 0 10px;">
                                        <div style="font-size: 24px; color: ${theme.primary}; margin-bottom: 8px;">&#10004;</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 4px;">Zero Hidden Fees</div>
                                        <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">Absolute transparency with no platform charges.</div>
                                    </td>
                                    <!-- Feature 4 -->
                                    <td width="50%" align="center" valign="top" style="padding: 0 10px;">
                                        <div style="font-size: 24px; color: ${theme.primary}; margin-bottom: 8px;">&#10022;</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 4px;">Global Support</div>
                                        <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">End-to-end guidance to study anywhere.</div>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td align="center" style="background-color: ${theme.light}; padding: 32px 32px 40px;">
                            <h3 style="margin: 0 0 12px; font-size: 20px; font-weight: bold; color: #111827;">Secure your global journey</h3>
                            <a href="https://freedomplan.vercel.app" style="display: inline-block; background-color: ${theme.primary}; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 6px;">Visit Freedom Plan</a>
                        </td>
                    </tr>

                    <!-- Footer Details (HSBC Style Legal) -->
                    <tr>
                        <td align="left" style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; font-size: 11px; line-height: 1.6; color: #6b7280;">
                            <p style="margin: 0 0 12px;">
                                <strong>Important Information:</strong><br>
                                Issued by Freedom Plan Financial Services. This email is intended solely for registered users of Freedom Plan. 
                                Please do not reply directly to this automated security message.
                            </p>
                            <p style="margin: 0 0 12px;">
                                <a href="https://freedomplan.vercel.app" style="color: ${theme.primary}; text-decoration: underline;">Privacy and Security</a> | 
                                <a href="https://freedomplan.vercel.app" style="color: ${theme.primary}; text-decoration: underline;">Terms of Use</a> | 
                                <a href="mailto:support@freedomplan.com" style="color: ${theme.primary}; text-decoration: underline;">Contact Support</a>
                            </p>
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Freedom Plan. All rights reserved. Registered office: Freedom Plan Towers, Global Financial District.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
    `;
}

module.exports = { selectTheme, renderTemplate };
