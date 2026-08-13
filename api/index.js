import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@vercel/kv';

const app = express();
app.use(cors());
app.use(express.json());

// Fallback in-memory store for local testing
const localOtpStore = new Map();

// Helper functions to manage OTP state automatically switching between KV and Map
function getKVClient() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return createClient({ url, token });
  }
  return null;
}

async function storeOtp(email, otp, expiresInMs) {
  const kv = getKVClient();
  if (kv) {
    // Vercel KV / Upstash Redis
    await kv.set(`otp:${email}`, otp, { px: expiresInMs });
  } else {
    // Local memory fallback
    localOtpStore.set(email, { otp, expiresAt: Date.now() + expiresInMs });
  }
}

async function getStoredOtp(email) {
  const kv = getKVClient();
  if (kv) {
    return await kv.get(`otp:${email}`);
  } else {
    const data = localOtpStore.get(email);
    if (data && Date.now() <= data.expiresAt) return data.otp;
    if (data) localOtpStore.delete(email); // Clean up expired
    return null;
  }
}

async function deleteOtp(email) {
  const kv = getKVClient();
  if (kv) {
    await kv.del(`otp:${email}`);
  } else {
    localOtpStore.delete(email);
  }
}

// Configure NodeMailer (If no credentials, it will just log to console)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store OTP with 5-minute expiration
    await storeOtp(normalizedEmail, otp, 5 * 60 * 1000);

    console.log(`[OTP GENERATED] Email: ${normalizedEmail} | OTP: ${otp} (Using ${getKVClient() ? 'Vercel KV/Upstash' : 'Local Memory'})`);

    // If SMTP credentials are provided, send an actual email
    if (process.env.SMTP_USER) {
      // Build dynamic request metadata
      const now = new Date();
      const requestDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const requestTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const currentYear = now.getFullYear();

      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: 'Your FreedomPlan Security Code',
        text: `Your login code is: ${otp}. It will expire in 5 minutes. Never share this code with anyone.`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FreedomPlan - Security Check</title>
</head>
<body style="margin:0;padding:0;background:#f7f5f1;font-family:Arial,Helvetica,sans-serif;color:#101d31;">

  <!--[if mso]><table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><![endif]-->

  <!-- Outer wrapper -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f7f5f1;">
    <tr>
      <td align="center" style="padding:30px 0;">

        <!-- Card table: 640px wide, two columns -->
        <table width="640" border="0" cellspacing="0" cellpadding="0"
               style="max-width:640px;background:#faf9f6;border:1px solid #d8d8d5;">
          <tr valign="top">

            <!-- ===== LEFT RECORD PANEL ===== -->
            <td width="140" style="width:140px;border-right:2px solid #4422d8;padding:40px 16px 36px;background:#faf9f6;" valign="top">

              <!-- Brand logo mark + name -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom:36px;">
                    <!-- F mark (two rectangles stacked) -->
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="display:block;width:40px;height:11px;background:#4221d4;border-radius:6px;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                      <tr><td style="height:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr>
                      <tr>
                        <td style="display:block;width:11px;height:38px;background:#4221d4;border-radius:6px;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                    <!-- Brand name -->
                    <p style="margin:8px 0 0;font-size:14px;font-weight:700;letter-spacing:-0.5px;color:#101d31;">
                      Freedom<span style="color:#4323d6;">Plan</span>
                    </p>
                  </td>
                </tr>

                <!-- Divider line -->
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="1" style="width:1px;height:70px;background:#62676e;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ACCESS RECORD label -->
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:5px;color:#101820;writing-mode:vertical-rl;">ACCESS RECORD</p>
                  </td>
                </tr>

                <!-- dot -->
                <tr>
                  <td align="center" style="padding:14px 0 30px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="10" height="10" style="width:10px;height:10px;background:#4825d9;border-radius:50%;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- FP -->
                <tr>
                  <td align="center" style="padding-bottom:18px;">
                    <p style="margin:0;color:#3d21d2;font-size:17px;font-weight:700;">FP</p>
                  </td>
                </tr>

                <!-- Year -->
                <tr>
                  <td style="padding-left:22px;padding-bottom:0;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:16px;line-height:1.4;letter-spacing:1px;color:#101d31;">20<br />${currentYear.toString().slice(2)}</p>
                  </td>
                </tr>

                <!-- divider -->
                <tr>
                  <td style="padding-left:22px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="margin:14px 0;">
                      <tr>
                        <td width="36" height="1" style="width:36px;height:1px;background:#666;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- DOC TYPE -->
                <tr>
                  <td style="padding-bottom:6px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:8px;letter-spacing:2px;color:#ad4218;text-transform:uppercase;">DOC TYPE</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:18px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.5px;color:#101d31;">AUTHENTICATION</p>
                  </td>
                </tr>

                <!-- small divider -->
                <tr>
                  <td>
                    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                      <tr>
                        <td width="54" height="1" style="width:54px;height:1px;background:#777;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- STATUS -->
                <tr>
                  <td style="padding-bottom:6px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:8px;letter-spacing:2px;color:#ad4218;text-transform:uppercase;">STATUS</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:18px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.5px;color:#3920d4;">PENDING</p>
                  </td>
                </tr>

                <!-- small divider -->
                <tr>
                  <td>
                    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                      <tr>
                        <td width="54" height="1" style="width:54px;height:1px;background:#777;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- REF ID -->
                <tr>
                  <td style="padding-bottom:6px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:8px;letter-spacing:2px;color:#ad4218;text-transform:uppercase;">REF ID</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.5px;color:#101d31;">FP-SEC-OTP</p>
                  </td>
                </tr>

                <!-- Barcode simulation -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="2" style="width:2px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="4" style="width:4px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="1">&nbsp;</td>
                        <td width="4" style="width:4px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="4" style="width:4px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="1">&nbsp;</td>
                        <td width="2" style="width:2px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="4" style="width:4px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="1">&nbsp;</td>
                        <td width="4" style="width:4px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                        <td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:34px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Globe icon -->
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:22px;color:#ad4218;">&#9678;</p>
                  </td>
                </tr>

              </table>
            </td>
            <!-- ===== END LEFT PANEL ===== -->


            <!-- ===== MAIN CONTENT ===== -->
            <td style="padding:60px 44px 36px 50px;" valign="top">

              <!-- Top row: SECURITY CHECK label + orange dots -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:56px;">
                <tr>
                  <td>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:4px;color:#3820c9;">SECURITY CHECK</p>
                  </td>
                  <td align="right">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="7" height="7" style="width:7px;height:7px;background:#ad572f;border-radius:50%;font-size:1px;">&nbsp;</td>
                        <td width="9">&nbsp;</td>
                        <td width="7" height="7" style="width:7px;height:7px;background:#ad572f;border-radius:50%;font-size:1px;">&nbsp;</td>
                        <td width="9">&nbsp;</td>
                        <td width="7" height="7" style="width:7px;height:7px;background:#ad572f;border-radius:50%;font-size:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Hello -->
              <p style="margin:0 0 18px;font-size:18px;color:#101d31;">Hello,</p>

              <!-- Heading -->
              <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:48px;line-height:1;font-weight:700;letter-spacing:-2px;color:#10203a;">Confirm your<br />sign-in</p>

              <!-- Heading underline -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin:30px 0 28px;">
                <tr>
                  <td width="50" height="4" style="width:50px;height:4px;background:#4120d6;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <!-- Intro paragraph -->
              <p style="margin:0;font-size:15px;line-height:1.7;color:#101d31;max-width:380px;">
                We received a request to securely sign in to your Freedom Plan account.
                Use the One-Time Password below to continue.
              </p>

              <!-- ---- OTP SECTION ---- -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:44px;margin-bottom:44px;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#ad4218;">VERIFICATION CODE</p>
                  </td>
                </tr>
                <tr valign="middle">
                  <!-- Large OTP digits -->
                  <td style="padding-right:20px;">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:68px;line-height:1;letter-spacing:10px;color:#4020d3;font-weight:700;white-space:nowrap;">${otp}</p>
                  </td>
                  <!-- Validity box -->
                  <td width="120" style="width:120px;border-left:3px solid #4824d5;padding-left:16px;" valign="middle">
                    <p style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:10px;color:#ad4218;">VALID FOR</p>
                    <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:30px;line-height:1;color:#3820ca;font-weight:700;white-space:nowrap;">05:00</p>
                    <p style="margin:10px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1px;color:#101d31;">MINUTES</p>
                  </td>
                </tr>
              </table>

              <!-- Dashed divider -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px dashed #b9b9b5;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <!-- ---- REQUEST DETAILS ---- -->
              <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#ad4218;">REQUEST DETAILS</p>
              <!-- underline accent -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr>
                  <td width="22" height="2" style="width:22px;height:2px;background:#4320d4;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr valign="top">
                  <td width="48%" style="width:48%;padding-right:20px;">
                    <p style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1px;color:#101d31;">REQUEST TIME</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.7;color:#101d31;">${requestDate}<br />${requestTime} IST</p>
                  </td>
                  <td width="4%" style="border-left:1px solid #b9b9b9;font-size:1px;">&nbsp;</td>
                  <td width="48%" style="width:48%;padding-left:20px;">
                    <p style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1px;color:#101d31;">DEVICE</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.7;color:#101d31;">Web Browser</p>
                  </td>
                </tr>
              </table>

              <!-- Dashed divider -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-top:1px dashed #b9b9b5;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <!-- ---- SECURITY INSTRUCTIONS ---- -->
              <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;color:#ad4218;">SECURITY INSTRUCTIONS</p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td width="22" height="2" style="width:22px;height:2px;background:#4320d4;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>

              <!-- Instruction 1 -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:1px dashed #d1d1ce;padding-bottom:12px;margin-bottom:12px;">
                <tr valign="top">
                  <td width="24" style="padding-top:7px;padding-right:20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr><td width="22" height="2" style="width:22px;height:2px;background:#4320d4;font-size:1px;line-height:1px;">&nbsp;</td></tr>
                    </table>
                  </td>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.55;color:#101d31;">Never share your OTP with anyone.</td>
                </tr>
              </table>

              <!-- Instruction 2 -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:1px dashed #d1d1ce;padding-bottom:12px;margin-bottom:12px;">
                <tr valign="top">
                  <td width="24" style="padding-top:7px;padding-right:20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr><td width="22" height="2" style="width:22px;height:2px;background:#4320d4;font-size:1px;line-height:1px;">&nbsp;</td></tr>
                    </table>
                  </td>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.55;color:#101d31;">Freedom Plan will never ask for your OTP by phone, email, or message.</td>
                </tr>
              </table>

              <!-- Instruction 3 -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding-bottom:12px;margin-bottom:12px;">
                <tr valign="top">
                  <td width="24" style="padding-top:7px;padding-right:20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr><td width="22" height="2" style="width:22px;height:2px;background:#4320d4;font-size:1px;line-height:1px;">&nbsp;</td></tr>
                    </table>
                  </td>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.55;color:#101d31;">If you didn't request this code, please ignore this email or contact support.</td>
                </tr>
              </table>

              <!-- ---- FOOTER ---- -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:2px solid #4320d4;margin-top:28px;padding-top:28px;">
                <tr valign="top">

                  <!-- Col 1: Brand -->
                  <td width="33%" style="width:33%;padding-right:16px;">
                    <p style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:#3920d0;">FREEDOMPLAN</p>
                    <p style="margin:0;font-size:12px;line-height:1.65;color:#101d31;">Financial freedom.<br />Education first.</p>
                  </td>

                  <!-- Col 2: Contact -->
                  <td width="40%" style="width:40%;border-left:1px solid #8e8e8e;padding-left:20px;padding-right:16px;">
                    <p style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#101d31;">&#9678; &nbsp;www.freedomplan.com</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:11px;color:#101d31;">&#9993; &nbsp;support@freedomplan.com</p>
                  </td>

                  <!-- Col 3: Copyright -->
                  <td width="27%" style="width:27%;border-left:1px solid #8e8e8e;padding-left:20px;">
                    <p style="margin:0;font-size:12px;line-height:1.8;color:#101d31;">&copy; ${currentYear}<br />Freedom Plan<br />All rights reserved.</p>
                  </td>

                </tr>
              </table>

            </td>
            <!-- ===== END MAIN CONTENT ===== -->

          </tr>
        </table>
        <!-- End card -->

      </td>
    </tr>
  </table>
  <!-- End outer wrapper -->

  <!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`,
      });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const storedOtp = await getStoredOtp(normalizedEmail);

  if (!storedOtp) {
    return res.status(400).json({ error: 'No active OTP found or it has expired. Please request a new one.' });
  }

  if (String(storedOtp) !== String(otp)) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // OTP verified successfully, remove it from store
  await deleteOtp(normalizedEmail);
  
  res.json({ message: 'Verified successfully' });
});

app.post('/api/auth/register-notify', async (req, res) => {
  const data = req.body;
  
  console.log('[NEW REGISTRATION NOTIFICATION]', data);

  try {
    if (process.env.SMTP_USER) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: adminEmail,
        subject: 'New Freedom Plan Registration',
        text: `A new user has registered:\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nTier: ${data.tier}\nTime: ${data.timestamp}`,
        html: `
          <div style="font-family: sans-serif;">
            <h2>New Customer Registration</h2>
            <ul>
              <li><strong>Name:</strong> ${data.name}</li>
              <li><strong>Email:</strong> ${data.email}</li>
              <li><strong>Phone:</strong> ${data.phone}</li>
              <li><strong>Tier:</strong> ${data.tier}</li>
              <li><strong>Time:</strong> ${data.timestamp}</li>
            </ul>
            <p>This user has been saved to your Google Sheets.</p>
          </div>
        `,
      });
    }
    res.json({ message: 'Notification sent' });
  } catch (err) {
    console.error('Error sending registration notification:', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Export the Express API for Vercel Serverless
export default app;

// Start server locally if not running in Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_ENV) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Auth API Server running locally on port ${PORT}`);
  });
}
