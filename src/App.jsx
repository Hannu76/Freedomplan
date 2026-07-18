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
import BlurGate from './components/BlurGate'
import { useAutoLogout } from './hooks/useAutoLogout'

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



function AppShell() {
  const { darkMode, setDarkMode, soundEnabled, setSoundEnabled, rate, setRate, isBasicUnlocked, setIsBasicUnlocked, isProUnlocked, setIsProUnlocked, setProLeadData, isLoggedIn } = useStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isEditingRate, setIsEditingRate] = useState(false)
  const [tempRate, setTempRate] = useState(rate)
  const [isProModalOpen, setIsProModalOpen] = useState(false)
  const [pendingProtectedTab, setPendingProtectedTab] = useState(null)
  const [showSessionExpired, setShowSessionExpired] = useState(false)

  useAutoLogout(() => {
    setShowSessionExpired(true)
    setTimeout(() => {
      setShowSessionExpired(false)
      setActiveTab('dashboard')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setIsProModalOpen(true)
    }, 2000)
  })

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
    // Let the BlurGate handle opening the modal via the UI overlay
    setActiveTab('charts')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleProUnlock = (data, tier) => {
    // This is now handled inside ProLeadFormModal which uses StoreContext to update `isLoggedIn`
    
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
                    Basic
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
      <main 
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 pb-20 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndEvent}
      >
        <SlideTransition activeTab={activeTab}>
          {activeTab === 'dashboard' && <Dashboard onViewReport={handleViewReport} onRequirePro={(tab = 'charts') => { setPendingProtectedTab(tab); setIsProModalOpen(true); }} />}
          {activeTab === 'charts' && (
            <BlurGate isLocked={!isLoggedIn} onUnlock={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true); }}>
              <AnalyticsDashboard onRequirePro={() => setIsProModalOpen(true)} />
            </BlurGate>
          )}
          {activeTab === 'accounts' && (
            <BlurGate isLocked={!isProUnlocked} title="Unlock Pro Access" message="Unlock Pro Access to access this premium feature." onUnlock={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true); }}>
              <AccountsManager />
            </BlurGate>
          )}
          {activeTab === 'tracker' && (
            <BlurGate isLocked={!isProUnlocked} title="Unlock Pro Access" message="Unlock Pro Access to access this premium feature." onUnlock={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true); }}>
              <SavingsTracker />
            </BlurGate>
          )}
          {activeTab === 'converter' && (
            <BlurGate isLocked={!isProUnlocked} title="Unlock Pro Access" message="Unlock Pro Access to access this premium feature." onUnlock={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true); }}>
              <CurrencyConverter />
            </BlurGate>
          )}
          {activeTab === 'loan' && (
            <BlurGate isLocked={!isProUnlocked} title="Unlock Pro Access" message="Unlock Pro Access to access this premium feature." onUnlock={() => { setPendingProtectedTab(activeTab); setIsProModalOpen(true); }}>
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
            <p className="text-sm font-semibold text-[#667085] leading-relaxed">For your security, your session has expired due to 4 minutes of inactivity. Please log in again.</p>
          </div>
        </div>
      )}

      {/* Pro Lead Capture & Login Modal */}
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
