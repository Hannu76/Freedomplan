import React from 'react'
import { motion } from 'framer-motion'
import { Mail, Check } from 'lucide-react'

/**
 * Reusable Marketing Consent Checkbox
 * Allows customers to opt-in or opt-out of weekly promotional campaigns.
 */
export default function MarketingConsentCheckbox({
  checked = true,
  onChange,
  className = '',
  label = 'Receive weekly promotional updates & creator earning opportunities (every Friday)'
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all ${className}`}>
      <div className="relative flex items-center mt-0.5">
        <input
          type="checkbox"
          id="marketing-consent-checkbox"
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          onClick={() => onChange && onChange(!checked)}
          className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all ${
            checked
              ? 'bg-blue-600 border border-blue-500 shadow-sm shadow-blue-500/30 text-white'
              : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
          }`}
        >
          <Check className={`w-3.5 h-3.5 transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
        </div>
      </div>

      <label
        htmlFor="marketing-consent-checkbox"
        onClick={() => onChange && onChange(!checked)}
        className="text-xs text-slate-300 select-none cursor-pointer leading-relaxed"
      >
        <span className="font-medium text-slate-200">{label}</span>
        <span className="block text-[11px] text-slate-500 mt-0.5">
          You can unsubscribe anytime. Transactional & OTP security emails remain unaffected.
        </span>
      </label>
    </div>
  )
}
