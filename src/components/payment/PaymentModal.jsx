import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, Shield, AlertCircle, Mail, User, Phone,
  BarChart2, CreditCard, PiggyBank, ArrowLeftRight,
  CalendarDays, FileText, Cloud, Bell, ArrowRight
} from 'lucide-react';

import { useStore } from '../../context/StoreContext';
import { BLACK_TEXT_URL } from '../ui';

const SPIN_CSS = `@keyframes fp-spin { to { transform: rotate(360deg); } }`;

// ─── Feature list — Lucide icon + uniform dark label ─────────────────────────
const FEATURES = [
  { Icon: BarChart2,      label: 'Advanced Analytics Dashboard'  },
  { Icon: CreditCard,     label: 'Accounts & Budget Manager'      },
  { Icon: PiggyBank,      label: 'Savings Tracker'                },
  { Icon: ArrowLeftRight, label: 'Live Currency Converter'        },
  { Icon: CalendarDays,   label: 'Loan Repayment Schedule'        },
  { Icon: FileText,       label: 'PDF Report Downloads'           },
  { Icon: Cloud,          label: 'Secure Cloud Storage'           },
  { Icon: Bell,           label: 'Smart Payment Reminders'        },
];

const COUNTRY_CODES = [
  { code: '+44', country: 'UK 🇬🇧' },
  { code: '+91', country: 'IN 🇮🇳' },
  { code: '+1',  country: 'US/CA 🇺🇸' },
  { code: '+61', country: 'AU 🇦🇺' },
  { code: '+49', country: 'DE 🇩🇪' },
  { code: '+33', country: 'FR 🇫🇷' },
  { code: '+971', country: 'AE 🇦🇪' },
];

// ─── Animated checkmark ───────────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <svg viewBox="0 0 52 52" fill="none" style={{ width: 56, height: 56 }}>
      <motion.circle cx="26" cy="26" r="24" stroke="#10B981" strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45 }} />
      <motion.path d="M14 27l9 9 16-16" stroke="#10B981" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.35 }} />
    </svg>
  );
}

