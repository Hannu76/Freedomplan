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
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fc; color: #1a1a24; }
        .wrapper { background-color: #f7f9fc; padding: 40px 10px; width: 100%; display: flex; justify-content: center; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        .header { padding: 32px 40px; background: #ffffff; }
        .brand { font-size: 20px; font-weight: 800; color: #0f172a; text-decoration: none; display: flex; align-items: center; }
        .brand span { color: ${theme.primary}; }
        .hero { background-color: ${theme.soft}; padding: 0; position: relative; }
        
        .hero-table { width: 100%; border-spacing: 0; }
        .hero-text-container { padding: 48px 40px; width: 55%; vertical-align: top; }
        .hero-img-container { width: 45%; vertical-align: bottom; text-align: right; }
        .hero h1 { margin: 0; font-size: 34px; line-height: 1.15; font-weight: 800; color: #0f172a; }
        .hero h1 span { color: ${theme.primary}; }
        .hero p { margin: 16px 0 0; font-size: 15px; line-height: 1.5; color: #475569; font-weight: 500; }
        
        .kicker { font-size: 11px; font-weight: 800; letter-spacing: 2px; color: ${theme.primary}; text-transform: uppercase; margin-bottom: 12px; }
        .title { margin: 0 0 12px; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
        .subtitle { margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #475569; }
        
        .otp-box { border: 2px dashed #e2e8f0; border-radius: 20px; padding: 40px 24px; text-align: center; margin-bottom: 32px; background: #fafbfc; }
        .otp-digits { text-align: center; margin: 0 auto; }
        .digit { display: inline-block; width: 40px; height: 50px; line-height: 50px; font-size: 32px; font-weight: 800; color: #0f172a; background: #ffffff; border: 1px solid #cbd5e1; border-bottom: 3px solid ${theme.primary}; border-radius: 8px; margin: 0 4px; text-align: center; }
        
        .timer { margin-top: 24px; font-size: 13px; font-weight: 600; color: #64748b; }
        .timer-icon { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid ${theme.primary}; color: ${theme.primary}; line-height: 14px; font-size: 11px; font-weight: bold; margin-right: 6px; vertical-align: middle; text-align: center; }
        
        .details-box { display: block; width: 100%; border-top: 1px solid #e2e8f0; padding-top: 24px; margin-bottom: 32px; }
        .details-col { display: inline-block; width: 48%; vertical-align: top; }
        
        .security-notes { background-color: ${theme.soft}; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
        .sec-item { margin-bottom: 16px; }
        .sec-item:last-child { margin-bottom: 0; }
        .sec-icon { display: inline-block; width: 28px; height: 28px; background-color: ${theme.primary}; color: #ffffff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-family: monospace; font-size: 16px; margin-right: 12px; vertical-align: top; }
        .sec-text { display: inline-block; width: calc(100% - 45px); vertical-align: top; }
        .sec-text h4 { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #0f172a; }
        .sec-text p { margin: 0; font-size: 13px; color: #475569; line-height: 1.5; }
        
        .benefits { border-top: 1px solid #e2e8f0; padding-top: 40px; margin-bottom: 40px; text-align: center; }
        .benefits h3 { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #64748b; text-transform: uppercase; margin: 0 0 32px; }
        .feature { display: inline-block; width: 48%; padding: 0; margin-bottom: 32px; vertical-align: top; text-align: center; }
        .f-icon { font-size: 24px; line-height: 1.1; margin-bottom: 12px; color: ${theme.primary}; display: block; font-family: "Segoe UI Symbol", "Apple Color Emoji", sans-serif; }
        .f-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
        .f-desc { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0; padding: 0 10px; }
        
        .cta { background-color: ${theme.primary}; border-radius: 16px; padding: 32px; text-align: center; color: #ffffff; }
        .cta h3 { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #ffffff; }
        .cta p { margin: 0 0 24px; font-size: 14px; color: ${theme.light}; }
        .cta-btn { display: inline-block; background: #ffffff; color: ${theme.primary}; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 30px; text-decoration: none; }
        
        .footer { padding: 40px; border-top: 1px solid #f1f5f9; text-align: center; }
        .footer p { margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6; }
        
        @media only screen and (max-width: 600px) {
            .hero-text-container { width: 100%; display: block; padding: 40px 24px 20px; }
            .hero-img-container { width: 100%; display: block; text-align: center; padding-right: 0;}
            .hero-img-container img { right: auto; margin: 0 auto; position: relative !important; max-height: 280px !important; }
            .details-col { width: 100%; margin-bottom: 16px; display: block; }
            .feature { width: 100%; display: block; margin-bottom: 24px; padding: 0; }
            header, .content, .footer { padding-left: 24px; padding-right: 24px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="container" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0">
            <!-- Header -->
            <tr>
                <td class="header" align="center">
                    <div class="brand">
                        <span style="display:inline-block; background:${theme.primary}; color:#fff; width:28px; height:28px; border-radius:6px; line-height:28px; text-align:center; font-size:16px; margin-right:10px;">F</span>
                        Freedom<span>Plan</span>
                    </div>
                </td>
            </tr>
            
            <!-- Hero -->
            <tr>
                <td class="hero">
                    <table class="hero-table">
                        <tr>
                            <td class="hero-text-container">
                                <h1>You dream it.</h1>
                                <h1><span>We plan it.</span></h1>
                                <p>Smart financial planning for your global education journey.</p>
                            </td>
                            <td class="hero-img-container" style="position: relative;">
                                <img src="https://raw.githubusercontent.com/Hannu76/Freedomplan/main/public/images/freedomplan-female.png" alt="Student" style="display: block; max-height: 320px; position: absolute; bottom: 0; right: 0;" />
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td style="padding: 40px;">
                    <div class="kicker">&#9632; SECURITY CHECK</div>
                    <h2 class="title">Verify your sign-in</h2>
                    <p class="subtitle">Use the One-Time Password below to continue securely to your Freedom Plan account.</p>
                    
                    <!-- OTP -->
                    <div class="otp-box">
                        <div class="kicker" style="text-align: center;">YOUR SECURE OTP</div>
                        <div class="otp-digits">
                            ${otpBoxHtml}
                        </div>
                        <div class="timer">
                            <span class="timer-icon">&#x21BA;</span> This code is valid for 5 minutes only.
                        </div>
                    </div>
                    
                    <!-- Details -->
                    <div class="details-box">
                        <div class="details-col">
                            <div style="font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:1px; margin-bottom:6px; text-transform:uppercase;">&#x29D6; Request Time</div>
                            <div style="font-size:14px; font-weight:700; color:#0f172a;">${requestTime || new Date().toLocaleString()}</div>
                        </div>
                        <div class="details-col">
                            <div style="font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:1px; margin-bottom:6px; text-transform:uppercase;">&#x25A1; Device</div>
                            <div style="font-size:14px; font-weight:700; color:#0f172a;">${device || 'Web Browser'}</div>
                        </div>
                    </div>
                    
                    <!-- Security Notes -->
                    <div class="security-notes">
                        <div class="sec-item">
                            <div class="sec-icon">&#x2139;</div>
                            <div class="sec-text">
                                <h4>Never share your OTP</h4>
                                <p>Freedom Plan will never ask for your OTP via phone, email, or message.</p>
                            </div>
                        </div>
                        <div style="height: 1px; background: #e2e8f0; margin: 20px 0;"></div>
                        <div class="sec-item">
                            <div class="sec-icon" style="background:#475569;">!</div>
                            <div class="sec-text">
                                <h4>Didn't request this?</h4>
                                <p>You can safely ignore this email. Your account remains secure.</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Benefits -->
                    <div class="benefits">
                        <h3>&#9670; Why Choose Freedom Plan</h3>
                        <div class="feature">
                            <div class="f-icon">&#9673;</div>
                            <div class="f-title">Smart Planning</div>
                            <div class="f-desc">Personalized options tailored to your needs.</div>
                        </div>
                        <div class="feature">
                            <div class="f-icon">&#10022;</div>
                            <div class="f-title">Best Rates</div>
                            <div class="f-desc">Unbeatable competitive plans for growth.</div>
                        </div>
                        <div class="feature">
                            <div class="f-icon">&#9678;</div>
                            <div class="f-title">Zero Hidden Fees</div>
                            <div class="f-desc">Absolute transparency in all transactions.</div>
                        </div>
                        <div class="feature">
                            <div class="f-icon">&#10031;</div>
                            <div class="f-title">Global Education</div>
                            <div class="f-desc">Support to study anywhere in the world.</div>
                        </div>
                    </div>
                    
                    <!-- CTA -->
                    <div class="cta">
                        <h3>Secure Your Future</h3>
                        <p>Freedom Plan is with you at every step of your journey.</p>
                        <a href="https://freedomplan.vercel.app" class="cta-btn">Visit Freedom Plan &rarr;</a>
                    </div>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td class="footer">
                    <p style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 12px;">FreedomPlan</p>
                    <p style="margin-bottom: 4px;">www.freedomplan.com &nbsp;&bull;&nbsp; support@freedomplan.com</p>
                    <p>&copy; ${new Date().getFullYear()} Freedom Plan. All rights reserved.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
    `;
}

module.exports = { selectTheme, renderTemplate };
