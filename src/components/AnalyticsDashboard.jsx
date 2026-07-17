import React, { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, LOAN, CURRENCY } from '../config'
import { Card, Badge, StatTile, AnimatedCounter } from './ui'
import FlywayModal from './FlywayModal'

export default function AnalyticsDashboard({ onRequirePro }) {
  const { 
    timeline, entries, rate, setRate, derived, customPlan, basicLoan, setBasicLoan, isProUnlocked,
    interestRate, setInterestRate, moratoriumMonths, setMoratoriumMonths,
    coApplicantContribution, setCoApplicantContribution, hasCoApplicant, setHasCoApplicant
  } = useStore()
  
  const { targetYearlyLumpSumINR, targetMonthlySavingsGBP } = derived
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
  const [activeYearFilter, setActiveYearFilter] = useState('All')
  const [hoveredSlice, setHoveredSlice] = useState(null)
  const [simulatorYears, setSimulatorYears] = useState(10) // Default to 10 years like standard repayment
  const [simRate, setSimRate] = useState(rate) // Local state for Rate Simulator
  const [isFlywayModalOpen, setIsFlywayModalOpen] = useState(false)

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

  const handleDownloadDashboard = () => {
    if (!isProUnlocked) {
      onRequirePro();
      return;
    }
    const reportDate = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const reportId = 'ANALYTICS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Variables for the template
    const loanAmt = basicLoan.toLocaleString('en-IN');
    const emi = LOAN.monthlyEMIINR.toLocaleString('en-IN');
    const tenureMonths = moratoriumMonths;
    const completionDate = new Date(new Date().setMonth(new Date().getMonth() + derived.remainingMonths)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const totalSavingsGBP = derived.savedAllTime.toLocaleString('en-GB');
    const targetSavingsGBP = targetMonthlySavingsGBP.toLocaleString('en-GB');
    const monthlyIncome = customPlan.monthlyIncome.toLocaleString('en-GB');
    const monthlyExpenses = fixedExpenses.toLocaleString('en-GB');
    const monthlyBuffer = Math.max(0, surplus).toLocaleString('en-GB');
    
    const progressPercent = basicLoan > 0 ? Math.min(100, Math.max(0, (derived.savedAllTime / (derived.savedAllTime + (basicLoan/rate))) * 100)).toFixed(1) : 100;
    
    const reportText = `# Freedom Plan™ Strategy Report

### Personalized Financial Analysis & Debt Freedom Roadmap

**Report Generated:** ${reportDate}

**Reference ID:** ${reportId}

---

### Freedom Plan™ Overview

This report is generated using our **Freedom Plan™ Strategy**, a personalized financial planning approach that analyzes your income, expenses, loan details, savings capacity, repayment schedule, and exchange rate (where applicable).

The goal of the Freedom Plan™ is to help you manage your repayments sustainably while maintaining healthy cash flow and working toward long-term financial freedom.

---

## 1. Loan Analytics Summary

* **Remaining Loan Balance:** ₹${loanAmt}
* **Interest Rate (Annual):** ${interestRate}%
* **Grace Period / Tenure Configured:** ${tenureMonths} Months
* **Estimated Loan Completion Date:** ${completionDate}
* **Monthly Repayment Target (EMI):** ₹${emi}

---

## 2. Financial Distribution

This section illustrates how your loan is currently allocated across principal, repayments, savings, and remaining balance.

The chart below illustrates how your loan is currently distributed between your remaining principal, repayments made, savings applied, and interest (where applicable). It provides a clear visual overview of your current repayment position and updates automatically as your financial information changes.

---

## 3. Interest Analysis

Annual Interest Rate

${interestRate}%

Monthly Interest Rate

${(interestRate / 12).toFixed(2)}%

Loan Type

Reducing Balance

Estimated Interest Remaining

₹${((basicLoan * interestRate / 100) / 12).toFixed(0)} (Monthly Approx)

Monthly Interest on Outstanding Balance

₹${((basicLoan * interestRate / 100) / 12).toFixed(0)}

Analysis

Your interest calculations are based on your current outstanding loan balance and the configured loan terms. Making repayments on time helps reduce the overall interest payable throughout the repayment period.

---

## 4. Repayment Analysis

Current Repayment Status

${derived.strategyChecks?.every(Boolean) ? 'On Track' : 'Needs Attention'}

Monthly Repayment

₹${emi}

Remaining Loan Term

${derived.remainingMonths} Months

Estimated Completion

${completionDate}

Analysis

Your repayment schedule is evaluated using your latest financial information. Consistent repayments help maintain your projected completion timeline, while any updates to your financial profile automatically recalculate future repayment projections.

---

## 5. Savings & Cash Flow Analysis

Monthly Income

£${monthlyIncome}

Monthly Expenses

£${monthlyExpenses}

Monthly Savings

£${targetSavingsGBP}

Available Monthly Buffer

£${monthlyBuffer}

Analysis

Your current monthly cash flow indicates how much flexibility remains after planned expenses and savings. Maintaining a positive monthly buffer supports financial stability and helps manage unexpected expenses without disrupting your repayment plan.

---

## 6. Currency & Exchange Analysis

Current Exchange Rate

£1 = ₹${rate.toFixed(2)}

Base Currency

GBP

Target Currency

INR

Analysis

The Freedom Plan™ automatically adjusts calculations when exchange rates change. This helps ensure your repayment targets and financial projections remain accurate across different currencies.

---

## 7. Personalized Financial Insights

Based on your current trajectory, your repayment performance is heavily supported by your monthly target of £${targetSavingsGBP}. By maintaining your current cash flow health and reserving your £${monthlyBuffer} buffer, you minimize risks associated with sudden expenses. If your buffer allows, channeling extra funds towards your principal can significantly reduce your overall interest burden and accelerate your debt-free date.

These insights are generated using the Freedom Plan™ Strategy, which continuously evaluates your financial profile to provide personalized guidance based on your latest income, expenses, loan details, savings capacity, repayment schedule, and exchange rate. Every time your financial information changes, the analysis is automatically refreshed.

---

## 8. Report Summary

This report provides a comprehensive analysis of your current financial position based on the latest information available.

Summary

• Remaining Loan Balance: ₹${loanAmt}

• Estimated Loan Completion: ${completionDate}

• Current Repayment Status: ${derived.strategyChecks?.every(Boolean) ? 'On Track' : 'Needs Attention'}

• Monthly Savings Target: £${targetSavingsGBP}

• Available Monthly Buffer: £${monthlyBuffer}

Generate a new Analytics Report whenever your financial information changes to receive the latest calculations and personalized financial insights.

This report represents your current Freedom Plan™ Strategy and reflects the latest information available in your financial profile. We recommend generating a new report whenever your financial situation changes so your strategy remains accurate and up to date.
`;

    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Analytics_Report_${reportId}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

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
          accent="text-rose-600"
          badge="Liabilities"
        />
        <StatTile
          label="Projected Net Debt Position"
          value={<AnimatedCounter prefix="₹" value={Math.abs(selectedData.netWorthINR || 0)} />}
          sub={(selectedData.netWorthINR || 0) >= 0 ? 'Surplus Net Worth' : 'Remaining Net Debt'}
          accent={(selectedData.netWorthINR || 0) >= 0 ? 'text-[#161C2D]' : 'text-rose-600'}
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
                       <span className={`block text-[11px] figure font-bold mt-0.5 ${diffFromBase > 0 ? 'text-[#93E33C]' : 'text-rose-600'}`}>
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
        // EMI Calculation
        const P = basicLoan;
        const P_0 = basicLoan;
        const R_annual = interestRate;
        const M = moratoriumMonths;
        const coApplicant = hasCoApplicant ? coApplicantContribution : 0;
        
        const yearlyInterest = P_0 * (R_annual / 100);
        const R_monthly = R_annual / 12;
        const I_month = P_0 * (R_monthly / 100);
        const studentShare = Math.max(0, I_month - coApplicant);
        const I_unpaidTotal = studentShare * M;
        const P_grad = P_0 + I_unpaidTotal;
        
        const coApplicantPct = I_month > 0 ? (coApplicant / I_month) * 100 : 0;
        const principalPct = P_grad > 0 ? (P_0 / P_grad) * 100 : 0;

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
              <div className="flex-1 bg-white border border-[#EEF2F7] rounded-[24px] shadow-sm-clean p-6 lg:p-8 flex flex-col justify-start space-y-8">
                
                {/* Loan Amount */}
                <div className="space-y-4 relative z-10 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#161C2D]">How much your loan have currently?</label>
                    <div className="bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl px-4 py-2 flex items-center gap-2">
                      <span className="text-[#4A7BFF] font-bold">₹</span>
                      <span className="text-lg font-extrabold text-[#161C2D] figure">{basicLoan.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="100000" 
                      max="10000000" 
                      step="50000" 
                      value={basicLoan} 
                      onChange={(e) => setBasicLoan(Number(e.target.value))}
                      style={getSliderStyle(basicLoan, 100000, 10000000)}
                      className="w-full h-2.5 bg-[#EEF2F7] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#D0D5DD] transition-colors range-3d"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-2 tracking-wider">
                      <span>₹1,00,000</span>
                      <span>₹1,00,00,000</span>
                    </div>
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#161C2D]">Interest rate (per year)</label>
                    <div className="bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl px-4 py-2 flex items-center gap-1">
                      <span className="text-lg font-extrabold text-[#161C2D] figure">{interestRate}</span>
                      <span className="text-[#667085] font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      step="0.1" 
                      value={interestRate} 
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      style={getSliderStyle(interestRate, 1, 20)}
                      className="w-full h-2.5 bg-[#EEF2F7] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#D0D5DD] transition-colors range-3d"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-2 tracking-wider">
                      <span>1%</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>

                {/* Course + Grace Period */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#161C2D]">Course + grace period</label>
                    <div className="bg-[#F9FBFD] border border-[#EEF2F7] rounded-xl px-4 py-2 flex items-center gap-1">
                      <span className="text-lg font-extrabold text-[#161C2D] figure">{moratoriumMonths}</span>
                      <span className="text-[#667085] font-bold text-sm">months</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="12" 
                      max="72" 
                      step="6" 
                      value={moratoriumMonths} 
                      onChange={(e) => setMoratoriumMonths(Number(e.target.value))}
                      style={getSliderStyle(moratoriumMonths, 12, 72)}
                      className="w-full h-2.5 bg-[#EEF2F7] rounded-full appearance-none cursor-grab active:cursor-grabbing hover:bg-[#D0D5DD] transition-colors range-3d"
                    />
                    <div className="flex justify-between text-[11px] font-bold text-[#98A2B3] mt-2 tracking-wider">
                      <span>12 mos</span>
                      <span>72 mos</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <WalletCard isProUnlocked={isProUnlocked} onRequirePro={onRequirePro} />
                </div>

              </div>

              {/* Right Column: Results */}
              <div className="flex-1 flex flex-col gap-6">
                
                {/* Section 1: During Course + Grace (Interest Only) */}
                <div className="bg-gradient-to-br from-lime-400 to-lime-500 rounded-[24px] p-8 text-center shadow-xl shadow-lime-500/20 text-neutral-950 relative overflow-hidden group border border-lime-300">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                  <div className="absolute -top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/20 blur-3xl transition-all duration-700 group-hover:bg-white/30" />
                  
                  <h3 className="text-xs font-bold uppercase tracking-widest text-lime-900/70 mb-4 relative z-10">Total Interest Accumulation</h3>
                  <div className="flex items-center justify-center gap-2 mb-3 relative z-10">
                    <span className="text-6xl font-black tracking-tighter figure leading-none">
                       <AnimatedCounter prefix="₹" value={Math.round((basicLoan * (interestRate / 100)) * (moratoriumMonths / 12))} />
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-lime-900/80 mb-8 relative z-10">
                    Calculated at {interestRate}% for {moratoriumMonths / 12} {moratoriumMonths / 12 === 1 ? 'year' : 'years'} ({moratoriumMonths} months)
                  </p>

                  <div className="border-t border-lime-600/20 pt-6 grid grid-cols-3 gap-4 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-lime-900/70 mb-1">Principal</p>
                      <p className="text-lg font-black figure">₹{(P_0 / 100000).toFixed(1)}L</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-lime-900/70 mb-1">Unpaid Interest</p>
                      <p className="text-lg font-black figure">₹{(I_unpaidTotal / 100000).toFixed(1)}L</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-lime-900/70 mb-1">New Principal</p>
                      <p className="text-lg font-black figure">₹{(P_grad / 100000).toFixed(1)}L</p>
                    </div>
                  </div>

                  <p className="mt-6 text-[10.5px] font-bold text-lime-900/60 relative z-10 leading-relaxed text-center px-2 uppercase tracking-wide">
                    *If you want to significantly reduce your interest and principal burden, carefully follow Step 1 and Step 2 below.
                  </p>
                </div>

                {/* Monthly Breakdown Pie Chart (Grey Box) */}
                <div className="bg-[#161C2D] border border-[#232A3B] rounded-[24px] shadow-sm-clean p-6 flex flex-col sm:flex-row items-center gap-8">
                   <div className="relative w-40 h-40 flex-shrink-0 group">
                      <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                        {/* Track (Student Share) */}
                        <circle cx="21" cy="21" r="15.9154943" fill="transparent" stroke="#334155" strokeWidth="6" className="opacity-90" />
                        {/* Co-applicant Progress */}
                        <circle 
                          cx="21" cy="21" r="15.9154943" 
                          fill="transparent" 
                          stroke="#B6F36A" 
                          strokeWidth="6" 
                          strokeDasharray={`${coApplicantPct} ${100 - coApplicantPct}`}
                          strokeDashoffset="0"
                          className="drop-shadow-md"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-widest mb-0.5">Total/mo</span>
                        <span className="text-xl font-black text-white figure">{Math.round(I_month / 1000)}K</span>
                      </div>
                   </div>

                   {/* Legend and Monthly Strategy */}
                   <div className="flex-1 space-y-4 w-full">
                     <div className="bg-[#1D2435] border border-[#2E374A] rounded-[14px] p-4 flex flex-col justify-between transition-colors hover:bg-[#232A3B] group cursor-default">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                           <label className="flex items-center gap-4 cursor-pointer">
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
                       <span className="text-lg font-black text-white figure mt-1">₹{coApplicant.toLocaleString('en-IN')}</span>
                     </div>
                     <div className="bg-[#1D2435] border border-[#2E374A] rounded-[14px] p-4 flex flex-col justify-between transition-colors hover:bg-[#232A3B] group cursor-default">
                       <div className="flex items-center gap-3 mb-3">
                         <div className="w-3 h-3 rounded-full bg-[#334155] shadow-sm"></div>
                         <span className="text-xs font-bold text-[#98A2B3] uppercase tracking-wider">Unpaid (Added)</span>
                       </div>
                       <span className="text-lg font-black text-white figure">₹{Math.round(studentShare).toLocaleString('en-IN')}</span>
                     </div>
                   </div>
                </div>



                {/* Section 3: 3-Year Repayment Strategy (GBP INR Freedom Plan) */}
                <div className="bg-white border border-[#EEF2F7] rounded-[24px] shadow-sm-clean p-6 sm:p-8 flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#667085] mb-5">Step 2: Automatic Monthly Savings Target</h3>
                  
                  <div className="flex flex-col gap-4 mb-8">
                    <div className="flex justify-between items-center bg-[#F9FBFD] border border-[#EEF2F7] rounded-[14px] p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">Yearly Payment Goal</span>
                      <span className="text-xl font-black text-[#161C2D] figure">₹{targetYearlyLumpSumINR.toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="flex justify-center -my-2 z-10">
                      <div className="bg-white border border-[#EEF2F7] rounded-full p-1.5 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6F36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-[#161C2D] border border-[#161C2D] rounded-[14px] p-5 shadow-lg">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Monthly Saving Target</span>
                      <div className="text-right">
                        <span className="block text-2xl font-black text-[#B6F36A] figure">£{targetMonthlySavingsGBP.toLocaleString('en-GB')} / mo</span>
                        <span className="block text-[10px] font-semibold text-white/60 mt-1">₹{Math.floor(targetYearlyLumpSumINR / 12).toLocaleString('en-IN')} equivalent</span>
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
                          <span className="text-xs font-semibold text-[#667085]">Save <span className="font-bold text-[#161C2D]">£{targetMonthlySavingsGBP.toLocaleString('en-GB')}</span>/mo</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#B6F36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          <span className="text-xs font-bold text-[#161C2D]">Pay ₹{targetYearlyLumpSumINR.toLocaleString('en-IN')}</span>
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
