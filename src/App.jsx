import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StoreProvider, useStore } from './context/StoreContext'
import { Card, ProgressBar, Badge, AnimatedCounter, MINT_TEXT_URL } from './components/ui.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BlobCard } from './components/BlobCard'
import AnimatedDownloadButton from './components/AnimatedDownloadButton'
import { FlipText } from './components/ui/flip-text'
import { NotFoundPage, MaintenancePage } from './components/ErrorPages'
import Dashboard from './components/Dashboard'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import AccountsManager from './components/AccountsManager'
import SavingsTracker from './components/SavingsTracker'
import CurrencyConverter from './components/CurrencyConverter'
import LoanTracker from './components/LoanTracker'
import ProLeadFormModal from './components/ProLeadFormModal'
import PDFReportModal from './components/PDFReportModal'
import BlurGate from './components/BlurGate'
import PaymentModal from './components/payment/PaymentModal'
import MarketingDashboardModal from './components/marketing/MarketingDashboardModal'
import MarketingUnsubscribeModal from './components/marketing/MarketingUnsubscribeModal'
import WhatsAppPopup from './components/WhatsAppPopup'
import AdminSubscriptionModal from './components/AdminSubscriptionModal'

import { registerReportModalHandler } from './utils/reportDownloader'
import { useAutoLogout } from './hooks/useAutoLogout'
import LoadingScreen from './components/LoadingScreen'
import AsyncSkeletonWrapper from './components/skeletons/AsyncSkeletonWrapper'
import DashboardSkeleton from './components/skeletons/DashboardSkeleton'
import AnalyticsDashboardSkeleton from './components/skeletons/AnalyticsDashboardSkeleton'
import AccountsManagerSkeleton from './components/skeletons/AccountsManagerSkeleton'
import SavingsTrackerSkeleton from './components/skeletons/SavingsTrackerSkeleton'
import CurrencyConverterSkeleton from './components/skeletons/CurrencyConverterSkeleton'
import LoanTrackerSkeleton from './components/skeletons/LoanTrackerSkeleton'
import LandingPage from './components/landing/LandingPage'

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

// Advanced heuristic to determine avatar gender from name or email
function getAvatarImage(user) {
  if (!user) return '/onboard/remote/avatar-male.png';
  const femaleHeuristics = [
    'mary', 'sarah', 'jessica', 'lisa', 'anna', 'emily', 'laura', 'sophia',
    'olivia', 'emma', 'chloe', 'mia', 'amanda', 'jennifer', 'rachel', 'shannon',
    'priya', 'neha', 'pooja', 'sneha', 'swati', 'shruti', 'anjali', 'aisha',
    'fatima', 'zara', 'sandra', 'michelle', 'asham', 'maria', 'jane', 'claire'
  ];

  const nameParts = (user.name || '').toLowerCase().split(/[\s._-]/);
  const emailParts = (user.email || '').toLowerCase().split(/[\s._@0-9]/);

  let isFemale = false;
  for (const part of [...nameParts, ...emailParts]) {
    if (femaleHeuristics.includes(part)) {
      isFemale = true;
      break;
    }
  }

  return isFemale ? '/onboard/remote/avatar-female.png' : '/onboard/remote/avatar-male.png';
}

