import React, { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { LOAN } from '../config'
import { Card, StatTile, Badge } from './ui'

/**
 * Builds the full 3-year loan schedule: EMI deducted every month, plus a
 * lump-sum pre-payment every December. Balance is floored at 0.
 */
function buildLoanSchedule(timeline, basicLoan, targetYearlyLumpSumINR) {
  let balance = basicLoan
  return timeline.map((m) => {
    const isDecember = m.month === 11 // 0-indexed: 11 = December
    const emi = Math.min(LOAN.monthlyEMIINR, balance)
    balance = Math.max(0, balance - emi)
    let lumpSum = 0
    if (isDecember && balance > 0) {
      lumpSum = Math.min(targetYearlyLumpSumINR, balance)
      balance = Math.max(0, balance - lumpSum)
    }
    return { ...m, emi, lumpSum, balanceAfter: balance, isDecember }
  })
}

export default function LoanTracker() {
  const { timeline, derived, basicLoan } = useStore()
  const { targetYearlyLumpSumINR } = derived
  const schedule = useMemo(() => buildLoanSchedule(timeline, basicLoan, targetYearlyLumpSumINR), [timeline, basicLoan, targetYearlyLumpSumINR])

  const nextDec = schedule.find((s) => s.isDecember && s.lumpSum > 0)
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
          value={nextDec ? fmt(nextDec.balanceAfter) : fmt(finalBalance)}
          sub={nextDec ? `Post-${nextDec.label} ₹${(targetYearlyLumpSumINR/100000).toFixed(1)}L transfer` : 'Target achieved'}
          accent="text-[#161C2D]"
          badge="Next Milestone"
        />
      </div>

      <Card
        eyebrow="India Primary Loan Schedule"
        title="Amortization & Annual Prepayment Schedule Table"
        action={
          <span className="bg-[#F9FBFD] text-[#161C2D] border border-[#EEF2F7] text-xs font-bold px-3.5 py-1.5 rounded-full figure">
            Fixed EMI: {fmt(LOAN.monthlyEMIINR)}/mo
          </span>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-5 rounded-[16px] bg-[#F9FBFD] border border-[#EEF2F7] text-xs sm:text-sm text-[#667085]">
          <p>
            Standard monthly deduction is <span className="figure font-bold text-[#161C2D]">{fmt(LOAN.monthlyEMIINR)}</span> · Annual pre-payment scheduled every December for <span className="figure font-bold text-[#161C2D]">{fmt(targetYearlyLumpSumINR)}</span>
          </p>
          <div className="shrink-0 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">[DEC] Milestone Month</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 rounded-[16px] border border-[#EEF2F7] bg-white">
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
                    s.isDecember ? 'bg-amber-500/5 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-[#161C2D] whitespace-nowrap">
                    {s.label} {s.isDecember && <span className="text-amber-600 ml-1.5 text-xs font-mono bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">ANNUAL TRANSFER</span>}
                  </td>
                  <td className="py-3.5 px-4 figure text-[#667085]">{fmt(s.emi)}</td>
                  <td className="py-3.5 px-4 figure font-bold text-amber-600">
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
