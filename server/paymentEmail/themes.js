/**
 * FreedomPlan Premium — Dynamic Accessible Email Theme Engine
 * Provides WCAG AA-validated accessible color palettes, deterministic hash selection,
 * and contrast ratio enforcement for high-converting email rendering across dark/light clients.
 */

const crypto = require('crypto');

/**
 * Calculate relative luminance from a hex color string (WCAG 2.1 standard)
 */
function getRelativeLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculate contrast ratio between two hex colors (e.g. 4.5 = 4.5:1)
 */
function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * 7 Curated, High-Contrast, WCAG AA-Compliant Light-Mode Brand Themes
 * Zero pitch-black/dark backgrounds. Crisp, modern financial styling.
 */
const PAYMENT_THEMES = [
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    canvasBg: '#F0F4F8',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    brandHeader: '#1E40AF',
    brandBadgeBg: '#EFF6FF',
    brandBadgeText: '#1D4ED8',
    brandBadgeBorder: '#DBEAFE',
    headingColor: '#0F172A',
    bodyColor: '#334155',
    mutedColor: '#64748B',
    accentColor: '#2563EB',
    buttonBg: '#2563EB',
    buttonText: '#FFFFFF',
    buttonHover: '#1D4ED8',
    linkColor: '#2563EB',
    stepCardBg: '#F8FAFC',
    stepCardBorder: '#E2E8F0',
    stepNumberColor: '#1E40AF',
    guaranteeBg: '#ECFDF5',
    guaranteeBorder: '#A7F3D0',
    guaranteeText: '#065F46',
    footerBg: '#F8FAFC',
    footerText: '#64748B',
  },
  {
    id: 'emerald-mint',
    name: 'Emerald Mint',
    canvasBg: '#F0FDF4',
    cardBg: '#FFFFFF',
    cardBorder: '#DCFCE7',
    brandHeader: '#047857',
    brandBadgeBg: '#ECFDF5',
    brandBadgeText: '#059669',
    brandBadgeBorder: '#A7F3D0',
    headingColor: '#064E3B',
    bodyColor: '#1F2937',
    mutedColor: '#4B5563',
    accentColor: '#059669',
    buttonBg: '#1D4ED8',
    buttonText: '#FFFFFF',
    buttonHover: '#1E40AF',
    linkColor: '#047857',
    stepCardBg: '#F0FDF4',
    stepCardBorder: '#DCFCE7',
    stepNumberColor: '#047857',
    guaranteeBg: '#F0FDF4',
    guaranteeBorder: '#86EFAC',
    guaranteeText: '#064E3B',
    footerBg: '#F0FDF4',
    footerText: '#4B5563',
  },
  {
    id: 'electric-indigo',
    name: 'Electric Indigo',
    canvasBg: '#F5F3FF',
    cardBg: '#FFFFFF',
    cardBorder: '#EDE9FE',
    brandHeader: '#4338CA',
    brandBadgeBg: '#F5F3FF',
    brandBadgeText: '#4338CA',
    brandBadgeBorder: '#DDD6FE',
    headingColor: '#1E1B4B',
    bodyColor: '#334155',
    mutedColor: '#64748B',
    accentColor: '#4F46E5',
    buttonBg: '#2563EB',
    buttonText: '#FFFFFF',
    buttonHover: '#1D4ED8',
    linkColor: '#4338CA',
    stepCardBg: '#FAF5FF',
    stepCardBorder: '#EDE9FE',
    stepNumberColor: '#4338CA',
    guaranteeBg: '#ECFDF5',
    guaranteeBorder: '#A7F3D0',
    guaranteeText: '#065F46',
    footerBg: '#FAF5FF',
    footerText: '#64748B',
  },
  {
    id: 'amber-gold',
    name: 'Amber Gold',
    canvasBg: '#FFFBEB',
    cardBg: '#FFFFFF',
    cardBorder: '#FEF3C7',
    brandHeader: '#92400E',
    brandBadgeBg: '#FEF3C7',
    brandBadgeText: '#92400E',
    brandBadgeBorder: '#FDE68A',
    headingColor: '#451A03',
    bodyColor: '#292524',
    mutedColor: '#57534E',
    accentColor: '#92400E',
    buttonBg: '#1D4ED8',
    buttonText: '#FFFFFF',
    buttonHover: '#1E40AF',
    linkColor: '#92400E',
    stepCardBg: '#FFFBEB',
    stepCardBorder: '#FEF3C7',
    stepNumberColor: '#92400E',
    guaranteeBg: '#ECFDF5',
    guaranteeBorder: '#A7F3D0',
    guaranteeText: '#065F46',
    footerBg: '#FFFBEB',
    footerText: '#57534E',
  },
  {
    id: 'teal-horizon',
    name: 'Teal Horizon',
    canvasBg: '#F0FDFA',
    cardBg: '#FFFFFF',
    cardBorder: '#CCFBF1',
    brandHeader: '#0F766E',
    brandBadgeBg: '#F0FDFA',
    brandBadgeText: '#0F766E',
    brandBadgeBorder: '#99F6E4',
    headingColor: '#134E4A',
    bodyColor: '#1E293B',
    mutedColor: '#475569',
    accentColor: '#0F766E',
    buttonBg: '#2563EB',
    buttonText: '#FFFFFF',
    buttonHover: '#1D4ED8',
    linkColor: '#0F766E',
    stepCardBg: '#F0FDFA',
    stepCardBorder: '#CCFBF1',
    stepNumberColor: '#0F766E',
    guaranteeBg: '#ECFDF5',
    guaranteeBorder: '#A7F3D0',
    guaranteeText: '#065F46',
    footerBg: '#F0FDFA',
    footerText: '#475569',
  },
  {
    id: 'rose-crimson',
    name: 'Rose Crimson',
    canvasBg: '#FFF1F2',
    cardBg: '#FFFFFF',
    cardBorder: '#FFE4E6',
    brandHeader: '#9F1239',
    brandBadgeBg: '#FFF1F2',
    brandBadgeText: '#9F1239',
    brandBadgeBorder: '#FECDD3',
    headingColor: '#881337',
    bodyColor: '#334155',
    mutedColor: '#64748B',
    accentColor: '#9F1239',
    buttonBg: '#1D4ED8',
    buttonText: '#FFFFFF',
    buttonHover: '#1E40AF',
    linkColor: '#9F1239',
    stepCardBg: '#FFF1F2',
    stepCardBorder: '#FFE4E6',
    stepNumberColor: '#9F1239',
    guaranteeBg: '#ECFDF5',
    guaranteeBorder: '#A7F3D0',
    guaranteeText: '#065F46',
    footerBg: '#FFF1F2',
    footerText: '#64748B',
  },
  {
    id: 'slate-modern',
    name: 'Slate Modern',
    canvasBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    brandHeader: '#0F172A',
    brandBadgeBg: '#F1F5F9',
    brandBadgeText: '#334155',
    brandBadgeBorder: '#CBD5E1',
    headingColor: '#0F172A',
    bodyColor: '#334155',
    mutedColor: '#64748B',
    accentColor: '#1E40AF',
    buttonBg: '#2563EB',
    buttonText: '#FFFFFF',
    buttonHover: '#1D4ED8',
    linkColor: '#1E40AF',
    stepCardBg: '#F8FAFC',
    stepCardBorder: '#E2E8F0',
    stepNumberColor: '#0F172A',
    guaranteeBg: '#ECFDF5',
    guaranteeBorder: '#A7F3D0',
    guaranteeText: '#065F46',
    footerBg: '#F8FAFC',
    footerText: '#64748B',
  },
];

