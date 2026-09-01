import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { LOAN } from '../config'
import { Card, BANKNOTE_URL, BEFORE_URL, BLACK_TEXT_URL, TRICOLOR_WHITE_URL, WHITE_TEXT_URL } from './ui.jsx'
import { Sparkles, CheckCircle2, Clock, Calendar, CreditCard, TrendingDown, Landmark, Percent } from 'lucide-react'

/**
 * Builds the full loan schedule: EMI deducted every month based on Savings strategy,
 * plus the exact annual repayment amount from Savings applied at the end of each
 * 12-month plan phase (Month 12, e.g. July for an August intake). Balance is floored at 0.
 * NOTE: PURE BUSINESS CALCULATION ENGINE - STRICTLY PRESERVED AS REQUIRED BY ARCHITECTURE RULES.
 */
function buildLoanSchedule(timeline, basicLoan, threeYearPlan, defaultYearlyLumpSumINR, monthlyEmi = 5000) {
  let balance = basicLoan

  return timeline.map((m, idx) => {
    // End of 12-month phase milestone (Month 12 of each plan year)
    const isYearEndMilestone = (idx % 12 === 11) || (idx === timeline.length - 1)
    const planYearIdx = Math.floor(idx / 12)
    const yearPlan = threeYearPlan && threeYearPlan[planYearIdx] ? threeYearPlan[planYearIdx] : null
    const yearlyTargetINR = yearPlan?.yearlyLumpSumINR || defaultYearlyLumpSumINR || 1013333

    const emiDeduction = Math.min(monthlyEmi, balance)
    balance = Math.max(0, balance - emiDeduction)

    let lumpSum = 0
    if (isYearEndMilestone && balance > 0) {
      lumpSum = Math.min(yearlyTargetINR, balance)
      balance = Math.max(0, balance - lumpSum)
    }

    return {
      ...m,
      planYearNumber: planYearIdx + 1,
      emi: emiDeduction,
      lumpSum,
      balanceAfter: balance,
      isYearEndMilestone,
      yearlyTargetINR,
    }
  })
}

