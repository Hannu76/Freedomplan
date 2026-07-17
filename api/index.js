import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

const app = express();
app.use(cors());
app.use(express.json());

// Fallback in-memory store for local testing
const localOtpStore = new Map();

// Helper functions to manage OTP state automatically switching between KV and Map
async function storeOtp(email, otp, expiresInMs) {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    // Vercel KV (Redis)
    await kv.set(`otp:${email}`, otp, { px: expiresInMs });
  } else {
    // Local memory fallback
    localOtpStore.set(email, { otp, expiresAt: Date.now() + expiresInMs });
  }
}

async function getStoredOtp(email) {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return await kv.get(`otp:${email}`);
  } else {
    const data = localOtpStore.get(email);
    if (data && Date.now() <= data.expiresAt) return data.otp;
    if (data) localOtpStore.delete(email); // Clean up expired
    return null;
  }
}

async function deleteOtp(email) {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
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

    console.log(`[OTP GENERATED] Email: ${normalizedEmail} | OTP: ${otp} (Using ${process.env.KV_REST_API_URL ? 'Vercel KV' : 'Local Memory'})`);

    // If SMTP credentials are provided, send an actual email
    if (process.env.SMTP_USER) {
      await transporter.sendMail({
        from: '"Freedom Plan" <no-reply@freedomplan.com>',
        to: normalizedEmail,
        subject: 'Your Login Security Code',
        text: `Your login code is: ${otp}. It will expire in 5 minutes.`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FBFD; margin: 0; padding: 40px 20px; color: #161C2D;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #EEF2F7;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 20px;">
                  <a href="https://freedomplan.com" style="text-decoration: none;">
                    <h2 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #161C2D;">
                      Freedom Plan
                    </h2>
                  </a>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 0 32px;">
                  <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 800; text-align: center;">Secure Login Verification</h3>
                  <p style="margin: 0 0 8px; font-size: 14px; color: #667085; line-height: 1.6;">Hello,</p>
                  <p style="margin: 0 0 24px; font-size: 14px; color: #667085; line-height: 1.6;">We received a request to securely sign in to your Freedom Plan account. Use the One-Time Password (OTP) below to continue.</p>

                  <!-- OTP Card -->
                  <div style="background-color: #161C2D; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <h1 style="margin: 0 0 8px; font-size: 42px; font-weight: 900; letter-spacing: 6px; color: #B6F36A;">${otp}</h1>
                    <p style="margin: 0; font-size: 12px; color: #8d8d8d; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">This code is valid for 5 minutes.</p>
                  </div>

                  <!-- CTA -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <a href="https://freedomplan.com" style="display: inline-block; background-color: #161C2D; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 14px 28px; border-radius: 12px;">Visit Freedom Plan</a>
                  </div>

                  <!-- About -->
                  <div style="background-color: #F9FBFD; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #EEF2F7;">
                    <h4 style="margin: 0 0 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #161C2D;">About Freedom Plan</h4>
                    <p style="margin: 0; font-size: 13px; color: #667085; line-height: 1.6;">Freedom Plan helps international students and professionals plan their education finances with smart loan analysis, repayment planning, currency insights, savings tracking, and financial tools designed to make studying abroad more affordable.</p>
                  </div>

                  <!-- Security -->
                  <div style="margin-bottom: 32px;">
                    <h4 style="margin: 0 0 12px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #161C2D;">Security Notice</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #667085; line-height: 1.6;">
                      <li style="margin-bottom: 6px;">Never share your OTP with anyone.</li>
                      <li style="margin-bottom: 6px;">Freedom Plan will never ask for your OTP by phone, email, or message.</li>
                      <li>If you did not request this login, you can safely ignore this email.</li>
                    </ul>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #161C2D; padding: 32px 24px; text-align: center;">
                  <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 900; color: #ffffff;">Freedom Plan</h2>
                  <p style="margin: 0 0 12px; font-size: 12px; color: #8d8d8d; line-height: 1.5;">This is an automated email from Freedom Plan.<br>Please do not reply to this email.</p>
                  <a href="https://freedomplan.com" style="color: #B6F36A; text-decoration: none; font-size: 12px; font-weight: 700;">www.freedomplan.com</a>
                  <p style="margin: 12px 0 0 0; font-size: 10px; color: #555555;">&copy; ${new Date().getFullYear()} Freedom Plan. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
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

  if (storedOtp !== otp) {
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
