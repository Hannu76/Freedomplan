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
      // Build dynamic request metadata in IST
      const now = new Date();
      const requestDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });
      const requestTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
      const currentYear = now.getFullYear();

      // ── Accent theme selection (True RGB Randomization) ──────────────
      // Purely a visual presentation feature — has zero connection to OTP
      // generation or authentication logic.
      function randomRGB() {
          const r = Math.floor(Math.random() * 256);
          const g = Math.floor(Math.random() * 256);
          const b = Math.floor(Math.random() * 256);
          return { rgb: `rgb(${r}, ${g}, ${b})`, r, g, b };
      }
      
      const color = randomRGB();
      const accent = color.rgb;
      // ────────────────────────────────────────────────────────────────

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
                    <!-- F mark -->
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Top horizontal bar -->
                        <td colspan="2" width="40" height="11" style="width:40px;height:11px;background:${accent};border-radius:6px;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                      <tr><td colspan="2" height="3" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>
                      <tr>
                        <!-- Vertical stem -->
                        <td width="11" height="38" style="width:11px;height:38px;background:${accent};border-radius:6px;font-size:1px;line-height:1px;">&nbsp;</td>
                        <!-- Middle horizontal bar -->
                        <td width="20" height="11" valign="top" style="width:20px;height:11px;background:${accent};border-radius:0 6px 6px 0;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                    <!-- Brand name -->
                    <p style="margin:8px 0 0;font-size:14px;font-weight:700;letter-spacing:-0.5px;color:#101d31;">
                      Freedom<span style="color:${accent};">Plan</span>
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
            <!-- ===== LEFT ACCESS RECORD PANEL ===== -->
            <td width="140" style="width:140px;border-right:1px solid #92969b;padding:46px 18px 34px 20px;background:#faf8f4;" valign="top">

              <table width="100%" border="0" cellspacing="0" cellpadding="0">

                <!-- F-mark logo -->
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Top bar of F -->
                        <td>
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="38" height="16" style="width:38px;height:16px;background:${accent};border-radius:7px 7px 3px 3px;font-size:1px;line-height:1px;">&nbsp;</td>
                            </tr>
                            <tr><td height="3" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>
                            <tr>
                              <!-- Stem of F -->
                              <td width="12" height="36" style="width:12px;height:36px;background:${accent};border-radius:0 0 8px 8px;font-size:1px;line-height:1px;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- FREEDOMPLAN wordmark -->
                <tr>
                  <td align="center" style="padding-bottom:34px;">
                    <p style="margin:0;font-size:8px;font-weight:700;letter-spacing:3px;color:#10213a;line-height:1;">FREEDOMPLAN</p>
                  </td>
                </tr>

                <!-- Vertical divider line -->
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="1" style="width:1px;height:100px;background:#87909b;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ACCESS RECORD -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <p style="margin:0;font-size:9px;font-weight:600;letter-spacing:7px;color:#10213a;writing-mode:vertical-rl;transform:rotate(180deg);">ACCESS RECORD</p>
                  </td>
                </tr>

                <!-- Blue dot -->
                <tr>
                  <td align="center" style="padding:22px 0 28px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="11" height="11" style="width:11px;height:11px;background:${accent};border-radius:50%;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- FP -->
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <p style="margin:0;font-size:21px;font-weight:700;color:${accent};line-height:1;">FP</p>
                  </td>
                </tr>

                <!-- Year -->
                <tr>
                  <td align="center" style="padding-bottom:0;">
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;line-height:1.45;letter-spacing:1px;color:#10213a;">20<br />${currentYear.toString().slice(2)}</p>
                  </td>
                </tr>

                <!-- Small rule -->
                <tr>
                  <td align="center">
                    <table border="0" cellspacing="0" cellpadding="0" style="margin:20px auto 56px;">
                      <tr>
                        <td width="24" height="1" style="width:24px;height:1px;background:#9da2a9;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- DOC TYPE -->
                <tr>
                  <td style="padding-bottom:5px;">
                    <p style="margin:0;font-size:8px;letter-spacing:1px;font-weight:700;color:#a8471f;text-transform:uppercase;">DOC. TYPE</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:3px;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#10213a;">AUTHENTICATION</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellspacing="0" cellpadding="0" style="margin:14px 0;">
                      <tr>
                        <td width="60" height="1" style="width:60px;height:1px;background:#8f969e;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- STATUS -->
                <tr>
                  <td style="padding-bottom:5px;">
                    <p style="margin:0;font-size:8px;letter-spacing:1px;font-weight:700;color:#a8471f;text-transform:uppercase;">STATUS</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:3px;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:${accent};">PENDING</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table border="0" cellspacing="0" cellpadding="0" style="margin:14px 0;">
                      <tr>
                        <td width="60" height="1" style="width:60px;height:1px;background:#8f969e;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- REF ID -->
                <tr>
                  <td style="padding-bottom:5px;">
                    <p style="margin:0;font-size:8px;letter-spacing:1px;font-weight:700;color:#a8471f;text-transform:uppercase;">REF ID</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:18px;">
                    <p style="margin:0;font-size:10px;font-weight:600;color:#10213a;">FP-SEC-OTP</p>
                  </td>
                </tr>

                <!-- Barcode strips -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="2" style="width:2px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="4" style="width:4px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="1">&nbsp;</td>
                        <td width="2" style="width:2px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="3" style="width:3px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="1">&nbsp;</td>
                        <td width="4" style="width:4px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="3" style="width:3px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="1">&nbsp;</td>
                        <td width="2" style="width:2px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="4" style="width:4px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td><td width="2">&nbsp;</td>
                        <td width="2" style="width:2px;height:30px;background:#1b1d20;font-size:1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Globe icon -->
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:21px;color:#a8471f;">&#9678;</p>
                  </td>
                </tr>

              </table>
            </td>
            <!-- ===== END LEFT PANEL ===== -->


            <!-- ===== MAIN CONTENT ===== -->
            <td style="padding:0;" valign="top">

              <table width="100%" border="0" cellspacing="0" cellpadding="0">

                <!-- TOP: kicker + map area -->
                <tr>
                  <td style="padding:38px 40px 0 40px;" valign="top">
                    <!-- Two column wrapper for email safety -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top">
                          <!-- SECURITY CHECK label -->
                          <p style="margin:0 0 26px;font-size:11px;font-weight:700;letter-spacing:4px;color:${accent};">SECURITY CHECK</p>
                          <!-- Main heading -->
                          <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:60px;line-height:.94;font-weight:600;letter-spacing:-3px;color:#10213a;">Confirm<br />your sign-in</p>
                        </td>
                        <td valign="top" align="right">
                          <!-- Map dots decoration -->
                          <table border="0" cellspacing="0" cellpadding="0">
                      <!-- Row 1 â€“ Europe/Asia dots -->
                      <tr>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td>
                      </tr>
                      <tr><td colspan="20" height="4">&nbsp;</td></tr>
                      <!-- Row 2 â€“ wider spread -->
                      <tr>
                        <td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:${accent};border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:${accent};border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td>
                      </tr>
                      <tr><td colspan="20" height="4">&nbsp;</td></tr>
                      <!-- Row 3 -->
                      <tr>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:${accent};border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td>
                      </tr>
                      <tr><td colspan="20" height="4">&nbsp;</td></tr>
                      <!-- Row 4 -->
                      <tr>
                        <td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:${accent};border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td>
                      </tr>
                      <tr><td colspan="20" height="4">&nbsp;</td></tr>
                      <!-- Row 5 -->
                      <tr>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td><td width="4">&nbsp;</td>
                        <td width="5" height="5" style="width:5px;height:5px;background:#c6c6d9;border-radius:50%;font-size:1px;">&nbsp;</td>
                      </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Blue accent rule -->
                    <table border="0" cellspacing="0" cellpadding="0" style="margin:28px 0 30px;">
                      <tr>
                        <td width="56" height="4" style="width:56px;height:4px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Intro text -->
                    <p style="margin:0 0 46px;font-size:17px;line-height:1.75;font-weight:500;color:#10213a;">
                      We received a request to securely sign in to<br />your Freedom Plan account.<br />Use the One-Time Password below to continue.
                    </p>

                  </td>
                </tr>

                <!-- ---- VERIFICATION CODE ---- -->
                <tr>
                  <td style="padding:0 40px;">

                    <!-- Section label row with trailing line -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                      <tr valign="middle">
                        <td style="white-space:nowrap;padding-right:14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#a8471f;">VERIFICATION CODE</td>
                        <td style="border-top:1px solid #858b94;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- OTP digits + validity box -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:8px;">
                      <tr valign="middle">
                        <td>
                          <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:74px;line-height:.85;font-weight:600;letter-spacing:2px;color:${accent};white-space:nowrap;">${otp}</p>
                        </td>
                        <td width="124" style="width:124px;" align="right" valign="middle">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr valign="top">
                              <td style="padding-right:12px;">
                                <p style="margin:0 0 11px;font-size:10px;font-weight:700;letter-spacing:2px;color:#a8471f;">VALID FOR</p>
                                <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:31px;font-weight:500;line-height:1;color:${accent};">05:00</p>
                                <p style="margin:8px 0 0;font-size:9px;letter-spacing:2px;font-weight:700;color:#10213a;">MINUTES</p>
                              </td>
                              <!-- Right border accent -->
                              <td width="3" style="width:3px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Solid separator -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:34px 0 28px;">
                      <tr>
                        <td height="1" style="height:1px;background:#9da2a8;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- ---- REQUEST DETAILS ---- -->
                <tr>
                  <td style="padding:0 40px;">

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                      <tr valign="middle">
                        <td style="white-space:nowrap;padding-right:14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#a8471f;">REQUEST DETAILS</td>
                        <td style="border-top:1px solid #858b94;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:2px dotted #c2c3c5;padding-bottom:26px;margin-bottom:24px;">
                      <tr valign="top">

                        <!-- REQUEST TIME -->
                        <td width="46%" style="width:46%;border-right:1px solid #a2a7ad;padding-right:28px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                            <tr><td width="30" height="3" style="width:30px;height:3px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td></tr>
                          </table>
                          <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:2px;color:${accent};">REQUEST TIME</p>
                          <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:15px;line-height:1.8;color:#10213a;">${requestDate}<br />${requestTime} IST</p>
                        </td>

                        <td width="8%">&nbsp;</td>

                        <!-- DEVICE -->
                        <td width="46%" style="width:46%;padding-left:28px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                            <tr><td width="30" height="3" style="width:30px;height:3px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td></tr>
                          </table>
                          <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:2px;color:${accent};">DEVICE</p>
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr valign="middle">
                              <td><p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:15px;line-height:1.8;color:#10213a;">Web Browser</p></td>
                              <td align="right"><p style="margin:0;font-size:28px;color:#a8471f;font-weight:300;">&rarr;</p></td>
                            </tr>
                          </table>
                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- ---- SECURITY NOTES ---- -->
                <tr>
                  <td style="padding:0 40px 0;">

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                      <tr valign="middle">
                        <td style="white-space:nowrap;padding-right:14px;font-size:11px;font-weight:700;letter-spacing:3px;color:#a8471f;">SECURITY NOTES</td>
                        <td style="border-top:1px solid #858b94;font-size:1px;line-height:1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Note 1 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:1px dotted #c4c4c5;padding-bottom:14px;margin-bottom:14px;">
                      <tr valign="top">
                        <td width="38" style="padding-top:8px;padding-right:14px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr><td width="26" height="3" style="width:26px;height:3px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td></tr>
                          </table>
                        </td>
                        <td style="font-size:14px;line-height:1.55;font-weight:500;color:#10213a;">Never share your OTP with anyone.</td>
                      </tr>
                    </table>

                    <!-- Note 2 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:1px dotted #c4c4c5;padding-bottom:14px;margin-bottom:14px;">
                      <tr valign="top">
                        <td width="38" style="padding-top:8px;padding-right:14px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr><td width="26" height="3" style="width:26px;height:3px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td></tr>
                          </table>
                        </td>
                        <td style="font-size:14px;line-height:1.55;font-weight:500;color:#10213a;">Freedom Plan will never ask for your OTP by phone, email, or message.</td>
                      </tr>
                    </table>

                    <!-- Note 3 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding-bottom:14px;margin-bottom:26px;">
                      <tr valign="top">
                        <td width="38" style="padding-top:8px;padding-right:14px;">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr><td width="26" height="3" style="width:26px;height:3px;background:${accent};font-size:1px;line-height:1px;">&nbsp;</td></tr>
                          </table>
                        </td>
                        <td style="font-size:14px;line-height:1.55;font-weight:500;color:#10213a;">If you didn&rsquo;t request this code, please ignore this email or contact support.</td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- ---- FOOTER ---- -->
                <tr>
                  <td style="padding:0 40px 36px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:1px solid ${accent};padding-top:22px;">
                      <tr valign="top">

                        <!-- Col 1: Brand + tagline -->
                        <td width="33%" style="width:33%;padding-right:14px;">
                          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:700;color:#10213a;">Freedom<span style="color:${accent};">Plan</span></p>
                          <p style="margin:0;font-size:8px;letter-spacing:2px;line-height:2.1;font-weight:600;color:#10213a;">FINANCIAL FREEDOM.<br />EDUCATION FIRST.</p>
                        </td>

                        <!-- Col 2: Contact -->
                        <td width="40%" style="width:40%;border-left:1px solid #9ca1a8;padding-left:22px;padding-right:14px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:11px;">
                            <tr valign="middle">
                              <td width="18" style="padding-right:9px;"><p style="margin:0;font-size:13px;color:#a8471f;">&#9678;</p></td>
                              <td><p style="margin:0;font-size:12px;color:#10213a;">www.freedomplan.com</p></td>
                            </tr>
                          </table>
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr valign="middle">
                              <td width="18" style="padding-right:9px;"><p style="margin:0;font-size:12px;color:#a8471f;">&#9993;</p></td>
                              <td><p style="margin:0;font-size:12px;color:#10213a;">support@freedomplan.com</p></td>
                            </tr>
                          </table>
                        </td>

                        <!-- Col 3: Copyright -->
                        <td width="27%" style="width:27%;border-left:1px solid #9ca1a8;padding-left:22px;">
                          <p style="margin:0;font-size:12px;line-height:1.8;color:#10213a;">&copy; ${currentYear}<br />Freedom Plan<br />All rights reserved.</p>
                        </td>

                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

            </td>
            <!-- ===== END MAIN CONTENT ===== -->

          </tr>
        </table>

      </td>
    </tr>
  </table>

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
