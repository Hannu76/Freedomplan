import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, Sparkles, Shield,
  BarChart2, CreditCard, PiggyBank, ArrowLeftRight,
  CalendarDays, FileText, Cloud, Bell,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../context/StoreContext';
import { useRazorpay } from '../../hooks/useRazorpay';
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

const UNLOCK_LIST = [
  'Analytics Dashboard', 'Accounts Manager', 'Savings Tracker',
  'Currency Converter',  'Loan Schedule',    'PDF Downloads', 'Premium Access',
];

// ─── Animated checkmark ───────────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <svg viewBox="0 0 52 52" fill="none" style={{ width: 52, height: 52 }}>
      <motion.circle cx="26" cy="26" r="25" stroke="#10B981" strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5 }} />
      <motion.path d="M14 27l9 9 16-16" stroke="#10B981" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }} />
    </svg>
  );
}

// =============================================================================
// PAYMENT MODAL — horizontal card layout
// =============================================================================
export default function PaymentModal({ isOpen, onClose, onSuccess: onSuccessCallback }) {
  const { currentUser, unlockPremium } = useStore();

  const [step, setStep]                   = useState('pricing');
  const [errorMsg, setErrorMsg]           = useState('');
  const [revealedCount, setRevealedCount] = useState(0);
  const [progress, setProgress]           = useState(0);
  const confettiFired                     = useRef(false);

  const PRICING_CYCLE = [
    { symbol: '₹', amount: '499', cross: '₹999' }
  ];
  const [priceIdx, setPriceIdx] = useState(0);

  const userEmail = currentUser?.email || '';
  const userName  = currentUser?.name  || '';

  useEffect(() => {
    if (isOpen) {
      setStep('pricing'); setErrorMsg('');
      setRevealedCount(0); setProgress(0);
      confettiFired.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && step === 'pricing') onClose?.(); };
    if (isOpen) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isOpen, step, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (step !== 'verifying') return;
    let p = 0;
    const id = setInterval(() => {
      p += Math.floor(Math.random() * 14) + 7;
      if (p >= 95) { p = 95; clearInterval(id); }
      setProgress(p);
    }, 180);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== 'success') return;
    setProgress(100);
    if (revealedCount < UNLOCK_LIST.length) {
      const t = setTimeout(() => setRevealedCount(c => c + 1), 280);
      return () => clearTimeout(t);
    }
    if (!confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 },
          colors: ['#4A7BFF', '#10B981', '#F59E0B', '#6366F1'] });
        setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { x: 0.1, y: 0.6 }, angle: 60 }), 250);
        setTimeout(() => confetti({ particleCount: 60, spread: 50, origin: { x: 0.9, y: 0.6 }, angle: 120 }), 450);
      }, 150);
    }
  }, [step, revealedCount]);

  const { initPayment, isLoading: rzpLoading } = useRazorpay({
    email: userEmail, name: userName, amount: 49900,
    onSuccess: ({ token }) => { unlockPremium(token); setStep('success'); setRevealedCount(0); },
    onError:   (msg)       => { setErrorMsg(msg || 'Payment failed. Please try again.'); setStep('error'); },
  });

  // FIX: don't touch 'step' before Razorpay opens — callbacks drive transitions
  const handleUpgrade     = useCallback(() => { initPayment(); }, [initPayment]);
  const handleSuccessClose = useCallback(() => { onSuccessCallback?.(); onClose?.(); }, [onSuccessCallback, onClose]);

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
            padding: 20,
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={step === 'pricing' ? onClose : undefined}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(15,23,42,0.52)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            }}
          />

          {/* ── Modal card ──────────────────────────────────────────────── */}
          <motion.div
            key="pm-card"
            initial={{ scale: 0.94, y: 22, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{   scale: 0.94, y: 22, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.8 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 640,          // ← horizontal card
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
              boxShadow: '0 16px 56px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            {/* Close */}
            {(step === 'pricing' || step === 'error') && (
              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: 14, right: 14, zIndex: 50,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#F3F4F6', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6B7280', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'}
                onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}
              ><X size={14} /></button>
            )}

            <AnimatePresence mode="wait">

              {/* ════════════════════════════════════════════════════════
                  PRICING — horizontal two columns
              ════════════════════════════════════════════════════════ */}
              {step === 'pricing' && (
                <motion.div key="pricing"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="flex flex-col sm:flex-row w-full max-h-[85vh] sm:max-h-none overflow-y-auto sm:overflow-hidden"
                >
                  {/* LEFT — headline, price, CTA */}
                  <div className="flex flex-col sm:w-[320px] shrink-0 p-6 sm:px-7 sm:py-8 border-b sm:border-b-0 sm:border-r border-gray-100">
                    {/* Plan name + badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                        FreedomPlan Premium
                      </span>
                      <span style={{
                        padding: '3px 9px', borderRadius: 999,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                        color: '#4A7BFF', background: '#EEF2FF', border: '1px solid #C7D2FE',
                      }}>RECOMMENDED</span>
                    </div>

                    {/* Headline */}
                    <h2 style={{
                      fontSize: 22, fontWeight: 900, color: '#111827',
                      margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.03em',
                    }}>
                      Your financial freedom toolkit
                    </h2>

                    {/* Description */}
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6, fontWeight: 400 }}>
                      Unlock advanced tools that adapt to your study-abroad finances the more you use them.
                    </p>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.05em' }}>
                        <span style={{ color: '#98182E' }}>{PRICING_CYCLE[priceIdx].symbol}</span>
                        <span style={{ color: '#00439F' }}>{PRICING_CYCLE[priceIdx].amount}</span>
                      </span>
                      <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>/ one-time</span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, color: '#6B7280',
                      }}>
                        <span style={{
                          textDecoration: 'line-through', color: '#D1D5DB', marginRight: 4,
                        }}>{PRICING_CYCLE[priceIdx].cross}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999,
                          fontSize: 10, fontWeight: 700,
                          color: '#10B981', background: '#ECFDF5', border: '1px solid #A7F3D0',
                        }}>50% OFF</span>
                      </span>
                    </div>
                    <div style={{
                      background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8,
                      padding: '10px 12px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <span style={{ fontSize: 14 }}>🌍</span>
                      <p style={{ fontSize: 11, color: '#0369A1', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
                        <strong style={{ color: '#0C4A6E', fontWeight: 700 }}>Primary INR.</strong> You can also pay with cards for international payments.
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="relative group w-full mt-4">
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                      <button
                        onClick={handleUpgrade}
                        disabled={rzpLoading}
                        className="relative z-10 w-full py-3 px-4 rounded-full font-extrabold uppercase tracking-wide text-[14px] transition-all bg-[#111827] text-white hover:opacity-90 shadow-xl border border-slate-700 text-center flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap active:scale-95"
                        style={{
                          backgroundImage: BLACK_TEXT_URL,
                          backgroundPosition: 'center',
                          backgroundSize: 'auto 150%',
                          cursor: rzpLoading ? 'wait' : 'pointer',
                          opacity: rzpLoading ? 0.72 : 1,
                        }}
                      >
                        {rzpLoading ? (
                          <>
                            <span style={{
                              width: 14, height: 14,
                              border: '2px solid rgba(255,255,255,0.28)', borderTopColor: '#fff',
                              borderRadius: '50%', display: 'inline-block',
                              animation: 'fp-spin 0.65s linear infinite',
                            }} />
                            Opening checkout…
                          </>
                        ) : 'Get Instant Access'}
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rounded-full opacity-90" />
                      </button>
                    </div>

                    {/* Security */}
                    <div style={{
                      marginTop: 'auto', paddingTop: 18,
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 10, color: '#D1D5DB', fontWeight: 500,
                    }}>
                      <Shield size={9} color="#D1D5DB" />
                      256-bit SSL encrypted · Powered by Razorpay
                    </div>
                  </div>

                  {/* RIGHT — feature list */}
                  <div className="flex-1 flex flex-col justify-center p-6 sm:px-6 sm:py-8">
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                      Everything included, and:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {FEATURES.map(({ Icon, label }, i) => (
                        <motion.div key={label}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.035, duration: 0.2 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            height: 42,
                            borderBottom: i < FEATURES.length - 1 ? '1px solid #F9FAFB' : 'none',
                          }}
                        >
                          {/* Icon in light grey circle */}
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '#F3F4F6',
                          }}>
                            <Icon size={14} color="#6B7280" strokeWidth={2} />
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#374151' }}>
                            {label}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════════
                  VERIFYING
              ════════════════════════════════════════════════════════ */}
              {step === 'verifying' && (
                <motion.div key="verifying"
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '72px 40px', textAlign: 'center',
                  }}
                >
                  <div style={{ position: 'relative', marginBottom: 18 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E5E7EB' }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      borderRadius: '50%', border: '3px solid transparent',
                      borderTopColor: '#111827', animation: 'fp-spin 0.65s linear infinite',
                    }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 5px', letterSpacing: '-0.02em' }}>
                    Verifying Payment
                  </h3>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 22px' }}>
                    Please wait while we confirm your transaction…
                  </p>
                  <div style={{ width: 240, height: 3, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                    <motion.div
                      style={{ height: '100%', borderRadius: 999, background: '#111827' }}
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.26 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════════
                  SUCCESS
              ════════════════════════════════════════════════════════ */}
              {step === 'success' && (
                <motion.div key="success"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                  className="flex flex-col sm:flex-row min-h-[380px]"
                >
                  {/* Left — checkmark + status */}
                  <div className="flex flex-col items-center justify-center text-center p-8 sm:w-[280px] shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100">
                    <div style={{ marginBottom: 14 }}><AnimatedCheck /></div>
                    <motion.h3
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
                      style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.03em' }}
                    >Payment Successful!</motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                      style={{ fontSize: 12, color: '#9CA3AF', margin: '6px 0 20px' }}
                    >Unlocking your premium access…</motion.p>
                    <div style={{ width: '100%', height: 3, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 999, background: '#10B981' }}
                        initial={{ width: '95%' }} animate={{ width: '100%' }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      />
                    </div>
                    {revealedCount >= UNLOCK_LIST.length && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.2 }}
                        onClick={handleSuccessClose}
                        style={{
                          marginTop: 20, width: '100%', height: 46, borderRadius: 11,
                          border: 'none', cursor: 'pointer',
                          background: '#111827', color: '#FFFFFF',
                          fontSize: 13, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <Sparkles size={13} /> Enter Premium
                      </motion.button>
                    )}
                  </div>

                  {/* Right — unlock list */}
                  <div className="flex-1 flex flex-col justify-center p-6 sm:px-6 sm:py-8">
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>
                      Features unlocked:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {UNLOCK_LIST.map((item, idx) => {
                        const revealed = idx < revealedCount;
                        return (
                          <motion.div key={item}
                            animate={{ opacity: revealed ? 1 : 0.28, filter: revealed ? 'blur(0)' : 'blur(2px)' }}
                            transition={{ duration: 0.26 }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              height: 38, padding: '0 12px', borderRadius: 9,
                              background: revealed ? '#F0FDF4' : '#F9FAFB',
                              border: `1px solid ${revealed ? '#BBF7D0' : '#E5E7EB'}`,
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: revealed ? '#D1FAE5' : '#E5E7EB',
                            }}>
                              {revealed
                                ? <CheckCircle size={11} color="#10B981" />
                                : <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D1D5DB' }} />
                              }
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: revealed ? '#111827' : '#9CA3AF' }}>
                              {item}
                            </span>
                            {revealed && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                                style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                              >✓ Unlocked</motion.span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════════
                  ERROR
              ════════════════════════════════════════════════════════ */}
              {step === 'error' && (
                <motion.div key="error"
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '60px 40px', textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                  }}>
                    <X size={20} color="#EF4444" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    Payment Failed
                  </h3>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 20px', maxWidth: 280, lineHeight: 1.55 }}>
                    {errorMsg || 'Something went wrong. Please try again or contact support.'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320 }}>
                    <button
                      onClick={() => { setStep('pricing'); setErrorMsg(''); }}
                      style={{
                        flex: 1, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: '#111827', color: '#fff', fontSize: 13, fontWeight: 700,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >Try Again</button>
                    <button
                      onClick={onClose}
                      style={{
                        flex: 1, height: 44, borderRadius: 10,
                        border: '1px solid #E5E7EB', background: '#F9FAFB',
                        cursor: 'pointer', color: '#6B7280', fontSize: 13, fontWeight: 600,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                      onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                    >Close</button>
                  </div>
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