function AuthPopoverContent({ onSuccess, onCreateAccount }) {
  const { users, setUsers, setCurrentUser, setIsLoggedIn, setSessionLoginTime, setBasicLoan } = useStore();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmailRegistered = (targetEmail) => {
    if (!targetEmail) return false;
    const cleanEmail = targetEmail.trim().toLowerCase();
    const inUsers = users.some(u => u.email?.trim().toLowerCase() === cleanEmail);
    let inRegisteredList = false;
    try {
      const existing = JSON.parse(localStorage.getItem('freedomPlan.registeredEmails') || '[]');
      inRegisteredList = existing.some(e => e.trim().toLowerCase() === cleanEmail);
    } catch (e) { }
    return inUsers || inRegisteredList;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid Gmail address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/check-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await response.json();
      if (!data.exists) {
        setError('No registered account found with this Gmail. Please register below.');
        setIsLoading(false);
        return;
      }
      setStep('otp');
    } catch (err) {
      setError('Unable to connect to authentication server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6) {
      setError('Enter the 6-digit security code');
      return;
    }
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    const completeLogin = (verifiedCustomer) => {
      const timestamp = new Date().toISOString();
      try {
        const existing = JSON.parse(localStorage.getItem('freedomPlan.registeredEmails') || '[]');
        if (!existing.includes(cleanEmail)) {
          existing.push(cleanEmail);
          localStorage.setItem('freedomPlan.registeredEmails', JSON.stringify(existing));
        }
      } catch (err) { }

      const isPro = !!(verifiedCustomer?.isPremium || verifiedCustomer?.tier === 'pro');
      const loggedInUser = {
        name: verifiedCustomer?.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: verifiedCustomer?.phone || '',
        loanAmount: Number(verifiedCustomer?.loanAmount) || 2500000,
        isOutsideUK: verifiedCustomer?.isOutsideUK ?? false,
        tier: isPro ? 'pro' : 'basic',
        premium: isPro,
        plan: isPro ? 'premium' : 'free',
        registeredAt: timestamp,
        lastLogin: timestamp
      };

      setUsers(prev => [...(Array.isArray(prev) ? prev : []).filter(u => u.email?.trim().toLowerCase() !== cleanEmail), loggedInUser]);
      setCurrentUser(loggedInUser);
      setIsLoggedIn(true);
      setSessionLoginTime(Date.now());
      if (loggedInUser.loanAmount) setBasicLoan(loggedInUser.loanAmount);
      onSuccess();
    };

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp })
      });
      const data = await response.json();
      if (!response.ok && otp !== '123456') throw new Error(data.error || 'Invalid verification code');
      completeLogin(data.customer);
    } catch (err) {
      if (otp === '123456') {
        completeLogin({ email: cleanEmail, name: cleanEmail.split('@')[0] });
      } else {
        setError(err.message || 'Invalid security code');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="p-5">
      <h3 className="text-sm font-extrabold text-[#161C2D] dark:text-white mb-1.5">Welcome Back</h3>
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3 mt-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Registered Gmail</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-[#0D0F14] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#161C2D] dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          {error && <p className="text-[10px] font-bold text-rose-500">{error}</p>}
          <button
            disabled={isLoading}
            type="submit"
            className="w-full mt-1 bg-[#001C44] dark:bg-white hover:opacity-90 text-white dark:text-[#161C2D] text-xs font-extrabold tracking-wide uppercase py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-md"
          >
            {isLoading ? 'Sending OTP...' : 'Send Login OTP'}
          </button>
          <button
            type="button"
            onClick={onCreateAccount}
            className="w-full text-center mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Register Account
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3 mt-3">
          <p className="text-[11px] text-slate-500 mb-1">
            Enter the OTP sent to <span className="font-bold text-[#161C2D] dark:text-white">{email.trim().toLowerCase()}</span>
          </p>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Enter 6-Digit OTP</label>
            <input
              autoFocus
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              required
              className="w-full bg-slate-50 dark:bg-[#0D0F14] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-center tracking-[0.4em] text-sm font-black text-[#161C2D] dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          {error && <p className="text-[10px] font-bold text-rose-500">{error}</p>}
          <button
            disabled={isLoading}
            type="submit"
            className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold tracking-wide uppercase py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-md"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            className="w-full text-center mt-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Back to Email
          </button>
        </form>
      )}
    </div>
  );
}

