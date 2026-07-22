import React, { useState, useEffect, useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, LOAN, CURRENCY } from '../config'
import { Card, Badge, StatTile, AnimatedCounter } from './ui'
import FlywayModal from './FlywayModal'
import { triggerReportDownload } from '../utils/downloadReport'

const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = React.useState('');
  
  React.useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, 40); // typing speed
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="font-mono text-[13px] text-neutral-300 p-4 border border-lime-500/10 rounded-[16px] bg-neutral-950/60 shadow-inner flex items-center leading-relaxed">
      <span className="text-lime-400 font-bold mr-3 text-lg leading-none">❯</span>
      <span>{displayedText}</span>
      <span className="inline-block w-1.5 h-4 bg-lime-400 ml-1 animate-[pulse_0.8s_ease-in-out_infinite] align-middle rounded-sm"></span>
    </div>
  );
};

export default function AnalyticsDashboard({ onRequirePro, onRequireLogin }) {
  const { 
    timeline, entries, rate, setRate, derived, customPlan, basicLoan, setBasicLoan, isProUnlocked,
    interestRate, setInterestRate, moratoriumMonths, setMoratoriumMonths,
    coApplicantContribution, setCoApplicantContribution, hasCoApplicant, setHasCoApplicant,
    isLoggedIn, setIsLoggedIn, sessionDownloadCount, setSessionDownloadCount,
    isAnalyticsLocked, setIsAnalyticsLocked, isSessionActive, touchSession
  } = useStore()
  
  const { targetYearlyLumpSumINR, targetMonthlySavingsGBP } = derived
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
  const [activeYearFilter, setActiveYearFilter] = useState('All')
  const [hoveredSlice, setHoveredSlice] = useState(null)
  const [simulatorYears, setSimulatorYears] = useState(10) // Default to 10 years like standard repayment
  const [simRate, setSimRate] = useState(rate) // Local state for Rate Simulator
  const [isFlywayModalOpen, setIsFlywayModalOpen] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [isGreenCardFlipped, setIsGreenCardFlipped] = useState(false)

  const [tempBasicLoan, setTempBasicLoan] = useState(basicLoan)
  const [tempInterestRate, setTempInterestRate] = useState(interestRate)
  const [tempMoratoriumMonths, setTempMoratoriumMonths] = useState(moratoriumMonths)
  const [showSavedNotification, setShowSavedNotification] = useState(false)

  React.useEffect(() => {
    setTempBasicLoan(basicLoan)
    setTempInterestRate(interestRate)
    setTempMoratoriumMonths(moratoriumMonths)
  }, [basicLoan, interestRate, moratoriumMonths])

  const handleSaveAnalytics = () => {
    setBasicLoan(tempBasicLoan)
    setInterestRate(tempInterestRate)
    setMoratoriumMonths(tempMoratoriumMonths)
    setIsAnalyticsLocked(true)
    setShowSavedNotification(true)
    setTimeout(() => setShowSavedNotification(false), 4000)
  }

  const handleResetAnalytics = () => {
    setIsAnalyticsLocked(false)
    setShowSavedNotification(false)
  }

  const handlePollVote = async () => {
    setIsVoting(true);
    try {
      await fetch('https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "PollVote",
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error(error);
    }
    setTimeout(() => {
      setIsVoting(false);
      setHasVoted(true);
    }, 800);
  };

  // 1. Build data for Net Worth Growth vs. Debt Paydown Curve
  const chartData = useMemo(() => {
    let runningSavingsGBP = 0
    let runningLoanINR = basicLoan

    const all = timeline.map((m, idx) => {
      const savedThisMonth = entries[m.key]?.saved || 0
      runningSavingsGBP += savedThisMonth

      const isDecember = m.month === 11
      const emi = Math.min(LOAN.monthlyEMIINR, runningLoanINR)
      runningLoanINR = Math.max(0, runningLoanINR - emi)
      if (isDecember && runningLoanINR > 0) {
        const lump = Math.min(targetYearlyLumpSumINR, runningLoanINR)
        runningLoanINR = Math.max(0, runningLoanINR - lump)
      }

      const savingsInINR = runningSavingsGBP * rate
      const netWorthINR = savingsInINR - runningLoanINR

      return {
        ...m,
        idx,
        savingsGBP: runningSavingsGBP,
        savingsINR: savingsInINR,
        loanINR: runningLoanINR,
        netWorthINR,
      }
    })

    if (activeYearFilter === 'All') return all
    return all.filter(d => String(d.year) === activeYearFilter)
  }, [timeline, entries, rate, activeYearFilter, basicLoan, targetYearlyLumpSumINR])

  const selectedData = chartData[selectedMonthIndex] || chartData[0] || {}
  const { strategyChecks, setStrategyChecks } = useStore()

  // Chart dimensions & scaling for Net Worth vs Loan SVG
  const svgWidth = 640
  const svgHeight = 240
  const paddingX = 40
  const paddingY = 24
  const chartW = svgWidth - paddingX * 2
  const chartH = svgHeight - paddingY * 2

  const maxINR = Math.max(
    basicLoan,
    ...chartData.map((d) => Math.max(d.savingsINR || 0, d.loanINR || 0))
  )

  // SVG coordinate helpers
  const getX = (idx) => paddingX + (idx / (Math.max(1, chartData.length - 1))) * chartW
  const getY = (val) => paddingY + chartH - ((val || 0) / (maxINR || 1)) * chartH

  // Build path strings
  const loanPoints = chartData.map((d, i) => `${getX(i)},${getY(d.loanINR)}`).join(' ')
  const savingsPoints = chartData.map((d, i) => `${getX(i)},${getY(d.savingsINR)}`).join(' ')
  
  const loanAreaPath = `M ${paddingX},${paddingY + chartH} L ${loanPoints
    .split(' ')
    .join(' L ')} L ${getX(chartData.length - 1)},${paddingY + chartH} Z`
  const savingsAreaPath = `M ${paddingX},${paddingY + chartH} L ${savingsPoints
    .split(' ')
    .join(' L ')} L ${getX(chartData.length - 1)},${paddingY + chartH} Z`

  // 2. Cash Flow Breakdown computation
  const rentAvg = (PLAN.expenses.rent.min + PLAN.expenses.rent.max) / 2
  const fixedExpenses = rentAvg + PLAN.expenses.bills + PLAN.expenses.travel + PLAN.expenses.food
  const savingsTarget = PLAN.monthlySavingsTarget
  const surplus = PLAN.monthlyIncome - fixedExpenses - savingsTarget

  const cashFlowSlices = [
    { label: 'Rent', amount: rentAvg, color: 'bg-rose-500', stroke: '#f43f5e', pct: (rentAvg / PLAN.monthlyIncome) * 100 },
    { label: 'Bills + Travel', amount: fixedExpenses - rentAvg, color: 'bg-amber-500', stroke: '#f59e0b', pct: ((fixedExpenses - rentAvg) / PLAN.monthlyIncome) * 100 },
    { label: 'Target', amount: savingsTarget, color: 'bg-[#B6F36A]', stroke: '#B6F36A', pct: (savingsTarget / PLAN.monthlyIncome) * 100 },
    { label: 'Buffer', amount: Math.max(0, surplus), color: 'bg-[#4A7BFF]', stroke: '#4A7BFF', pct: (Math.max(0, surplus) / PLAN.monthlyIncome) * 100 },
  ]

  // 3. Exchange Rate Sensitivity table/chart
  const rateScenarios = [120, 125, CURRENCY.defaultRate, 130, 135, 140]

  // ── Shared report footer (AI prompts + disclaimer) ─────────────────────────
  const sharedReportFooter = `
---

## Understanding This Report

This report was generated automatically from the financial information you entered into Freedom Plan™. Think of it as a starting point — a structured snapshot of where you stand today and what it will take to reach debt freedom.

Numbers are recalculated every time you update your profile, so generate a fresh copy whenever your situation changes.

---

## Want Personalised Advice?

Upload this report into ChatGPT and ask:

- How can I reduce my loan faster given these numbers?
- Is my yearly prepayment target optimally sized?
- Should I increase my annual prepayment, and by how much?
- How much more interest can I save with an extra £100 per month?
- Based on this plan, can I realistically become debt-free earlier?

---

> **Disclaimer:** This report is generated automatically using the financial information you provided. It is designed to support budgeting, repayment planning, and financial organisation. It does not constitute regulated financial, legal, tax, or investment advice. Actual outcomes will depend on your lender's terms, applicable interest rates, exchange rate movements, and your personal financial circumstances.
`;

  const handleDownloadDashboard = () => {
    const runDownload = () => {
      touchSession()
      triggerReportDownload({
        basicLoan: isAnalyticsLocked ? basicLoan : tempBasicLoan,
        interestRate: isAnalyticsLocked ? interestRate : tempInterestRate,
        moratoriumMonths: isAnalyticsLocked ? moratoriumMonths : tempMoratoriumMonths,
        rate,
        derived
      })
    }

    if (isSessionActive) {
      runDownload()
    } else {
      if (onRequireLogin) onRequireLogin(runDownload)
      else if (onRequirePro) onRequirePro(runDownload)
      else runDownload()
    }
  }

  // ── 3-Year Repayment Strategy Download Report ────────────────────────────────
  const handleDownloadYearlyReport = () => {
    const runDownload = () => {
      touchSession()
      triggerReportDownload({
        basicLoan: isAnalyticsLocked ? basicLoan : tempBasicLoan,
        interestRate: isAnalyticsLocked ? interestRate : tempInterestRate,
        moratoriumMonths: isAnalyticsLocked ? moratoriumMonths : tempMoratoriumMonths,
        rate,
        derived
      })
    }

    if (isSessionActive) {
      runDownload()
    } else {
      if (onRequireLogin) onRequireLogin(runDownload)
      else if (onRequirePro) onRequirePro(runDownload)
      else runDownload()
    }
  }



  return (
    <div className="space-y-6 animate-slide-up">
      


      {/* Header Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatTile
          label="Total Savings (Equivalent)"
          value={<AnimatedCounter prefix="₹" value={Math.round(derived.savedAllTime * rate)} />}
          sub={`£${derived.savedAllTime.toLocaleString('en-GB')} at ₹${rate}/£`}
          accent="text-[#93E33C]"
          badge="Growth"
        />
        <StatTile
          label="Current Loan Balance"
          value={<AnimatedCounter prefix="₹" value={Math.round(selectedData.loanINR || basicLoan)} />}
          sub={`As of ${selectedData.label || 'Start'}`}
          accent="text-[#ED000C]"
          badge="Liabilities"
        />
        <StatTile
          label="Projected Net Debt Position"
          value={<AnimatedCounter prefix="₹" value={Math.abs(selectedData.netWorthINR || 0)} />}
          sub={(selectedData.netWorthINR || 0) >= 0 ? 'Surplus Net Worth' : 'Remaining Net Debt'}
          accent={(selectedData.netWorthINR || 0) >= 0 ? 'text-[#161C2D]' : 'text-[#ED000C]'}
          badge={(selectedData.netWorthINR || 0) >= 0 ? 'Surplus' : 'Deficit'}
          isLocked={!isProUnlocked}
          onUnlock={onRequirePro}
        />
      </div>

      {/* Chart 1: Net Worth & Debt Paydown Curve - Exact Luxury Template with w-80 card size */}
      <div className="flex justify-center w-full">
        <div className="group relative w-80 overflow-hidden rounded-2xl bg-neutral-950 p-6 font-sans shadow-2xl border border-neutral-800">
          <div className="absolute -top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-lime-500/10 blur-3xl transition-all duration-700 group-hover:bg-lime-500/15" />

          <div className="relative flex flex-col gap-5">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-lime-400"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                    <path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                    <path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
                    <path d="M4 20l14 0" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-neutral-200">Cumulative Paydown Curve</p>
                  <p className="text-xs text-neutral-500">Updated just now</p>
                </div>
              </div>
            </div>

            <div className="flex divide-x divide-neutral-800">
              <div className="flex-1 pr-6">
                <p className="text-xs font-medium text-neutral-500">Cumulative Savings</p>
                <p className="text-xl font-semibold text-neutral-100">
                  <AnimatedCounter prefix="₹" value={(selectedData.savingsINR || 410000) / 100000} format={false} suffix="L" />
                </p>
                <p className="mt-1 text-xs font-medium text-lime-400">+8.5%</p>
              </div>
              <div className="flex-1 pl-6">
                <p className="text-xs font-medium text-neutral-500">Remaining Loan</p>
                <p className="text-xl font-semibold text-neutral-100">
                  <AnimatedCounter prefix="₹" value={(selectedData.loanINR || basicLoan) / 100000} format={false} suffix="L" />
                </p>
                <p className="mt-1 text-xs font-medium text-red-400">+2.1%</p>
              </div>
            </div>

            <div className="relative h-24 w-full">
              <svg
                className="h-full w-full"
                viewBox="0 0 300 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="aurora-gradient-v3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3e635" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,65 C50,20 80,80 150,70 S250,50 300,85"
                  fill="none"
                  stroke="#a3e635"
                  strokeWidth="2"
                />
                <path
                  d="M0,100 L0,65 C50,20 80,80 150,70 S250,50 300,85 L300,100 Z"
                  fill="url(#aurora-gradient-v3)"
                />
              </svg>
              <div className="absolute right-[-1px] top-[81px]">
                <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-400 shadow-lg shadow-lime-400/50" />
                <div className="animate-pulse-strong absolute h-full w-full rounded-full bg-lime-400/25" />
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-5">
              <button onClick={handleDownloadDashboard} className="w-full flex items-center justify-center gap-2 rounded-lg border border-lime-400/50 bg-transparent px-4 py-2 text-sm font-medium text-lime-400 transition-colors duration-300 hover:bg-lime-400 hover:text-neutral-950">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download the dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart 2 & 3 Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Flow Visual Allocation */}
        <Card eyebrow="Monthly Budget" title="Income Allocation Gauge">
          <p className="text-xs text-[#667085] mb-5">
            How your <span className="figure font-bold text-[#161C2D]">£{PLAN.monthlyIncome}</span> monthly income splits into expenses vs. target vs. buffer.
          </p>

          {/* Interactive Donut Chart */}
          <div 
            className="relative w-full h-80 mx-auto mb-4 mt-6 flex items-center justify-center group" 
            style={{ perspective: '1200px' }}
            onMouseEnter={() => setHoveredSlice(0)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <svg 
              viewBox="0 0 42 42" 
              className="w-72 h-72 overflow-visible transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative z-10" 
              style={{ transform: hoveredSlice !== null ? 'rotateX(0deg) rotateZ(0deg)' : 'rotateX(55deg) rotateZ(-30deg)' }}
            >
              {(() => {
                let currentOffset = 25; // Start at 12 o'clock (25% offset backwards from 3 o'clock)
                return cashFlowSlices.map((slice, i) => {
                  const dash = `${slice.pct} ${100 - slice.pct}`;
                  const offset = 100 - currentOffset + 25;
                  currentOffset += slice.pct;
                  const isHovered = hoveredSlice === i;
                  return (
                    <g key={i}>
                      {/* Interactive Layer */}
                      <circle
                        cx="21"
                        cy="21"
                        r="15.9154943"
                        fill="transparent"
                        stroke={slice.stroke}
                        strokeWidth={isHovered ? "7" : "6"}
                        strokeDasharray={dash}
                        strokeDashoffset={offset}
                        onMouseEnter={(e) => { e.stopPropagation(); setHoveredSlice(i); }}
                        className="transition-all duration-300 cursor-pointer origin-center"
                        style={{
                           transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                           filter: isHovered ? 'drop-shadow(0px 10px 15px rgba(0,0,0,0.15))' : 'none'
                        }}
                      />
                    </g>
                  )
                })
              })()}
            </svg>
            
            {/* Strategy Tooltip Popups */}
            {hoveredSlice !== null && (
              <div className={`absolute z-20 pointer-events-none animate-fade-in ${
                hoveredSlice === 0 ? 'top-1/2 left-[85%] -translate-y-1/2' :
                hoveredSlice === 1 ? 'top-[85%] left-1/2 -translate-x-1/2' :
                hoveredSlice === 2 ? 'top-1/2 right-[85%] -translate-y-1/2' :
                'bottom-[85%] left-1/2 -translate-x-1/2'
              }`}>
                <div className="relative bg-white/95 backdrop-blur-md border border-[#EEF2F7] shadow-xl rounded-2xl p-4 w-56 text-left">
                   
                   <span className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: cashFlowSlices[hoveredSlice].stroke }}>Analysis</span>
                   <span className="text-[11px] text-[#667085] leading-relaxed block">
                     {hoveredSlice === 0 && `Rent costs £${cashFlowSlices[0].amount}. It is a fixed necessity. Ensure it doesn't exceed 35% of income.`}
                     {hoveredSlice === 1 && `Bills & Travel take ${cashFlowSlices[1].pct.toFixed(1)}%. Review subscriptions to keep this under 15%.`}
                     {hoveredSlice === 2 && `Loan & Education are necessary priorities. Maintain this £${cashFlowSlices[2].amount} target.`}
                     {hoveredSlice === 3 && `Buffer includes Shopping & Entertainment (non-essential). Reducing this from ${cashFlowSlices[3].pct.toFixed(1)}% to ${(cashFlowSlices[3].pct * 0.8).toFixed(1)}% heavily boosts savings.`}
                   </span>
                </div>
              </div>
            )}
            
            {/* Center Hover Details */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 z-10">
              {hoveredSlice !== null ? (
                <div className="flex flex-col items-center mt-2 animate-fade-in">
                  <span className="text-3xl font-bold text-[#161C2D] figure leading-none">£{cashFlowSlices[hoveredSlice].amount.toFixed(0)}</span>
                  <div className="flex items-center gap-2 mt-2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cashFlowSlices[hoveredSlice].stroke }} />
                    <span className="text-[10px] font-bold" style={{ color: cashFlowSlices[hoveredSlice].stroke }}>{cashFlowSlices[hoveredSlice].pct.toFixed(1)}% Utilisation</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-sm border border-[#EEF2F7]">
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-widest text-center">Hover for details</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Exchange Rate Purchasing Power Sensitivity */}
        <Card eyebrow="Forex Impact" title="Rate Sensitivity Simulator">
          <p className="text-xs text-[#667085] mb-5">
            Impact of exchange rate shifts on your yearly <span className="figure font-bold text-[#161C2D]">£{PLAN.yearlyTarget.toLocaleString()}</span> transfer:
          </p>

          <div className="flex flex-col gap-5">
            <div className="bg-[#F9FBFD] p-5 rounded-[16px] border border-[#EEF2F7]">
              <div className="flex justify-between items-center mb-5">
                <span className="text-sm font-semibold text-[#667085]">Simulated Rate</span>
                <span className="text-3xl font-bold text-[#161C2D] figure tracking-tight">₹{simRate} <span className="text-sm text-[#667085] font-semibold">/ £</span></span>
              </div>
              <input 
                type="range" 
                min="115" 
                max="145" 
                step="0.5" 
                value={simRate} 
                onChange={(e) => setSimRate(Number(e.target.value))}
                className="w-full h-2.5 bg-[#D0D5DD] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#98A2B3] transition-colors range-3d"
              />
              <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-3 uppercase tracking-wider">
                <span>₹115</span>
                <span>₹130 (Base)</span>
                <span>₹145</span>
              </div>
            </div>

            {/* Impact Calculation */}
            {(() => {
              const inrVal = PLAN.yearlyTarget * simRate;
              const diffFromBase = inrVal - PLAN.yearlyTarget * CURRENCY.defaultRate;
              return (
                <div className="flex items-center justify-between p-4 bg-white border border-[#EEF2F7] rounded-[14px] shadow-sm-clean">
                  <span className="text-sm font-semibold text-[#161C2D]">Yearly Transfer Power</span>
                  <div className="text-right">
                    <span className="figure text-xl font-bold text-[#161C2D] tracking-tight">
                      <AnimatedCounter prefix="₹" value={inrVal / 100000} format={false} suffix="L" />
                    </span>
                    {diffFromBase !== 0 && (
                       <span className={`block text-[11px] figure font-bold mt-0.5 ${diffFromBase > 0 ? 'text-[#93E33C]' : 'text-[#ED000C]'}`}>
                         {diffFromBase > 0 ? '+' : ''}₹{(diffFromBase / 1000).toFixed(0)}k vs base
                       </span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Forex Bank Links (Rectangular Card Style) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 w-full">
              <a 
                href="https://www.icici.bank.in/corporate/global-markets/forex/forex-card-rate" 
                target="_blank" 
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 w-full py-3 px-4 rounded-[16px] border border-[#EEF2F7] bg-white shadow-sm hover:shadow-md hover:border-[#D0D5DD] transition-all group overflow-hidden"
                title="ICICI Bank Forex"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/ICICI_Bank_Logo.svg" alt="ICICI" className="h-7 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
              </a>
              <a 
                href="https://sbi.bank.in/documents/16012/1400784/FOREX_CARD_RATES.pdf" 
                target="_blank" 
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 w-full py-3 px-4 rounded-[16px] border border-[#EEF2F7] bg-white shadow-sm hover:shadow-md hover:border-[#D0D5DD] transition-all group overflow-hidden"
                title="SBI Forex"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/cc/SBI-logo.svg" alt="SBI" className="h-7 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
              </a>
              <button 
                onClick={() => setIsFlywayModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 w-full py-3 px-4 rounded-[16px] border border-[#EEF2F7] bg-white shadow-sm hover:shadow-md hover:border-[#D0D5DD] transition-all group overflow-hidden"
                title="Flywire"
              >
                <img src={`${import.meta.env.BASE_URL}images/flywire.jpg`} alt="Flywire" className="h-6 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* New Simulator UI */}
      {(() => {
        // Use temp values for live preview (updated by sliders; saved to global on 'Save')
        const P = tempBasicLoan;
        const P_0 = tempBasicLoan;
        const R_annual = tempInterestRate;
        const M = tempMoratoriumMonths;
        const coApplicant = hasCoApplicant ? coApplicantContribution : 0;
        
        const yearlyInterest = P_0 * (R_annual / 100);
        const R_monthly = R_annual / 12;
        const I_month = P_0 * (R_monthly / 100);
        const studentShare = Math.max(0, I_month - coApplicant);
        const I_unpaidTotal = studentShare * M;
        const P_grad = P_0 + I_unpaidTotal;
        
        const coApplicantPct = I_month > 0 ? (coApplicant / I_month) * 100 : 0;
        const principalPct = P_grad > 0 ? (P_0 / P_grad) * 100 : 0;

        // Live Step 2 calculations based on temp values
        const planYears = 3;
        const termMonths = planYears * 12;
        const fixedEMIAllYears = LOAN.monthlyEMIINR * termMonths;
        const liveTargetYearlyLumpSumINR = Math.max(0, Math.floor((P_grad - fixedEMIAllYears) / planYears));
        const liveTargetMonthlySavingsGBP = Math.ceil((liveTargetYearlyLumpSumINR / rate) / 12);

        const postGradYears = simulatorYears;
        const n = postGradYears * 12;
        const r_emi = (R_annual / 12) / 100;
        
        let EMI_postGrad = 0;
        if (r_emi > 0) {
          EMI_postGrad = (P_grad * r_emi * Math.pow(1 + r_emi, n)) / (Math.pow(1 + r_emi, n) - 1);
        }

        const getSliderStyle = (val, min, max) => {
          const percentage = ((val - min) / (max - min)) * 100;
          return {
            background: `linear-gradient(to right, #B6F36A 0%, #93E33C ${percentage}%, #EEF2F7 ${percentage}%, #EEF2F7 100%)`
          };
        };

        return (
          <div className="mt-8 mb-10 animate-slide-in-bottom delay-300">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Sliders */}
              <div className="flex-1 bg-white border border-[#EEF2F7] rounded-[24px] shadow-sm-clean p-6 lg:p-8 flex flex-col justify-start space-y-8 relative">
                
                {/* Header Lock Badge */}
                <div className="flex items-center justify-between border-b border-[#EEF2F7] pb-4">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#667085]">Analytics Controls</span>
                  {isAnalyticsLocked ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm animate-fade-in">
                      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Controls Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-fade-in">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Editable Mode
                    </span>
                  )}
                </div>

                {/* Loan Amount */}
                <div className={`space-y-4 relative z-10 pt-2 transition-opacity ${isAnalyticsLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#161C2D]">How much your loan have currently?</label>
                    <div className="bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl px-4 py-2 flex items-center gap-2">
                      <span className="text-[#4A7BFF] font-bold">₹</span>
                      <span className="text-lg font-extrabold text-[#161C2D] figure">{tempBasicLoan.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="100000" 
                      max="10000000" 
                      step="50000" 
                      disabled={isAnalyticsLocked}
                      value={tempBasicLoan} 
                      onChange={(e) => setTempBasicLoan(Number(e.target.value))}
                      style={{ ...getSliderStyle(tempBasicLoan, 100000, 10000000), touchAction: 'pan-y' }}
                      className="w-full h-2.5 bg-[#EEF2F7] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#D0D5DD] transition-colors range-3d disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-2 tracking-wider">
                      <span>₹1,00,000</span>
                      <span>₹1,00,00,000</span>
                    </div>
                  </div>
                </div>

                {/* Interest Rate */}
                <div className={`space-y-4 transition-opacity ${isAnalyticsLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#161C2D]">Interest rate (per year)</label>
                    <div className="bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl px-4 py-2 flex items-center gap-1">
                      <span className="text-lg font-extrabold text-[#161C2D] figure">{tempInterestRate}</span>
                      <span className="text-[#667085] font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      step="0.1" 
                      disabled={isAnalyticsLocked}
                      value={tempInterestRate} 
                      onChange={(e) => setTempInterestRate(Number(e.target.value))}
                      style={{ ...getSliderStyle(tempInterestRate, 1, 20), touchAction: 'pan-y' }}
                      className="w-full h-2.5 bg-[#EEF2F7] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#D0D5DD] transition-colors range-3d disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-2 tracking-wider">
                      <span>1%</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>

                {/* Course + Grace Period */}
                <div className={`space-y-4 transition-opacity ${isAnalyticsLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#161C2D]">Course + grace period</label>
                    <div className="bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl px-4 py-2 flex items-center gap-1">
                      <span className="text-lg font-extrabold text-[#161C2D] figure">{tempMoratoriumMonths}</span>
                      <span className="text-[#667085] font-bold text-sm">months</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="12" 
                      max="72" 
                      step="6" 
                      disabled={isAnalyticsLocked}
                      value={tempMoratoriumMonths} 
                      onChange={(e) => setTempMoratoriumMonths(Number(e.target.value))}
                      style={{ ...getSliderStyle(tempMoratoriumMonths, 12, 72), touchAction: 'pan-y' }}
                      className="w-full h-2.5 bg-[#EEF2F7] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#D0D5DD] transition-colors range-3d disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-2 tracking-wider">
                      <span>12 mos</span>
                      <span>72 mos</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons: Save Analytics & Reset */}
                <div className="pt-4 pb-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Save Analytics Button */}
                    <button
                      type="button"
                      onClick={handleSaveAnalytics}
                      disabled={isAnalyticsLocked}
                      className="sm:col-span-2 py-3.5 px-5 rounded-xl font-extrabold text-sm tracking-wide text-white transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                      style={{
                        background: 'linear-gradient(135deg, #0034de 0%, #006eff 100%)',
                        boxShadow: '0px 4px 12px rgba(0, 110, 255, 0.25), inset 0px 2px 4px rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      {isAnalyticsLocked ? 'Saved & Locked' : 'Save Analytics Settings'}
                    </button>

                    {/* Reset Button (Matching Size & Styling) */}
                    <button
                      type="button"
                      onClick={handleResetAnalytics}
                      className="py-3.5 px-4 rounded-xl font-extrabold text-sm tracking-wide text-[#161C2D] bg-[#F1F5F9] border border-[#CBD5E1] hover:bg-[#E2E8F0] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset
                    </button>
                  </div>

                  {showSavedNotification && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-extrabold flex items-center justify-center gap-2 animate-fade-in">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Analytics locked and saved to local storage!
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <WalletCard isProUnlocked={isProUnlocked} onRequirePro={onRequirePro} />
                </div>
                
                <div className="mt-2 mb-6 w-full max-w-2xl mx-auto bg-neutral-950 rounded-[24px] border border-[#EEF2F7]/10 shadow-2xl relative overflow-hidden group flex flex-col sm:flex-row items-stretch">
                  <div className="absolute -top-1/2 left-0 h-64 w-64 rounded-full bg-lime-500/10 blur-3xl transition-all duration-700 group-hover:bg-lime-500/20 pointer-events-none" />
                  
                  {/* Left Side: Text */}
                  <div className="relative z-10 p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Community Poll
                      </span>
                    </div>

                    <h4 className="text-xl font-extrabold text-white leading-tight mb-2">
                      Shape Our Next <span className="text-lime-400">Premium</span> Feature
                    </h4>
                    
                    <p className="text-xs text-neutral-400 mb-6 leading-relaxed max-w-sm">
                      Tell us what tools you need most to reduce your loan burden. Your feedback helps us build smarter tools for your financial journey.
                    </p>

                    <div className="mt-auto">
                      {hasVoted ? (
                        <div className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-lime-500/10 text-lime-400 font-bold text-sm rounded-xl border border-lime-500/20 w-max animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Your vote has been noted!
                        </div>
                      ) : (
                        <button 
                          onClick={handlePollVote}
                          disabled={isVoting}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-sm rounded-xl transition-colors group/btn shadow-[0_0_20px_rgba(163,230,53,0.15)] w-max disabled:opacity-50"
                        >
                          {isVoting ? (
                            <>
                               <svg className="animate-spin h-4 w-4 text-neutral-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               Noting Vote...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                              Take the Poll
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Full Image */}
                  <div className="relative z-10 w-full sm:w-[45%] bg-black flex items-center justify-center p-0">
                    <img src="/images/poll.png" alt="Poll Illustration" className="w-full h-full object-cover sm:object-contain object-center drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500" />
                  </div>
                </div>
                
                <div className="mt-2 mb-8 w-full max-w-2xl mx-auto">
                  <TypewriterText text="Don't be stressed buddy, let the Freedom Plan do the heavy lifting for you! ✨" />
                </div>

              </div>

              {/* Right Column: Results */}
              <div className="flex-1 flex flex-col gap-6">

                {/* ── Green Flip Card (Front + Back) ── */}
                {(() => {
                  // ── Correct reducing-balance schedule ──────────────────────
                  // Each year: interest on opening balance, then deduct EMI stream + lump sum.
                  // Baseline: same but NO lump sum (to compute interest saved).
                  const annualEMI = LOAN.monthlyEMIINR * 12;
                  const schedule = [];
                  const baseline = [];
                  let bal = P_grad;
                  let balBase = P_grad;
                  let cumInterestSaved = 0;
                  for (let i = 0; i < 3; i++) {
                    // With prepayment
                    const opening = Math.max(0, bal);
                    const interest = Math.round(opening * (R_annual / 100));
                    const lump = Math.min(liveTargetYearlyLumpSumINR, Math.max(0, opening + interest - annualEMI));
                    const closing = Math.max(0, opening + interest - annualEMI - lump);
                    // Baseline (no lump sum)
                    const openingBase = Math.max(0, balBase);
                    const interestBase = Math.round(openingBase * (R_annual / 100));
                    const closingBase = Math.max(0, openingBase + interestBase - annualEMI);
                    // Interest saved this year vs baseline
                    const interestSavedThisYear = Math.max(0, interestBase - interest);
                    cumInterestSaved += interestSavedThisYear;
                    schedule.push({
                      year: i + 1,
                      opening,
                      interest,
                      annualEMI,
                      lump,
                      totalPaid: annualEMI + lump,
                      closing,
                      principalReduced: opening - closing,
                      interestSavedNextYear: i < 2 ? Math.round((closing) * (R_annual / 100)) - Math.round(Math.max(0, closingBase) * (R_annual / 100)) : 0,
                      interestSaved: interestSavedThisYear,
                      cumInterestSaved,
                    });
                    bal = closing;
                    balBase = closingBase;
                  }

                  return (
                    <div
                      className="relative isolate overflow-visible w-full group cursor-pointer"
                      style={{ perspective: '1200px' }}
                      onMouseEnter={() => window.innerWidth >= 1024 && setIsGreenCardFlipped(true)}
                      onMouseLeave={() => window.innerWidth >= 1024 && setIsGreenCardFlipped(false)}
                      onClick={() => window.innerWidth < 1024 && setIsGreenCardFlipped(!isGreenCardFlipped)}
                    >
                      <div
                        className="relative w-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                        style={{ transformStyle: 'preserve-3d', transform: isGreenCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                      >
                        {/* ── FRONT ── */}
                        <GreenCardFront schedule={schedule} R_annual={R_annual} M={M} P_0={P_0} P_grad={P_grad} unpaidInterest={Math.round(studentShare * M)} onDownload={handleDownloadYearlyReport} />

                        {/* ── BACK ── */}
                        <GreenCardBack schedule={schedule} onDownload={handleDownloadYearlyReport} />
                      </div>
                    </div>
                  );
                })()}



                {/* Legend and Monthly Strategy with restored Small SVG Pie Chart */}
                <div className="bg-[#161C2D] border border-[#232A3B] rounded-[20px] p-5 shadow-md flex flex-col sm:flex-row items-center gap-5 w-full">
                  {/* Small SVG Donut / Pie Chart */}
                  <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center bg-[#111625] rounded-full p-2 border border-[#232A3B]">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1D2435" strokeWidth="4" />
                      {/* Unpaid Interest Share (Cyan) */}
                      <circle
                        cx="18" cy="18" r="15.9155"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="4.5"
                        strokeDasharray={`${Math.max(0, Math.min(100, (studentShare / Math.max(1, studentShare + coApplicant)) * 100))} 100`}
                        strokeDashoffset="0"
                        className="transition-all duration-500 ease-out"
                      />
                      {/* Co-applicant Share (Green) */}
                      {hasCoApplicant && coApplicant > 0 && (
                        <circle
                          cx="18" cy="18" r="15.9155"
                          fill="none"
                          stroke="#4ade80"
                          strokeWidth="4.5"
                          strokeDasharray={`${Math.max(0, Math.min(100, (coApplicant / Math.max(1, studentShare + coApplicant)) * 100))} 100`}
                          strokeDashoffset={`-${(studentShare / Math.max(1, studentShare + coApplicant)) * 100}`}
                          className="transition-all duration-500 ease-out"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-extrabold text-[#98A2B3] uppercase tracking-tighter">Share</span>
                      <span className="text-xs font-black text-white">
                        {Math.round((studentShare / Math.max(1, studentShare + coApplicant)) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Cards: Co-applicant Pays & Unpaid (Added) */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="bg-[#1D2435] border border-[#2E374A] rounded-[14px] p-3.5 flex flex-col justify-between transition-colors hover:bg-[#232A3B] group cursor-default">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div className="checkbox onoff-btn transform scale-75 origin-center">
                              <input 
                                type="checkbox" 
                                checked={hasCoApplicant} 
                                onChange={(e) => setHasCoApplicant(e.target.checked)}
                                className="onoff-btn-checkbox" 
                              />
                              <svg className="onoff-btn-icon icon-cross absolute" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                              </svg>
                              <svg className="onoff-btn-icon icon-check absolute" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                            <span className="text-xs font-bold text-[#98A2B3] uppercase tracking-wider">Co-applicant Pays</span>
                          </label>
                        </div>
                        {hasCoApplicant && (
                          <div className="flex items-center gap-2 bg-[#161C2D] border border-[#334155] rounded-xl px-2 py-1 w-24">
                            <span className="text-[#98A2B3] font-bold text-xs">₹</span>
                            <input 
                              type="number" 
                              value={coApplicantContribution} 
                              onChange={(e) => setCoApplicantContribution(Number(e.target.value) || 0)}
                              className="bg-transparent w-full font-black text-white text-sm figure focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                      <span className="text-base font-black text-white figure mt-0.5">₹{coApplicant.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-[#1D2435] border border-[#2E374A] rounded-[14px] p-3.5 flex flex-col justify-between transition-colors hover:bg-[#232A3B] group cursor-default">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-sm"></div>
                        <span className="text-xs font-bold text-[#98A2B3] uppercase tracking-wider">Unpaid (Added)</span>
                      </div>
                      <span className="text-base font-black text-white figure">₹{Math.round(studentShare).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>



                {/* Section 3: 3-Year Repayment Strategy (GBP INR Freedom Plan) */}
                <div className="bg-white border border-[#EEF2F7] rounded-[24px] shadow-sm-clean p-6 sm:p-8 flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#667085] mb-5">Step 2: Automatic Monthly Savings Target</h3>
                  
                  <div className="flex flex-col gap-4 mb-8">
                    <div className="flex justify-between items-center bg-[#F9FBFD] border border-[#EEF2F7] rounded-[14px] p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">Yearly Payment Goal</span>
                      <span className="text-xl font-black text-[#161C2D] figure">₹{liveTargetYearlyLumpSumINR.toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="flex justify-center -my-2 z-10">
                      <div className="bg-white border border-[#EEF2F7] rounded-full p-1.5 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6F36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-[#161C2D] border border-[#161C2D] rounded-[14px] p-5 shadow-lg">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Monthly Saving Target</span>
                      <div className="text-right">
                        <span className="block text-2xl font-black text-[#B6F36A] figure">£{liveTargetMonthlySavingsGBP.toLocaleString('en-GB')} / mo</span>
                        <span className="block text-[10px] font-semibold text-white/60 mt-1">₹{Math.floor(liveTargetYearlyLumpSumINR / 12).toLocaleString('en-IN')} equivalent</span>
                      </div>
                    </div>
                    <div className="bg-[#B6F36A]/10 border border-[#B6F36A]/30 rounded-[12px] p-3 mt-1">
                      <p className="text-[11px] font-bold text-[#161C2D] text-center">
                        🎯 Meeting this target ensures you cover all unpaid interest and successfully clear your yearly repayment goal!
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#667085] mb-4">Step 3: Three-Year Plan</h3>
                  <p className="text-[10px] font-bold text-[#667085] mb-4">The system automatically generates:</p>
                  
                  <div className="space-y-3">
                    {[1, 2, 3].map((year) => (
                      <div key={year} className="flex justify-between items-center bg-[#F9FBFD] border border-[#EEF2F7] rounded-[12px] p-3.5 group hover:bg-white transition-colors">
                        <span className="text-xs font-extrabold text-[#161C2D]">Year {year}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-[#667085]">Save <span className="font-bold text-[#161C2D]">£{liveTargetMonthlySavingsGBP.toLocaleString('en-GB')}</span>/mo</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#B6F36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          <span className="text-xs font-bold text-[#161C2D]">Pay ₹{liveTargetYearlyLumpSumINR.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            </div>
          </div>
        );
      })()}
      
      <FlywayModal isOpen={isFlywayModalOpen} onClose={() => setIsFlywayModalOpen(false)} />
    </div>
  )
}

/* ── Green Card FRONT ── */
function GreenCardFront({ schedule, R_annual, M, P_0, P_grad, unpaidInterest, onDownload }) {
  const totalInterest = Math.round(P_0 * (R_annual / 100) * (M / 12));

  return (
    <div
      className="bg-gradient-to-br from-lime-400 to-lime-500 rounded-[24px] p-6 sm:p-8 text-center shadow-2xl shadow-lime-500/25 text-neutral-950 relative overflow-hidden border border-lime-300 w-full flex flex-col justify-center gap-5"
      style={{ backfaceVisibility: 'hidden', minHeight: '340px' }}
    >
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      <div className="absolute -top-1/3 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/25 blur-3xl pointer-events-none" />

      {/* Green Paperclip Download Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDownload && onDownload(); }}
        className="absolute top-4 right-4 bg-white/30 hover:bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-lime-200/60 z-20 flex items-center gap-1.5 text-lime-950 font-extrabold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
        title="Download Repayment Strategy Report"
      >
        <svg className="w-4 h-4 text-lime-950 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.567 18.312a1.5 1.5 0 01-2.122-2.122l8.834-8.834" />
        </svg>
        <span>Download Report</span>
      </button>

      {/* Header */}
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-950/60 mb-2">Total Interest Accumulation</p>
        <div className="text-5xl sm:text-6xl font-bold tracking-tight figure text-neutral-950 leading-none">
          <AnimatedCounter prefix="₹" value={totalInterest} />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-lime-950/70">
          Calculated at {R_annual}% for {Math.ceil(M/12)} years ({M} months)
        </p>
      </div>

      {/* 3 stat boxes */}
      <div className="relative z-10 grid grid-cols-3 gap-3 mt-1">
        {[
          { label: 'Principal', value: `₹${(P_0/100000).toFixed(1)}L`, tooltip: false },
          { label: 'Unpaid Interest', value: `₹${(unpaidInterest/100000).toFixed(1)}L`, tooltip: true },
          { label: 'New Principal', value: `₹${(P_grad/100000).toFixed(1)}L`, tooltip: false },
        ].map(({ label, value, tooltip }) => (
          <div key={label} className="bg-white/25 border border-white/30 rounded-2xl px-3 py-3 backdrop-blur-sm flex flex-col items-center gap-1.5 relative">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-lime-950/60">{label}</span>
              {tooltip && <UnpaidInterestTooltip />}
            </div>
            <span className="text-base sm:text-lg font-bold text-neutral-950 figure leading-none">{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="relative z-10 text-[11px] font-semibold text-lime-950/70 leading-relaxed mx-auto max-w-xs">
        Paying your yearly interest reduces your future principal and total interest cost.
      </p>
    </div>
  );
}

/* ── Green Card BACK ── */
function GreenCardBack({ schedule, onDownload }) {
  const fmt = (n) => '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');

  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-lime-400 to-lime-500 rounded-[24px] shadow-2xl shadow-lime-500/25 border border-lime-300 w-full p-4 sm:p-5 flex flex-col justify-between overflow-y-auto text-lime-950"
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', minHeight: '340px' }}
    >
      {/* Dot texture */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

      {/* Top CTA: Download Report */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-3 flex items-center justify-between shadow-md">
        <div>
          <p className="text-xs font-extrabold text-lime-950 leading-tight">Full Repayment Strategy Report</p>
          <p className="text-[10px] text-lime-950/70 font-medium mt-0.5">3-year plan, interest charges & principal paydown</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDownload && onDownload(); }}
          className="py-2 px-3.5 rounded-xl font-extrabold text-xs text-white transition-all active:scale-95 shadow-md shrink-0 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #166534 100%)' }}
        >
          Download Report
        </button>
      </div>

      {/* 3-Year Repayment Strategy Information */}
      <div className="relative z-10 my-3 p-4 bg-white/20 border border-white/30 rounded-2xl backdrop-blur-sm space-y-2">
        <p className="text-xs font-extrabold uppercase tracking-widest text-lime-950 text-center">3-Year Repayment Strategy</p>
        <p className="text-xs font-semibold leading-relaxed text-lime-950/90 text-center px-2">
          Download your complete 3-year repayment strategy report to view detailed yearly interest calculations, principal paydowns, and remaining balances.
        </p>
        <p className="text-[10px] font-medium leading-tight text-lime-950/80 text-center pt-1 border-t border-lime-950/10">
          <strong>Note:</strong> The remaining balance after each year includes the yearly interest accumulated during that period. Detailed yearly interest calculations are provided in your downloadable report.
        </p>
      </div>

      {/* AI Strategy Section — Clean Circular Logos Only (No White Rectangular Containers) */}
      <div className="relative z-10 pt-1 border-t border-lime-950/15 flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-lime-950/80 uppercase tracking-wider">Analyze Plan with AI:</span>
        <div className="flex items-center gap-4">
          {/* ChatGPT */}
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
            title="ChatGPT"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border border-white/80 overflow-hidden">
              <img src={`${import.meta.env.BASE_URL}images/chatgpt_round.png`} alt="ChatGPT" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-extrabold text-lime-950">ChatGPT</span>
          </a>

          {/* Gemini */}
          <a
            href="https://gemini.google.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
            title="Google Gemini"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border border-white/80 overflow-hidden">
              <img src={`${import.meta.env.BASE_URL}images/gemini_round.png`} alt="Gemini" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-extrabold text-lime-950">Gemini</span>
          </a>

          {/* Claude */}
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
            title="Claude AI"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border border-white/80 overflow-hidden">
              <img src={`${import.meta.env.BASE_URL}images/claude_round.png`} alt="Claude" className="w-full h-full object-cover" />
            </div>
            <span className="text-[11px] font-extrabold text-lime-950">Claude</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Unpaid Interest Tooltip ── */
function UnpaidInterestTooltip() {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="w-4 h-4 rounded-full bg-lime-900/20 border border-lime-900/30 flex items-center justify-center text-[9px] font-black text-lime-950/60 hover:bg-lime-900/30 transition-colors focus:outline-none"
        aria-label="What is Unpaid Interest?"
      >ⓘ</button>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-50 animate-fade-in pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-[#EEF2F7] shadow-2xl rounded-2xl p-3.5">
            <p className="text-[10px] font-bold text-[#161C2D] mb-1.5">What is Unpaid Interest?</p>
            <p className="text-[10px] text-[#667085] leading-relaxed">
              If you don't pay your accumulated interest for the current year, it will be added to your outstanding principal. Interest for the following year will then be calculated on this increased principal.
            </p>
          </div>
          {/* Arrow */}
          <div className="flex justify-center"><div className="w-2.5 h-2.5 bg-white border-r border-b border-[#EEF2F7] rotate-45 -mt-1.5" /></div>
        </div>
      )}
    </div>
  );
}

/* ── Loan Snake Journey ── */
function LoanSnakeJourney({ principal, interestRate, yearlyPayment, monthlySavingsGBP, monthlyEMI }) {
  const [hoveredYear, setHoveredYear] = React.useState(null);

  // Build 3-year schedule
  const schedule = React.useMemo(() => {
    const years = [];
    let balance = principal;
    for (let i = 0; i < 3; i++) {
      const opening = balance;
      const annualInterest = Math.round(opening * (interestRate / 100));
      const totalDue = opening + annualInterest;
      const annualEMI = monthlyEMI * 12;
      const totalPayment = yearlyPayment + annualEMI;
      const closing = Math.max(0, totalDue - totalPayment);
      years.push({ year: i + 1, opening, annualInterest, totalDue, totalPayment, annualEMI, yearlyLump: yearlyPayment, closing });
      balance = closing;
    }
    return years;
  }, [principal, interestRate, yearlyPayment, monthlyEMI]);

  const delayMap = ['delay-100', 'delay-300', 'delay-500'];
  const connectorDelayMap = ['delay-200', 'delay-400'];

  return (
    <div className="w-full">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#667085] mb-5">3-Year Repayment Journey</h3>

      {/* Desktop: snake layout */}
      <div className="hidden lg:block relative">
        <div className="flex flex-col gap-0">
          {schedule.map((yr, i) => {
            const isRight = i % 2 !== 0; // Year 2 is on the right
            return (
              <div key={yr.year}>
                {/* Year card row */}
                <div className={`flex items-center ${isRight ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
                  {/* Card */}
                  <div
                    className={`animate-journey-card ${delayMap[i]} flex-shrink-0 w-64 rounded-2xl border border-[#EEF2F7] bg-[#F9FBFD] shadow-sm p-4 cursor-default transition-all duration-300 ${hoveredYear === i ? '-translate-y-1 shadow-lg border-lime-300' : ''}`}
                    onMouseEnter={() => setHoveredYear(i)}
                    onMouseLeave={() => setHoveredYear(null)}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                          <span className="text-[10px] font-black text-lime-950">{yr.year}</span>
                        </div>
                        <span className="text-xs font-bold text-[#161C2D] uppercase tracking-wider">Year {yr.year}</span>
                      </div>
                      <span className="text-[9px] font-bold bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                    </div>

                    {/* Stats grid */}
                    <div className="space-y-1.5">
                      {[
                        { label: 'Opening Balance', value: `₹${(yr.opening/100000).toFixed(1)}L`, accent: false },
                        { label: 'Annual Interest', value: `+₹${(yr.annualInterest/100000).toFixed(1)}L`, accent: true },
                        { label: 'Monthly Savings', value: `£${monthlySavingsGBP}/mo`, accent: false },
                        { label: 'Annual Payment', value: `₹${(yr.totalPayment/100000).toFixed(1)}L`, accent: false },
                        { label: 'Remaining Balance', value: `₹${(yr.closing/100000).toFixed(1)}L`, accent: false, bold: true },
                      ].map(({ label, value, accent, bold }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-[10px] text-[#667085]">{label}</span>
                          <span className={`text-[10px] font-bold figure ${accent ? 'text-red-500' : bold ? 'text-[#161C2D]' : 'text-[#161C2D]'}`}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Arrow label */}
                    {yr.year < 3 && (
                      <div className="mt-3 pt-2 border-t border-[#EEF2F7] flex items-center gap-1">
                        <span className="text-[9px] text-[#667085]">Balance carries to Year {yr.year + 1}</span>
                        <svg className="w-3 h-3 text-lime-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </div>
                    )}
                  </div>

                  {/* Horizontal dotted line filling the gap */}
                  <div className={`animate-journey-card ${delayMap[i]} flex-1 flex items-center ${isRight ? 'flex-row-reverse' : ''}`}>
                    <svg className="w-full h-6 overflow-visible" viewBox="0 0 200 24" preserveAspectRatio="none">
                      <line
                        x1={isRight ? 200 : 0} y1="12" x2={isRight ? 0 : 200} y2="12"
                        stroke={hoveredYear === i ? '#84cc16' : '#D0D5DD'}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        className="transition-colors duration-300"
                      />
                    </svg>
                    {/* End dot */}
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 animate-dot-pulse ${hoveredYear === i ? 'bg-lime-400 scale-125' : 'bg-[#D0D5DD]'}`} />
                  </div>
                </div>

                {/* Vertical connector between rows */}
                {i < 2 && (
                  <div className={`animate-journey-card ${connectorDelayMap[i]} flex ${i % 2 === 0 ? 'justify-end pr-3' : 'justify-start pl-3'} my-0`}>
                    <div className="flex flex-col items-center">
                      <svg height="40" width="2" className="overflow-visible">
                        <line
                          x1="1" y1="0" x2="1" y2="40"
                          stroke="#D0D5DD"
                          strokeWidth="2"
                          strokeDasharray="5 4"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Final completion card */}
        <div className="animate-journey-card delay-700 mt-6 w-full">
          <CompletionCard />
        </div>
      </div>

      {/* Mobile: vertical stacked layout */}
      <div className="lg:hidden flex flex-col gap-4">
        {schedule.map((yr, i) => (
          <div key={yr.year} className="flex flex-col items-center gap-0">
            <div className={`animate-journey-card ${delayMap[i]} w-full rounded-2xl border border-[#EEF2F7] bg-[#F9FBFD] p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                  <span className="text-[10px] font-black text-lime-950">{yr.year}</span>
                </div>
                <span className="text-xs font-bold text-[#161C2D] uppercase tracking-wider">Year {yr.year}</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Opening Balance', value: `₹${(yr.opening/100000).toFixed(1)}L` },
                  { label: 'Annual Interest', value: `+₹${(yr.annualInterest/100000).toFixed(1)}L`, red: true },
                  { label: 'Monthly Savings', value: `£${monthlySavingsGBP}/mo` },
                  { label: 'Annual Payment', value: `₹${(yr.totalPayment/100000).toFixed(1)}L` },
                  { label: 'Remaining Balance', value: `₹${(yr.closing/100000).toFixed(1)}L`, bold: true },
                ].map(({ label, value, red, bold }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[10px] text-[#667085]">{label}</span>
                    <span className={`text-[10px] font-bold figure ${red ? 'text-red-500' : 'text-[#161C2D]'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {yr.year < 3 && (
              <div className="flex flex-col items-center py-1">
                <svg height="28" width="2"><line x1="1" y1="0" x2="1" y2="28" stroke="#D0D5DD" strokeWidth="2" strokeDasharray="4 3" /></svg>
                <div className="w-2.5 h-2.5 rounded-full bg-lime-400" />
              </div>
            )}
          </div>
        ))}
        <div className="animate-journey-card delay-700 w-full">
          <CompletionCard />
        </div>
      </div>
    </div>
  );
}

function CompletionCard() {
  return (
    <div className="animate-confetti-pop bg-gradient-to-br from-lime-50 to-emerald-50 border-2 border-lime-300 rounded-2xl p-6 text-center shadow-lg shadow-lime-100/60 relative overflow-hidden">
      {/* Confetti dots */}
      {['top-2 left-4', 'top-3 right-6', 'top-1 left-1/2', 'top-4 right-12', 'top-2 left-16'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-2 h-2 rounded-full animate-bounce`}
          style={{ backgroundColor: ['#84cc16','#f59e0b','#ec4899','#3b82f6','#10b981'][i], animationDelay: `${i*150}ms` }} />
      ))}

      <div className="text-4xl mb-2 animate-confetti-pop">🎉</div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#667085] mb-1">Outstanding Balance</p>
      <div className="animate-balance-zero text-4xl font-bold text-lime-600 figure mb-2">₹0</div>
      <p className="text-base font-bold text-[#161C2D] mb-1">Congratulations!</p>
      <p className="text-[11px] text-[#667085] leading-relaxed">
        Your loan has been completely repaid.<br />No outstanding balance remains.
      </p>

      {/* Bottom success bar */}
      <div className="mt-4 flex items-center justify-center gap-2 bg-lime-100 border border-lime-200 rounded-xl px-4 py-2">
        <svg className="w-4 h-4 text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-[11px] font-bold text-lime-700">Loan Successfully Completed</span>
      </div>
    </div>
  );
}

function WalletCard({ isProUnlocked, onRequirePro }) {
  return (
    <div className="w-full flex justify-center pt-24 pb-12 mb-6">
      <div className={`wallet ${isProUnlocked ? 'pro-unlocked' : ''}`}>
        <div className="wallet-back"></div>

        <div className="wallet-card stripe">
          <div className="card-inner">
            <div className="card-top">
              <span>Stripe</span>
              <div className="chip"></div>
            </div>
            <div className="card-bottom">
              <div className="card-info">
                <span className="label">Holder</span>
                <span className="value">ALEX SMITH</span>
              </div>
              <div className="card-number-wrapper">
                <span className="hidden-stars">**** 4242</span>
                <span className="card-number">5524 9910 4242</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-card wise">
          <div className="card-inner">
            <div className="card-top">
              <span>Wise</span>
              <div className="chip"></div>
            </div>
            <div className="card-bottom">
              <div className="card-info">
                <span className="label">Business</span>
                <span className="value">STUDIO LLC</span>
              </div>
              <div className="card-number-wrapper">
                <span className="hidden-stars">**** 8810</span>
                <span className="card-number">9012 4432 8810</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-card paypal">
          <div className="card-inner">
            <div className="card-top">
              <span>Pay<b style={{ color: '#0079C1' }}>Pal</b></span>
              <div className="chip"></div>
            </div>
            <div className="card-bottom">
              <div className="card-info">
                <span className="label">Email</span>
                <span className="value">hello@work.com</span>
              </div>
              <div className="card-number-wrapper">
                <span className="hidden-stars">**** 0094</span>
                <span className="card-number">3312 0045 0094</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pocket">
          <svg className="pocket-svg" viewBox="0 0 280 160" fill="none">
            <path
              d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z"
              fill="#1e341e"
            ></path>
            <path
              d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z"
              stroke="#3d5635"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            ></path>
          </svg>
          
          <div className="pocket-content group">
            {isProUnlocked ? (
              <>
                <div style={{ position: 'relative', height: '24px', width: '100%' }}>
                  <div className="balance-stars">******</div>
                  <div className="balance-real">$12,450.00</div>
                </div>
                <div style={{ color: '#698263', fontSize: '12px', fontWeight: 500 }}>
                  Total Balance
                </div>
                <div className="eye-icon-wrapper">
                  <svg className="eye-icon eye-slash" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="3" x2="21" y2="21"></line></svg>
                  <svg className="eye-icon eye-open" style={{ opacity: 0 }} width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-x-0 -top-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto flex flex-col items-center justify-center bg-[#161C2D]/95 backdrop-blur-md border border-[#334155] rounded-[16px] p-5 w-64 shadow-2xl z-[100] text-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                  <p className="text-white/90 text-[11px] font-bold mb-4 leading-relaxed uppercase tracking-wider">This feature is available only in the Pro version. Upgrade to access your balance.</p>
                  <button onClick={onRequirePro} className="bg-lime-400 text-[#161C2D] px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-lime-300 transition-colors w-full active:scale-95">Upgrade to Pro</button>
                </div>
                <div className="transition-opacity group-hover:opacity-0 relative z-50 pointer-events-none">
                  <div style={{ position: 'relative', height: '24px', width: '100%' }}>
                     <div className="text-[#839e7b] text-2xl tracking-[4px]">******</div>
                   </div>
                   <div style={{ color: '#698263', fontSize: '12px', fontWeight: 500, marginTop: '8px' }}>
                     Total Balance
                   </div>
                   <div className="eye-icon-wrapper mx-auto">
                     <svg className="eye-icon" stroke="#839e7b" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle><line x1="3" y1="3" x2="21" y2="21"></line></svg>
                   </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
