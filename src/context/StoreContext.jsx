import React, { createContext, useContext, useMemo } from 'react'
import { useLocalStorage } from '../utils/useLocalStorage'
import { buildMonthTimeline } from '../utils/dates'
import { PLAN, CURRENCY, LOAN } from '../config'

const StoreContext = createContext(null)

const TOTAL_MONTHS = PLAN.planYears * 12

const DEFAULT_ACCOUNTS = [
  {
    id: 'india-loan-lump',
    name: 'India Loan Pre-payment (Primary)',
    type: 'EMI',
    targetAmount: 700000,
    currency: 'INR',
    frequency: 'Yearly',
    status: 'Active',
    notes: 'Yearly lump sum every December toward primary loan principal',
  },
  {
    id: 'india-loan-emi',
    name: 'India Monthly Loan EMI',
    type: 'EMI',
    targetAmount: 5000,
    currency: 'INR',
    frequency: 'Monthly',
    status: 'Active',
    notes: 'Regular monthly deduction from NRO/savings account',
  },
  {
    id: 'uk-emergency-buffer',
    name: 'UK Emergency Fund Buffer',
    type: 'Asset',
    targetAmount: 3000,
    currency: 'GBP',
    frequency: 'Target',
    status: 'Active',
    notes: 'High-yield instant access GBP safety net',
  },
  {
    id: 'india-mutual-sip',
    name: 'India Equity Index SIP',
    type: 'Asset',
    targetAmount: 15000,
    currency: 'INR',
    frequency: 'Monthly',
    status: 'Active',
    notes: 'Long-term wealth accumulation post-debt payoff',
  },
]

