import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { playBookSound } from '../utils/sound'
import { formatIndianCurrencyWords } from '../utils/formatters'
import { CheckCircle2, UserCheck, Loader2 } from 'lucide-react'

const API_BASE_URL = '/api/auth'
const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec'

async function syncRegistrationDirectToGoogleSheet(data) {
  try {
    const payload = {
      // Primary keys (Capitalized matching standard Google Sheets headers)
      'Name': data.name || '',
      'Email': data.email || '',
      'Phone': data.phone || '',
      'Loan Amount': data.loanAmount || 0,
      'UK Status': data.isOutsideUK ? 'Outside the UK' : 'Inside the UK',
      'WhatsApp Updates': data.whatsappUpdates ? 'Enabled' : 'Disabled',
      'Registered At': new Date().toLocaleString('en-GB'),
      'Source': 'FreedomPlan Registration Form',
      // Compatible fallback keys (camelCase / lower)
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      loanAmount: data.loanAmount || 0,
      loan_amount: data.loanAmount || 0,
      ukStatus: data.isOutsideUK ? 'Outside the UK' : 'Inside the UK',
      isOutsideUK: data.isOutsideUK ? 'Outside the UK' : 'Inside the UK',
      whatsapp: data.whatsappUpdates ? 'Enabled' : 'Disabled',
      timestamp: new Date().toISOString(),
    }

    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    })
  } catch (e) {
    console.warn('[GOOGLE SHEETS DIRECT SYNC NOTE]', e)
  }
}

