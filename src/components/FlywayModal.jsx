import React, { useState } from 'react'

// ============================================================================
// CONFIGURATION
// Replace this URL with your NEW Google Apps Script Web App URL for Flywire
// ============================================================================
const FLYWIRE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbw4VnHaQ7J9dMi1b8KSOh1bqlO-Btt9ovThxqNq5tbYdVcLkI-JZ5t6my17bIb04c5Rcg/exec'

export default function FlywayModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    amount: '',
    date: '',
    destination: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (!isOpen) return null

  const resetState = () => {
    setFormData({ name: '', phone: '', email: '', amount: '', date: '', destination: '', notes: '' })
    setIsSuccess(false)
    setIsSubmitting(false)
    setSubmitError('')
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')
    
    try {
      const response = await fetch(FLYWIRE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          source: 'Flywire Transfer Request'
        })
        // Note: For proper error detection, 'no-cors' is removed. 
        // Ensure your Google Apps Script is configured to allow CORS and returns a valid status.
      })

      if (!response.ok && response.type !== 'opaque') {
        throw new Error('Server returned an error')
      }

      setIsSubmitting(false)
      setIsSuccess(true)
    } catch (err) {
      console.error('Failed to submit Flywire request:', err)
      setIsSubmitting(false)
      setSubmitError('Failed to submit your request. Please try again or contact support.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in dark-invert"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg border border-[#8d8d8d]/40 p-6 sm:p-8 rounded-[24px] bg-white shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Aurora Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#B6F36A]/20 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors z-50"
          title="Close Modal"
        >
          ✕
        </button>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
            {/* Success Checkmark Animation */}
            <div className="mb-6 relative">
              <div className="h-20 w-20 rounded-full bg-[#B6F36A]/20 animate-pulse-strong absolute inset-0 m-auto" />
              <div className="h-16 w-16 rounded-full bg-[#B6F36A] flex items-center justify-center relative z-10 shadow-lg text-white">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-[#161C2D] mb-4">Request Submitted!</h2>
            <p className="text-sm font-semibold text-neutral-600 leading-relaxed max-w-xs">
              Your transfer request has been received successfully. Our agent will contact you shortly to assist with your transfer.
            </p>
            <button 
              onClick={handleClose}
              className="mt-8 px-6 py-3 bg-[#161C2D] text-white rounded-xl text-[13px] font-extrabold uppercase tracking-wide shadow-md hover:bg-[#2A3441] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="animate-fade-in relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <img src={`${import.meta.env.BASE_URL}images/flywire.jpg`} alt="Flyway" className="h-6 object-contain" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] tracking-tight">
                Transfer Request
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mb-6">Request a secure, low-fee money transfer. Our agent will call you to finalize the rate and process.</p>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input required type="text" name="name" id="fw-name" value={formData.name} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                  <label htmlFor="fw-name" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Full Name *</label>
                </div>
                <div className="relative">
                  <input required type="tel" name="phone" id="fw-phone" value={formData.phone} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                  <label htmlFor="fw-phone" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Mobile Number *</label>
                </div>
              </div>

              <div className="relative">
                <input type="email" name="email" id="fw-email" value={formData.email} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="fw-email" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Email Address (Optional)</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input required type="text" inputMode="numeric" name="amount" id="fw-amount" value={formData.amount} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                  <label htmlFor="fw-amount" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Amount to Transfer *</label>
                </div>
                <div className="relative">
                  <input required type="date" name="date" id="fw-date" value={formData.date} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                  <label htmlFor="fw-date" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Preferred Date *</label>
                </div>
              </div>

              <div className="relative">
                <input type="text" name="destination" id="fw-dest" value={formData.destination} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="fw-dest" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Destination Country (Optional)</label>
              </div>

              <div className="relative">
                <textarea rows="2" name="notes" id="fw-notes" value={formData.notes} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white resize-none" />
                <label htmlFor="fw-notes" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Additional Notes (Optional)</label>
              </div>
              
              <div className="mt-2">
                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs font-bold text-red-600">{submitError}</p>
                  </div>
                )}
                <button type="submit" disabled={isSubmitting} className="w-full px-4 py-3.5 bg-[#161C2D] text-white rounded-xl text-[13px] font-extrabold uppercase tracking-widest shadow-md hover:bg-[#2A3441] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <span className="flex h-4 w-4 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                    </span>
                  ) : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
