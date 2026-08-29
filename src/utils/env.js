/**
 * Environment detection for FreedomPlan
 * 
 * LOCAL / DEVELOPMENT:
 * - All sections fully visible
 * - All sections editable & testable (including Premium)
 * - Admin/subscription controls testable normally
 * - No section blurred or locked locally
 * 
 * PRODUCTION / DEPLOYED:
 * - Protected sections locked / blurred according to production access rules
 */
export const isLocalDevelopment = typeof window !== 'undefined' && Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.endsWith('.local') ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  import.meta.env?.DEV
);

export default isLocalDevelopment;