/**
 * Deterministically select an approved theme using a hash seed (email or paymentId).
 * Ensures that the same customer receives consistent visual treatment on resend,
 * while different customers experience tailored variations.
 */
function selectPaymentTheme(seed = '') {
  if (!seed) {
    const randomIndex = Math.floor(Math.random() * PAYMENT_THEMES.length);
    return PAYMENT_THEMES[randomIndex];
  }

  const hash = crypto.createHash('md5').update(String(seed).toLowerCase().trim()).digest('hex');
  const index = parseInt(hash.substring(0, 4), 16) % PAYMENT_THEMES.length;
  return PAYMENT_THEMES[index];
}

/**
 * Validate accessibility & contrast metrics for a given theme
 */
function validateThemeAccessibility(theme) {
  const issues = [];

  // Card body text contrast against card background
  const bodyContrast = getContrastRatio(theme.bodyColor, theme.cardBg);
  if (bodyContrast < 4.5) {
    issues.push(`Body text contrast too low (${bodyContrast.toFixed(2)}:1, min 4.5:1 required)`);
  }

  // Heading text contrast against card background
  const headingContrast = getContrastRatio(theme.headingColor, theme.cardBg);
  if (headingContrast < 3.0) {
    issues.push(`Heading contrast too low (${headingContrast.toFixed(2)}:1, min 3.0:1 required)`);
  }

  // CTA button text contrast against button background
  const buttonContrast = getContrastRatio(theme.buttonText, theme.buttonBg);
  if (buttonContrast < 4.5) {
    issues.push(`Button text contrast too low (${buttonContrast.toFixed(2)}:1, min 4.5:1 required)`);
  }

  // Link visibility against card background
  const linkContrast = getContrastRatio(theme.linkColor, theme.cardBg);
  if (linkContrast < 3.5) {
    issues.push(`Link text contrast too low (${linkContrast.toFixed(2)}:1, min 3.5:1 required)`);
  }

  return {
    valid: issues.length === 0,
    bodyContrast: Number(bodyContrast.toFixed(2)),
    headingContrast: Number(headingContrast.toFixed(2)),
    buttonContrast: Number(buttonContrast.toFixed(2)),
    linkContrast: Number(linkContrast.toFixed(2)),
    issues,
  };
}

module.exports = {
  PAYMENT_THEMES,
  selectPaymentTheme,
  getContrastRatio,
  validateThemeAccessibility,
};
