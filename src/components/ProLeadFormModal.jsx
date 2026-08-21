import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { playBookSound } from '../utils/sound'
import { formatIndianCurrencyWords } from '../utils/formatters'
import { WHITE_TEXT_URL } from './ui'

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);
const API_BASE_URL = '/api/auth'

export default function ProLeadFormModal({ isOpen, onClose, onUnlock }) {
  const { users, setUsers, setIsLoggedIn, setCurrentUser, setBasicLoan, setSessionLoginTime, currentUser } = useStore()

  // Views: 'register' | 'register-otp' | 'registration-success' | 'login-request' | 'login-otp'
  const [view, setView] = useState('register')
  const [emailCheckMessage, setEmailCheckMessage] = useState('')

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phoneCode: '+44',
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
      if (currentUser) {
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
    setView('register')
    setEmailCheckMessage('')
    setFormData({
      name: '',
      email: '',
      phoneCode: '+44',
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

  const isEmailRegistered = (email) => {
    if (!email) return false
    const cleanEmail = email.trim().toLowerCase()
    const inUsers = users.some(u => u.email?.trim().toLowerCase() === cleanEmail)
    let inRegisteredList = false
    try {
      const existing = JSON.parse(localStorage.getItem('freedomPlan.registeredEmails') || '[]')
      inRegisteredList = existing.some(e => e.trim().toLowerCase() === cleanEmail)
    } catch (e) { }
    return inUsers || inRegisteredList
  }

  const findUserByEmail = (email) => {
    if (!email) return null
    const cleanEmail = email.trim().toLowerCase()
    return users.find(u => u.email?.trim().toLowerCase() === cleanEmail)
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

    // Smooth check when user types an existing email in register view
    if (name === 'email' && isValidEmail(value)) {
      const cleanEmail = value.trim().toLowerCase()
      if (view === 'register' && isEmailRegistered(cleanEmail)) {
        const existing = findUserByEmail(cleanEmail)
        setFormData(prev => ({ ...prev, email: cleanEmail, name: existing?.name || prev.name }))
        setEmailCheckMessage('You are an existing customer! We have switched you to Existing Account Sign In so you can request an OTP.')
        setView('login-request')
      }
    }
  }

  // Google Sheets webhook sync
  const submitToGoogleSheetAPI = async (data) => {
    try {
      const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec'
      if (GOOGLE_SHEETS_WEBHOOK_URL) {
        await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            ukStatus: data.isOutsideUK ? 'Outside the UK' : 'Inside the UK',
            'UK Status': data.isOutsideUK ? 'Outside the UK' : 'Inside the UK',
            loanAmount: data.loanAmount,
            'Loan Amount': data.loanAmount,
            whatsappUpdates: data.whatsappUpdates !== false ? 'Enabled' : 'Disabled',
            'WhatsApp Updates': data.whatsappUpdates !== false ? 'Enabled' : 'Disabled',
            timestamp: new Date().toISOString(),
            source: 'Freedom Plan Dashboard',
          }),
          mode: 'no-cors'
        })
      }
    } catch (err) {
      console.error('Google Sheets API sync note:', err)
    }
  }

  // Handle New User Registration Submit
  const handleRegisterSubmit = async (e) => {
    e?.preventDefault?.()
    playBookSound()
    setError('')

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please complete Name and Email fields.')
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const cleanEmail = formData.email.trim().toLowerCase()

    // If user attempts to register with an already registered email, direct to login
    if (isEmailRegistered(cleanEmail)) {
      const existingUser = findUserByEmail(cleanEmail)
      setFormData(prev => ({ ...prev, name: existingUser?.name || prev.name, email: cleanEmail }))
      setEmailCheckMessage('You are an existing customer! Please sign in to request an OTP.')
      setView('login-request')
      return
    }

    if (isOutsideUK === null) {
      setError('Please select your UK residency status: "Right now in UK" or "Planning to UK".')
      return
    }

    if (!formData.phone.trim() || !formData.loanAmount.trim()) {
      setError(`Please complete all required fields: Loan Amount and ${isOutsideUK ? 'Phone Number' : 'UK Phone Number'}.`)
      return
    }

    if (isNaN(Number(formData.loanAmount)) || Number(formData.loanAmount) <= 0) {
      setError('Please enter a valid numeric Loan Amount.')
      return
    }

    setIsSubmitting(true)

    if (isLocalhost) {
      setTimeout(() => {
        setView('register-otp')
        setResendTimer(120)
        setIsSubmitting(false)
      }, 500)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })

      let data = {}
      try {
        data = await response.json()
      } catch (e) {
        throw new Error('Authentication server is currently unavailable. Please try again later.')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      setView('register-otp')
      setResendTimer(120)
    } catch (err) {
      setError(err.message || 'Error connecting to the authentication server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Existing User Login Request (Email check)
  const handleLoginRequest = async (e) => {
    e?.preventDefault?.()
    playBookSound()
    setError('')

    if (!formData.email.trim()) {
      setError('Please enter your Email Address.')
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const cleanEmail = formData.email.trim().toLowerCase()

    // Check if customer exists in the system
    if (!isEmailRegistered(cleanEmail)) {
      setError('No existing account found with this email. Redirecting to registration...')
      setTimeout(() => {
        setView('register')
        setError('')
      }, 1000)
      return
    }

    setIsSubmitting(true)

    if (isLocalhost) {
      setTimeout(() => {
        setView('login-otp')
        setResendTimer(120)
        setIsSubmitting(false)
      }, 500)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })

      let data = {}
      try {
        data = await response.json()
      } catch (e) {
        throw new Error('Authentication server is currently unavailable. Please try again later.')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      setView('login-otp')
      setResendTimer(120)
    } catch (err) {
      setError(err.message || 'Error connecting to the authentication server.')
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // Verify OTP for either Registration or Login
  const verifyOtp = async () => {
    playBookSound()
    setError('')
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.')
      return
    }

    setIsSubmitting(true)

    if (isLocalhost) {
      if (code !== '123456') {
        setIsSubmitting(false)
        setError('Invalid OTP. Please enter 123456 for local testing.')
        return
      }
      if (view === 'register-otp') {
        completeNewUserRegistration()
      } else {
        completeExistingUserLogin()
      }
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase(), otp: code })
      })

      let data = {}
      try {
        data = await response.json()
      } catch (e) {
        throw new Error('Authentication server is currently unavailable. Please try again later.')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP')
      }

      if (view === 'register-otp') {
        completeNewUserRegistration()
      } else {
        completeExistingUserLogin()
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Complete New User Registration -> Smoothly transition to "Welcome to FreedomPlan"
  const completeNewUserRegistration = () => {
    const cleanEmail = formData.email.trim().toLowerCase()
    const timestamp = new Date().toISOString()
    const newUserData = { ...formData, email: cleanEmail, isOutsideUK, whatsappUpdates, whatsapp_updates_enabled: whatsappUpdates, tier: 'basic', timestamp }

    saveRegisteredEmail(cleanEmail)

    // Record marketing eligibility (fire-and-forget)
    try {
      fetch('/api/marketing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: formData.name,
          consent: true,
          source: 'registration_lead',
        }),
      }).catch(console.error)
    } catch (e) {
      console.error(e)
    }

    // Send to Google Sheets (fire-and-forget)
    submitToGoogleSheetAPI(newUserData).catch(console.error)

    // Send to backend for admin email notification & WhatsApp automated invitation queue (fire-and-forget)
    try {
      fetch(`${API_BASE_URL}/register-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      }).catch(console.error)
    } catch (e) {
      console.error(e)
    }

    const newUser = {
      name: formData.name,
      email: cleanEmail,
      phone: formData.phone,
      loanAmount: Number(formData.loanAmount) || 0,
      isOutsideUK: isOutsideUK,
      whatsappUpdates: whatsappUpdates,
      whatsapp_updates_enabled: whatsappUpdates,
      tier: 'basic',
      registeredAt: timestamp,
      lastLogin: timestamp
    }

    setUsers([...users, newUser])
    setCurrentUser(newUser)
    setIsLoggedIn(true)
    setSessionLoginTime(Date.now())
    if (formData.loanAmount && Number(formData.loanAmount) > 0) {
      setBasicLoan(Number(formData.loanAmount))
    }

    setRegisteredData({ ...formData, isOutsideUK, whatsappUpdates })
    setIsSubmitting(false)

    // Smoothly transition away from registration form to Welcome popup
    setView('registration-success')
  }

  // When user clicks Continue on "Welcome to FreedomPlan" popup
  const handleWelcomeContinue = () => {
    if (onUnlock) onUnlock(registeredData || formData, 'basic')
    handleClose()
  }

  // Complete Existing User Login
  const completeExistingUserLogin = () => {
    const timestamp = new Date().toISOString()
    const normalizedEmail = formData.email.trim().toLowerCase()
    saveRegisteredEmail(normalizedEmail)

    let loggedInUser = users.find(u => u.email?.trim().toLowerCase() === normalizedEmail)
    let updatedUsers = users

    if (!loggedInUser) {
      loggedInUser = {
        name: formData.name || 'User',
        email: normalizedEmail,
        phone: formData.phone || '',
        loanAmount: Number(formData.loanAmount) || 0,
        isOutsideUK: isOutsideUK,
        tier: 'basic',
        registeredAt: timestamp,
        lastLogin: timestamp
      }
      updatedUsers = [...users, loggedInUser]
    } else {
      updatedUsers = users.map(u =>
        u.email?.trim().toLowerCase() === normalizedEmail ? { ...u, lastLogin: timestamp } : u
      )
    }

    setUsers(updatedUsers)
    setCurrentUser(loggedInUser)
    setIsLoggedIn(true)
    setSessionLoginTime(Date.now())
    if (loggedInUser?.loanAmount && Number(loggedInUser.loanAmount) > 0) {
      setBasicLoan(Number(loggedInUser.loanAmount))
    }

    setIsSubmitting(false)
    if (onUnlock) onUnlock()
    handleClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md font-sans"
      onClick={handleClose}
    >
      <motion.div
        layout
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-md border border-[#8d8d8d]/30 p-6 sm:p-8 rounded-[24px] bg-white shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Aurora Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        {/* Close Button (Hidden on Registration Success to encourage clean Continue click) */}
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
          {/* 1. NEW USER REGISTRATION                                 */}
          {/* ========================================================= */}
          {view === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight">
                Create <span className="text-blue-600">Account</span>
              </div>
              {emailCheckMessage && (
                <div className="mb-3 p-2.5 bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl">
                  <p className="text-xs font-bold text-blue-600">{emailCheckMessage}</p>
                </div>
              )}
              <p className="text-xs text-neutral-500 mb-5">
                Register now to access your detailed paydown curve and personalized plan.
              </p>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
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
                  <label htmlFor="pro-name" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Full Name</label>
                </div>

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
                  <label htmlFor="pro-email" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Email Address</label>
                </div>

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
                  <label htmlFor="pro-phone" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">
                    {isOutsideUK === true ? 'International Phone Number (+code)' : 'UK Phone Number (+44)'}
                  </label>
                </div>

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
                      className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1"
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

                {/* UK Status Toggle Container */}
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

                {/* WhatsApp Updates Toggle - Default ON with User's 3D WhatsApp Icon */}
                <div className="flex items-center justify-between p-2.5 px-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-xl transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img
                        src="/images/whatsapp-3d.png"
                        alt="WhatsApp"
                        className="w-full h-full object-contain drop-shadow-sm"
                        onError={(e) => { e.currentTarget.src = '/whatsapp-icon.png'; }}
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 leading-tight">
                        WhatsApp Updates
                        {whatsappUpdates && (
                          <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded-full leading-none">
                            ON
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                        Get roadmap tips & community invite
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="pro-whatsapp-updates"
                      checked={whatsappUpdates}
                      onChange={(e) => setWhatsappUpdates(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {error && <p className="text-xs text-rose-600 font-extrabold text-center bg-rose-50 border border-rose-200 p-2 rounded-lg">{error}</p>}

                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setView('login-request'); setEmailCheckMessage(''); setError(''); }}
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
                      {isSubmitting ? 'Sending OTP...' : 'Register Plan'}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 2. NEW USER REGISTRATION OTP                             */}
          {/* ========================================================= */}
          {view === 'register-otp' && (
            <motion.div
              key="register-otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center relative z-10"
            >
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight text-center">
                Verify Your Registration
              </h2>
              <p className="text-xs text-neutral-500 mb-5 text-center leading-relaxed">
                We've sent a 6-digit verification code to <span className="font-bold text-[#161C2D]">{formData.email}</span> to confirm your account registration.
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

              {error && <p className="text-xs text-rose-500 font-bold mb-4 text-center">{error}</p>}

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={verifyOtp}
                  disabled={isSubmitting || otp.join('').length < 6}
                  className="relative z-10 w-full px-4 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span className="flex h-4 w-4 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                    </span>
                  ) : 'Verify & Create Account'}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>

              <div className="flex w-full justify-between mt-4 px-2">
                <button
                  onClick={() => { setView('register'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900"
                >
                  Change Details
                </button>

                <button
                  onClick={handleRegisterSubmit}
                  disabled={resendTimer > 0 || isSubmitting}
                  className={`text-xs font-bold transition-colors ${resendTimer > 0 ? 'text-neutral-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {resendTimer > 0 ? `Resend Code (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})` : 'Resend Code'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* 3. NEW USER REGISTRATION SUCCESS WELCOME POPUP           */}
          {/* ========================================================= */}
          {view === 'registration-success' && (
            <motion.div
              key="registration-success"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center text-center py-3 relative z-10"
            >
              {/* Success Badge */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              {/* Primary Header */}
              <h2 className="text-xl sm:text-2xl font-black text-[#161C2D] tracking-tight mb-2">
                Welcome to FreedomPlan
              </h2>

              {/* Secondary Subtitle */}
              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mb-6 leading-relaxed">
                Your account has been created successfully.
              </p>

              {/* CTA Continue Button */}
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

          {/* ========================================================= */}
          {/* 4. EXISTING USER LOGIN (EMAIL REQUEST)                   */}
          {/* ========================================================= */}
          {view === 'login-request' && (
            <motion.div
              key="login-request"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10"
            >
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight">
                Sign In to Your Account
              </h2>
              {emailCheckMessage && (
                <div className="mb-3 p-2.5 bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl">
                  <p className="text-xs font-bold text-blue-600">{emailCheckMessage}</p>
                </div>
              )}
              <p className="text-xs text-neutral-500 mb-5">
                Enter your registered email address to receive your login OTP.
              </p>

              <form onSubmit={handleLoginRequest} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    required
                    autoComplete="email"
                    type="email"
                    name="email"
                    id="login-email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder=" "
                    className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white"
                  />
                  <label htmlFor="login-email" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">
                    Email Address
                  </label>
                </div>

                {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setView('register'); setError(''); setEmailCheckMessage(''); }}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Create Account
                  </button>
                  <div className="relative group flex-1">
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
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
          {/* 5. EXISTING USER "WELCOME BACK" + OTP VERIFICATION         */}
          {/* ========================================================= */}
          {view === 'login-otp' && (
            <motion.div
              key="login-otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-center relative z-10"
            >
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-1.5 tracking-tight text-center">
                Welcome Back
              </h2>
              <p className="text-xs text-neutral-500 mb-5 text-center leading-relaxed">
                Enter the OTP sent to your registered email address <br />
                <span className="font-bold text-[#161C2D]">{formData.email}</span>.
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

              {error && <p className="text-xs text-rose-500 font-bold mb-4 text-center">{error}</p>}

              <div className="relative group w-full">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-slate-300 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                <button
                  onClick={verifyOtp}
                  disabled={isSubmitting || otp.join('').length < 6}
                  className="relative z-10 w-full px-4 py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest text-white bg-[#001C44] hover:opacity-90 transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span className="flex h-4 w-4 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                    </span>
                  ) : 'Verify'}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                </button>
              </div>

              <div className="flex w-full justify-between mt-4 px-2">
                <button
                  onClick={() => { setView('login-request'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-900"
                >
                  Change Email
                </button>

                <button
                  onClick={handleLoginRequest}
                  disabled={resendTimer > 0 || isSubmitting}
                  className={`text-xs font-bold transition-colors ${resendTimer > 0 ? 'text-neutral-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  {resendTimer > 0 ? `Resend OTP (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})` : 'Resend OTP'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
