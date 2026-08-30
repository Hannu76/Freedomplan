import React, { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { LOAN } from '../config'
import { Card, StatTile, Badge } from './ui.jsx'

/**
 * Builds the full loan schedule: EMI deducted every month based on Savings strategy,
 * plus the exact annual repayment amount from Savings applied at the end of each
 * 12-month plan phase (Month 12, e.g. July for an August intake). Balance is floored at 0.
 */
function buildLoanSchedule(timeline, basicLoan, threeYearPlan, defaultYearlyLumpSumINR) {
  let balance = basicLoan
  const monthlyEmi = LOAN.monthlyEMIINR || 5000

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
  const { timeline, derived, basicLoan } = useStore()
  const { threeYearPlan, planYearlyLumpSumINR } = derived

  // Active Savings yearly prepayment target as the single source of truth
  const currentYearlyTarget = planYearlyLumpSumINR || (threeYearPlan && threeYearPlan[0]?.yearlyLumpSumINR) || 1013333

  const schedule = useMemo(
    () => buildLoanSchedule(timeline, basicLoan, threeYearPlan, currentYearlyTarget),
    [timeline, basicLoan, threeYearPlan, currentYearlyTarget]
  )

  const nextMilestone = schedule.find((s) => s.isYearEndMilestone && s.lumpSum > 0)
  const finalBalance = schedule[schedule.length - 1]?.balanceAfter ?? 0

  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Summary Info Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatTile
          label="Starting Principal"
          value={fmt(basicLoan)}
          sub="Initial India Loan Balance"
          accent="text-[#161C2D]"
          badge="Liabilities"
        />
        <StatTile
          label="Remaining After Next Prepayment"
          value={nextMilestone ? fmt(nextMilestone.balanceAfter) : fmt(finalBalance)}
          sub={nextMilestone ? `Post-${nextMilestone.label} ₹${(nextMilestone.lumpSum / 100000).toFixed(1)}L transfer` : 'Target achieved'}
          accent="text-[#161C2D]"
          badge="Next Milestone"
        />
      </div>

      <Card
        eyebrow="India Primary Loan Schedule"
        title="Amortization & Annual Prepayment Schedule Table"
        action={
          <span className="bg-[#F9FBFD] text-[#161C2D] border border-[#EEF2F7] text-xs font-bold px-3.5 py-1.5 rounded-full figure">
            Fixed EMI: {fmt(LOAN.monthlyEMIINR || 5000)}/mo
          </span>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-5 rounded-[16px] bg-[#F9FBFD] border border-[#EEF2F7] text-xs sm:text-sm text-[#667085]">
          <p>
            Standard monthly deduction is <span className="figure font-bold text-[#161C2D]">{fmt(LOAN.monthlyEMIINR || 5000)}</span> · Annual pre-payment scheduled at end of each 12-month phase for <span className="figure font-bold text-[#161C2D]">{fmt(currentYearlyTarget)}</span>
          </p>
          <div className="shrink-0 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-black tracking-wider">Annual Milestone Month</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[16px] border border-[#EEF2F7] bg-white">
          <table className="w-full text-xs sm:text-sm min-w-[580px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-[#667085] border-b border-[#EEF2F7] bg-[#F9FBFD]">
                <th className="py-3.5 px-4">Timeline Period</th>
                <th className="py-3.5 px-4 figure">Monthly EMI (₹)</th>
                <th className="py-3.5 px-4 figure">Annual Prepayment (₹)</th>
                <th className="py-3.5 px-4 figure">Remaining Principal (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {schedule.map((s) => (
                <tr
                  key={s.key}
                  className={`transition-colors hover:bg-[#F9FBFD] ${
                    s.isYearEndMilestone ? 'bg-emerald-500/10 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-[#161C2D] whitespace-nowrap">
                    {s.label} {s.isYearEndMilestone && <span className="text-black font-extrabold ml-1.5 text-xs">ANNUAL TRANSFER</span>}
                  </td>
                  <td className="py-3.5 px-4 figure text-[#667085]">{fmt(s.emi)}</td>
                  <td className="py-3.5 px-4 figure font-bold text-emerald-600">
                    {s.lumpSum > 0 ? fmt(s.lumpSum) : <span className="text-[#667085]/40 font-normal">—</span>}
                  </td>
                  <td className="py-3.5 px-4 figure font-bold">
                    {s.balanceAfter === 0 ? (
                      <span className="bg-[#B6F36A]/20 text-[#161C2D] border border-[#B6F36A]/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        ₹0 (PAID IN FULL)
                      </span>
                    ) : (
                      <span className="text-[#161C2D]">{fmt(s.balanceAfter)}</span>
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
