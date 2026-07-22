import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN } from '../config'
import { Card, ProgressBar, StatTile, EditableStatTile, Badge, AnimatedCounter } from './ui'
import RoutePath from './RoutePath'
import MultiCurrencySavings from './MultiCurrencySavings'
import { triggerReportDownload, triggerOverviewReportDownload } from '../utils/downloadReport'

export default function Dashboard({ onViewReport, onRequirePro }) {
  const { derived, rate, customPlan, updateCustomPlan, basicLoan, setBasicLoan, darkMode, setDarkMode, isProUnlocked, isLoggedIn, setIsLoggedIn, isSessionActive, touchSession } = useStore()
  const { 
    savedThisMonth, 
    savedThisYear, 
    savedAllTime, 
    activeEMIsCount, 
    activeAssetsCount,
    targetYearlyLumpSumINR,
    targetMonthlySavingsGBP,
    deficitGBP,
    remainingMonths,
    catchUpMonthlySavingsGBP
  } = derived
  const { strategyChecks } = useStore()
  const [isSurplusFlipped, setIsSurplusFlipped] = React.useState(false)
  const [showMoreCards, setShowMoreCards] = React.useState(false)
  const [isEditingLoan, setIsEditingLoan] = React.useState(false)
  const [isRolloverExpanded, setIsRolloverExpanded] = React.useState(false)
  const [isNotificationDismissed, setIsNotificationDismissed] = React.useState(false)
  const [isCustomTargetNotificationDismissed, setIsCustomTargetNotificationDismissed] = React.useState(false)
  const pendingDownloadRef = React.useRef(false)
  const [isRadarHovered, setIsRadarHovered] = useState(false)

  // Expense range midpoint used for "money left" math (rent varies £250-300)
  const rentMid = customPlan.rentMid
  const extraExpenses = (customPlan.shopping || 0) + (customPlan.entertainment || 0) + (customPlan.health || 0) + (customPlan.education || 0) + (customPlan.insurance || 0) + (customPlan.misc || 0)
  const totalExpenses = rentMid + customPlan.bills + customPlan.travel + customPlan.food + extraExpenses
  const moneyLeftAfterSavings = customPlan.monthlyIncome - totalExpenses - customPlan.monthlySavingsTarget
  const monthOnTrack = savedThisMonth >= customPlan.monthlySavingsTarget
  const yearlyOnTrack = savedThisYear >= customPlan.monthlySavingsTarget * 12 || savedThisYear >= targetYearlyLumpSumINR

  const customTargetDeficit = targetMonthlySavingsGBP - customPlan.monthlySavingsTarget

  const performDownload = () => {
    const reportDate = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
    const reportId = 'FP-RPT-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const loanBalance = `₹${basicLoan.toLocaleString('en-IN')}`;
    const loanBalanceGBP = `£${(basicLoan / rate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    const monthlyIncomeStr = `£${customPlan.monthlyIncome.toLocaleString('en-GB')}`;
    const monthlyExpensesStr = `£${totalExpenses.toLocaleString('en-GB')}`;
    const monthlyTargetStr = `£${targetMonthlySavingsGBP.toLocaleString('en-GB')}`;
    const bufferAmt = Math.abs(moneyLeftAfterSavings);
    const bufferStr = `£${bufferAmt.toLocaleString('en-GB')}`;
    const bufferSign = moneyLeftAfterSavings >= 0 ? '' : '-';
    const exchangeRate = `£1 = ₹${rate.toFixed(2)}`;

    const estimatedTotalDebtGBP = (basicLoan / rate) + savedAllTime;
    const progressPercentNum = estimatedTotalDebtGBP > 0 ? Math.min(100, (savedAllTime / estimatedTotalDebtGBP) * 100) : 0;
    const progressPct = progressPercentNum.toFixed(1);
    const blocks = Math.round((progressPercentNum / 100) * 20);
    const progressBar = '█'.repeat(blocks) + '░'.repeat(20 - blocks);

    const completionDate = new Date(new Date().setMonth(new Date().getMonth() + remainingMonths)).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    const isOnTrack = strategyChecks.every(Boolean);
    const otherExpenses = (customPlan.shopping||0)+(customPlan.entertainment||0)+(customPlan.health||0)+(customPlan.education||0)+(customPlan.insurance||0)+(customPlan.misc||0);

    const bufferAnalysis = moneyLeftAfterSavings >= 0
      ? `After meeting all your monthly commitments — including rent, bills, travel, food, and your full loan repayment target — you have ${bufferStr} remaining each month. This buffer is your financial cushion. A healthy reserve means you can absorb unexpected costs without falling behind on your loan plan. If this figure consistently stays above £50, consider redirecting part of it toward your prepayment fund to bring your payoff date forward.`
      : `Your current income and expenses leave a shortfall of ${bufferStr} per month once your repayment target is factored in. This means your budget is running tight and any unexpected cost could create a shortfall. The most effective response is to review discretionary spending — reducing eating out, streaming subscriptions, or shopping by even a small amount each month can restore a positive buffer and keep your repayment plan on track.`;

    const reportText = `# Freedom Plan™ — Personal Debt Repayment Strategy Report

---

**Prepared for:** Your Personal Account
**Report Date:** ${reportDate}
**Reference:** ${reportId}

---

## Your Situation in Plain English

This report is built directly from the numbers you entered in your Freedom Plan dashboard. It gives you a clear, honest picture of where your loan stands right now — where your money is going each month, how much progress you have already made, and what you need to stay on course to reach debt freedom.

Whenever your circumstances change — a new salary, a shift in expenses, or a change in the exchange rate — simply generate a fresh report to keep your plan accurate.

---

## Loan & Finances at a Glance

| Detail | Amount |
| --- | ---: |
| Remaining Loan Balance | ${loanBalance} (${loanBalanceGBP}) |
| Monthly Income (UK) | ${monthlyIncomeStr} |
| Monthly Living Expenses | ${monthlyExpensesStr} |
| Monthly Repayment Target | ${monthlyTargetStr} |
| Available Monthly Buffer | ${bufferSign}${bufferStr} |
| Exchange Rate | ${exchangeRate} |
| Remaining Loan Term | ${remainingMonths} months |
| Projected Payoff | ${completionDate} |
| Repayment Status | ${isOnTrack ? '✅  On Track' : '⚠️  Needs Attention'} |

---

## How Far You Have Come

**Savings accumulated so far:** £${savedAllTime.toLocaleString('en-GB')}
**Progress toward debt freedom:** ${progressPct}%

${progressBar}  ${progressPct}%

You are targeting full payoff by **${completionDate}**. The single most important factor in hitting that date is staying consistent with your ${monthlyTargetStr} monthly savings goal. Even one missed month creates a gap that needs catching up — but one strong month of saving can pull your completion date noticeably forward.

---

## Your Monthly Budget

${bufferAnalysis}

Here is how your income is currently allocated each month:

| Category | Monthly Amount |
| --- | ---: |
| Rent | £${customPlan.rentMid.toLocaleString('en-GB')} |
| Bills & Utilities | £${customPlan.bills.toLocaleString('en-GB')} |
| Travel & Commute | £${customPlan.travel.toLocaleString('en-GB')} |
| Food & Groceries | £${customPlan.food.toLocaleString('en-GB')} |
| Other Expenses | £${otherExpenses.toLocaleString('en-GB')} |
| **Loan Repayment Target** | **${monthlyTargetStr}** |
| **Net Monthly Buffer** | **${bufferSign}${bufferStr}** |

---

## How Your Repayment Strategy Works

Your plan is built around saving **${monthlyTargetStr} per month** in the UK and transferring the accumulated amount to India once a year, typically in December, as a lump-sum principal prepayment. This approach directly chips away at your outstanding balance — and because interest is calculated on the remaining principal, every rupee you prepay today reduces the interest you owe on every year that follows.

With **${loanBalance}** still outstanding and ${remainingMonths} months left on your plan, momentum matters. Keep the exchange rate in mind too — at the current rate of ${exchangeRate}, every pound you save has real purchasing power on the ground in India.

---

## What To Do Next

**1. Protect your monthly savings target first.**
Treat the ${monthlyTargetStr} like a standing order that goes out at the start of the month — before discretionary spending. Once it is set aside, it cannot be spent.

**2. Track the exchange rate.**
Transferring when the rate is meaningfully above its current level could significantly boost your annual prepayment. Use the Currency tab in your dashboard to monitor shifts and time your transfer when conditions are favourable.

**3. Update your figures monthly.**
Your situation will evolve. Refreshing this report whenever your income, expenses, or loan balance changes ensures you are always working from accurate numbers.

**4. Use AI to pressure-test your plan.**
Upload this report to ChatGPT or Gemini and ask questions like:
- *"Given these figures, how much earlier could I repay my loan if I saved an extra £100 per month?"*
- *"Is my monthly savings target realistic for someone on this income and with these expenses?"*
- *"What is the fastest way to reduce my loan interest based on this plan?"*

---

## Important Notice

> This report is automatically generated from the financial information you provide in Freedom Plan™. It is intended to help you track repayment progress and organise your savings — it is not regulated financial advice. Actual outcomes will depend on your lender's terms, prevailing interest rates, exchange rate movements, and your personal financial circumstances. Always consult a qualified financial adviser before making major financial decisions.
`;

    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FreedomPlan_Repayment_Strategy_${reportId}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadStrategy = () => {
    const runDownload = () => {
      touchSession()
      triggerOverviewReportDownload({ basicLoan, rate, derived, customPlan })
      if (onViewReport) onViewReport()
    }

    if (isSessionActive) {
      runDownload()
    } else {
      if (onRequirePro) onRequirePro('dashboard', runDownload)
      else runDownload()
    }
  }

  // Called by the hidden trigger button after login completes successfully
  const executePendingAction = () => {
    if (pendingDownloadRef.current) {
      pendingDownloadRef.current = false
      performDownload()
      if (onViewReport) onViewReport()
    }
  }

  return (
    <div className="space-y-6">
      <button id="hidden-download-trigger" className="hidden" onClick={executePendingAction} aria-hidden="true" />
      {/* Top 3-Panel Stripe/Linear style Stat Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Monthly Savings in INR */}
        <div className="rounded-[22px] border border-[#E7ECF4] bg-white p-6 shadow-sm-clean relative isolate overflow-hidden group hover:-translate-y-1 hover:shadow-card transition-all duration-350 animate-slide-in-left">
          <img
            src={`${import.meta.env.BASE_URL}images/currency_conversion.png`}
            alt="Currency Conversion GBP to INR"
            className="absolute inset-0 w-full h-full object-cover z-[-2] transition-transform duration-700 group-hover:scale-105 opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40 w-full sm:w-4/5 z-[-1]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#161C2D] uppercase tracking-wider">
                Monthly Savings in INR
              </span>
              <span className="h-2 w-2 rounded-full bg-[#B6F36A]" />
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="figure text-3xl font-extrabold text-[#0D0F14]">
                <AnimatedCounter prefix="₹" value={Math.round(targetMonthlySavingsGBP * rate)} />
              </span>
              <span className="text-xs font-bold text-[#161C2D]/80 figure">/ mo target</span>
            </div>
            <div className="flex items-center justify-between pt-4 text-xs">
              <p className="text-[#161C2D] font-bold leading-tight pr-2">
                You have to save this money in Indian Rupees each month.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Yearly Prepayment Target */}
        <div className="rounded-[22px] border border-[#E7ECF4] bg-white p-6 shadow-sm-clean relative isolate overflow-hidden group hover:-translate-y-1 hover:shadow-card transition-all duration-350 animate-drop-in-top">
          <img
            src={`${import.meta.env.BASE_URL}images/prepayment_target.png`}
            alt="Yearly Prepayment Target"
            className="absolute inset-0 w-full h-full object-cover z-[-2] transition-transform duration-700 group-hover:scale-105 opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent w-full sm:w-3/5 z-[-1]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#161C2D] uppercase tracking-wider">
                Yearly Prepayment Target
              </span>
              <Badge variant="marigold">Dec Transfer</Badge>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="figure text-3xl font-extrabold text-[#0D0F14]">
                <AnimatedCounter prefix="₹" value={targetYearlyLumpSumINR} />
              </span>
              <span className="text-xs font-bold text-[#161C2D]/80 figure">£{(targetYearlyLumpSumINR / rate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex items-center justify-between pt-4 text-xs">
              <span className="text-[#161C2D] figure font-bold">Progress: £{savedThisYear.toLocaleString('en-GB')} saved</span>
              <span className="text-[#0D0F14] font-extrabold figure">{((savedThisYear/(targetMonthlySavingsGBP * 12))*100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Remaining Loan Amount */}
        <div className="rounded-[22px] border border-[#E7ECF4] bg-white p-6 shadow-sm-clean relative isolate overflow-hidden group hover:-translate-y-1 hover:shadow-card transition-all duration-350 animate-slide-in-bottom">
          <img
            src={`${import.meta.env.BASE_URL}images/loan_balance.png`}
            alt="Remaining Loan Amount"
            className="absolute inset-0 w-full h-full object-cover z-[-2] transition-transform duration-700 group-hover:scale-105 opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent w-full sm:w-3/5 z-[-1]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#161C2D] uppercase tracking-wider">
                Current Remaining Loan
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/95 text-[#161C2D] border border-[#EEF2F7] shadow-sm-clean cursor-help" title="Based on active pound rate">
                Editable
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-4 group/edit relative">
              {isEditingLoan ? (
                <>
                  <span className="text-3xl font-extrabold text-[#0D0F14]">₹</span>
                  <input
                    type="number"
                    value={basicLoan}
                    onChange={(e) => setBasicLoan(Number(e.target.value) || 0)}
                    onBlur={() => setIsEditingLoan(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingLoan(false)}
                    autoFocus
                    className="figure text-3xl font-extrabold text-[#0D0F14] bg-transparent border-b border-dashed border-neutral-400 focus:border-lime-500 outline-none w-[180px] p-0 m-0"
                  />
                </>
              ) : (
                <div 
                  onClick={() => setIsEditingLoan(true)}
                  className="cursor-pointer flex items-baseline gap-1 py-1 hover:bg-[#4A7BFF]/10 rounded-lg -ml-1 px-1 transition-all"
                  title="Click to edit"
                >
                  <span className="figure text-3xl font-extrabold text-[#0D0F14]">
                    <AnimatedCounter prefix="₹" value={basicLoan} />
                  </span>
                </div>
              )}
              <span className="text-xs font-bold text-[#161C2D]/80 figure ml-2">≈ £{(basicLoan / rate).toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-1.5 text-xs text-[#161C2D] font-bold">
                <span className="h-2 w-2 rounded-full bg-[#B6F36A]" /> Syncs with Analytics
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Income & Expenses Breakdown Card */}
      <Card
        eyebrow="Monthly Cashflow"
        title="Income & Expenses Allocation"
        centerAction={
          <div className="relative z-10 flex items-center mt-2 sm:mt-0">
            <label className="theme-switch" title="Toggle Dark/Light Mode">
              <input 
                type="checkbox" 
                className="theme-switch__checkbox" 
                checked={darkMode} 
                onChange={(e) => setDarkMode(e.target.checked)} 
              />
              <div className="theme-switch__container">
                <div className="theme-switch__clouds"></div>
                <div className="theme-switch__stars-container">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor"></path>
                  </svg>
                </div>
                <div className="theme-switch__circle-container">
                  <div className="theme-switch__sun-moon-container">
                    <div className="theme-switch__moon">
                      <div className="theme-switch__spot"></div>
                      <div className="theme-switch__spot"></div>
                      <div className="theme-switch__spot"></div>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>
        }
        action={
          <div className="flex items-center gap-1 bg-[#F9FBFD] p-1 rounded-[14px] border border-[#EEF2F7] text-xs relative z-10">
            <button 
              className={`px-3 py-1.5 rounded-[12px] font-bold shadow-sm transition-colors ${!showMoreCards ? 'bg-[#161C2D] text-white' : 'text-[#667085] hover:text-[#161C2D] bg-transparent'}`}
              onClick={() => setShowMoreCards(false)}
            >
              All Split
            </button>
            <button 
              className={`px-3 py-1.5 rounded-[12px] font-bold transition-colors ${showMoreCards ? 'bg-[#161C2D] text-white shadow-sm' : 'text-[#667085] hover:text-[#161C2D] bg-transparent'}`}
              onClick={() => setShowMoreCards(true)}
            >
              Add More
            </button>
          </div>
        }
      >
        <div className="overflow-hidden w-full mb-8 rounded-[22px]">
          <div 
            className="flex flex-nowrap transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ transform: showMoreCards ? 'translateX(-100%)' : 'translateX(0%)' }}
          >
            {/* Page 1 */}
            <div className="w-full flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <EditableStatTile
                  label="Monthly Income"
                  valueNumber={customPlan.monthlyIncome}
                  accent="text-[#161C2D]"
                  bgImage={`${import.meta.env.BASE_URL}images/currency.png`}
                  className="animate-stagger delay-100"
                  onSave={(val) => updateCustomPlan({ monthlyIncome: val })}
                />
                <EditableStatTile
                  label="Rent (Midpoint)"
                  valueNumber={customPlan.rentMid}
                  sub="Custom monthly estimate"
                  bgImage={`${import.meta.env.BASE_URL}images/rent.png`}
                  className="animate-stagger delay-200"
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ rentMid: val })}
                />
                <EditableStatTile
                  label="Utilities & Bills"
                  valueNumber={customPlan.bills}
                  bgImage={`${import.meta.env.BASE_URL}images/bills.png`}
                  className="animate-stagger delay-300"
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ bills: val })}
                />
                <EditableStatTile
                  label="UK Commute & Travel"
                  valueNumber={customPlan.travel}
                  bgImage={`${import.meta.env.BASE_URL}images/commute.png`}
                  className="animate-stagger delay-400"
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ travel: val })}
                />
                <EditableStatTile
                  label="Groceries & Food"
                  valueNumber={customPlan.food}
                  bgImage={`${import.meta.env.BASE_URL}images/food.png`}
                  className="animate-stagger delay-500"
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ food: val })}
                />
                <EditableStatTile
                  label="Monthly Prepayment Target"
                  valueNumber={customPlan.monthlySavingsTarget}
                  sub={`≈ ₹${Math.round(customPlan.monthlySavingsTarget * rate).toLocaleString('en-IN')} / mo`}
                  accent="text-[#161C2D] font-bold"
                  bgImage={`${import.meta.env.BASE_URL}images/target.png`}
                  className="animate-stagger delay-600"
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ monthlySavingsTarget: val })}
                />
              </div>
            </div>

            {/* Page 2 */}
            <div className="w-full flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <EditableStatTile
                  label="Shopping"
                  valueNumber={customPlan.shopping}
                  bgImage={`${import.meta.env.BASE_URL}images/shopping.png`}
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ shopping: val })}
                />
                <EditableStatTile
                  label="Entertainment"
                  valueNumber={customPlan.entertainment}
                  bgImage={`${import.meta.env.BASE_URL}images/entertainment.png`}
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ entertainment: val })}
                />
                <EditableStatTile
                  label="Healthcare"
                  valueNumber={customPlan.health}
                  bgImage={`${import.meta.env.BASE_URL}images/healthcare.png`}
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ health: val })}
                />
                <EditableStatTile
                  label="Education"
                  valueNumber={customPlan.education}
                  bgImage={`${import.meta.env.BASE_URL}images/education.png`}
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ education: val })}
                />
                <EditableStatTile
                  label="Insurance"
                  valueNumber={customPlan.insurance}
                  bgImage={`${import.meta.env.BASE_URL}images/insurance.png`}
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ insurance: val })}
                />
                <EditableStatTile
                  label="Miscellaneous"
                  valueNumber={customPlan.misc}
                  bgImage={`${import.meta.env.BASE_URL}images/misc.png`}
                  prefix="£"
                  onSave={(val) => updateCustomPlan({ misc: val })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 1. Multi-Currency Savings Display */}
        <MultiCurrencySavings targetGBP={customPlan.monthlySavingsTarget} />

        <div 
          className="relative isolate overflow-hidden rounded-[20px] bg-white dark:bg-neutral-950 border border-[#EEF2F7] dark:border-neutral-800 shadow-clean dark:shadow-xl min-h-[160px] group transition-all duration-350 hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer" 
          onClick={() => setIsSurplusFlipped(!isSurplusFlipped)}
          style={{ perspective: '1000px' }}
        >
          <div 
            className="relative w-full h-full min-h-[160px] transition-transform duration-700"
            style={{ 
              transformStyle: 'preserve-3d', 
              transform: isSurplusFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)' 
            }}
          >
            {/* Front Side */}
            <div className="absolute inset-0 w-full h-full p-6 flex flex-col items-center justify-center gap-1" style={{ backfaceVisibility: 'hidden' }}>
              {/* Image Section (Background) */}
              <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <img 
                  src={`${import.meta.env.BASE_URL}images/save.png`} 
                  alt="Savings" 
                  className="w-full h-full object-cover object-[center_30%]" 
                  style={{ opacity: 1, filter: 'none', mixBlendMode: 'normal' }}
                />
              </div>

              {/* Text Section (Center Overlay) */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-1 mt-2 text-center double-invert" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.5)' }}>
                <span className="text-xs font-bold text-white uppercase tracking-wider mb-2 drop-shadow-lg">
                  {moneyLeftAfterSavings >= 0 ? 'Net Monthly Surplus Buffer' : 'Net Monthly Deficit'}
                </span>
                <div className="flex flex-wrap justify-center items-center gap-3">
                  <span className={`figure text-5xl sm:text-6xl font-extrabold drop-shadow-xl ${moneyLeftAfterSavings >= 0 ? 'text-white' : 'text-[#ED000C]'}`}>
                    £{moneyLeftAfterSavings.toFixed(0)}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-neutral-900/95 text-white text-xs font-bold border border-neutral-700 shadow-md mt-2">
                    / month
                  </span>
                </div>
              </div>
            </div>

            {/* Back Side (Flipped) */}
            <div 
              className="absolute inset-0 w-full h-full bg-neutral-900 border border-neutral-700 rounded-[20px] p-6 flex items-center justify-center text-center"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
            >
              <span className="text-sm sm:text-base text-neutral-200 font-semibold leading-relaxed max-w-md">
                Amount remaining after covering living expenses plus your full £{customPlan.monthlySavingsTarget} loan target. Click to return.
              </span>
            </div>
          </div>
        </div>
      </Card>



      {/* Monthly Balance & Utilization - Exact Luxury Template with w-80 card size */}
      <div className="flex justify-center gap-6 w-full mt-6 flex-wrap items-stretch">
        
        {/* Pro Premium Card (Luminous Style) */}
        <div className="luminous-card-container shrink-0">
          <input type="checkbox" className="luminous-toggle-input" id="lum-toggle" />
          <div className="luminous-card">
            <div className="luminous-light-layer">
              <div className="luminous-lumen">
                <div className="min"></div>
                <div className="mid"></div>
                <div className="hi"></div>
              </div>
              <div className="luminous-darken">
                <div className="sl"></div>
                <div className="ll"></div>
                <div className="slt"></div>
                <div className="srt"></div>
              </div>
            </div>
            
            <div className="luminous-content">
              <div className="luminous-icon flex items-end justify-center gap-2 pb-5">
                {/* 3. Premium Card Enhancement: 3D Stars with Golden Glow */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  <defs>
                    <linearGradient id="gold-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#a16207" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#gold-grad-1)" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]">
                  <path fill="url(#gold-grad-1)" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-12 h-12 drop-shadow-[0_0_20px_rgba(250,204,21,0.7)] animate-pulse-strong" style={{ filter: 'drop-shadow(0px 8px 10px rgba(0,0,0,0.8))' }}>
                  <defs>
                    <radialGradient id="gold-grad-center" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                      <stop offset="0%" stopColor="#fef9c3" />
                      <stop offset="50%" stopColor="#facc15" />
                      <stop offset="100%" stopColor="#854d0e" />
                    </radialGradient>
                  </defs>
                  <path fill="url(#gold-grad-center)" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]">
                  <path fill="url(#gold-grad-1)" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  <path fill="url(#gold-grad-1)" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </div>
              <div className="luminous-bottom">
                <h3 className="luminous-title">Premium (£3/mo)</h3>
                <div className="luminous-description">
                   <p>Currently running offer. Original price £5.</p>
                   <div className="mt-3 flex flex-col gap-1 text-[11px] font-bold text-gray-300">
                     <p className="flex items-center gap-1.5"><svg viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="none"><rect rx="4" y="3" x="3" height="18" width="18"></rect><path d="m9 12l2.25 2L15 10"></path></g></svg> Savings Rescheduling</p>
                     <p className="flex items-center gap-1.5"><svg viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="none"><rect rx="4" y="3" x="3" height="18" width="18"></rect><path d="m9 12l2.25 2L15 10"></path></g></svg> Customizable Dashboards</p>
                     <p className="flex items-center gap-1.5"><svg viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="none"><rect rx="4" y="3" x="3" height="18" width="18"></rect><path d="m9 12l2.25 2L15 10"></path></g></svg> Advanced Budgeting</p>
                     <p className="flex items-center gap-1.5"><svg viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="none"><rect rx="4" y="3" x="3" height="18" width="18"></rect><path d="m9 12l2.25 2L15 10"></path></g></svg> Enhanced Security</p>
                   </div>
                </div>
                
                <label className="luminous-toggle" htmlFor="lum-toggle" onClick={() => { if (onRequirePro) onRequirePro(); else setWantsToDownload(true); }}>
                   <div className="luminous-handle"></div>
                   <span className="luminous-toggle-label">Sign Up</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative w-80 overflow-hidden rounded-2xl bg-neutral-950 p-6 font-sans shadow-2xl border border-neutral-800 double-invert">
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
                  <p className="font-semibold text-neutral-200">Monthly Balance</p>
                  <p className="text-xs text-neutral-500">Updated just now</p>
                </div>
              </div>
            </div>

            <div className="flex divide-x divide-neutral-800">
              <div className="flex-1 pr-6">
                <p className="text-xs font-medium text-neutral-500">Revenue (Income)</p>
                <p className="text-xl font-semibold text-neutral-100">£{customPlan.monthlyIncome.toLocaleString('en-GB')}</p>
                <p className="mt-1 text-xs font-medium text-lime-400">100%</p>
              </div>
              <div className="flex-1 pl-6">
                <p className="text-xs font-medium text-neutral-500">Costs (Utilisation)</p>
                <p className="text-xl font-semibold text-neutral-100">£{(totalExpenses + customPlan.monthlySavingsTarget).toLocaleString('en-GB')}</p>
                <p className={`mt-1 text-xs font-medium ${totalExpenses + customPlan.monthlySavingsTarget > customPlan.monthlyIncome ? 'text-[#ED000C]' : 'text-neutral-400'}`}>
                  {((totalExpenses + customPlan.monthlySavingsTarget) / (customPlan.monthlyIncome || 1) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="relative h-24 w-full">
              {(() => {
                const totalUtilisation = totalExpenses + customPlan.monthlySavingsTarget;
                const utilRatio = Math.min(totalUtilisation / (customPlan.monthlyIncome || 1), 1);
                const remainingRatio = 1 - utilRatio;
                // endY goes from 10 (when remaining is 100%) to 90 (when remaining is 0%)
                const endY = 90 - (remainingRatio * 80);
                const pathD = `M0,50 C100,50 200,${endY} 300,${endY}`;
                const fillD = `${pathD} L300,100 L0,100 Z`;
                const isWarning = utilRatio > 0.85;
                const color = isWarning ? '#f43f5e' : '#a3e635'; // Rose or Lime
                const colorHex = isWarning ? 'rose-500' : 'lime-400';

                return (
                  <>
                    <svg
                      className="h-full w-full"
                      viewBox="0 0 300 100"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="dynamic-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                      />
                      <path
                        d={fillD}
                        fill="url(#dynamic-gradient)"
                      />
                    </svg>
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: '300px',
                        top: `${endY}%`,
                        width: '12px',
                        height: '12px',
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-full shadow-lg"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 10px ${color}`
                        }}
                      />
                      <div
                        className="animate-pulse-strong absolute inset-0 rounded-full opacity-25 pointer-events-none scale-150"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="border-t border-neutral-800 pt-5">
              <button
                onClick={handleDownloadStrategy}
                className="w-full rounded-lg border border-lime-400/50 bg-transparent px-4 py-2 text-sm font-medium text-lime-400 transition-all duration-300 hover:bg-lime-400 hover:text-neutral-950 hover:shadow-lg hover:shadow-lime-400/30"
              >
                Download my repayment report
              </button>
            </div>
          </div>
        </div>
        
        {/* Radar Monthly Target Card */}
        <div 
          className="radar-outer shrink-0 cursor-default"
          onMouseEnter={() => setIsRadarHovered(true)}
          onMouseLeave={() => setIsRadarHovered(false)}
        >
          <div className="radar-dot"></div>
          <div className="radar-card">
            <div className="radar-ray"></div>
            <div className="radar-text transition-all duration-300">
              {isRadarHovered ? (
                <AnimatedCounter prefix="£" value={Math.round(targetMonthlySavingsGBP)} duration={1200} />
              ) : (
                <span className="opacity-70 tracking-widest text-white text-5xl">****</span>
              )}
            </div>
            <div className="text-sm font-semibold tracking-wider text-neutral-400 mt-1 uppercase">Monthly Target</div>
            <div className="radar-line radar-topl"></div>
            <div className="radar-line radar-leftl"></div>
            <div className="radar-line radar-bottoml"></div>
            <div className="radar-line radar-rightl"></div>
          </div>
        </div>
      </div>

      {/* Mathematical Strategy & Editable Pound Rate Removed */}
      
      {/* 4. Bottom Floating Bar (Custom Target Edit Warning) */}
      {customTargetDeficit > 0 && !isCustomTargetNotificationDismissed && (
        <div className="fixed bottom-0 inset-x-0 w-full z-50 animate-slide-up pb-4 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto w-full flex justify-center sm:justify-center lg:justify-end">
            <div className="w-full max-w-lg bg-neutral-950/95 backdrop-blur-xl border border-neutral-800/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
              <div className="p-4 flex items-start sm:items-center gap-3">
              <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                <div className="h-8 w-8 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-300 border border-neutral-700/50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Target Difference Notice</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  You are short by <strong>£{Math.ceil(customTargetDeficit).toLocaleString('en-GB')}</strong> from your required 3-year plan target (£{targetMonthlySavingsGBP}). This difference will be added to your next month.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCustomPlan({ monthlySavingsTarget: targetMonthlySavingsGBP })}
                  className="flex-shrink-0 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 rounded-lg text-xs font-bold text-neutral-200 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsCustomTargetNotificationDismissed(true)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
