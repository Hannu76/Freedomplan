import React, { useState } from 'react'

export default function ProLeadFormModal({ isOpen, onClose, onUnlock }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneCode: '+44',
    phone: '',
  })
  const [isOutsideUK, setIsOutsideUK] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Stub ready for Google Sheets API / APK Webhook when user provides URL later
  const submitToGoogleSheetAPI = async (data) => {
    try {
      // TODO: Paste your Google Apps Script Webhook URL here once deployed
      const GOOGLE_SHEETS_WEBHOOK_URL = '' 
      
      if (GOOGLE_SHEETS_WEBHOOK_URL) {
        await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            source: 'Freedom Plan Pro Dashboard',
          }),
        })
      }
      console.log('[Google Sheets API Ready] Lead Info Logged:', data)
    } catch (err) {
      console.error('Google Sheets API sync note:', err)
    }
  }

  const handleSubmit = async (e, tier) => {
    e?.preventDefault?.()
    setError('')



    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError(`Please fill in Name, Email, and ${isOutsideUK ? 'Phone Number' : 'UK Phone Number'}.`)
      return
    }

    setIsSubmitting(true)
    submitToGoogleSheetAPI({ ...formData, isOutsideUK, tier }).catch(console.error)
    setIsSubmitting(false)
    onUnlock({ ...formData, isOutsideUK }, tier)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in dark-invert"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md border border-[#8d8d8d]/40 p-6 sm:p-8 rounded-[24px] bg-white shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Aurora Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-lime-500/10 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
          title="Close Modal"
        >
          ✕
        </button>

        {/* Heading */}
        <div className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-2 tracking-tight">
          Book Freedom Plan <span className="text-blue-600">Pro</span> Access
        </div>
        <p className="text-xs text-neutral-500 mb-6">
          Unlock the full paydown curve, custom UK schedules, and high-precision analytics.
        </p>

        {/* Form adapted from Uiverse by user */}
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
          {/* Full Name Input Field */}
          <div className="relative">
            <input
              required
              autoComplete="name"
              type="text"
              name="name"
              id="pro-name"
              value={formData.name}
              onChange={handleChange}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-transparent"
            />
            <label
              htmlFor="pro-name"
              className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
            >
              Full Name
            </label>
          </div>

          {/* Email Input Field */}
          <div className="relative">
            <input
              required
              autoComplete="email"
              type="email"
              name="email"
              id="pro-email"
              value={formData.email}
              onChange={handleChange}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-transparent"
            />
            <label
              htmlFor="pro-email"
              className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
            >
              Email Address
            </label>
          </div>

          {/* UK Phone Number Input Field */}
          <div className="relative">
            <input
              required
              autoComplete="tel"
              type="tel"
              name="phone"
              id="pro-phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-transparent"
            />
            <label
              htmlFor="pro-phone"
              className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
            >
              {isOutsideUK === true ? 'International Phone Number (+code)' : 'UK Phone Number (+44)'}
            </label>
          </div>

          {/* Centered Bauble Toggle */}
          <div className="flex items-center justify-center gap-4 mt-1">
            <span className={`text-xs font-bold transition-colors ${isOutsideUK === false ? 'text-[#B6F36A]' : 'text-neutral-400'}`}>
              Inside UK
            </span>
            <div className="bauble_box">
              <input 
                className={`bauble_input ${isOutsideUK === null ? 'unselected' : ''}`}
                id="bauble_check" 
                name="bauble" 
                type="checkbox"
                checked={isOutsideUK === true}
                onChange={(e) => setIsOutsideUK(e.target.checked)}
              />
              <label className="bauble_label" htmlFor="bauble_check">Toggle</label>
            </div>
            <span className={`text-xs font-bold transition-colors ${isOutsideUK === true ? 'text-rose-500' : 'text-neutral-400'}`}>
              Outside UK
            </span>
          </div>

          {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

          {/* Button Row: Basic Plan LEFT — Premium Plan RIGHT */}
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            {/* Blue Basic Button (LEFT) */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'basic')}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl text-[13px] font-extrabold tracking-wide uppercase text-white transition-all duration-200 active:scale-95 disabled:opacity-50 text-center"
              style={{
                background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)',
                boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb',
              }}
            >
              {isSubmitting ? 'Wait...' : 'Basic Plan'}
            </button>

            {/* Golden Premium Button (RIGHT) */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'premium')}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl text-[13px] font-extrabold tracking-wide uppercase text-white transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #aa771c 0%, #bf953f 50%, #aa771c 100%)',
                boxShadow: '0px 2px 4px rgba(121,103,3,0.28), inset 0px 2px 5px rgba(252,246,186,0.5)',
                textShadow: '0px 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              <svg viewBox="0 0 576 512" style={{ height: '1.2em', width: 'auto' }} aria-hidden="true">
                <path fill="currentColor" d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"/>
              </svg>
              {isSubmitting ? 'Wait...' : 'Premium Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