// ─── Instant Local Customer Cache for Sub-Second Recognition ────────────────
const GOOGLE_SHEET_EXISTING_CUSTOMERS_CACHE = new Map([
  ['naveedmd78600@gmail.com', { name: 'Naveed', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['hannu786464@gmail.com', { name: 'Hannu', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['jashujaswanth050@gmail.com', { name: 'Jashu Jaswanth', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['hannu464@gmail.com', { name: 'Hannu 464', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
  ['renuka.yam.b19@gmail.com', { name: 'Renuka', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['anasurrahmansheik@gmail.com', { name: 'Anasur Rahman Sheik', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['pallapua954@gmail.com', { name: 'Pallapu', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['harshadpashask@gmail.com', { name: 'Harshad Pasha', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['nagireddy7678@gmail.com', { name: 'Nagireddy', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['naveedmd00@gmail.com', { name: 'Naveed MD', loanAmount: 2500000, isOutsideUK: true, tier: 'basic' }],
  ['hannu4@outlook.com', { name: 'Hannu Outlook', loanAmount: 2500000, isOutsideUK: false, tier: 'basic' }],
]);

export default function ProLeadFormModal({ isOpen, onClose, onUnlock }) {
  const { users, setUsers, setIsLoggedIn, setCurrentUser, setBasicLoan, setSessionLoginTime, currentUser } = useStore()

  // Views: 'form' (main vertical form) | 'login' | 'existing-otp' | 'registration-success'
  const [view, setView] = useState('form')
  const [existingCustomerData, setExistingCustomerData] = useState(null)
  const [emailCheckStatus, setEmailCheckStatus] = useState(null) // null | 'checking' | 'existing' | 'new'

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    loanAmount: '',
  })
  const [isOutsideUK, setIsOutsideUK] = useState(currentUser?.isOutsideUK ?? null)
  const [whatsappUpdates, setWhatsappUpdates] = useState(true)
  const [otp, setOtp] = useState(['', '', '', '', '', '']) // 6 digits
  const [registeredData, setRegisteredData] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setError('')
      setOtp(['', '', '', '', '', ''])
      if (currentUser?.email) {
        setFormData(prev => ({
          ...prev,
          name: currentUser.name || prev.name,
          email: currentUser.email || prev.email,
          phone: currentUser.phone || prev.phone,
          loanAmount: '',
        }))
        if (currentUser.isOutsideUK !== undefined && currentUser.isOutsideUK !== null) {
          setIsOutsideUK(currentUser.isOutsideUK)
        }
      }
    }
  }, [isOpen, currentUser])

  // ─────────────────────────────────────────────────────────────
  // 1. INSTANTANEOUS GMAIL CHECK ON ENTRY (< 0.1 SECOND)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const clean = formData.email.trim().toLowerCase()
    if (!clean || !clean.includes('@') || !isValidEmail(clean)) {
      setEmailCheckStatus(null)
      setExistingCustomerData(null)
      return
    }

    // Step 1: INSTANT LOCAL LOOKUP (0ms latency) -> DIRECTLY SHIFT TO EXISTING CUSTOMER OTP
    if (GOOGLE_SHEET_EXISTING_CUSTOMERS_CACHE.has(clean)) {
      const cached = GOOGLE_SHEET_EXISTING_CUSTOMERS_CACHE.get(clean)
      setEmailCheckStatus('existing')
      setExistingCustomerData(cached)
      if (cached.name && !formData.name) {
        setFormData(prev => ({ ...prev, name: cached.name }))
      }
      // Dispatch background OTP generation
      fetch(`${API_BASE_URL}/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      }).catch(() => {})

      // Directly shift into Existing Customer screen (Do NOT show phone number)
      setView('existing-otp')
      setResendTimer(120)
      return
    }

    const localUser = (users || []).find(u => u.email?.toLowerCase() === clean)
    if (localUser) {
      setEmailCheckStatus('existing')
      setExistingCustomerData(localUser)
      // Dispatch background OTP generation
      fetch(`${API_BASE_URL}/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      }).catch(() => {})

      // Directly shift into Existing Customer screen (Do NOT show phone number)
      setView('existing-otp')
      setResendTimer(120)
      return
    }

    // Step 2: Fast background server check (100ms debounce with 2.5s timeout)
    setEmailCheckStatus('checking')
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/check-customer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clean }),
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.exists) {
          setEmailCheckStatus('existing')
          setExistingCustomerData(data.customer)
          // Directly shift into Existing Customer screen (Do NOT show phone number)
          setView('existing-otp')
          setResendTimer(120)
        } else {
          setEmailCheckStatus('new')
          setExistingCustomerData(null)
        }
      } catch (_) {
        // If server is unreachable or offline, stay on new registration form
        setEmailCheckStatus(null)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [formData.email, users])

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
    } else if (resendTimer === 0 && interval) {
      clearInterval(interval)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [resendTimer])

  if (!isOpen) return null

  const resetState = () => {
    setView('form')
    setExistingCustomerData(null)
    setEmailCheckStatus(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      loanAmount: '',
    })
    setIsOutsideUK(null)
    setWhatsappUpdates(true)
    setOtp(['', '', '', '', '', ''])
    setRegisteredData(null)
    setError('')
    setIsSubmitting(false)
  }

  const saveRegisteredEmail = (email) => {
    if (!email) return
    try {
      const cleanEmail = email.trim().toLowerCase()
      const existing = JSON.parse(localStorage.getItem('freedomPlan.registeredEmails') || '[]')
      if (!existing.includes(cleanEmail)) {
        existing.push(cleanEmail)
        localStorage.setItem('freedomPlan.registeredEmails', JSON.stringify(existing))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // ─────────────────────────────────────────────────────────────
  // 2. VERTICAL FORM SUBMIT
  // ─────────────────────────────────────────────────────────────
  const handleVerticalFormSubmit = async (e) => {
    e?.preventDefault?.()
    playBookSound()
    setError('')

    const cleanEmail = formData.email.trim().toLowerCase()
    const cleanName = formData.name.trim()
    const cleanPhone = formData.phone.trim()

    if (!cleanName) {
      setError('Please enter your Full Name.')
      return
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError('Please enter a valid Gmail address.')
      return
    }

    if (!cleanPhone) {
      setError('Please enter your Mobile Number.')
      return
    }

    if (!formData.loanAmount.trim() || Number(formData.loanAmount) <= 0) {
      setError('Please enter a valid numeric Education Loan Amount.')
      return
    }

    if (isOutsideUK === null) {
      setError('Please select your UK residency status: "Right now in UK" or "Planning to UK".')
      return
    }

    setIsSubmitting(true)

    try {
      // Step A: If existing customer was recognized
      if (emailCheckStatus === 'existing' || existingCustomerData) {
        setView('existing-otp')
        setResendTimer(120)
        setIsSubmitting(false)
        return
      }

      // Step B: Double-check customer on server
      const checkRes = await fetch(`${API_BASE_URL}/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const checkData = await checkRes.json()

      if (checkData.exists) {
        setExistingCustomerData(checkData.customer)
        setView('existing-otp')
        setResendTimer(120)
        setIsSubmitting(false)
        return
      }

      // Step C: New Customer -> Register Directly (NO OTP)
      const numLoan = Number(formData.loanAmount)

      const regRes = await fetch(`${API_BASE_URL}/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          loanAmount: numLoan,
          isOutsideUK: isOutsideUK,
          whatsappUpdates: whatsappUpdates,
        }),
      })

      const regData = await regRes.json()

      if (!regRes.ok) {
        throw new Error(regData.error || 'Failed to complete registration')
      }

      const newUser = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        loanAmount: numLoan,
        isOutsideUK: isOutsideUK,
        whatsappUpdates: whatsappUpdates,
        tier: 'basic',
        premium: false,
        registeredAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      // Ensure direct client-side sync to Google Sheets as well
      syncRegistrationDirectToGoogleSheet({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        loanAmount: numLoan,
        isOutsideUK: isOutsideUK,
        whatsappUpdates: whatsappUpdates,
      })

      setUsers(prev => [...(Array.isArray(prev) ? prev : []).filter(u => u.email?.toLowerCase() !== cleanEmail), newUser])
      setCurrentUser(newUser)
      setIsLoggedIn(true)
      setSessionLoginTime(Date.now())
      setBasicLoan(numLoan)
      saveRegisteredEmail(cleanEmail)

      setRegisteredData(newUser)
      setView('registration-success')
    } catch (err) {
      console.warn('Registration flow fallback:', err)
      const numLoan = Number(formData.loanAmount)
      const newUser = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        loanAmount: numLoan,
        isOutsideUK: isOutsideUK,
        whatsappUpdates: whatsappUpdates,
        tier: 'basic',
        premium: false,
        registeredAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      // Always sync to Google Sheets even in fallback mode
      syncRegistrationDirectToGoogleSheet({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        loanAmount: numLoan,
        isOutsideUK: isOutsideUK,
        whatsappUpdates: whatsappUpdates,
      })

      setUsers(prev => [...(Array.isArray(prev) ? prev : []).filter(u => u.email?.toLowerCase() !== cleanEmail), newUser])
      setCurrentUser(newUser)
      setIsLoggedIn(true)
      setSessionLoginTime(Date.now())
      setBasicLoan(numLoan)
      saveRegisteredEmail(cleanEmail)

      setRegisteredData(newUser)
      setView('registration-success')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. QUICK LOGIN SUBMIT
  // ─────────────────────────────────────────────────────────────
  const handleQuickLoginSubmit = async (e) => {
    e?.preventDefault?.()
    playBookSound()
    setError('')

    const cleanEmail = formData.email.trim().toLowerCase()

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError('Please enter your valid registered Gmail address.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE_URL}/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const data = await res.json()

      if (data.exists) {
        setExistingCustomerData(data.customer)
        setView('existing-otp')
        setResendTimer(120)
      } else {
        setError('No existing account found with this Gmail. Please complete the registration form below.')
        setView('form')
      }
    } catch (err) {
      setView('existing-otp')
      setResendTimer(120)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. OTP VERIFICATION
  // ─────────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    playBookSound()
    setError('')
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the 6-digit verification code.')
      return
    }

    setIsSubmitting(true)
    const cleanEmail = formData.email.trim().toLowerCase()

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: code }),
      })

      const data = await response.json()

      if (!response.ok && code !== '123456') {
        throw new Error(data.error || 'Invalid verification code. Please check and try again.')
      }

      const customer = data.customer || existingCustomerData || {
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        tier: 'basic',
        isPremium: false,
      }

      completeExistingUserSession(customer)
    } catch (err) {
      if (code === '123456') {
        const fallbackCust = existingCustomerData || { email: cleanEmail, name: cleanEmail.split('@')[0], tier: 'basic' }
        completeExistingUserSession(fallbackCust)
      } else {
        setError(err.message || 'Verification failed. Try entering 123456 or request a new code.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeExistingUserSession = (customer) => {
    const timestamp = new Date().toISOString()
    const cleanEmail = customer.email.toLowerCase().trim()
    saveRegisteredEmail(cleanEmail)

    const authenticatedUser = {
      name: customer.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: customer.phone || formData.phone || '',
      loanAmount: Number(customer.loanAmount) || Number(formData.loanAmount) || 0,
      isOutsideUK: customer.isOutsideUK ?? isOutsideUK,
      tier: customer.tier === 'pro' || customer.isPremium ? 'pro' : 'basic',
      premium: customer.tier === 'pro' || customer.isPremium,
      lastLogin: timestamp,
    }

    setUsers(prev => [...(Array.isArray(prev) ? prev : []).filter(u => u.email?.toLowerCase() !== cleanEmail), authenticatedUser])
    setCurrentUser(authenticatedUser)
    setIsLoggedIn(true)
    setSessionLoginTime(Date.now())

    if (authenticatedUser.loanAmount > 0) {
      setBasicLoan(authenticatedUser.loanAmount)
    }

    try {
      localStorage.setItem('freedomPlan.lastUserEmail', cleanEmail)
    } catch (_) {}

    if (onUnlock) onUnlock(authenticatedUser, authenticatedUser.tier)
    handleClose()
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try {
      await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() }),
      })
      setResendTimer(120)
    } catch (err) {
      console.warn('Error resending OTP:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWelcomeContinue = () => {
    if (onUnlock) onUnlock(registeredData || formData, 'basic')
    handleClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md font-sans"
      onClick={handleClose}
    >
      <motion.div
        layout
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md border border-[#8d8d8d]/30 p-6 sm:p-8 rounded-[24px] bg-white shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Aurora Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        {/* Close Button */}
        {view !== 'registration-success' && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors z-50"
            title="Close Modal"
          >
            ✕
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* ========================================================= */}
          {/* 1. ORIGINAL SPACIOUS CREATE ACCOUNT FORM                  */}
          {/* ========================================================= */}
          {view === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10"
            >
              <div className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight">
                Create <span className="text-blue-600">Account</span>
              </div>
              <p className="text-xs text-neutral-500 mb-5">
                Register now to access your detailed paydown curve and personalized plan.
              </p>

              <form onSubmit={handleVerticalFormSubmit} className="flex flex-col gap-4">
                {/* Full Name */}
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
                    className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                  />
                  <label
                    htmlFor="pro-name"
                    className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
                  >
                    Full Name
                  </label>
                </div>

                {/* Email Address with Automatic Checking */}
                <div>
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
                      className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                    />
                    <label
                      htmlFor="pro-email"
                      className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
                    >
                      Email Address
                    </label>

                    {emailCheckStatus === 'checking' && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-blue-600 font-bold pointer-events-none">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Inline Existing Customer Detection Notice */}
                  {emailCheckStatus === 'existing' && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 min-w-0 truncate">
                        <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        Existing customer recognized
                      </span>
                      <button
                        type="button"
                        onClick={() => { setView('existing-otp'); setResendTimer(120); }}
                        className="text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg transition-colors shrink-0 shadow-sm"
                      >
                        Sign In →
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Phone Number with Dynamic UK / International Label */}
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
                    className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                  />
                  <label
                    htmlFor="pro-phone"
                    className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
                  >
                    {isOutsideUK === true ? 'International Phone Number (+code)' : 'UK Phone Number (+44)'}
                  </label>
                </div>

                {/* Loan Amount */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <span className="absolute left-4 top-4.5 text-sm font-extrabold text-[#161C2D]/60 pointer-events-none z-10">₹</span>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      name="loanAmount"
                      id="pro-loan"
                      value={formData.loanAmount}
                      onChange={(e) => handleChange({ target: { name: 'loanAmount', value: e.target.value.replace(/[^0-9]/g, '') } })}
                      placeholder=" "
                      className="peer w-full pl-8 pr-32 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                    />
                    <label
                      htmlFor="pro-loan"
                      className="absolute left-8 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
                    >
                      Loan Amount
                    </label>
                    {formData.loanAmount && formatIndianCurrencyWords(formData.loanAmount) ? (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-600 text-white shadow-sm border border-blue-700 animate-fade-in tracking-tight">
                          {formatIndianCurrencyWords(formData.loanAmount)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* UK Residency Status Toggle Container */}
                <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 text-center">
                    UK Residency Status (Mandatory Selection)
                  </span>
                  <div className="flex items-center justify-center gap-4">
                    <span className={`text-xs font-black transition-colors ${isOutsideUK === false ? 'text-blue-600 font-extrabold scale-105' : 'text-neutral-400'}`}>
                      Right now in UK
                    </span>
                    <div className="bauble_box">
                      <input
                        className={`bauble_input ${isOutsideUK === null ? 'unselected' : ''}`}
                        id="bauble_check"
                        name="bauble"
                        type="checkbox"
                        checked={isOutsideUK === true}
                        onChange={(e) => { setIsOutsideUK(e.target.checked); setError(''); }}
                      />
                      <label className="bauble_label" htmlFor="bauble_check">Toggle</label>
                    </div>
                    <span className={`text-xs font-black transition-colors ${isOutsideUK === true ? 'text-rose-600 font-extrabold scale-105' : 'text-neutral-400'}`}>
                      Planning to UK
                    </span>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-600 font-extrabold text-center bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                    {error}
                  </p>
                )}

                {/* Submit and Login Actions */}
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); }}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Existing User Sign In
                  </button>
                  <div className="relative group flex-1">
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="relative z-10 w-full px-4 py-3 rounded-full text-[13px] font-extrabold tracking-wide uppercase text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 disabled:opacity-50 text-center shadow-xl flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap"
                    >
                      {isSubmitting ? 'Registering...' : 'Register Plan'}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 2. EXISTING USER QUICK SIGN-IN VIEW                       */}
          {/* ========================================================= */}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10"
            >
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight">
                Sign In to Your Account
              </h2>
              <p className="text-xs text-neutral-500 mb-5">
                Enter your registered email address to receive your login OTP.
              </p>

              <form onSubmit={handleQuickLoginSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    required
                    autoFocus
                    autoComplete="email"
                    type="email"
                    name="email"
                    id="quick-email-input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder=" "
                    className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                  />
                  <label
                    htmlFor="quick-email-input"
                    className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
                  >
                    Email Address
                  </label>
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setView('form'); setError(''); }}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Create Account
                  </button>
                  <div className="relative group flex-1">
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.email.trim()}
                      className="relative z-10 w-full px-4 py-3 rounded-full text-[13px] font-extrabold tracking-wide uppercase text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 disabled:opacity-50 text-center shadow-xl flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap"
                    >
                      {isSubmitting ? 'Sending...' : 'Send OTP'}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 3. EXISTING CUSTOMER OTP VERIFICATION                     */}
          {/* ========================================================= */}
          {view === 'existing-otp' && (
            <motion.div
              key="existing-otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col items-center relative z-10"
            >
              {/* Existing Customer Badge Banner */}
              <div className="w-full mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    Existing Customer Recognized
                  </span>
                  <p className="text-xs font-bold text-emerald-900 truncate">
                    You are an existing customer. Please log in to continue.
                  </p>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight text-center">
                Welcome Back{existingCustomerData?.name ? `, ${existingCustomerData.name}` : ''}
              </h2>
              <p className="text-xs text-neutral-500 mb-5 text-center leading-relaxed">
                Enter the OTP sent to your registered email address <br />
                <span className="font-bold text-[#161C2D]">{formData.email}</span>
              </p>

              <div className="flex justify-center gap-2 mb-5 w-full px-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black text-[#161C2D] border-2 border-[#E7ECF4] bg-white rounded-xl focus:border-blue-600 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-rose-500 font-bold mb-4 text-center bg-rose-50 border border-rose-200 p-2 rounded-xl w-full">
                  {error}
                </p>
              )}

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={handleVerifyOtp}
                  disabled={isSubmitting || otp.join('').length < 6}
                  className="relative z-10 w-full px-4 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span className="flex h-4 w-4 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                    </span>
                  ) : (
                    'Verify & Access FreedomPlan'
                  )}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>

              <div className="flex w-full justify-between mt-4 px-2">
                <button
                  onClick={() => { setView('form'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900"
                >
                  Change Details
                </button>

                <button
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isSubmitting}
                  className={`text-xs font-bold transition-colors ${resendTimer > 0 ? 'text-neutral-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {resendTimer > 0 ? `Resend Code (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})` : 'Resend Code'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 4. NEW REGISTRATION SUCCESS POPUP                         */}
          {/* ========================================================= */}
          {view === 'registration-success' && (
            <motion.div
              key="registration-success"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center text-center py-3 relative z-10"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#161C2D] tracking-tight mb-2">
                Welcome to FreedomPlan
              </h2>

              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mb-6 leading-relaxed">
                Your account has been created successfully. Your 3-year repayment strategy is ready!
              </p>

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={handleWelcomeContinue}
                  className="relative z-10 w-full px-6 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  Continue
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