// =============================================================================
// PAYMENT MODAL — TEMPORARY MANUAL PAYMENT LINK REQUEST FLOW
// =============================================================================
export default function PaymentModal({ isOpen, onClose, onSuccess: onSuccessCallback }) {
  const { currentUser } = useStore();

  const isLoggedIn = Boolean(currentUser && currentUser.email);

  // Steps: 'form' | 'submitting' | 'success' | 'error'
  const [step, setStep] = useState('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for logged-out users
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+44');
  const [guestPhone, setGuestPhone] = useState('');

  // Track submitted data for confirmation screen
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setErrorMsg('');
      setIsSubmitting(false);
      if (currentUser) {
        setGuestName(currentUser.name || '');
        setGuestEmail(currentUser.email || '');
        setGuestPhone(currentUser.phone || '');
      } else {
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
      }
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && (step === 'form' || step === 'success')) onClose?.(); };
    if (isOpen) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isOpen, step, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmitRequest = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    let nameToSend = '';
    let emailToSend = '';
    let phoneToSend = '';

    if (isLoggedIn) {
      nameToSend = currentUser?.name || 'Customer';
      emailToSend = (currentUser?.email || '').toLowerCase().trim();
      phoneToSend = currentUser?.phone || '';
    } else {
      if (!guestName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address');
        return;
      }
      if (!guestPhone.trim()) {
        setErrorMsg('Please enter your phone number');
        return;
      }
      nameToSend = guestName.trim();
      emailToSend = guestEmail.toLowerCase().trim();
      phoneToSend = `${phoneCode} ${guestPhone.trim()}`;
    }

    if (!emailToSend) {
      setErrorMsg('Valid email address is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: nameToSend,
        email: emailToSend,
        phone: phoneToSend,
        plan: 'FreedomPlan Premium',
        amount: 499,
        status: 'payment_link_requested',
        userId: currentUser?.uid || currentUser?.id || null,
        createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/payment/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit payment request. Please try again.');
      }

      setSubmittedData({
        name: nameToSend,
        email: emailToSend,
        phone: phoneToSend,
        plan: 'FreedomPlan Premium',
        amount: 499,
      });

      setIsSubmitting(false);
      setStep('success');
      onSuccessCallback?.();
    } catch (err) {
      console.error('Payment request error:', err);
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Something went wrong while sending your request. Please try again.');
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <style>{SPIN_CSS}</style>
      <AnimatePresence>
        <motion.div
          key="pm-root"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={step === 'form' || step === 'success' ? onClose : undefined}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(15,23,42,0.6)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* ── Modal Card ──────────────────────────────────────────────── */}
          <motion.div
            key="pm-card"
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{   scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 680,
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
              overflow: 'hidden',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 50,
                width: 30, height: 30, borderRadius: '50%',
                background: '#F3F4F6', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7280', transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#111827'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280'; }}
              aria-label="Close modal"
            >
              <X size={15} />
            </button>

            <AnimatePresence mode="wait">

              {/* ════════════════════════════════════════════════════════
                  STEP: FORM (Logged-in or Guest)
              ════════════════════════════════════════════════════════ */}
              {step === 'form' && (
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="flex flex-col md:flex-row w-full overflow-y-auto"
                >
                  {/* LEFT COLUMN — Notice, Price, & Request Action */}
                  <div className="flex flex-col md:w-[350px] shrink-0 p-5 sm:p-7 border-b md:border-b-0 md:border-r border-gray-100 bg-white">
                    {/* Plan Header + Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        FreedomPlan Premium
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider text-blue-700 bg-blue-50 border border-blue-200">
                        RECOMMENDED
                      </span>
                    </div>

                    {/* Price Header */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                        <span className="text-[#98182E]">₹</span>
                        <span className="text-[#00439F]">499</span>
                      </span>
                      <span className="text-xs text-gray-400 font-medium">/ one-time</span>
                      <span className="text-xs text-gray-400 line-through ml-1">₹999</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                        50% OFF
                      </span>
                    </div>

                    {/* Notice Block — Online Payment Temporarily on Hold */}
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 mb-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          !
                        </div>
                        <div className="text-left">
                          <h4 className="text-[12.5px] font-bold text-amber-900 leading-tight mb-1">
                            Premium payment is temporarily on hold
                          </h4>
                          <p className="text-[11.5px] text-amber-800/90 leading-relaxed">
                            Our online payment section is temporarily on hold. Don't worry — you can still purchase FreedomPlan Premium.
                          </p>
                          <p className="text-[11px] font-medium text-amber-900 mt-1.5">
                            {isLoggedIn
                              ? 'We will send the official payment link to your registered email address.'
                              : "Enter your details below and we'll send the payment link to your email."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CASE 1: Logged-in User */}
                    {isLoggedIn && (
                      <div className="flex flex-col gap-3 mb-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                            Payment link will be sent to:
                          </span>
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 break-all">
                            <Mail size={15} className="text-blue-600 shrink-0" />
                            <span>{currentUser?.email}</span>
                          </div>
                          {currentUser?.name && (
                            <span className="text-[11px] text-gray-500 block mt-1">
                              Account: <strong>{currentUser.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CASE 2: Logged-out Guest User (ONLY 3 Fields: Name, Email, Phone) */}
                    {!isLoggedIn && (
                      <form onSubmit={handleSubmitRequest} className="flex flex-col gap-2.5 mb-3 text-left">
                        {/* Name Field */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={guestName}
                              onChange={e => setGuestName(e.target.value)}
                              placeholder="e.g. John Smith"
                              required
                              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
                            />
                          </div>
                        </div>

                        {/* Email Field */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              value={guestEmail}
                              onChange={e => setGuestEmail(e.target.value)}
                              placeholder="e.g. john@gmail.com"
                              required
                              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
                            />
                          </div>
                        </div>

                        {/* Phone Number Field */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-1.5">
                            <select
                              value={phoneCode}
                              onChange={e => setPhoneCode(e.target.value)}
                              className="w-[90px] px-1.5 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 focus:border-blue-500 outline-none text-gray-800"
                            >
                              {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.code}>{c.code} ({c.country})</option>
                              ))}
                            </select>
                            <div className="relative flex-1">
                              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="tel"
                                value={guestPhone}
                                onChange={e => setGuestPhone(e.target.value)}
                                placeholder="Phone number"
                                required
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
                              />
                            </div>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Error Notification */}
                    {errorMsg && (
                      <div className="flex items-center gap-2 p-2 mb-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 text-left">
                        <AlertCircle size={14} className="shrink-0 text-red-500" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* CTA Button: REQUEST PAYMENT LINK */}
                    <div className="relative group w-full mt-auto pt-2">
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 blur-md rounded-full opacity-70 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                      <button
                        onClick={handleSubmitRequest}
                        disabled={isSubmitting}
                        className="relative z-10 w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-[13px] transition-all bg-[#111827] text-white hover:bg-black shadow-lg border border-slate-800 text-center flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-75 disabled:cursor-wait"
                        style={{
                          backgroundImage: BLACK_TEXT_URL,
                          backgroundPosition: 'center',
                          backgroundSize: 'auto 150%',
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <span style={{
                              width: 14, height: 14,
                              border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                              borderRadius: '50%', display: 'inline-block',
                              animation: 'fp-spin 0.65s linear infinite',
                            }} />
                            Sending request…
                          </>
                        ) : (
                          <>
                            REQUEST PAYMENT LINK
                            <ArrowRight size={14} className="text-cyan-400" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Security Subtext */}
                    <div className="mt-3 pt-2 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium">
                      <Shield size={10} className="text-gray-400" />
                      256-bit SSL encrypted · Manual Razorpay verification
                    </div>
                  </div>

                  {/* RIGHT COLUMN — Premium Features Included */}
                  <div className="flex-1 flex flex-col justify-center p-5 sm:p-7 bg-slate-50/50">
                    <div className="text-left mb-3">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                        Everything included in FreedomPlan Premium:
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        One-time purchase · Lifetime access to all tools
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      {FEATURES.map(({ Icon, label }, i) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.18 }}
                          className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-white border border-gray-100 shadow-sm"
                        >
                          <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <Icon size={12} className="text-blue-600" />
                          </div>
                          <span className="text-[12px] font-semibold text-gray-700">
                            {label}
                          </span>
                          <CheckCircle size={12} className="text-emerald-500 ml-auto shrink-0" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════════
                  STEP: SUCCESS (Request Received)
              ════════════════════════════════════════════════════════ */}
              {step === 'success' && (
                <motion.div
                  key="success-view"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col items-center justify-center p-7 sm:p-9 text-center max-w-lg mx-auto"
                >
                  <div className="mb-3">
                    <AnimatedCheck />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
                    Request received
                  </h3>

                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    We've received your request.
                  </p>

                  <p className="text-xs text-gray-600 leading-relaxed mb-4 max-w-md">
                    Our online payment section is temporarily on hold. We will send the official Razorpay payment link to your email.
                  </p>

                  {/* Summary Card */}
                  {submittedData && (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-left text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Recipient Email:</span>
                        <strong className="text-gray-900 font-semibold">{submittedData.email}</strong>
                      </div>
                      {submittedData.name && (
                        <div className="flex justify-between items-center text-gray-600">
                          <span>Name:</span>
                          <strong className="text-gray-900 font-semibold">{submittedData.name}</strong>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Plan:</span>
                        <strong className="text-blue-700 font-semibold">FreedomPlan Premium (₹499)</strong>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Status:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Payment Link Requested
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Instruction Notice */}
                  <div className="w-full bg-blue-50 border border-blue-200/80 rounded-xl p-3 mb-5 text-left flex items-start gap-2.5">
                    <Mail size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 leading-snug">
                      <strong>Next step:</strong> After completing the payment, please reply to our email with your payment confirmation.
                    </p>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-6 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-black transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    CLOSE
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}
