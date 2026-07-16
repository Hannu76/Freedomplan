import React, { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './context/StoreContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Dashboard from './components/Dashboard'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import AccountsManager from './components/AccountsManager'
import SavingsTracker from './components/SavingsTracker'
import CurrencyConverter from './components/CurrencyConverter'
import LoanTracker from './components/LoanTracker'
import ProLeadFormModal from './components/ProLeadFormModal'

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'charts', label: 'Analytics' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'tracker', label: 'Savings' },
  { id: 'converter', label: 'Currency' },
  { id: 'loan', label: 'Schedule' },
]

function SlideTransition({ activeTab, children }) {
  const [prevTab, setPrevTab] = useState(activeTab);
  const [prevChildren, setPrevChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1);

  useEffect(() => {
    if (activeTab !== prevTab) {
      const oldIdx = TABS.findIndex(t => t.id === prevTab);
      const newIdx = TABS.findIndex(t => t.id === activeTab);
      setSlideDirection(newIdx > oldIdx ? 1 : -1);
      
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevTab(activeTab);
        setPrevChildren(children);
      }, 350);
      
      return () => clearTimeout(timer);
    } else {
      setPrevChildren(children);
    }
  }, [activeTab, children, prevTab]);

  return (
    <div className="grid w-full overflow-hidden items-start">
      {isAnimating && (
        <div 
          className="col-start-1 row-start-1 w-full"
          style={{ animation: `slideOut${slideDirection === 1 ? 'Left' : 'Right'} 0.35s cubic-bezier(0.4, 0.0, 0.2, 1) forwards` }}
        >
          {prevChildren}
        </div>
      )}
      <div 
        className="col-start-1 row-start-1 w-full"
        style={{
          animation: isAnimating ? `slideIn${slideDirection === 1 ? 'Right' : 'Left'} 0.35s cubic-bezier(0.4, 0.0, 0.2, 1) forwards` : 'none',
          opacity: isAnimating ? 0 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// BlurGate: renders content blurred with unlock overlay until form is submitted
function BlurGate({ children, level = 'premium', activeTab, setPendingProtectedTab, setIsProModalOpen }) {
  const { isBasicUnlocked, isProUnlocked } = useStore()
  const isUnlocked = level === 'basic' ? (isBasicUnlocked || isProUnlocked) : isProUnlocked;

  if (isUnlocked) {
    return children;
  }
  return (
    <div className="relative">
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(7px)', userSelect: 'none' }}>
        {children}
      </div>
      {/* Frosted unlock overlay - Positioned near the top so it's instantly visible without scrolling */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-24 sm:pt-32 px-4">
        <div className="bg-white/80 backdrop-blur-md border border-[#EEF2F7] rounded-[28px] shadow-2xl px-8 py-10 flex flex-col items-center gap-5 max-w-sm w-full text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
            style={level === 'premium' ? { background: 'linear-gradient(to right,#bf953f,#fcf6ba,#b38728,#fbf5b7,#aa771c)' } : { background: '#F9FBFD', border: '1px solid #EEF2F7' }}
          >
            {level === 'premium' ? (
              <svg viewBox="0 0 576 512" style={{ height: '1.6em', width: 'auto' }} aria-hidden="true">
                <path fill="rgb(121,103,3)" d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z"/>
              </svg>
            ) : (
              <span className="text-2xl">🔒</span>
            )}
          </div>
          <div>
            <p className="font-extrabold text-[#161C2D] text-lg tracking-tight">{level === 'premium' ? 'Freedom Plan Pro' : 'Unlock Analytics'}</p>
            <p className="text-sm text-[#667085] mt-1 leading-relaxed">
              {level === 'premium' ? 'Fill in the subscription form to unlock the full paydown curve, currency, and savings strategy.' : 'Fill the basic form to view your detailed analytics and account overview.'}
            </p>
          </div>
          <button
            onClick={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true) }}
            className="w-full py-3 rounded-xl text-sm font-extrabold tracking-widest uppercase text-white transition-all duration-200 active:scale-95"
            style={level === 'premium' ? {
              background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)',
              boxShadow: '0px 2px 4px rgba(0,13,56,0.28), inset 0px 4px 5px #0070f0, inset 0px -4px 5px #002cbb',
            } : {
              background: '#161C2D',
            }}
          >
            Fill Form to Unlock
          </button>
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const { darkMode, setDarkMode, soundEnabled, setSoundEnabled, rate, setRate, isBasicUnlocked, setIsBasicUnlocked, isProUnlocked, setIsProUnlocked, setProLeadData } = useStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isEditingRate, setIsEditingRate] = useState(false)
  const [tempRate, setTempRate] = useState(rate)
  const [isProModalOpen, setIsProModalOpen] = useState(false)
  const [pendingProtectedTab, setPendingProtectedTab] = useState(null)

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

  const handleRateSave = () => {
    const num = Number(tempRate)
    if (!isNaN(num) && num > 0) {
      setRate(num)
    }
    setIsEditingRate(false)
  }

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewReport = () => {
    // Always open the modal when not unlocked regardless of localStorage state
    if (!isBasicUnlocked && !isProUnlocked) {
      setPendingProtectedTab('charts')
      setIsProModalOpen(true)
    } else {
      setActiveTab('charts')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleProUnlock = (data, tier) => {
    setProLeadData(data)
    if (tier === 'premium') {
      setIsProUnlocked(true)
      setIsBasicUnlocked(true)
    } else {
      setIsBasicUnlocked(true)
    }
    
    // Synchronously trigger any pending downloads to satisfy strict browser gesture requirements
    const triggerBtn = document.getElementById('hidden-download-trigger')
    if (triggerBtn) {
      triggerBtn.click()
    }

    setIsProModalOpen(false)
    const nextTab = pendingProtectedTab || 'charts'
    setActiveTab(nextTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="dark-invert min-h-screen flex flex-col bg-[#F6F8FC] text-[#161C2D] transition-colors duration-350 selection:bg-[#B6F36A] selection:text-[#161C2D]">
        <header className="sticky top-4 z-40 max-w-7xl w-full mx-auto px-4 sm:px-6 mb-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-3.5 sm:p-4 rounded-[18px] bg-white/85 backdrop-blur-md border border-[#EEF2F7] shadow-clean transition-all">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center justify-between w-full lg:w-auto px-2">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              {/* AMS Logo removed as per user request */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-lg tracking-tight text-[#161C2D]">
                    Freedom<span className="text-[#93E33C] brand-highlight">plan</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F9FBFD] text-[#667085] border border-[#EEF2F7]">
                    {isProUnlocked ? 'PRO UNLOCKED' : 'PRO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile quick actions when collapsed */}
            <div className="flex lg:hidden items-center gap-2">
              {isEditingRate ? (
                <div className="flex items-center bg-[#161C2D] rounded-full px-2 py-1 border border-[#161C2D]">
                  <span className="text-white text-xs font-bold mr-1">₹</span>
                  <input
                    type="number"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    onBlur={handleRateSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleRateSave()}
                    autoFocus
                    className="w-14 bg-transparent text-white text-xs font-bold focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTempRate(rate)
                    setIsEditingRate(true)
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#161C2D] border border-[#161C2D] text-xs font-bold text-white shadow-sm"
                  title="Click to change exchange rate inline"
                >
                  ₹{rate}/£
                </button>
              )}
            </div>
          </div>

          {/* Centered Frosted Pill Navigation Bar — iOS Sliding Segmented Tabs (Uiverse by lawson_5090) */}
          <div className="w-full lg:w-auto overflow-x-auto no-scrollbar py-1">
            <nav
              aria-label="Main Navigation"
              className="cc-ios-tabs__control min-w-[560px] sm:min-w-[620px] w-full"
            >
              <div
                className="cc-ios-tabs__thumb"
                style={{
                  transform: `translateX(${Math.max(0, TABS.findIndex((t) => t.id === activeTab)) * 100}%)`,
                }}
              />
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`cc-ios-tabs__item shrink-0 px-2 sm:px-3 ${isActive ? 'active text-white' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-3 px-1">
            {/* Desktop Rate Editor - 3D Styled */}
            <div 
              className="flex items-center bg-white rounded-[14px] px-4 py-2.5 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] border-b-4 border-r-4 border-[#EEF2F7] transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:translate-y-0 active:border-b-2 active:border-r-2"
              title="Live Exchange Rate"
            >
              <span className="text-[#667085] text-sm font-bold mr-2 flex items-center gap-1.5">
                 <div className="relative">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4A7BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                   <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                   </span>
                 </div>
                 ₹
              </span>
              <input
                type="number"
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                onBlur={handleRateSave}
                onKeyDown={(e) => e.key === 'Enter' && handleRateSave()}
                className="w-16 bg-transparent text-[#161C2D] figure text-sm font-extrabold focus:outline-none focus:text-[#4A7BFF] transition-colors"
              />
              <span className="text-[#667085] text-sm font-bold ml-1">/ £</span>
            </div>

            {/* Enquiry Button */}
            <button
              onClick={() => setIsProModalOpen(true)}
              className="px-5 py-2 rounded-[14px] transition-all text-xs font-extrabold text-white tracking-wider uppercase active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #2b2b2b 0%, #0D0F14 100%)',
                boxShadow: '0px 2px 4px rgba(0,0,0,0.4), inset 0px 4px 5px rgba(255,255,255,0.15), inset 0px -4px 5px rgba(0,0,0,0.5)',
                border: '1px solid #000'
              }}
            >
              ENQUIRY
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 pb-20">
        <SlideTransition activeTab={activeTab}>
          {activeTab === 'dashboard' && <Dashboard onViewReport={handleViewReport} onRequirePro={(tab = 'charts') => { setPendingProtectedTab(tab); setIsProModalOpen(true); }} />}
          {activeTab === 'charts' && (
            <BlurGate level="basic" activeTab={activeTab} setPendingProtectedTab={setPendingProtectedTab} setIsProModalOpen={setIsProModalOpen}>
              <AnalyticsDashboard onRequirePro={() => { setPendingProtectedTab('charts'); setIsProModalOpen(true); }} />
            </BlurGate>
          )}
          {activeTab === 'accounts' && (
            <BlurGate level="premium" activeTab={activeTab} setPendingProtectedTab={setPendingProtectedTab} setIsProModalOpen={setIsProModalOpen}>
              <AccountsManager />
            </BlurGate>
          )}
          {activeTab === 'tracker' && (
            <BlurGate level="premium" activeTab={activeTab} setPendingProtectedTab={setPendingProtectedTab} setIsProModalOpen={setIsProModalOpen}>
              <SavingsTracker />
            </BlurGate>
          )}
          {activeTab === 'converter' && (
            <BlurGate level="premium" activeTab={activeTab} setPendingProtectedTab={setPendingProtectedTab} setIsProModalOpen={setIsProModalOpen}>
              <CurrencyConverter />
            </BlurGate>
          )}
          {activeTab === 'loan' && (
            <BlurGate level="premium" activeTab={activeTab} setPendingProtectedTab={setPendingProtectedTab} setIsProModalOpen={setIsProModalOpen}>
              <LoanTracker />
            </BlurGate>
          )}
        </SlideTransition>

        {/* Professional Footer */}
        <footer className="mt-20 border-t border-[#EEF2F7] dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-display font-extrabold text-2xl tracking-tight text-[#161C2D] dark:text-white">
                    Freedom<span className="text-[#93E33C] brand-highlight">plan</span>
                  </span>
                </div>
                <p className="text-sm text-[#667085] dark:text-neutral-400 max-w-sm leading-relaxed mb-6">
                  Empowering you to take control of your financial future. Manage loans, track savings, and navigate currency shifts with professional precision and clarity.
                </p>
              </div>
              <div>
                <h4 className="text-xs font-extrabold tracking-widest text-[#161C2D] dark:text-neutral-200 uppercase mb-5">Resources</h4>
                <ul className="space-y-3 text-sm text-[#667085] dark:text-neutral-400">
                  <li><a href="#" className="hover:text-[#4A7BFF] transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-[#4A7BFF] transition-colors">Forex Guidelines</a></li>
                  <li><a href="#" className="hover:text-[#4A7BFF] transition-colors">Loan Strategies</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-extrabold tracking-widest text-[#161C2D] dark:text-neutral-200 uppercase mb-5">Company</h4>
                <ul className="space-y-3 text-sm text-[#667085] dark:text-neutral-400">
                  <li><a href="#" className="hover:text-[#4A7BFF] transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-[#4A7BFF] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-[#4A7BFF] transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-[#EEF2F7] dark:border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#667085] dark:text-neutral-500 font-medium">
                © {new Date().getFullYear()} Freedom Plan. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-[#667085] dark:text-neutral-500">
                <a href="#" className="hover:text-[#161C2D] dark:hover:text-white transition-colors">Security</a>
                <span className="w-1 h-1 rounded-full bg-[#D0D5DD] dark:bg-neutral-700"></span>
                <a href="#" className="hover:text-[#161C2D] dark:hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>

    {/* Pro Lead Capture Modal */}
      <ProLeadFormModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        onUnlock={handleProUnlock}
      />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  )
}
