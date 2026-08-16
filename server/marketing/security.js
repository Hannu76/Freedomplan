const crypto = require('crypto');

// Use JWT_SECRET or a dedicated MARKETING_SECRET as the HMAC secret
const MARKETING_SECRET = process.env.MARKETING_SECRET || process.env.JWT_SECRET || 'freedomplan_marketing_secure_fallback_salt_2026';

/**
 * Generate a tamper-proof signed unsubscribe token for an email address
 * Token format: Base64URL(email:timestamp:hmac)
 */
function generateUnsubscribeToken(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const timestamp = Date.now();
  const payload = `${normalizedEmail}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', MARKETING_SECRET).update(payload).digest('hex');
  const rawToken = `${payload}:${hmac}`;
  return Buffer.from(rawToken).toString('base64url');
}

/**
 * Verify an unsubscribe token and extract the valid email address.
 * Returns { valid: boolean, email?: string, error?: string }
 */
function verifyUnsubscribeToken(token) {
  if (!token) return { valid: false, error: 'Token is missing' };
  try {
    const rawToken = Buffer.from(token, 'base64url').toString('utf8');
    const parts = rawToken.split(':');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }

    const [email, timestampStr, providedHmac] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Optional: Max expiry for token (e.g. 180 days)
    if (isNaN(timestamp) || Date.now() - timestamp > 180 * 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Token has expired. Please request a new unsubscribe link.' };
    }

    const payload = `${email}:${timestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', MARKETING_SECRET).update(payload).digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid token signature' };
    }

    return { valid: true, email };
  } catch (err) {
    return { valid: false, error: 'Failed to verify token: ' + err.message };
  }
}

/**
 * Middleware or helper to verify Admin Authorization for marketing actions
 */
function isAuthorizedAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const apiKeyHeader = req.headers['x-admin-key'] || req.query.adminKey || '';
  const adminSecret = process.env.MARKETING_ADMIN_KEY || process.env.ADMIN_KEY || 'freedomplan_admin_secret_key';

  if (apiKeyHeader && apiKeyHeader === adminSecret) {
    return true;
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === adminSecret) return true;
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'freedomplan_jwt_dev_secret_key_change_in_production');
      if (decoded && (decoded.tier === 'pro' || decoded.isAdmin)) {
        return true;
      }
    } catch {
      // not a valid JWT
    }
  }

  // In local development or if running in local environment without strict key, allow local requests
  if (process.env.NODE_ENV !== 'production' && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
    return true;
  }

  return false;
}

module.exports = {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  isAuthorizedAdmin,
};
