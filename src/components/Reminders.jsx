import React from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN } from '../config'
import { Card, StatTile, Badge } from './ui'
import { daysUntilNextDec31 } from '../utils/dates'

export default function Reminders() {
  const { currentKey, getEntry, updateEntry, generalNotes, setGeneralNotes, timeline } = useStore()
  const currentMonthLabel = timeline[0]?.label
  const entry = getEntry(currentKey)
  const daysLeft = daysUntilNextDec31()

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatTile
          label="Countdown to Annual Prepayment"
          value={`${daysLeft} Days Left`}
          sub="Until next December 31 milestone transfer"
          accent="text-amber-600"
          badge="Annual Milestone"
        />
        <StatTile
          label="Current Month Status"
          value={entry.transferred ? 'Verified Logged' : 'Pending Action'}
          sub={`Monthly target £${PLAN.monthlySavingsTarget} (${currentMonthLabel})`}
          accent={entry.transferred ? 'text-[#161C2D]' : 'text-rose-600'}
          badge={entry.transferred ? 'Completed' : 'Action Required'}
        />
      </div>

      <Card eyebrow="Execution compliance" title="Monthly Reminders & Ledger Log">
        <div className="space-y-6">
          <p className="text-xs sm:text-sm text-[#667085]">
            Maintain your audit trail and verify monthly UK transfers before the deadline. Logging notes ensures transparent currency conversion and fee tracking.
          </p>

          <label className={`flex items-center justify-between gap-4 rounded-[18px] border p-6 cursor-pointer transition-all shadow-sm-clean ${
            entry.transferred
              ? 'border-[#B6F36A] bg-[#B6F36A]/10'
              : 'border-[#EEF2F7] bg-[#F9FBFD] hover:border-[#D0D5DD]'
          }`}>
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={entry.transferred}
                onChange={(e) => updateEntry(currentKey, { transferred: e.target.checked })}
                className="h-5 w-5 rounded-[6px] accent-[#161C2D] cursor-pointer"
              />
              <div>
                <span className="block text-sm sm:text-base font-bold text-[#161C2D]">
                  Confirm UK Transfer: £{PLAN.monthlySavingsTarget}
                </span>
                <span className="text-xs text-[#667085]">
                  Target period: <span className="font-semibold text-[#161C2D]">{currentMonthLabel}</span>
                </span>
              </div>
            </div>
            <Badge variant={entry.transferred ? 'good' : 'default'}>
              {entry.transferred ? 'VERIFIED' : 'UNCONFIRMED'}
            </Badge>
          </label>

          <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#161C2D] mb-2.5" htmlFor="notes">
              Ledger Audit Notes <span className="text-[#667085] font-normal">(transfer fees, remittance platforms, fx anchor details)</span>
            </label>
            <textarea
              id="notes"
              rows={4}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="e.g. Transferred via Wise using live FX anchor ₹127.4/£. Transfer fee deducted: £2.10."
              className="w-full rounded-[16px] border border-[#EEF2F7] bg-white p-4 text-xs sm:text-sm text-[#161C2D] placeholder-[#667085]/40 focus:border-[#B6F36A] focus:outline-none focus:ring-4 focus:ring-[#B6F36A]/15 transition-all resize-none"
            />
          </div>

          <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3 font-bold text-amber-700">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Next December Pre-payment Target: ₹{PLAN.yearlyTarget.toLocaleString('en-IN')} (£{PLAN.yearlyTarget.toLocaleString('en-GB')})</span>
            </div>
            <span className="figure font-bold px-3.5 py-1.5 rounded-full bg-white border border-amber-300 text-[#161C2D] text-xs shadow-sm-clean">
              {daysLeft} Days Remaining
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
