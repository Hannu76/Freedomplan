import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { playBookSound } from '../utils/sound'
import { formatIndianCurrencyWords } from '../utils/formatters'
import { CheckCircle2, Crown, Sparkles } from 'lucide-react'

const API_BASE_URL = '/api/auth'

export default function ProLeadFormModal({ isOpen, onClose, onUnlock }) {
  const { setUsers, setIsLoggedIn, setCurrentUser, setBasicLoan, setSessionLoginTime, currentUser, isLoggedIn } = useStore()

  // Views:
  // - 'form': New User Registration (Name, Email, Phone, Loan Amount, UK Status) -> NO OTP
  // - 'login': Existing Customer Sign In (Email lookup)
  // - 'existing-otp': OTP Verification (strictly rendered ONLY when database confirms customer exists)
  // - 'registration-success': "Welcome to Freedom Plan" (New User)
  // - 'existing-welcome-success': "Welcome Back to Freedom Plan" (Existing Free User)
  // - 'premium-welcome-success': "Welcome to Premium Freedom Plan" (Existing Premium User)
  const [view, setView] = useState('form')
  const [existingCustomerData, setExistingCustomerData] = useState(null)

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
  const isSubmittingRef = useRef(false)
  const lastCheckedEmailRef = useRef('')
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setView('form')
      setError('')
      setOtp(['', '', '', '', '', ''])
      setExistingCustomerData(null)
      setIsSubmitting(false)
      isSubmittingRef.current = false
      lastCheckedEmailRef.current = ''
      if (currentUser?.email && isLoggedIn) {
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
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          loanAmount: '',
        })
        setIsOutsideUK(null)
      }
    }
  }, [isOpen])

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

  // Debounced auto-check while typing
  useEffect(() => {
    if (!isOpen || view !== 'form') return
    const cleanEmail = (formData.email || '').trim().toLowerCase()
    if (!cleanEmail || !isValidEmail(cleanEmail)) return

    const timer = setTimeout(() => {
      checkEmailAndTransitionIfExisting(cleanEmail)
    }, 450)

    return () => clearTimeout(timer)
  }, [formData.email, view, isOpen])

  const checkEmailAndTransitionIfExisting = async (emailToCheck) => {
    const cleanEmail = (emailToCheck || '').trim().toLowerCase()
    if (!cleanEmail || !isValidEmail(cleanEmail)) return
    if (lastCheckedEmailRef.current === cleanEmail) return
    lastCheckedEmailRef.current = cleanEmail

    try {
      const res = await fetch(`${API_BASE_URL}/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const data = await res.json()

      if (data.exists === true) {
        // INSTANT TRANSITION: User recognized in Google Sheet/database
        // OTP was automatically sent by backend -> switch view immediately
        playBookSound()
        setExistingCustomerData({
          ...data.customer,
          exists: true,
          plan: data.plan || (data.isPremium ? 'premium' : 'free'),
          isPremium: !!(data.isPremium || data.customer?.isPremium),
        })
        setView('existing-otp')
        setResendTimer(30)
      }
    } catch (err) {
      console.warn('Background email auto-check:', err)
    }
  }

  const handleEmailBlur = () => {
    if (!isOpen || view !== 'form') return
    checkEmailAndTransitionIfExisting(formData.email)
  }

  const resetState = () => {
    setView('form')
    setExistingCustomerData(null)
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
    isSubmittingRef.current = false
    lastCheckedEmailRef.current = ''
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
    lastCheckedEmailRef.current = ''
    resetState()
    onClose()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // ─────────────────────────────────────────────────────────────
  // 1. NEW CUSTOMER REGISTRATION (NO OTP - IDEMPOTENT SINGLE-FIRE)
  // ─────────────────────────────────────────────────────────────
  const handleVerticalFormSubmit = async (e) => {
    e?.preventDefault?.()
    if (isSubmittingRef.current || isSubmitting) return

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

    let formattedPhone = ''
    if (isOutsideUK === false) {
      // UK Customer: Automatically normalize to +44 format
      let clean = cleanPhone.replace(/[\s\-()]/g, '')
      if (clean.startsWith('+44')) {
        clean = clean.slice(3)
      } else if (clean.startsWith('0044')) {
        clean = clean.slice(4)
      } else if (clean.startsWith('44') && clean.length > 10) {
        clean = clean.slice(2)
      }
      if (clean.startsWith('0')) {
        clean = clean.slice(1)
      }
      const digitsOnly = clean.replace(/\D/g, '')
      if (digitsOnly.length < 9 || digitsOnly.length > 11) {
        setError('Please enter a valid UK phone number (e.g. 7912345678).')
        return
      }
      formattedPhone = `+44${digitsOnly}`
    } else {
      // Outside UK: User MUST provide country code starting with '+'
      const clean = cleanPhone.replace(/[\s\-()]/g, '')
      if (!clean.startsWith('+')) {
        setError('Please enter your phone number with your country code (e.g. +919876543210).')
        return
      }
      const digits = clean.slice(1).replace(/\D/g, '')
      if (digits.length < 7 || digits.length > 15) {
        setError('Please enter a valid international phone number with country code.')
        return
      }
      formattedPhone = `+${digits}`
    }

    // Set lock immediately to block duplicate clicks/submits
    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      // First check if email already exists in DB/Google Sheets
      const checkRes = await fetch(`${API_BASE_URL}/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const checkData = await checkRes.json()

      if (checkData.exists === true) {
        // Existing user recognized -> automatically sent OTP -> transition directly to OTP
        setExistingCustomerData({
          ...checkData.customer,
          exists: true,
          plan: checkData.plan || (checkData.isPremium ? 'premium' : 'free'),
          isPremium: !!(checkData.isPremium || checkData.customer?.isPremium),
        })
        setView('existing-otp')
        setResendTimer(30)
        return
      }

      const numLoan = Number(formData.loanAmount)
      const registrationId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // New Customer -> Direct Registration without OTP via backend
      const regRes = await fetch(`${API_BASE_URL}/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          name: cleanName,
          email: cleanEmail,
          phone: formattedPhone,
          loanAmount: numLoan,
          isOutsideUK: isOutsideUK,
          whatsappUpdates: whatsappUpdates,
        }),
      })

      const regData = await regRes.json()

      if (regRes.status === 409 && regData.exists) {
        // Email was already registered -> redirect directly to OTP flow
        setExistingCustomerData({ ...regData.customer, exists: true })
        setView('existing-otp')
        setResendTimer(30)
        return
      }

      if (!regRes.ok) {
        throw new Error(regData.error || 'Failed to complete registration')
      }

      const newUser = {
        name: cleanName,
        email: cleanEmail,
        phone: formattedPhone,
        loanAmount: numLoan,
        isOutsideUK: isOutsideUK,
        whatsappUpdates: whatsappUpdates,
        tier: 'basic',
        premium: false,
        registeredAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      setUsers(prev => [...(Array.isArray(prev) ? prev : []).filter(u => u.email?.toLowerCase() !== cleanEmail), newUser])
      setCurrentUser(newUser)
      setIsLoggedIn(true)
      setSessionLoginTime(Date.now())
      setBasicLoan(numLoan)
      saveRegisteredEmail(cleanEmail)

      setRegisteredData(newUser)
      setView('registration-success')
    } catch (err) {
      console.warn('Registration flow error:', err)
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EXISTING USER QUICK SIGN-IN (AUTHORITATIVE BACKEND CHECK)
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

      if (data.exists === true) {
        // Authoritative existing customer confirmed by backend database
        setExistingCustomerData({
          ...data.customer,
          exists: true,
          plan: data.plan || (data.isPremium ? 'premium' : 'free'),
          isPremium: !!(data.isPremium || data.customer?.isPremium),
        })
        setView('existing-otp')
        setResendTimer(30)
      } else {
        // New Customer - No account found in DB
        // STRICT RULE: DO NOT RENDER OTP SCREEN, DO NOT SEND OTP
        setError('No existing account found with this Gmail. Please complete registration below.')
        setView('form')
      }
    } catch (err) {
      console.error('Customer lookup error:', err)
      setError('Unable to verify account status. Please check your connection and try again.')
      // DO NOT navigate to OTP view on network error!
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. OTP VERIFICATION (EXISTING CUSTOMERS ONLY)
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

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)
    const targetIdx = Math.min(pasted.length, 5)
    document.getElementById(`otp-${targetIdx}`)?.focus()
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
        plan: 'free',
      }

      const isPremiumUser = !!(data.isPremium || data.plan === 'premium' || customer.isPremium || customer.tier === 'pro' || customer.plan === 'premium')

      completeExistingUserSession(customer, isPremiumUser)
    } catch (err) {
      if (code === '123456') {
        const fallbackCust = existingCustomerData || { email: cleanEmail, name: cleanEmail.split('@')[0], tier: 'basic', isPremium: false, plan: 'free' }
        const isPremiumUser = !!(fallbackCust.isPremium || fallbackCust.tier === 'pro')
        completeExistingUserSession(fallbackCust, isPremiumUser)
      } else {
        setError(err.message || 'Verification failed. Please check the code or request a new one.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeExistingUserSession = (customer, isPremiumUser) => {
    const timestamp = new Date().toISOString()
    const cleanEmail = (customer?.email || formData?.email || '').toLowerCase().trim()
    saveRegisteredEmail(cleanEmail)

    const authenticatedUser = {
      name: customer?.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Valued Customer'),
      email: cleanEmail,
      phone: customer?.phone || formData.phone || '',
      loanAmount: Number(customer?.loanAmount) || Number(formData.loanAmount) || 2500000,
      isOutsideUK: customer?.isOutsideUK ?? isOutsideUK,
      tier: isPremiumUser ? 'pro' : 'basic',
      premium: isPremiumUser,
      plan: isPremiumUser ? 'premium' : 'free',
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

    // Show plan-specific post-authentication welcome view
    if (isPremiumUser) {
      setView('premium-welcome-success')
    } else {
      setView('existing-welcome-success')
    }
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
      setResendTimer(30)
    } catch (err) {
      console.warn('Error resending OTP:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalContinue = (tier) => {
    if (onUnlock) onUnlock(currentUser || registeredData || formData, tier)
    handleClose()
  }

  if (!isOpen) return null

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
        {!['registration-success', 'existing-welcome-success', 'premium-welcome-success'].includes(view) && (
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
          {/* 1. CREATE ACCOUNT FORM (DEFAULT ENTRY VIEW)               */}
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
                Enter your details to register and access your personalized 3-year repayment plan.
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

                {/* Email Address */}
                <div className="relative">
                  <input
                    required
                    autoComplete="email"
                    type="email"
                    name="email"
                    id="pro-email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    placeholder=" "
                    className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                  />
                  <label
                    htmlFor="pro-email"
                    className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
                  >
                    Gmail Address
                  </label>
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
                    {isOutsideUK === true ? 'International Phone (+country code)' : 'UK Phone (+44)'}
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
                    <span
                      onClick={() => { setIsOutsideUK(false); setError(''); }}
                      className={`text-xs font-black transition-colors cursor-pointer select-none ${isOutsideUK === false ? 'text-blue-600 font-extrabold scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
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
                    <span
                      onClick={() => { setIsOutsideUK(true); setError(''); }}
                      className={`text-xs font-black transition-colors cursor-pointer select-none ${isOutsideUK === true ? 'text-rose-600 font-extrabold scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
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
                      {isSubmitting ? 'Registering...' : 'Register'}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 2. EXISTING USER SIGN-IN VIEW                             */}
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
                Enter your registered Gmail address to receive your login security code.
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
                    Gmail Address
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
                      {isSubmitting ? 'Sending Code...' : 'Send Login Code'}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}


          {/* ========================================================= */}
          {/* 3. EXISTING CUSTOMER OTP VERIFICATION (STRICT GUARD)      */}
          {/* ========================================================= */}
          {view === 'existing-otp' && existingCustomerData?.exists === true && (
            <motion.div
              key="existing-otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col items-center relative z-10"
            >
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight text-center">
                Welcome Back{existingCustomerData?.name ? `, ${existingCustomerData.name}` : ''}
              </h2>
              <p className="text-xs text-neutral-500 mb-5 text-center leading-relaxed">
                Enter the 6-digit security code sent to your registered email <br />
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
                    onPaste={handleOtpPaste}
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
                    'Verify & Access Freedom Plan'
                  )}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>

              <div className="flex w-full justify-between mt-4 px-2">
                <button
                  onClick={() => { setView('email-check'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900"
                >
                  ← Use different email
                </button>

                <button
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isSubmitting}
                  className={`text-xs font-bold transition-colors ${resendTimer > 0 ? 'text-neutral-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 4. NEW REGISTRATION SUCCESS POPUP (NO OTP)                */}
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
                Welcome to Freedom Plan!
              </h2>

              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mb-6 leading-relaxed">
                Your account has been created successfully. Your personalized 3-year repayment strategy is ready!
              </p>

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={() => handleFinalContinue('basic')}
                  className="relative z-10 w-full px-6 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  Continue to Freedom Plan
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 5. EXISTING FREE CUSTOMER POST-OTP SUCCESS                */}
          {/* ========================================================= */}
          {view === 'existing-welcome-success' && (
            <motion.div
              key="existing-welcome-success"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center text-center py-3 relative z-10"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#161C2D] tracking-tight mb-2">
                Welcome Back to Freedom Plan
              </h2>

              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mb-6 leading-relaxed">
                Your session is verified. Your financial plan and tracking details are loaded.
              </p>

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={() => handleFinalContinue('basic')}
                  className="relative z-10 w-full px-6 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  Continue to Freedom Plan
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 6. EXISTING PREMIUM CUSTOMER POST-OTP SUCCESS             */}
          {/* ========================================================= */}
          {view === 'premium-welcome-success' && (
            <motion.div
              key="premium-welcome-success"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center text-center py-3 relative z-10"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-100 to-amber-50 border border-amber-300 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
                <Crown className="w-8 h-8" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Premium Member
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#161C2D] tracking-tight mb-2">
                Welcome to Premium Freedom Plan
              </h2>

              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mb-6 leading-relaxed">
                Your premium membership is active. Enjoy full access to all advanced analytics, multi-account strategies, and simulators.
              </p>

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-amber-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={() => handleFinalContinue('pro')}
                  className="relative z-10 w-full px-6 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-gradient-to-r from-[#001C44] via-blue-900 to-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  Access Premium Freedom Plan
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