export function StoreProvider({ children }) {
  // Authentication & Users System (Global, not prefixed)
  const [isLoggedIn, setIsLoggedIn] = useLocalStorage('freedomPlan.isLoggedIn', false)
  const [currentUser, setCurrentUser] = useLocalStorage('freedomPlan.currentUser', null)
  const [users, setUsers] = useLocalStorage('freedomPlan.users', [])
  // Session login timestamp — set on login, cleared on logout. Used for 5-min session rule.
  const [sessionLoginTime, setSessionLoginTime] = React.useState(() => {
    return isLoggedIn ? Date.now() : null
  })

  const touchSession = React.useCallback(() => {
    setSessionLoginTime(Date.now())
  }, [])

  React.useEffect(() => {
    if (isLoggedIn && !sessionLoginTime) {
      setSessionLoginTime(Date.now())
    } else if (!isLoggedIn) {
      setSessionLoginTime(null)
    }
  }, [isLoggedIn, sessionLoginTime])

  // Helper: check if we have an active session (logged in within last 5 minutes)
  const isSessionActive = React.useMemo(() => {
    if (!isLoggedIn || !sessionLoginTime) return false
    return (Date.now() - sessionLoginTime) < 5 * 60 * 1000
  }, [isLoggedIn, sessionLoginTime])
  
  // The active prefix isolates all user data. Defaults to 'guest' if not logged in.
  const profilePrefix = isLoggedIn && currentUser?.email ? `freedomPlan.${currentUser.email.toLowerCase().trim()}` : 'freedomPlan.guest'

  // Aliases for backwards compatibility with BlurGate and other components
  const isProUnlocked = currentUser?.tier === 'pro'
  const isBasicUnlocked = isLoggedIn
  const proLeadData = currentUser
  const setIsProUnlocked = setIsLoggedIn
  const setIsBasicUnlocked = setIsLoggedIn
  const setProLeadData = setCurrentUser

  const [darkMode, setDarkMode] = useLocalStorage('freedomPlan.darkMode', false)
  const [soundEnabled, setSoundEnabled] = useLocalStorage('freedomPlan.soundEnabled', true)

  // GBP -> INR rate, user-editable
  const [rawRate, setRate] = useLocalStorage(`${profilePrefix}.rate`, CURRENCY.defaultRate)
  const rate = Number(rawRate) && Number(rawRate) > 0 ? parseFloat(Number(rawRate).toFixed(2)) : CURRENCY.defaultRate

  // New state for all rates
  const [allRates, setAllRates] = useLocalStorage(`${profilePrefix}.allRates`, {})

  React.useEffect(() => {
    fetch('https://v6.exchangerate-api.com/v6/7515f12b392977fc6c68a97a/latest/GBP')
      .then(res => res.json())
      .then(data => {
        if (data && data.conversion_rates && data.conversion_rates.INR) {
          setRate(parseFloat(data.conversion_rates.INR.toFixed(2)));
          setAllRates(data.conversion_rates);
        }
      })
      .catch(err => console.error('Failed to fetch exchange rate', err));
  }, []);

  // Compute effective rates scaling based on the user-edited rate vs API baseline
  const effectiveRates = useMemo(() => {
    if (!allRates || !allRates.INR) return allRates || {};
    const multiplier = rate / allRates.INR;
    const scaled = {};
    for (const [code, val] of Object.entries(allRates)) {
      scaled[code] = val * multiplier;
    }
    return scaled;
  }, [allRates, rate]);

  // Initial Loan Principal (Single Source of Truth) — System Default: ₹25,00,000 for new users
  const [rawBasicLoan, setRawBasicLoan] = useLocalStorage(`${profilePrefix}.basicLoan`, null)
  const basicLoan = useMemo(() => {
    if (Number(rawBasicLoan) > 0) return Number(rawBasicLoan)
    if (currentUser?.loanAmount && Number(currentUser.loanAmount) > 0) return Number(currentUser.loanAmount)
    return 2500000
  }, [rawBasicLoan, currentUser])

  const setBasicLoan = (val) => {
    const num = Number(val)
    if (num > 0) {
      setRawBasicLoan(num)
      if (currentUser?.email) {
        setCurrentUser(prev => prev ? { ...prev, loanAmount: num } : prev)
      }
    }
  }

  // Interest Rate — System Default: 11.5% p.a. for new users
  const [interestRate, setInterestRate] = useLocalStorage(`${profilePrefix}.interestRate`, 11.5)
  const [moratoriumMonths, setMoratoriumMonths] = useLocalStorage(`${profilePrefix}.moratoriumMonths`, 36)
  const [coApplicantContribution, setCoApplicantContribution] = useLocalStorage(`${profilePrefix}.coApplicantContribution`, 5000)
  const [hasCoApplicant, setHasCoApplicant] = useLocalStorage(`${profilePrefix}.hasCoApplicant`, true)
  const [isAnalyticsLocked, setIsAnalyticsLocked] = useLocalStorage(`${profilePrefix}.isAnalyticsLocked`, false)

  // Per-month savings entries, keyed by "YYYY-MM":
  const [rawEntries, setEntries] = useLocalStorage(`${profilePrefix}.entries`, {})
  const entries = (rawEntries && typeof rawEntries === 'object' && !Array.isArray(rawEntries)) ? rawEntries : {}

  // Free-form notes (transfer fees, exchange rate used, etc.)
  const [generalNotes, setGeneralNotes] = useLocalStorage(`${profilePrefix}.generalNotes`, '')

  // Multi-Account AMS management
  const [rawAccounts, setAccounts] = useLocalStorage(`${profilePrefix}.accounts`, DEFAULT_ACCOUNTS)
  const accounts = Array.isArray(rawAccounts) ? rawAccounts : DEFAULT_ACCOUNTS

  // Amortization Simulator Sandbox state
  const [rawSimulator, setSimulator] = useLocalStorage(`${profilePrefix}.simulator`, {
    extraMonthlyPrepaymentGBP: 0,
    extraYearlyLumpSumINR: 0,
    simulatedRate: CURRENCY.defaultRate,
  })
  const simulator = (rawSimulator && typeof rawSimulator === 'object' && !Array.isArray(rawSimulator)) ? {
    extraMonthlyPrepaymentGBP: Number(rawSimulator.extraMonthlyPrepaymentGBP) || 0,
    extraYearlyLumpSumINR: Number(rawSimulator.extraYearlyLumpSumINR) || 0,
    simulatedRate: Number(rawSimulator.simulatedRate) || CURRENCY.defaultRate,
  } : {
    extraMonthlyPrepaymentGBP: 0,
    extraYearlyLumpSumINR: 0,
    simulatedRate: CURRENCY.defaultRate,
  }

  // User customizable timeline structure & start date
  const [rawTimelineConfig, setTimelineConfig] = useLocalStorage(`${profilePrefix}.timelineConfig`, {
    planStartYear: new Date().getFullYear(),
    planStartMonth: new Date().getMonth(), // 0-11
    planDurationYears: PLAN.planYears, // 3 by default
  })
  const timelineConfig = useMemo(() => {
    return (rawTimelineConfig && typeof rawTimelineConfig === 'object') ? {
      planStartYear: Number(rawTimelineConfig.planStartYear) || new Date().getFullYear(),
      planStartMonth: Number(rawTimelineConfig.planStartMonth) >= 0 ? Number(rawTimelineConfig.planStartMonth) : new Date().getMonth(),
      planDurationYears: Number(rawTimelineConfig.planDurationYears) || PLAN.planYears,
    } : {
      planStartYear: new Date().getFullYear(),
      planStartMonth: new Date().getMonth(),
      planDurationYears: PLAN.planYears,
    }
  }, [rawTimelineConfig])

  function updateTimelineConfig(patch) {
    setTimelineConfig((prev) => ({ ...prev, ...patch }))
  }

  const [rawCustomPlan, setCustomPlan] = useLocalStorage(`${profilePrefix}.customPlan.v3`, {
    monthlyIncome: PLAN.monthlyIncome,
    rentMid: (PLAN.expenses.rent.min + PLAN.expenses.rent.max) / 2,
    bills: PLAN.expenses.bills,
    travel: PLAN.expenses.travel,
    food: PLAN.expenses.food,
    monthlySavingsTarget: PLAN.monthlySavingsTarget,
    shopping: 0,
    entertainment: 0,
    health: 0,
    education: 0,
    insurance: 0,
    misc: 0,
  })
  const customPlan = useMemo(() => {
    const planYears = rawTimelineConfig?.planDurationYears || 3
    // Strategy: divide remaining loan across plan years, reduce by co-applicant contribution
    const coApplicantYearlyINR = hasCoApplicant ? Number(coApplicantContribution) * 12 : 0
    const targetYearlyLumpSumINR = Math.max(0, Math.floor(basicLoan / planYears) - coApplicantYearlyINR)
    const dynamicMonthlySavingsTarget = Math.ceil((targetYearlyLumpSumINR / rate) / 12)

    return (rawCustomPlan && typeof rawCustomPlan === 'object') ? {
      monthlyIncome: Number(rawCustomPlan.monthlyIncome) >= 0 ? Number(rawCustomPlan.monthlyIncome) : 1300,
      rentMid: Number(rawCustomPlan.rentMid) >= 0 ? Number(rawCustomPlan.rentMid) : 300,
      bills: Number(rawCustomPlan.bills) >= 0 ? Number(rawCustomPlan.bills) : 100,
      travel: Number(rawCustomPlan.travel) >= 0 ? Number(rawCustomPlan.travel) : 100,
      food: Number(rawCustomPlan.food) >= 0 ? Number(rawCustomPlan.food) : 120,
      monthlySavingsTarget: Number(rawCustomPlan.monthlySavingsTarget) >= 0 ? Number(rawCustomPlan.monthlySavingsTarget) : dynamicMonthlySavingsTarget,
      shopping: Number(rawCustomPlan.shopping) >= 0 ? Number(rawCustomPlan.shopping) : 0,
      entertainment: Number(rawCustomPlan.entertainment) >= 0 ? Number(rawCustomPlan.entertainment) : 0,
      health: Number(rawCustomPlan.health) >= 0 ? Number(rawCustomPlan.health) : 0,
      education: Number(rawCustomPlan.education) >= 0 ? Number(rawCustomPlan.education) : 0,
      insurance: Number(rawCustomPlan.insurance) >= 0 ? Number(rawCustomPlan.insurance) : 0,
      misc: Number(rawCustomPlan.misc) >= 0 ? Number(rawCustomPlan.misc) : 0,
    } : {
      monthlyIncome: 1300,
      rentMid: 300,
      bills: 100,
      travel: 100,
      food: 120,
      monthlySavingsTarget: dynamicMonthlySavingsTarget,
      shopping: 0,
      entertainment: 0,
      health: 0,
      education: 0,
      insurance: 0,
      misc: 0,
    }
  }, [rawCustomPlan, basicLoan, rate, interestRate, moratoriumMonths, coApplicantContribution, hasCoApplicant])

  function updateCustomPlan(patch) {
    setCustomPlan((prev) => ({ ...prev, ...patch }))
  }

  // Automatically recalibrate and sync the monthly prepayment target whenever inputs change
  React.useEffect(() => {
    const planYears = rawTimelineConfig?.planDurationYears || 3
    // Strategy: divide remaining loan across plan years, reduce by co-applicant contribution
    const coApplicantYearlyINR = hasCoApplicant ? Number(coApplicantContribution) * 12 : 0
    const targetYearlyLumpSumINR = Math.max(0, Math.floor(basicLoan / planYears) - coApplicantYearlyINR)
    const dynamicMonthlySavingsTarget = Math.ceil((targetYearlyLumpSumINR / rate) / 12)

    setCustomPlan((prev) => {
      if (prev && prev.monthlySavingsTarget !== dynamicMonthlySavingsTarget) {
        return { ...prev, monthlySavingsTarget: dynamicMonthlySavingsTarget }
      }
      return prev
    })
  }, [basicLoan, rate, interestRate, moratoriumMonths, coApplicantContribution, hasCoApplicant])

  // timelineConfig moved up

  const [strategyChecks, setStrategyChecks] = useLocalStorage(`${profilePrefix}.strategyChecks`, [true, false, false, false])

  // The dynamic timeline, anchored to the chosen year, month, and duration
  const timeline = useMemo(
    () => buildMonthTimeline(timelineConfig.planDurationYears * 12, new Date(timelineConfig.planStartYear, timelineConfig.planStartMonth, 1)),
    [timelineConfig]
  )

  const currentKey = timeline[0]?.key

  function updateEntry(key, patch) {
    setEntries((prev) => ({
      ...prev,
      [key]: { saved: 0, transferred: false, note: '', ...prev[key], ...patch },
    }))
  }

  function getEntry(key) {
    return entries[key] || { saved: 0, transferred: false, note: '' }
  }

  // Account Management methods
  function addAccount(account) {
    const newAcc = {
      id: `acc-${Date.now()}`,
      status: 'Active',
      ...account,
    }
    setAccounts((prev) => [newAcc, ...prev])
  }

  function updateAccount(id, patch) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function deleteAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }

  // Derived totals used across Dashboard / SavingsTracker / Analytics
  const derived = useMemo(() => {
    const thisYearMonths = timeline.slice(0, 12)
    const savedThisYear = thisYearMonths.reduce((sum, m) => sum + (entries[m.key]?.saved || 0), 0)
    const savedAllTime = timeline.reduce((sum, m) => sum + (entries[m.key]?.saved || 0), 0)
    const savedThisMonth = entries[currentKey]?.saved || 0
    
    // Calculate total monthly committed outgoings in GBP equivalent across active accounts
    const activeMonthlyOutgoingsGBP = accounts
      .filter((a) => a.status === 'Active' && a.frequency === 'Monthly')
      .reduce((sum, a) => {
        const amtGBP = a.currency === 'INR' ? a.targetAmount / rate : a.targetAmount
        return sum + amtGBP
      }, 0)

    const activeAssetsCount = accounts.filter((a) => a.type === 'Asset').length
    const activeEMIsCount = accounts.filter((a) => a.type === 'EMI').length

    // Dynamic Tracking & Rollover Math
    const planYears = timelineConfig?.planDurationYears || 3
    const termMonths = planYears * 12
    // Keep P_grad variables for analytics display
    const I_monthly = basicLoan * ((interestRate / 12) / 100)
    const studentShareMonthly = Math.max(0, I_monthly - (hasCoApplicant ? Number(coApplicantContribution) : 0))
    const I_unpaidTotal = studentShareMonthly * moratoriumMonths
    const P_grad = basicLoan + I_unpaidTotal
    // Strategy: divide remaining loan across plan years, reduce by co-applicant contribution
    const coApplicantYearlyINR = hasCoApplicant ? Number(coApplicantContribution) * 12 : 0
    const targetYearlyLumpSumINR = Math.max(0, Math.floor(basicLoan / planYears) - coApplicantYearlyINR)
    // Convert to a strict monthly UK savings goal (GBP), rounded up to the nearest whole pound
    const targetMonthlySavingsGBP = Math.ceil((targetYearlyLumpSumINR / rate) / 12)

    // Elapsed Months logic
    const currentMonthIdx = timeline.findIndex(m => m.key === currentKey)
    const elapsedMonths = Math.max(1, currentMonthIdx + 1)
    
    // Deficit calculation
    const expectedSavingsToDate = elapsedMonths * targetMonthlySavingsGBP
    const deficitGBP = Math.max(0, expectedSavingsToDate - savedAllTime)
    
    // Rollover/Catch-up
    const remainingMonths = Math.max(1, termMonths - elapsedMonths)
    const catchUpMonthlySavingsGBP = deficitGBP > 0 
      ? targetMonthlySavingsGBP + (deficitGBP / remainingMonths) 
      : targetMonthlySavingsGBP

    // Business Rules: Forex markup (+₹2) and Credit Advance (1% fee)
    const marketRate = rate
    const freedomPlanRate = rate + 2.0
    const forexMarkup = 2.0
    const creditAdvanceFee = Math.round(basicLoan * 0.01)
    const netAmountReceived = Math.max(0, basicLoan - creditAdvanceFee)

    return {
      savedThisYear,
      savedAllTime,
      savedThisMonth,
      activeMonthlyOutgoingsGBP,
      activeAssetsCount,
      activeEMIsCount,
      
      // Dynamic calculations exported
      P_grad,
      I_unpaidTotal,
      studentShareMonthly,
      I_monthly,
      targetYearlyLumpSumINR,
      targetMonthlySavingsGBP,
      elapsedMonths,
      expectedSavingsToDate,
      deficitGBP,
      remainingMonths,
      catchUpMonthlySavingsGBP,

      // Business Rules & Forex Math
      marketRate,
      freedomPlanRate,
      forexMarkup,
      creditAdvanceFee,
      netAmountReceived,
    }
  }, [timeline, entries, currentKey, accounts, rate, basicLoan, interestRate, moratoriumMonths, coApplicantContribution, hasCoApplicant])

  const value = {
    darkMode,
    setDarkMode,
    soundEnabled,
    setSoundEnabled,
    rate,
    setRate,
    basicLoan,
    setBasicLoan,
    interestRate,
    setInterestRate,
    moratoriumMonths,
    setMoratoriumMonths,
    coApplicantContribution,
    setCoApplicantContribution,
    hasCoApplicant,
    setHasCoApplicant,
    entries,
    getEntry,
    updateEntry,
    generalNotes,
    setGeneralNotes,
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    simulator,
    setSimulator,
    customPlan,
    updateCustomPlan,
    timelineConfig,
    updateTimelineConfig,
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    setCurrentUser,
    users,
    setUsers,
    isBasicUnlocked,
    setIsBasicUnlocked,
    isProUnlocked,
    setIsProUnlocked,
    proLeadData,
    setProLeadData,
    strategyChecks,
    setStrategyChecks,
    timeline,
    currentKey,
    derived,
    allRates,
    effectiveRates,
    isAnalyticsLocked,
    setIsAnalyticsLocked,
    sessionLoginTime,
    setSessionLoginTime,
    isSessionActive,
    touchSession,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
