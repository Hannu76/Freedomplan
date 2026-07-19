import React, { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = '/api/auth'

export default function ProLeadFormModal({ isOpen, onClose, onUnlock }) {
  const { users, setUsers, setIsLoggedIn, setCurrentUser, setBasicLoan } = useStore()
  
  // view can be 'register', 'login-request', 'login-otp', 'email-check'
  const [view, setView] = useState('register') 
  const [emailCheckMessage, setEmailCheckMessage] = useState('')
  const [checkEmail, setCheckEmail] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneCode: '+44',
    phone: '',
    loanAmount: '',
  })
  const [isOutsideUK, setIsOutsideUK] = useState(null)
  const [otp, setOtp] = useState(['', '', '', '', '', '']) // 6 digits
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [resendTimer, setResendTimer] = useState(0)

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
    setCheckEmail('')
    setFormData({ name: '', email: '', phoneCode: '+44', phone: '', loanAmount: '' })
    setIsOutsideUK(null)
    setOtp(['', '', '', '', '', ''])
    setError('')
    setIsSubmitting(false)
  }

  const handleEmailCheck = (e) => {
    e.preventDefault()
    setError('')
    if (!isValidEmail(checkEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    const userExists = users.find(u => u.email.toLowerCase() === checkEmail.toLowerCase())
    if (userExists) {
      setFormData(prev => ({ ...prev, email: checkEmail, name: userExists.name || '' }))
      setEmailCheckMessage('You are an existing customer. Please log in as an Existing Customer.')
      setView('login-request')
    } else {
      setFormData(prev => ({ ...prev, email: checkEmail }))
      setEmailCheckMessage('No existing account was found for this email. Please continue as a New Customer.')
      setView('register')
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Stub ready for Google Sheets API / APK Webhook when user provides URL later
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
            timestamp: new Date().toISOString(),
            source: 'Freedom Plan Dashboard',
          }),
          mode: 'no-cors' // often needed for google sheets macros unless CORS is configured on the script
        })
      }
    } catch (err) {
      console.error('Google Sheets API sync note:', err)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e?.preventDefault?.()
    setError('')

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.loanAmount.trim()) {
      setError(`Please fill in Name, Email, Loan Amount, and ${isOutsideUK ? 'Phone Number' : 'UK Phone Number'}.`)
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const existingUser = users.find(u => 
      u.email.toLowerCase() === formData.email.toLowerCase()
    )

    if (existingUser) {
      setFormData(prev => ({ ...prev, name: existingUser.name || prev.name }))
      setEmailCheckMessage('You already have an account! Please send an OTP to verify your email and sign in.')
      setView('login-request')
      return
    }

    setIsSubmitting(true)
    const timestamp = new Date().toISOString()
    const newUserData = { ...formData, isOutsideUK, tier: 'basic', timestamp }
    
    // Send to Google Sheets (Wait for it to not block UI entirely, but catch errors silently)
    submitToGoogleSheetAPI(newUserData).catch(console.error)
    
    // Send to backend for admin email notification
    try {
      fetch(`${API_BASE_URL}/register-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      }).catch(console.error)
    } catch (e) {
      console.error(e)
    }
    
    setTimeout(() => {
      const newUser = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        tier: 'basic',
        registeredAt: timestamp,
        lastLogin: timestamp
      }
      setUsers([...users, newUser])
      setCurrentUser(newUser)
      setIsLoggedIn(true)
      // Auto-populate basicLoan from the enquiry form so all pages show the correct principal
      if (formData.loanAmount && Number(formData.loanAmount) > 0) {
        setBasicLoan(Number(formData.loanAmount))
      }
      setIsSubmitting(false)
      if (onUnlock) onUnlock({ ...formData, isOutsideUK }, 'basic')
      handleClose()
    }, 800)
  }

  const handleLoginRequest = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please enter your Full Name and Email Address.')
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const user = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase())
    if (!user) {
      setError('No account found with this email. Please register.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
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
      setResendTimer(120) // 2 minutes cooldown
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

  const verifyOtp = async () => {
    setError('')
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: code })
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

      // Login Successful
      const timestamp = new Date().toISOString()
      const normalizedEmail = formData.email.toLowerCase()
      const updatedUsers = users.map(u => 
        u.email.toLowerCase() === normalizedEmail ? { ...u, lastLogin: timestamp } : u
      )
      
      setUsers(updatedUsers)
      const loggedInUser = updatedUsers.find(u => u.email.toLowerCase() === normalizedEmail)
      setCurrentUser(loggedInUser)
      setIsLoggedIn(true)
      // Restore loan amount from saved user profile if available
      if (loggedInUser?.loanAmount && Number(loggedInUser.loanAmount) > 0) {
        setBasicLoan(Number(loggedInUser.loanAmount))
      }
      if (onUnlock) onUnlock()
      handleClose()
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Freedom Plan',
          text: 'Check out Freedom Plan for smart international student loans and savings tracking!',
          url: 'https://freedomplan.vercel.app/'
        })
      } catch (error) {
        console.log('Error sharing', error)
      }
    } else {
      alert('Your browser does not support the native share feature.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in dark-invert"
      onClick={handleClose}
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
          onClick={handleClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors z-50"
          title="Close Modal"
        >
          ✕
        </button>

        {view === 'email-check' && (
          <div className="animate-fade-in relative z-10">
            <div className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-2 tracking-tight">
              Unlock Your <span className="text-blue-600">Dashboard</span>
            </div>
            <p className="text-xs text-neutral-500 mb-6">
              Enter your email to securely log in or register your account.
            </p>

            <form onSubmit={handleEmailCheck} className="flex flex-col gap-5">
              <div className="relative">
                <input required autoComplete="email" type="email" name="checkEmail" id="check-email" value={checkEmail} onChange={(e) => setCheckEmail(e.target.value)} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="check-email" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Email Address</label>
              </div>
              
              {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

              <button type="submit" className="w-full px-4 py-3 rounded-xl text-[13px] font-extrabold tracking-wide uppercase text-white transition-all duration-200 active:scale-95 text-center mt-2" style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)', boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb' }}>
                Continue
              </button>
            </form>
          </div>
        )}

        {view === 'register' && (
          <div className="animate-fade-in relative z-10">
            <div className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-2 tracking-tight">
              Create <span className="text-blue-600">Account</span>
            </div>
            {emailCheckMessage && (
              <div className="mb-4 p-3 bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl">
                <p className="text-xs font-bold text-blue-600">{emailCheckMessage}</p>
              </div>
            )}
            <p className="text-xs text-neutral-500 mb-6">
              Register now to access your detailed paydown curve and personalized plan.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
              <div className="relative">
                <input required autoComplete="name" type="text" name="name" id="pro-name" value={formData.name} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="pro-name" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Full Name</label>
              </div>

              <div className="relative">
                <input required autoComplete="email" type="email" name="email" id="pro-email" value={formData.email} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="pro-email" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Email Address</label>
              </div>

              <div className="relative">
                <input required autoComplete="tel" type="tel" name="phone" id="pro-phone" value={formData.phone} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="pro-phone" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">{isOutsideUK === true ? 'International Phone Number (+code)' : 'UK Phone Number (+44)'}</label>
              </div>

              <div className="relative">
                <input required type="text" inputMode="numeric" name="loanAmount" id="pro-loan" value={formData.loanAmount} onChange={(e) => handleChange({ target: { name: 'loanAmount', value: e.target.value.replace(/[^0-9]/g, '') }})} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="pro-loan" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Loan Amount</label>
              </div>

              <div className="flex items-center justify-center gap-4 mt-1">
                <span className={`text-xs font-bold transition-colors ${isOutsideUK === false ? 'text-[#B6F36A]' : 'text-neutral-400'}`}>Inside UK</span>
                <div className="bauble_box">
                  <input className={`bauble_input ${isOutsideUK === null ? 'unselected' : ''}`} id="bauble_check" name="bauble" type="checkbox" checked={isOutsideUK === true} onChange={(e) => setIsOutsideUK(e.target.checked)} />
                  <label className="bauble_label" htmlFor="bauble_check">Toggle</label>
                </div>
                <span className={`text-xs font-bold transition-colors ${isOutsideUK === true ? 'text-rose-500' : 'text-neutral-400'}`}>Outside UK</span>
              </div>

              {error && <p className="text-xs text-rose-500 font-bold text-center">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setView('login-request'); setEmailCheckMessage(''); setError(''); }} className="px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors">Existing User Sign In</button>
                <button type="button" onClick={handleRegisterSubmit} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl text-[13px] font-extrabold tracking-wide uppercase text-white transition-all duration-200 active:scale-95 disabled:opacity-50 text-center" style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)', boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb' }}>
                  {isSubmitting ? 'Wait...' : 'Register Plan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'login-request' && (
          <div className="animate-fade-in relative z-10">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-2 tracking-tight">
              Welcome Back!
            </h2>
            {emailCheckMessage && (
              <div className="mb-4 p-3 bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl">
                <p className="text-xs font-bold text-blue-600">{emailCheckMessage}</p>
              </div>
            )}
            <p className="text-xs text-neutral-500 mb-6">Continue your financial journey with Freedom Plan. <br/><span className="italic text-neutral-400">💡 "Small steps today build great wealth tomorrow."</span></p>
            
            <form onSubmit={handleLoginRequest} className="flex flex-col gap-4">
              <div className="relative">
                <input required autoComplete="name" type="text" name="name" id="login-name" value={formData.name} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="login-name" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Full Name</label>
              </div>
              <div className="relative">
                <input required autoComplete="email" type="email" name="email" id="login-email" value={formData.email} onChange={handleChange} placeholder=" " className="peer w-full px-4 pt-5 pb-2 text-sm font-semibold text-[#161C2D] border border-[#8d8d8d]/60 rounded-xl focus:outline-none focus:border-blue-600 transition-all bg-white" />
                <label htmlFor="login-email" className="absolute left-4 top-3.5 text-xs text-[#8d8d8d] pointer-events-none transition-all duration-200 peer-focus:-translate-y-3.5 peer-focus:scale-85 peer-focus:text-blue-600 peer-focus:font-bold peer-focus:bg-white peer-focus:px-1 rounded-full peer-[&:not(:placeholder-shown)]:-translate-y-3.5 peer-[&:not(:placeholder-shown)]:scale-85 peer-[&:not(:placeholder-shown)]:text-blue-600 peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:bg-white peer-[&:not(:placeholder-shown)]:px-1">Email Address</label>
              </div>
              
              {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}
              
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setView('register'); setError(''); }} className="px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors">Back</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-4 py-3 rounded-xl text-[13px] font-extrabold tracking-wide uppercase text-white transition-all duration-200 active:scale-95 disabled:opacity-50 text-center" 
                  style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)', boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb' }}
                >
                  {isSubmitting ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-[#EEF2F7] pt-6">
              <p className="text-sm font-extrabold text-[#161C2D] text-center mb-2">Share Freedom Plan</p>
              <p className="text-xs text-neutral-500 text-center mb-4">Love the app? Recommend us to your friends and family!</p>
              <button 
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F9FBFD] text-[#161C2D] rounded-xl text-xs font-extrabold uppercase tracking-wide border border-[#EEF2F7] hover:bg-neutral-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="6" r="3"></circle>
                  <circle cx="18" cy="18" r="3"></circle>
                  <line x1="8.7" y1="10.7" x2="15.3" y2="7.3"></line>
                  <line x1="8.7" y1="13.3" x2="15.3" y2="16.7"></line>
                </svg>
                Share
              </button>
            </div>
          </div>
        )}

        {view === 'login-otp' && (
          <div className="animate-fade-in flex flex-col items-center relative z-10">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#161C2D] mb-2 tracking-tight text-center">
              Verify Email
            </h2>
            <p className="text-xs text-neutral-500 mb-6 text-center">We've sent a 6-digit code to <span className="font-bold text-[#161C2D]">{formData.email}</span>.</p>
            
            <div className="flex justify-center gap-2 mb-6 w-full px-2">
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

            <button 
              onClick={verifyOtp}
              disabled={isSubmitting || otp.join('').length < 6}
              className="w-full px-4 py-3.5 rounded-xl text-[13px] font-extrabold uppercase tracking-widest text-white transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)', boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb' }}
            >
              {isSubmitting ? (
                <span className="flex h-4 w-4 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#161C2D] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#161C2D]"></span>
                </span>
              ) : 'Verify & Login'}
            </button>
            <div className="flex w-full justify-between mt-4 px-2">
              <button 
                onClick={() => { setView('login-request'); setOtp(['','','','','','']); setError(''); }}
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
          </div>
        )}
      </div>
    </div>
  )
}