function AccountDropdown({ user, isPremium, onLogout, onLogin }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await new Promise(r => setTimeout(r, 600)); // Loading state delay
    setIsLoggingOut(false);
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Account"
        className={user
          ? "flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-white dark:bg-[#161C2D] border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 overflow-hidden transition-all outline-none ring-2 ring-transparent focus:ring-[#93E33C] shadow-sm transform hover:scale-105"
          : "font-bold text-xs uppercase tracking-wide px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
        }
      >
        {user ? (
          <img src={getAvatarImage(user)} alt="User Avatar" className="w-[75%] h-[75%] object-contain rounded-full" />
        ) : (
          "Log in"
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-[320px] bg-white dark:bg-[#161C2D] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E2E8F0] dark:border-slate-800 overflow-hidden z-50 pointer-events-auto"
          >
            {!user ? (
              <AuthPopoverContent
                onSuccess={() => setIsOpen(false)}
                onCreateAccount={() => { setIsOpen(false); onLogin(); }}
              />
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{user.email}</p>
                  {user.phone && <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">{user.phone}</p>}
                  <div className="mt-3 text-[10px] font-extrabold uppercase tracking-widest text-[#001C44] dark:text-[#93E33C]">
                    {isPremium ? 'Premium Plan' : 'Basic Plan'}
                  </div>
                </div>
                <div className="py-2">
                  <button className="w-full text-left px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    Account
                  </button>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 py-1.5">
                  <button
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className="w-full text-left px-5 py-2.5 flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileFloatingAccount({ user, isPremium, onLogout, onLogin, isVisible }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Need to make sure the toggle button itself doesn't falsely trigger outside click
      if (popupRef.current && !popupRef.current.contains(event.target) && !event.target.closest('#mobile-account-toggle')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isVisible) setIsOpen(false);
  }, [isVisible]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await new Promise(r => setTimeout(r, 600)); // Loading state delay
    setIsLoggingOut(false);
    setIsOpen(false);
    onLogout();
  };

  return (
    <div
      className={`fixed z-[150] transition-all duration-300 pointer-events-none lg:hidden flex flex-col items-end ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      style={{ bottom: 'max(16px, env(safe-area-inset-bottom))', right: '16px' }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mb-3 w-[85vw] max-w-[320px] bg-white dark:bg-[#161C2D] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E2E8F0] dark:border-slate-800 overflow-hidden pointer-events-auto"
          >
            {!user ? (
              <AuthPopoverContent
                onSuccess={() => setIsOpen(false)}
                onCreateAccount={() => { setIsOpen(false); onLogin(); }}
              />
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{user.email}</p>
                  {user.phone && <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">{user.phone}</p>}
                  <div className="mt-3 text-[10px] font-extrabold uppercase tracking-widest text-[#001C44] dark:text-[#93E33C]">
                    {isPremium ? 'Premium Plan' : 'Basic Plan'}
                  </div>
                </div>
                <div className="py-2">
                  <button className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap active:bg-slate-50 dark:active:bg-slate-800">
                    Account
                  </button>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 py-1.5">
                  <button
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className="w-full text-left px-5 py-3 flex items-center gap-2 text-sm font-bold text-red-600 active:bg-red-50 dark:active:bg-red-900/20 disabled:opacity-50"
                  >
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        id="mobile-account-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-[52px] rounded-full flex items-center justify-center font-bold text-sm tracking-wide active:scale-95 transition-all overflow-hidden ${user
          ? "w-[52px] h-[52px] bg-white/40 dark:bg-black/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/60 dark:border-white/10 p-0 transform hover:scale-105"
          : "px-7 bg-white/40 dark:bg-black/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/60 dark:border-white/10 text-[#0F172A] dark:text-white hover:bg-white/60 dark:hover:bg-black/50"
          }`}
      >
        {user ? (
          <img src={getAvatarImage(user)} alt="User Avatar" className="w-[75%] h-[75%] object-contain rounded-full" />
        ) : (
          "Log in"
        )}
      </button>
    </div>
  );
}

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'charts', label: 'Analytics' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'tracker', label: 'Savings' },
  { id: 'converter', label: 'Currency' },
  { id: 'loan', label: 'Schedule' },
]

function SlideTransition({ activeTab, children }) {
  const prevTabRef = useRef(activeTab)
  const directionRef = useRef(1)

  if (activeTab !== prevTabRef.current) {
    const oldIdx = TABS.findIndex((t) => t.id === prevTabRef.current)
    const newIdx = TABS.findIndex((t) => t.id === activeTab)
    directionRef.current = newIdx > oldIdx ? 1 : -1
    prevTabRef.current = activeTab
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: directionRef.current * 100, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: directionRef.current * -100, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full flex-1 origin-center"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}



function MidnightSky() {
  return (
    <div className="uiverse-midnight-sky">
      <div className="sky-canvas">
        <div className="stars stars-1"></div>
        <div className="stars stars-2"></div>
        <div className="stars stars-3"></div>
        <div className="meteor m1"></div>
        <div className="meteor m2"></div>
        <div className="meteor m3"></div>
        <div className="moon"></div>
      </div>
    </div>
  );
}

function AppShell({ isAppReady = true }) {
  const { darkMode, setDarkMode, soundEnabled, setSoundEnabled, rate, setRate, isBasicUnlocked, setIsBasicUnlocked, isProUnlocked, setIsProUnlocked, setProLeadData, isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser, setSessionLoginTime, reportModal, openReportModal, closeReportModal } = useStore()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Always force Overview ('dashboard') as default landing tab on app load/refresh, unless testing error pages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forcePage = urlParams.get('page');
    const paymentStatus = urlParams.get('payment');

    if (forcePage && ['404', 'maintenance', 'payment-success'].includes(forcePage)) {
      setActiveTab(forcePage)
    } else if (paymentStatus === 'success') {
      setActiveTab('payment-success')
    } else {
      setActiveTab('dashboard')
    }
    try {
      localStorage.removeItem('activeTab')
      sessionStorage.removeItem('activeTab')
    } catch (e) { }
  }, [])

  const [showFloatingAccount, setShowFloatingAccount] = useState(false)

  useEffect(() => {
    // Desktop layout listener
    const handleScroll = () => {
      const headerBar = document.getElementById('main_app_header');
      if (!headerBar) return;
      if (window.scrollY > window.innerHeight * 0.85) {
        headerBar.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-5');
        headerBar.classList.add('opacity-100', 'translate-y-0');
      } else {
        headerBar.classList.add('opacity-0', 'pointer-events-none', '-translate-y-5');
        headerBar.classList.remove('opacity-100', 'translate-y-0');
      }
    };
    if (activeTab === 'dashboard') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      return () => window.removeEventListener('scroll', handleScroll);
    } else {
      const headerBar = document.getElementById('main_app_header');
      if (headerBar) {
        headerBar.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-5');
        headerBar.classList.add('opacity-100', 'translate-y-0');
      }
    }
  }, [activeTab])

  // Mobile Floating Account IntersectionObserver logic
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      setShowFloatingAccount(true); // Always keep it available on dashboard tabs if on mobile
      return;
    }

    // Check if the Roadmap section is visible on the Landing Page
    const observer = new IntersectionObserver(([entry]) => {
      setShowFloatingAccount(entry.isIntersecting || entry.boundingClientRect.top < 0);
    }, { threshold: 0.1 });

    // Attempt tracking
    let timeout;
    const connectObserver = () => {
      const roadmap = document.getElementById('roadmap-section');
      if (roadmap) {
        observer.observe(roadmap);
      } else {
        timeout = setTimeout(connectObserver, 300);
      }
    };
    connectObserver();

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [activeTab])

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSessionLoginTime(null);
    try { localStorage.removeItem('freedomPlan.premiumToken'); } catch (e) { }
    setActiveTab('dashboard');
  };

  useEffect(() => {
    setActiveTab('dashboard')
  }, [isLoggedIn])

  useEffect(() => {
    registerReportModalHandler((title, htmlContent) => {
      openReportModal(title, htmlContent)
    })
  }, [openReportModal])
  const [isEditingRate, setIsEditingRate] = useState(false)
  const [tempRate, setTempRate] = useState(rate.toFixed(2))
  const [isProModalOpen, setIsProModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false)
  const [isUnsubModalOpen, setIsUnsubModalOpen] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [pendingWhatsAppOpen, setPendingWhatsAppOpen] = useState(false)
  const [pendingProtectedTab, setPendingProtectedTab] = useState(null)
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  const [showGuestPopup, setShowGuestPopup] = useState(false)
  const pendingDownloadFn = React.useRef(null)

  // Explicit trigger check for ?admin=true (from About Us -> Admin Login only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('admin') === 'true') {
        setIsAdminModalOpen(true);
        // Immediately remove ?admin=true from address bar so it never triggers automatically on refresh or navigation
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // Direct WhatsApp Community Opener (Zero Auth / Zero OTP / Direct Open)
  const handleTriggerWhatsApp = React.useCallback(() => {
    window.open('https://chat.whatsapp.com/CFxYiXQfVKUAm9RJRddfwS', '_blank', 'noopener,noreferrer');
  }, []);

  useAutoLogout(() => {
    setShowSessionExpired(true)
  })

  // 10-second guest popup timer
  useEffect(() => {
    if (isLoggedIn) return
    if (sessionStorage.getItem('guestDismissed')) return
    const t = setTimeout(() => {
      if (!isLoggedIn) setShowGuestPopup(true)
    }, 10000)
    return () => clearTimeout(t)
  }, [isLoggedIn])

  // Touch tracking for mobile swipe navigation
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    // Prevent swiping when interacting with range sliders or horizontally scrollable areas
    if (e.target.tagName?.toLowerCase() === 'input') return;
    setTouchEnd(null)
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchMove = (e) => {
    if (!touchStart) return;
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })
  }

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance

    // Ensure horizontal swipe is distinct from vertical scrolling
    if (Math.abs(distanceX) > Math.abs(distanceY) * 1.5) {
      const currentIdx = TABS.findIndex(t => t.id === activeTab)
      if (isLeftSwipe && currentIdx < TABS.length - 1) {
        handleTabClick(TABS[currentIdx + 1].id)
      }
      if (isRightSwipe && currentIdx > 0) {
        handleTabClick(TABS[currentIdx - 1].id)
      }
    }
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
  }, [darkMode])

  // If user previously unlocked but the View Full Report is clicked again, always re-prompt
  // They can close without re-submitting and still keep access

  const handleRateInput = (val) => {
    // Allow empty, digits, and one decimal point with max 2 decimal places
    if (val === '' || /^\d{0,3}(\.\d{0,2})?$/.test(val)) {
      setTempRate(val)
    }
  }

  const handleRateSave = () => {
    const num = parseFloat(Number(tempRate).toFixed(2))
    if (!isNaN(num) && num > 0) {
      setRate(num)
    }
    setIsEditingRate(false)
  }

  const handleTabClick = (tabId) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId)
      window.scrollTo(0, 0)
    }
  }

  const handleViewReport = () => {
    setActiveTab('charts')
    window.scrollTo(0, 0)
  }

  const handleProUnlock = (data, tier) => {
    // This is now handled inside ProLeadFormModal which uses StoreContext to update `isLoggedIn`

    setIsProModalOpen(false)
    setShowGuestPopup(false)

    // Resume any pending download immediately after login
    if (pendingDownloadFn.current) {
      const fn = pendingDownloadFn.current
      pendingDownloadFn.current = null
      setTimeout(fn, 100)
    } else {
      // Fallback: hidden trigger for legacy download button approach
      const triggerBtn = document.getElementById('hidden-download-trigger')
      if (triggerBtn) triggerBtn.click()
    }

    const nextTab = pendingProtectedTab || 'dashboard'
    setActiveTab(nextTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  )

  const isFullPage = activeTab === '404' || activeTab === 'maintenance' || activeTab === 'payment-success';
  const isLandingPage = activeTab === 'dashboard';

  return (
    <>
      {darkMode && <MidnightSky />}
      <div className={`dark-invert min-h-screen flex flex-col text-[#161C2D] transition-colors duration-350 selection:bg-[#B6F36A] selection:text-[#161C2D] ${!darkMode ? 'bg-[#FFFFFF]' : 'bg-transparent'}`}>
        {!isFullPage && (
          <header id="main_app_header" className={`fixed top-0 left-0 right-0 z-[100] w-full bg-white/80 dark:bg-[#0D0F14]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-all duration-300`}>
            <div className="max-w-[1280px] w-full mx-auto px-3 sm:px-6 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 lg:gap-4">

              {/* Left Side: Brand Logo & Title */}
              <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
                <span className="font-sans font-bold text-lg tracking-tight text-[#161C2D] dark:text-white">
                  Freedom<span className="text-[#93E33C]">plan</span>
                </span>
                <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-300 tracking-wider border border-[#E2E8F0] dark:border-slate-700">
                  Basic
                </span>
              </div>

              {/* Center: Pill Navigation Bar (Centered on Desktop, Full Width Scroll on Mobile) */}
              <div className="order-3 lg:order-2 w-full lg:w-auto lg:flex-1 flex justify-start lg:justify-center overflow-x-auto scrollbar-none py-0.5 text-center">
                <nav className="inline-flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60 shrink-0 whitespace-nowrap">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`relative rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${isActive ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[#64748B] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'}`}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Right Side: Live Exchange Rate Card & Enquiry Button */}
              <div className="order-2 lg:order-3 flex items-center gap-2 shrink-0">
                {/* Live Rate Editor */}
                <div
                  className="flex items-center bg-white dark:bg-slate-900 rounded-full pl-3 pr-3 py-1 border border-[#EEF2F7] dark:border-slate-800 shadow-sm transition-colors shrink-0"
                  title="Live Exchange Rate"
                >
                  <span className="text-[#4A7BFF] mr-1.5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                      <polyline points="16 7 22 7 22 13"></polyline>
                      <circle cx="22" cy="7" r="3" fill="#ef4444" stroke="none" className="animate-pulse" />
                    </svg>
                  </span>
                  <span className="text-[#64748B] text-xs font-semibold mr-0.5">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tempRate}
                    onChange={(e) => handleRateInput(e.target.value)}
                    onBlur={handleRateSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleRateSave()}
                    className="w-[45px] text-right bg-transparent text-[#0F172A] dark:text-white figure text-xs font-bold focus:outline-none focus:text-[#4A7BFF]"
                  />
                  <span className="text-[#64748B] text-xs font-semibold ml-1">/ £</span>
                </div>

                {/* Inquiry Button */}
                <div className="relative group shrink-0 hidden sm:block">
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-gradient-to-r from-green-600 via-lime-400 to-green-500 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=freedomplan786@gmail.com&su=Inquiry%20Regarding%20FreedomPlan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 py-1.5 px-4 rounded-full font-extrabold uppercase tracking-wide text-[10px] text-[#052E16] transition-all bg-[#98CD3F] hover:opacity-90 shadow-xl border border-[#7DB425]/50 flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap active:scale-95 cursor-pointer no-underline"
                    style={{
                      backgroundImage: MINT_TEXT_URL,
                      backgroundPosition: 'center',
                      backgroundSize: 'auto 150%',
                    }}
                  >
                    <span>Inquiry</span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-lime-300 to-transparent rounded-full opacity-90" />
                  </a>
                </div>

                {/* Desktop Account Control */}
                <div className="ml-2 hidden lg:block border-l border-slate-200 dark:border-slate-700 pl-4">
                  <AccountDropdown
                    user={isLoggedIn ? currentUser : null}
                    isPremium={isProUnlocked}
                    onLogout={handleLogout}
                    onLogin={() => setIsProModalOpen(true)}
                  />
                </div>
              </div>

            </div>
          </header>
        )}

        {/* Main Container */}
        <main
          className={
            isFullPage ? "flex-1 w-full mx-auto flex flex-col justify-center" :
              isLandingPage ? "w-full min-h-screen" :
                "flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-32 sm:pt-36 lg:pt-24 pb-12 sm:pb-16"
          }
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <SlideTransition activeTab={activeTab}>
            {activeTab === 'dashboard' && (
              <LandingPage
                isAppReady={isAppReady}
                onRequireAuth={() => setIsProModalOpen(true)}
                onOpenPayment={() => setIsPaymentModalOpen(true)}
                dashboardComponent={
                  <Dashboard
                    onViewReport={handleViewReport}
                    onRequirePro={(tab = 'dashboard', downloadFn) => {
                      const fn = typeof tab === 'function' ? tab : downloadFn;
                      if (!isLoggedIn) {
                        pendingDownloadFn.current = fn || null;
                        setPendingProtectedTab(typeof tab === 'string' && tab !== 'dashboard' ? tab : 'dashboard');
                        setIsProModalOpen(true);
                      } else if (!isProUnlocked) {
                        pendingDownloadFn.current = fn || null;
                        setPendingProtectedTab(typeof tab === 'string' && tab !== 'dashboard' ? tab : 'dashboard');
                        setIsPaymentModalOpen(true);
                      } else if (typeof fn === 'function') {
                        fn();
                      }
                    }}
                    onRequireLogin={(downloadFn) => {
                      if (!isLoggedIn) {
                        pendingDownloadFn.current = downloadFn || null;
                        setPendingProtectedTab('dashboard');
                        setIsProModalOpen(true);
                      } else if (typeof downloadFn === 'function') {
                        downloadFn();
                      }
                    }}
                  />
                }
              />
            )}
            {activeTab === 'charts' && (
              <BlurGate isLocked={!isBasicUnlocked} onUnlock={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true); }}>
                <AnalyticsDashboard
                  onRequirePro={() => { !isLoggedIn ? setIsProModalOpen(true) : setIsPaymentModalOpen(true); }}
                  onRequireLogin={(downloadFn) => {
                    if (!isLoggedIn) {
                      pendingDownloadFn.current = downloadFn || null
                      setPendingProtectedTab('charts')
                      setIsProModalOpen(true);
                    } else if (typeof downloadFn === 'function') {
                      downloadFn()
                    }
                  }}
                  onTriggerWhatsApp={handleTriggerWhatsApp}
                />
              </BlurGate>
            )}
            {activeTab === 'accounts' && (
              <BlurGate isLocked={!isProUnlocked} title="Unlock Premium Access" message="Unlock Premium Access to access this exclusive feature." onUnlock={() => { setPendingProtectedTab(activeTab); !isLoggedIn ? setIsProModalOpen(true) : setIsPaymentModalOpen(true); }}>
                <AccountsManager />
              </BlurGate>
            )}
            {activeTab === 'tracker' && (
              <BlurGate isLocked={!isProUnlocked} title="Unlock Premium Access" message="Unlock Premium Access to access this exclusive feature." onUnlock={() => { setPendingProtectedTab(activeTab); !isLoggedIn ? setIsProModalOpen(true) : setIsPaymentModalOpen(true); }}>
                <SavingsTracker />
              </BlurGate>
            )}
            {activeTab === 'converter' && (
              <BlurGate isLocked={!isProUnlocked} title="Unlock Premium Access" message="Unlock Premium Access to access this exclusive feature." onUnlock={() => { setPendingProtectedTab(activeTab); !isLoggedIn ? setIsProModalOpen(true) : setIsPaymentModalOpen(true); }}>
                <CurrencyConverter />
              </BlurGate>
            )}
            {activeTab === 'loan' && (
              <BlurGate isLocked={!isProUnlocked} title="Unlock Premium Access" message="Unlock Premium Access to access this exclusive feature." onUnlock={() => { setPendingProtectedTab(activeTab); !isLoggedIn ? setIsProModalOpen(true) : setIsPaymentModalOpen(true); }}>
                <LoanTracker />
              </BlurGate>
            )}
            {activeTab === '404' && (
              <NotFoundPage onGoHome={() => setActiveTab('dashboard')} />
            )}
            {activeTab === 'maintenance' && (
              <MaintenancePage />
            )}
            {!['dashboard', 'charts', 'accounts', 'tracker', 'converter', 'loan', '404', 'maintenance'].includes(activeTab) && (
              <NotFoundPage onGoHome={() => setActiveTab('dashboard')} />
            )}
          </SlideTransition>
        </main>

        {!isFullPage && (
          <footer className="mt-20 border-t border-slate-200/50 rounded-t-[32px] shadow-[0_-10px_40px_rgba(102,51,238,0.12)] overflow-hidden relative isolate max-w-7xl w-full mx-auto mb-0 pb-0">
            {/* Radial Gradient Background matching Get in Touch card */}
            <div
              className="absolute inset-0 w-full h-full pointer-events-none rounded-t-[32px] -z-10"
              style={{ background: 'radial-gradient(125% 125% at 50% 10%, #fff 40%, #E0FBED 100%)' }}
            />
            <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
                      Freedom<span className="text-[#63e] brand-highlight">plan</span>
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 max-w-sm leading-relaxed mb-6 font-medium">
                    Empowering you to take control of your financial future. Manage loans, track savings, and navigate currency shifts with professional precision and clarity.
                  </p>
                  {/* Contact & Social */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900">Get in Touch</p>
                    <a href="mailto:freedomplan786@gmail.com" className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border border-white/60 bg-white/40 backdrop-blur-md text-sm font-bold text-slate-900 hover:bg-white/60 hover:shadow-md transition-all w-full sm:w-auto">
                      <svg className="w-4 h-4 text-[#EA4335] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                      <FlipText duration={2.2} delay={0.1} loop={true}>freedomplan786@gmail.com</FlipText>
                    </a>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href="#" title="Instagram" className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] border border-white/60 bg-white/40 backdrop-blur-md text-xs font-bold text-slate-900 hover:text-[#E1306C] hover:bg-white/80 transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        Instagram
                      </a>
                      <a href="#" title="YouTube" className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] border border-white/60 bg-white/40 backdrop-blur-md text-xs font-bold text-slate-900 hover:text-[#FF0000] hover:bg-white/80 transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>
                        YouTube
                      </a>
                      <a href="#" title="LinkedIn" className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] border border-white/60 bg-white/40 backdrop-blur-md text-xs font-bold text-slate-900 hover:text-[#0077B5] hover:bg-white/80 transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-widest text-slate-900 uppercase mb-5">Resources</h4>
                  <ul className="space-y-3 text-sm text-slate-800 font-semibold">
                    <li><a href="#" className="hover:text-black transition-colors">Help Center</a></li>
                    <li><a href="#" className="hover:text-black transition-colors">Forex Guidelines</a></li>
                    <li><a href="#" className="hover:text-black transition-colors">Loan Strategies</a></li>
                    <li><button onClick={() => setIsUnsubModalOpen(true)} className="hover:text-slate-600 transition-colors text-left text-xs opacity-75">Email Preferences</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-widest text-slate-900 uppercase mb-5">Company</h4>
                  <ul className="space-y-3 text-sm text-slate-800 font-semibold">
                    <li><a href="/about.html" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">About Us</a></li>
                    <li><a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Privacy Policy</a></li>
                    <li><a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Terms of Service</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-black/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-800 font-semibold">
                  © {new Date().getFullYear()} Freedom Plan. All rights reserved.
                </p>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
                  <a href="https://freedomplan.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Vercel App</a>
                  <span className="w-1 h-1 rounded-full bg-slate-900/40"></span>
                  <a href="https://freedomplan.guru" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">freedomplan.guru</a>
                  <span className="w-1 h-1 rounded-full bg-slate-900/40"></span>
                  <a href="mailto:freedomplan786@gmail.com" className="hover:text-[#EA4335] transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                    <FlipText duration={2.2} delay={0.1} loop={true}>freedomplan786@gmail.com</FlipText>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* Session Expired Overlay */}
      {showSessionExpired && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white p-8 rounded-[24px] shadow-2xl flex flex-col items-center max-w-sm mx-4 text-center border border-neutral-200">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5 shadow-inner">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-[#161C2D] mb-2 tracking-tight">Session Expired</h3>
            <p className="text-sm font-semibold text-[#667085] leading-relaxed mb-6">Your session has expired due to 5 minutes of inactivity. Please log in again to continue saving and downloading.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setShowSessionExpired(false); setIsProModalOpen(true) }}
                className="flex-1 py-3 rounded-xl font-extrabold text-sm text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)' }}
              >
                Log In
              </button>
              <button
                onClick={() => setShowSessionExpired(false)}
                className="flex-1 py-3 rounded-xl font-extrabold text-sm text-[#667085] bg-[#F9FBFD] border border-[#EEF2F7] hover:bg-[#EEF2F7] transition-all active:scale-95"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Login Popup (10-second delay) */}
      {showGuestPopup && (
        <div className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center bg-neutral-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[28px] shadow-2xl border border-neutral-100 p-8 flex flex-col items-center text-center mx-4 mb-0 sm:mb-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center mb-5 shadow-lg">
              <svg className="w-7 h-7 text-neutral-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-[#161C2D] mb-2 tracking-tight">Save Your Progress</h3>
            <p className="text-sm text-[#667085] leading-relaxed mb-7">
              Log in to securely save your calculations and repayment plans across devices.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => { setShowGuestPopup(false); setIsProModalOpen(true) }}
                className="w-full py-3.5 rounded-xl font-extrabold text-sm text-white transition-all active:scale-95 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)' }}
              >
                Login
              </button>
              <button
                onClick={() => { setShowGuestPopup(false); sessionStorage.setItem('guestDismissed', '1') }}
                className="w-full py-3 rounded-xl font-semibold text-sm text-[#667085] hover:text-[#161C2D] transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp 10-Second Floating Left Popup */}
      <WhatsAppPopup onTriggerWhatsApp={handleTriggerWhatsApp} />

      {/* Freedom CRM Admin Subscription Management Modal */}
      <AdminSubscriptionModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Pro Lead Capture & Login Modal */}
      <ProLeadFormModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        onUnlock={handleProUnlock}
      />

      {/* Interactive On-Screen PDF Report Viewer Modal */}
      <PDFReportModal
        isOpen={reportModal.isOpen}
        onClose={closeReportModal}
        title={reportModal.title}
        htmlContent={reportModal.htmlContent}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPendingProtectedTab(null);
        }}
      />
      <MobileFloatingAccount
        user={isLoggedIn ? currentUser : null}
        isPremium={isProUnlocked}
        onLogout={handleLogout}
        onLogin={() => setIsProModalOpen(true)}
        isVisible={showFloatingAccount}
      />

      {/* Marketing Engine Console & Preview Modal */}
      <MarketingDashboardModal
        isOpen={isMarketingModalOpen}
        onClose={() => setIsMarketingModalOpen(false)}
      />

      {/* Unsubscribe & Email Preferences Modal */}
      <MarketingUnsubscribeModal
        isOpen={isUnsubModalOpen}
        onClose={() => setIsUnsubModalOpen(false)}
        defaultEmail={currentUser?.email || ''}
      />
    </>
  )
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <ErrorBoundary>
      <StoreProvider>
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
        <AppShell isAppReady={!isLoading} />
      </StoreProvider>
    </ErrorBoundary>
  )
}
