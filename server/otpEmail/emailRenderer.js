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
    <title>FreedomPlan OTP</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.04); }
        .hero { background-color: ${theme.soft}; padding: 48px 40px 0; position: relative; overflow: hidden; }
        .hero-text { max-width: 240px; position: relative; z-index: 2; padding-bottom: 48px;}
        .hero h1 { margin: 0 0 4px; font-size: 36px; line-height: 1.1; font-weight: 700; color: #0f172a; }
        .hero h1 span { color: ${theme.primary}; }
        .hero p { margin: 24px 0 0; font-size: 15px; line-height: 1.5; color: #475569; font-weight: 500; }
        .hero-shape { position: absolute; right: 0; bottom: 0; width: 340px; height: 340px; background-color: ${theme.light}; border-top-left-radius: 50%; border-bottom-left-radius: 20px; z-index: 0; }
        .hero-img { position: absolute; right: -20px; bottom: 0; height: 320px; z-index: 1; }
        .header { padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; background: #ffffff;}
        .brand { font-size: 20px; font-weight: 800; color: #0f172a; text-decoration: none; display: flex; align-items: center; }
        .brand span { color: ${theme.primary}; }
        .brand-icon { background: ${theme.primary}; color: #ffffff; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 12px; font-size: 18px; line-height: 32px; text-align: center; }
        .journey-tag { font-size: 12px; font-weight: 600; color: #64748b; }
        .content { padding: 40px; }
        .kicker { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; color: ${theme.primary}; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center;}
        .kicker svg { margin-right: 8px; }
        .title { margin: 0 0 16px; font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.2; }
        .subtitle { margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #475569; }
        
        .otp-section { background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .otp-label { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: ${theme.primary}; text-transform: uppercase; margin-bottom: 20px; text-align: center;}
        
        .details-grid { display: block; border-top: 1px solid #e2e8f0; padding-top: 24px; margin-bottom: 32px; }
        .detail-item { display: inline-block; width: 48%; vertical-align: top; }
        .detail-label { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; display: flex; align-items: center;}
        .detail-value { font-size: 14px; font-weight: 700; color: #0f172a; }
        
        .security-box { background-color: #f8fafc; border-radius: 12px; padding: 16px; display: flex; align-items: flex-start; margin-bottom: 12px; }
        
        .benefits { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 48px; }
        .benefits-title { font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #64748b; text-transform: uppercase; margin-bottom: 32px; text-align: center; }
        
        .benefits-grid { display: block; text-align: center; }
        .benefit-item { display: inline-block; width: 45%; padding: 0 5%; margin-bottom: 32px; vertical-align: top; text-align: center; }
        .benefit-icon { width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
        .benefit-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
        .benefit-text { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; }
        
        .cta { background-color: ${theme.primary}; border-radius: 16px; padding: 32px 24px; text-align: center; display: block; margin-top: 16px; text-decoration: none; color: #ffffff;}
        .cta-title { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #ffffff;}
        .cta-text { font-size: 14px; color: ${theme.light}; margin: 0 0 20px;}
        .cta-button { display: inline-block; background-color: #ffffff; color: ${theme.primary}; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 30px; text-decoration: none; }
        
        .footer { background-color: #ffffff; padding: 32px 40px; border-top: 1px solid #f1f5f9; text-align: center;}
        .footer-logo { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 16px; }
        .footer-logo span { color: ${theme.primary}; }
        .footer-links { margin-bottom: 24px; }
        .footer-links a { display: inline-block; margin: 0 12px; color: #64748b; font-size: 13px; text-decoration: none; font-weight: 500; }
        .footer-text { font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0; }
        
        @media only screen and (max-width: 600px) {
            .container { border-radius: 0; margin-top: 0; }
            .hero { padding: 32px 24px 0; }
            .hero-img { height: 260px; right: -40px; }
            .hero-text { max-width: 200px; padding-bottom: 32px;}
            .hero h1 { font-size: 28px; }
            .header { padding: 24px; flex-direction: column; align-items: flex-start; }
            .journey-tag { margin-top: 12px; }
            .content { padding: 24px; }
            .title { font-size: 24px; }
            .benefit-item { width: 100%; padding: 0; }
            .detail-item { width: 100%; margin-bottom: 16px; }
        }
    </style>
</head>
<body>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table class="container" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.04);">
                    <!-- Header -->
                    <tr>
                        <td align="left" style="padding: 24px 40px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="left">
                                        <div class="brand">
                                            <div class="brand-icon" style="background-color: ${theme.primary};">F</div>
                                            Freedom<span>Plan</span>
                                        </div>
                                    </td>
                                    <td align="right">
                                        <div class="journey-tag">
                                            <span style="color: ${theme.primaryDark}; padding-right: 6px;">✓</span> Your Journey. Secured.
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                        <td style="background-color: ${theme.soft}; position: relative; height: 320px; overflow: hidden;">
                            <div class="hero-shape" style="background-color: ${theme.light};"></div>
                            <!-- Fallback layout for emails: standard absolute positioning doesn't always work great, so we use a table to structure -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="position: relative; z-index: 2; height: 100%;">
                                <tr>
                                    <td valign="top" style="padding: 48px 40px; width: 60%;">
                                        <div class="hero-text">
                                            <h1 style="margin: 0; font-size: 36px; line-height: 1.1; font-weight: 700; color: #0f172a;">You dream it.</h1>
                                            <h1 style="margin: 0; font-size: 36px; line-height: 1.1; font-weight: 700; color: #0f172a;"><span style="color: ${theme.primary};">We plan it.</span></h1>
                                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #475569; font-weight: 500;">
                                                Smart financial<br>planning for your<br>global education journey.
                                            </p>
                                        </div>
                                    </td>
                                    <td valign="bottom" style="width: 40%; text-align: right; position: relative;">
                                        <img src="${appUrl}/images/freedomplan-female.png" alt="Student" style="display: block; max-height: 320px; position: absolute; bottom: 0; right: 0;" />
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td class="content" style="padding: 40px;">
                            
                            <div class="kicker">
                                <span style="display:inline-block; width: 14px; height: 16px; border: 1.5px solid ${theme.primary}; border-radius: 4px; border-top: 6px solid ${theme.primary}; margin-right: 8px; vertical-align: middle;"></span>
                                SECURITY CHECK
                            </div>
                            <h2 class="title">Verify your sign-in</h2>
                            <p class="subtitle">We received a request to securely sign in to your Freedom Plan account. Use the One-Time Password below to continue.</p>
                            
                            <!-- OTP Box -->
                            <div class="otp-section" style="border: 1px solid #f1f5f9; border-radius: 16px; padding: 32px 24px; text-align: center; margin-bottom: 32px; background: #ffffff;">
                                <div class="otp-label" style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: ${theme.primary}; text-transform: uppercase; margin-bottom: 24px;">YOUR ONE-TIME PASSWORD</div>
                                
                                <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                    <tr>
                                        ${otpBoxHtml}
                                    </tr>
                                </table>
                                
                                <div style="margin-top: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #64748b;">
                                    <div style="width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid ${theme.primary}; color: ${theme.primary}; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; margin-right: 8px;">L</div>
                                    This code is valid for 5 minutes only.
                                </div>
                            </div>
                            
                            <!-- Request Details -->
                            <div class="details-grid" style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-bottom: 32px; font-family: 'DM Sans', sans-serif;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td width="50%" valign="top">
                                            <div class="detail-label"><span style="color:${theme.primary}; font-weight:bold; margin-right:6px;">🕒</span> Request Time</div>
                                            <div class="detail-value">${requestTime || new Date().toLocaleString()}</div>
                                        </td>
                                        <td width="50%" valign="top">
                                            <div class="detail-label"><span style="color:${theme.primary}; font-weight:bold; margin-right:6px;">💻</span> Device</div>
                                            <div class="detail-value">${device || 'Web Browser'}</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Security Info -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${theme.soft}; border-radius: 12px; width: 100%; margin-bottom: 12px;">
                                <tr>
                                    <td width="40" valign="top" style="padding: 16px 0 16px 16px;">
                                        <div style="background-color: ${theme.primary}; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">🔒</div>
                                    </td>
                                    <td style="padding: 16px 16px 16px 0;">
                                        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Never share your OTP with anyone.</div>
                                        <div style="font-size: 13px; color: #475569; line-height: 1.4;">Freedom Plan will never ask for your OTP via phone, email, or message.</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${theme.soft}; border-radius: 12px; width: 100%;">
                                <tr>
                                    <td width="40" valign="top" style="padding: 16px 0 16px 16px;">
                                        <div style="background-color: ${theme.primary}; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">?</div>
                                    </td>
                                    <td style="padding: 16px 16px 16px 0;">
                                        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Didn't request this?</div>
                                        <div style="font-size: 13px; color: #475569; line-height: 1.4;">You can safely ignore this email or contact our support team.</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Benefits -->
                            <div class="benefits" style="margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 48px; text-align: center;">
                                <div class="benefits-title" style="font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #64748b; text-transform: uppercase; margin-bottom: 32px; text-align: center;">
                                    ★ WHY STUDENTS & PROFESSIONALS CHOOSE <span style="color: ${theme.primary};">FREEDOM PLAN</span>
                                </div>
                                
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <!-- Benefit 1 -->
                                        <td width="33%" valign="top" align="center" style="padding: 0 10px 24px;">
                                            <div style="background-color: ${theme.soft}; border: 1px solid ${theme.light}; color: ${theme.primary}; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; font-size: 20px;">🎓</div>
                                            <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Smart Loan Planning</h3>
                                            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0;">Personalized loan options that fit your goals.</p>
                                        </td>
                                        <!-- Benefit 2 -->
                                        <td width="33%" valign="top" align="center" style="padding: 0 10px 24px;">
                                            <div style="background-color: ${theme.soft}; border: 1px solid ${theme.light}; color: ${theme.primaryDark}; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; font-size: 20px;">💵</div>
                                            <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Better Interest Rates</h3>
                                            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0;">Compare top lenders for competitive rates.</p>
                                        </td>
                                        <!-- Benefit 3 -->
                                        <td width="33%" valign="top" align="center" style="padding: 0 10px 24px;">
                                            <div style="background-color: ${theme.soft}; border: 1px solid ${theme.light}; color: ${theme.primary}; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; font-size: 20px;">🛡️</div>
                                            <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Zero Hidden Charges</h3>
                                            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0;">Transparent process with no surprises.</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <!-- Benefit 4 -->
                                        <td width="33%" valign="top" align="center" style="padding: 0 10px;">
                                            <div style="background-color: ${theme.soft}; border: 1px solid ${theme.light}; color: ${theme.primaryDark}; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; font-size: 20px;">🌐</div>
                                            <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Global Education</h3>
                                            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0;">Support to study anywhere in the world.</p>
                                        </td>
                                        <!-- Benefit 5 -->
                                        <td width="33%" valign="top" align="center" style="padding: 0 10px;">
                                            <div style="background-color: ${theme.soft}; border: 1px solid ${theme.light}; color: ${theme.primary}; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; font-size: 20px;">📈</div>
                                            <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Easy Repayment</h3>
                                            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0;">Flexible plans that grow with your career.</p>
                                        </td>
                                        <!-- Benefit 6 -->
                                        <td width="33%" valign="top" align="center" style="padding: 0 10px;">
                                            <div style="background-color: ${theme.soft}; border: 1px solid ${theme.light}; color: ${theme.primaryDark}; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; display: inline-block; line-height: 44px; font-size: 20px;">🎧</div>
                                            <h3 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Expert Support</h3>
                                            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0;">Real people, real support — whenever needed.</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA -->
                            <div style="margin-top: 40px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${theme.primary}; border-radius: 16px; padding: 24px;">
                                    <tr>
                                        <td valign="middle" align="center" style="padding-bottom: 20px;">
                                            <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 8px; color: #ffffff;">Plan your education. Secure your future.</h3>
                                            <p style="font-size: 14px; color: ${theme.light}; margin: 0 0 20px;">Freedom Plan is with you at every step.</p>
                                            <a href="https://freedomplan.vercel.app" style="display: inline-block; background-color: #ffffff; color: ${theme.primary}; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 30px; text-decoration: none;">Visit Freedom Plan →</a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="left" style="background-color: #ffffff; padding: 32px 40px; border-top: 1px solid #f1f5f9;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="60%" valign="top">
                                        <div class="brand" style="margin-bottom: 8px;">
                                            <div class="brand-icon" style="background-color: ${theme.primary}; width: 24px; height: 24px; border-radius: 6px; font-size: 14px; line-height: 24px; margin-right: 8px;">F</div>
                                            Freedom<span>Plan</span>
                                        </div>
                                        <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 16px;">Empowering your global education journey</div>
                                        
                                        <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                                            <tr>
                                                <td style="padding-right: 16px;">
                                                    <a href="https://www.freedomplan.com" style="color: #64748b; font-size: 12px; text-decoration: none; display: flex; align-items: center;"><span style="color: ${theme.primary}; margin-right: 6px;">🌐</span> www.freedomplan.com</a>
                                                </td>
                                                <td>
                                                    <a href="mailto:support@freedomplan.com" style="color: #64748b; font-size: 12px; text-decoration: none; display: flex; align-items: center;"><span style="color: ${theme.primary}; margin-right: 6px;">✉️</span> support@freedomplan.com</a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
                                            © ${new Date().getFullYear()} Freedom Plan. All rights reserved.<br>
                                            This is an automated email. Please do not reply to this email.
                                        </p>
                                    </td>
                                    <td width="40%" valign="top" align="right">
                                        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Follow us</div>
                                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                                            <a href="#" style="width: 32px; height: 32px; background-color: #3b5998; border-radius: 50%; color: #fff; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; text-align: center; line-height: 32px;">f</a>
                                            <a href="#" style="width: 32px; height: 32px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border-radius: 50%; color: #fff; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; text-align: center; line-height: 32px;">in</a>
                                            <a href="#" style="width: 32px; height: 32px; background-color: #0077b5; border-radius: 50%; color: #fff; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; text-align: center; line-height: 32px;">in</a>
                                            <a href="#" style="width: 32px; height: 32px; background-color: #ff0000; border-radius: 50%; color: #fff; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; text-align: center; line-height: 32px;">▶</a>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

module.exports = { selectTheme, renderTemplate };