export default function LoanTracker() {
  const { timeline, derived, basicLoan, coApplicantContribution, hasCoApplicant, interestRate } = useStore()
  const { threeYearPlan, planYearlyLumpSumINR } = derived

  // Active settled interest rate & dynamic yearly interest calculation (single source of truth)
  const settledInterestRate = Number(interestRate) || 12
  const yearlyInterest = Math.round(basicLoan * (settledInterestRate / 100))

  // Active dynamic monthly EMI sourced from co-applicant fee (single source of truth)
  const monthlyEmi = (hasCoApplicant ? Number(coApplicantContribution) : 0) || derived?.monthlyEMIINR || LOAN.monthlyEMIINR || 5000

  // Active Savings yearly prepayment target as the single source of truth
  const currentYearlyTarget = planYearlyLumpSumINR || (threeYearPlan && threeYearPlan[0]?.yearlyLumpSumINR) || 1013333

  const schedule = useMemo(
    () => buildLoanSchedule(timeline, basicLoan, threeYearPlan, currentYearlyTarget, monthlyEmi),
    [timeline, basicLoan, threeYearPlan, currentYearlyTarget, monthlyEmi]
  )

  const nextMilestone = schedule.find((s) => s.isYearEndMilestone && s.lumpSum > 0)
  const finalBalance = schedule[schedule.length - 1]?.balanceAfter ?? 0

  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="space-y-7 animate-slide-up">
      {/* ========================================================= */}
      {/* 1. UK FLAG & HERO BANKNOTE COCKPIT (RED, BLUE, BLACK, WHITE) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Titanium Crimson Red (Initial Principal) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-red-900/60 shadow-lg bg-[#B0102B] text-white flex flex-col justify-between"
          style={{
            backgroundImage: BEFORE_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-red-100">
              Total Principal
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              <CreditCard className="w-3 h-3" />
              India Loan
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-white">
              {fmt(basicLoan)}
            </div>
            <p className="text-[11px] font-semibold text-red-200 mt-1">
              Starting Committed Principal
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-red-300 to-transparent rounded-full opacity-80" />
        </motion.div>

        {/* Card 2: Royal Blue Banknote (Yearly Interest) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-blue-900/60 shadow-lg bg-[#00439F] text-white flex flex-col justify-between"
          style={{
            backgroundImage: BANKNOTE_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-blue-100">
              Yearly Interest
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              <Percent className="w-3 h-3 text-accent-green" />
              {settledInterestRate}% p.a.
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-white">
              {fmt(yearlyInterest)}
            </div>
            <p className="text-[11px] font-semibold text-blue-200 mt-1">
              Interest charged for Year 1 ({settledInterestRate}% rate)
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-80" />
        </motion.div>

        {/* Card 3: Obsidian Black (Annual Target Prepayment) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-slate-800 shadow-lg bg-[#12151B] text-white flex flex-col justify-between"
          style={{
            backgroundImage: BLACK_TEXT_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-300">
              Annual Prepayment
            </span>
            <span className="inline-flex items-center gap-1 bg-white/15 text-white border border-white/25 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-accent-green" />
              Lump Sum
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-white">
              {fmt(currentYearlyTarget)}
              <span className="text-xs font-semibold text-slate-400 ml-1">/yr</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              12-Month Acceleration Target
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-slate-400 to-transparent rounded-full opacity-80" />
        </motion.div>

        {/* Card 4: White Tricolor Banknote (Red, Blue, Black Lines on White) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-slate-300 shadow-md bg-white text-[#161C2D] flex flex-col justify-between"
          style={{
            backgroundImage: TRICOLOR_WHITE_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#667085]">
              Next Milestone
            </span>
            <span className="inline-flex items-center gap-1 bg-white text-[#161C2D] border border-slate-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Target Balance
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-[#161C2D]">
              {nextMilestone ? fmt(nextMilestone.balanceAfter) : fmt(finalBalance)}
            </div>
            <p className="text-[11px] font-semibold text-[#667085] mt-1">
              {nextMilestone
                ? `Post-₹${(nextMilestone.lumpSum / 100000).toFixed(1)}L transfer`
                : 'Freedom goal reached'}
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-[#B0102B] via-[#00439F] to-[#161C2D] rounded-full opacity-80" />
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 2. ROYAL BLUE HERO-STYLE PREPAYMENT CALLOUT BANNER        */}
      {/* ========================================================= */}
      <div
        className="relative overflow-hidden rounded-card p-5 sm:p-6 border border-blue-900/50 shadow-md bg-[#00439F] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          backgroundImage: BANKNOTE_URL,
          backgroundPosition: 'center',
          backgroundSize: 'auto 150%',
        }}
      >
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-[16px] bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-accent-green" />
          </div>
          <div>
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-blue-200 block mb-0.5">
              Scheduled Prepayment Cadence
            </span>
            <p className="text-xs sm:text-sm text-white leading-relaxed">
              Standard monthly deduction is <span className="font-mono font-bold text-accent-green">{fmt(monthlyEmi)}</span> · Annual pre-payment scheduled every 12 months for <span className="font-mono font-bold text-white">{fmt(currentYearlyTarget)}</span>
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-start sm:self-center px-4 py-2 rounded-full bg-white/15 border border-white/25 text-white backdrop-blur-sm shadow-sm relative z-10">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green" />
          </span>
          <span className="text-[11px] font-black tracking-wider uppercase">Annual Milestone Phase</span>
        </div>

        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-80" />
      </div>

      {/* ========================================================= */}
      {/* 3. AMORTIZATION SCHEDULE TABLE                            */}
      {/* ========================================================= */}
      <Card
        eyebrow="India Primary Loan Schedule"
        title="Amortization & Annual Prepayment Schedule Table"
        action={
          <span
            className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs bg-[#00439F] text-white shadow-md border border-blue-900/50"
            style={{
              backgroundImage: BANKNOTE_URL,
              backgroundPosition: 'center',
              backgroundSize: 'auto 150%',
            }}
          >
            <Clock className="w-3.5 h-3.5 text-accent-green" />
            <span>Fixed EMI: {fmt(monthlyEmi)}/mo</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-80" />
          </span>
        }
      >
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-sm mt-2">
          <table className="w-full text-xs sm:text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] font-display font-bold uppercase tracking-wider text-secondary border-b border-border bg-surface-2">
                <th className="py-4 px-5">Timeline Period</th>
                <th className="py-4 px-5 font-mono text-left">Monthly EMI (₹)</th>
                <th className="py-4 px-5 font-mono text-left">Annual Prepayment (₹)</th>
                <th className="py-4 px-5 font-mono text-right">Remaining Principal (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedule.map((s) => (
                <tr
                  key={s.key}
                  className={`transition-colors duration-150 ${
                    s.isYearEndMilestone
                      ? 'bg-rose-50/40 font-semibold hover:bg-rose-50/70'
                      : 'hover:bg-surface-2/70'
                  }`}
                >
                  <td className="py-4 px-5 font-bold text-primary whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      <span>{s.label}</span>
                      {s.isYearEndMilestone && (
                        <span
                          className="inline-flex items-center gap-1 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs"
                          style={{
                            backgroundImage: BEFORE_URL,
                            backgroundColor: '#B0102B',
                            backgroundSize: 'cover',
                          }}
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          Annual Transfer
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-5 font-mono tabular-nums text-secondary">
                    {fmt(s.emi)}
                  </td>
                  <td className="py-4 px-5 font-mono tabular-nums">
                    {s.lumpSum > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-white font-mono font-bold px-3 py-1 rounded-md shadow-xs text-xs"
                        style={{
                          backgroundImage: BANKNOTE_URL,
                          backgroundColor: '#00439F',
                          backgroundSize: 'cover',
                        }}
                      >
                        {fmt(s.lumpSum)}
                      </span>
                    ) : (
                      <span className="text-secondary/40 font-normal">—</span>
                    )}
                  </td>
                  <td className="py-4 px-5 font-mono tabular-nums text-right">
                    {s.balanceAfter === 0 ? (
                      <span className="inline-flex items-center gap-1.5 bg-[#B6F36A] text-[#161C2D] border border-[#B6F36A] px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#161C2D]" />
                        ₹0 (PAID IN FULL)
                      </span>
                    ) : (
                      <span className="font-bold text-primary text-sm sm:text-base">
                        {fmt(s.balanceAfter)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
