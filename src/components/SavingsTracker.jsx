import React, { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, MONTH_NAMES } from '../config'
import { Card, StatTile } from './ui'
import { downloadCSV } from '../utils/csv'

export default function SavingsTracker() {
  const { timeline, entries, updateEntry, timelineConfig, updateTimelineConfig, derived } = useStore()
  
  let runningTotal = 0

  const rows = timeline.map((m) => {
    const saved = entries[m.key]?.saved || 0
    runningTotal += saved
    const status = saved >= derived.targetMonthlySavingsGBP ? 'Completed' : 'Pending'
    const pctComplete = Math.min(100, ((saved / derived.targetMonthlySavingsGBP) * 100)).toFixed(0)
    return { ...m, saved, status, pctComplete, savedSoFar: runningTotal }
  })

  const distinctYears = Array.from(new Set(rows.map(r => String(r.year))))
  const [activeYear, setActiveYear] = useState(() => distinctYears[0] || 'All')

  useEffect(() => {
    if (activeYear !== 'All' && !distinctYears.includes(activeYear)) {
      setActiveYear(distinctYears[0] || 'All')
    }
  }, [distinctYears, activeYear])

  const filteredRows = activeYear === 'All'
    ? rows
    : rows.filter(r => String(r.year) === activeYear)

  const overallSaved = rows[rows.length - 1]?.savedSoFar || 0
  const overallTarget = derived.targetMonthlySavingsGBP * timeline.length
  const overallPct = ((overallSaved / overallTarget) * 100).toFixed(1)
  const remainingTarget = Math.max(0, overallTarget - overallSaved)

  // Zero-income / unpaid grace gap calculation
  const zeroIncomeRows = rows.filter(r => (r.saved || 0) === 0)
  const zeroCount = zeroIncomeRows.length
  const activeMonthsCount = Math.max(1, rows.length - zeroCount)
  const adjustedMonthlyRequired = (remainingTarget / activeMonthsCount).toFixed(0)

  function handleExport() {
    downloadCSV(
      'savings-tracker.csv',
      rows.map((r) => ({
        Month: r.label,
        Target: derived.targetMonthlySavingsGBP,
        Saved: r.saved,
        Status: r.status,
        '% Complete': `${r.pctComplete}%`,
        'Saved So Far': r.savedSoFar,
      })),
      [
        { key: 'Month', label: 'Month' },
        { key: 'Target', label: 'Target (£)' },
        { key: 'Saved', label: 'Saved (£)' },
        { key: 'Status', label: 'Status' },
        { key: '% Complete', label: '% Complete' },
        { key: 'Saved So Far', label: 'Saved So Far (£)' },
      ]
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatTile
          label="Total Saved So Far"
          value={`£${overallSaved.toLocaleString('en-GB')}`}
          sub={`Out of £${overallTarget.toLocaleString('en-GB')} plan`}
          accent="text-[#93E33C]"
          badge="Progress"
        />
        <StatTile
          label="Overall Target Progress"
          value={`${overallPct}%`}
          sub={`${timelineConfig?.planDurationYears || PLAN.planYears * 12}-month completion`}
          accent="text-[#161C2D]"
          badge="Milestone"
        />
        <StatTile
          label="Remaining Target"
          value={`£${remainingTarget.toLocaleString('en-GB')}`}
          sub="To reach full debt freedom"
          accent="text-rose-600"
          badge="Remaining"
        />
      </div>

      {/* Interactive Plan Timeline & Intake Configuration Card */}
      <div className="relative isolate overflow-hidden rounded-[22px] bg-white border border-[#E7ECF4] p-6 shadow-sm-clean">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EEF2F7] pb-4 mb-4">
          <div>
            <h3 className="font-display text-base font-extrabold text-[#161C2D]">
              Timeline & Study Intake Configuration
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Select your UK study intake start date and total timeline structure (including post-study grace period).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B6F36A]/20 text-[#161C2D] text-xs font-bold border border-[#B6F36A]/40 w-fit">
            <span className="h-2 w-2 rounded-full bg-[#B6F36A]" />
            Dynamic Recalibration Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Start Month Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-1.5">
              Start Month (Intake)
            </label>
            <select
              value={timelineConfig?.planStartMonth ?? new Date().getMonth()}
              onChange={(e) => updateTimelineConfig({ planStartMonth: Number(e.target.value) })}
              className="w-full rounded-[14px] border border-[#EEF2F7] bg-[#F9FBFD] px-3.5 py-2.5 text-xs font-bold text-[#161C2D] focus:border-[#161C2D] focus:outline-none shadow-sm-clean transition-all"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Year Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-1.5">
              Start Year
            </label>
            <select
              value={timelineConfig?.planStartYear ?? new Date().getFullYear()}
              onChange={(e) => updateTimelineConfig({ planStartYear: Number(e.target.value) })}
              className="w-full rounded-[14px] border border-[#EEF2F7] bg-[#F9FBFD] px-3.5 py-2.5 text-xs font-bold text-[#161C2D] focus:border-[#161C2D] focus:outline-none shadow-sm-clean transition-all"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Study + Grace Period Duration Structure */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-1.5">
              Plan Duration & Grace Period Structure
            </label>
            <select
              value={timelineConfig?.planDurationYears ?? PLAN.planYears}
              onChange={(e) => updateTimelineConfig({ planDurationYears: Number(e.target.value) })}
              className="w-full rounded-[14px] border border-[#EEF2F7] bg-[#F9FBFD] px-3.5 py-2.5 text-xs font-bold text-[#161C2D] focus:border-[#161C2D] focus:outline-none shadow-sm-clean transition-all"
            >
              <option value={3}>3 Years — 2 Yr Study + 1 Yr Grace Period (36 mo)</option>
              <option value={2}>2 Years — 1 Yr Study + 1 Yr Grace Period (24 mo)</option>
              <option value={1}>1 Year — Study Only / Accelerated Plan (12 mo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Zero Income / Unemployed Gap Advisory Notice Card */}
      {zeroCount > 0 && (
        <div className="relative isolate overflow-hidden rounded-[22px] bg-neutral-950 border border-neutral-800 p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
          <div className="absolute -top-1/2 left-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-lime-500/10 blur-3xl" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-400/15 text-lime-400 font-bold text-xl border border-lime-400/30">
              ℹ️
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Notice: £0 Logged for {zeroCount} Month{zeroCount > 1 ? 's' : ''} (Study / Grace Period Gap)</span>
              </h4>
              <p className="mt-1 text-xs text-neutral-300 leading-relaxed max-w-3xl">
                During your {timelineConfig?.planDurationYears || PLAN.planYears}-year schedule ({timelineConfig?.planDurationYears === 3 ? '2 Yr Study + 1 Yr Grace' : timelineConfig?.planDurationYears === 2 ? '1 Yr Study + 1 Yr Grace' : '1 Yr Study'}), you have {zeroCount} month(s) with £0 savings logged (e.g. initial study transition or job search gap). Because you have no income in those months, your remaining <span className="text-white font-bold">£{remainingTarget.toLocaleString('en-GB')}</span> target automatically recalibrates across your remaining <span className="text-lime-400 font-bold">{activeMonthsCount} active earning months</span> at approximately <span className="text-lime-400 font-extrabold figure">£{adjustedMonthlyRequired}/mo</span>.
              </p>
            </div>
          </div>
          <div className="relative z-10 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-lime-400 shadow-sm">
              ✨ Schedule Adjusted
            </span>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card
        eyebrow={`${(timelineConfig?.planDurationYears || PLAN.planYears) * 12}-month timeline`}
        title="Savings Ledger & Execution Tracker"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Filters - Showing Single Years Cleanly */}
            <div className="flex items-center gap-1.5 bg-[#F9FBFD] p-1 rounded-[14px] border border-[#EEF2F7] text-xs">
              <span className="px-2 text-[11px] font-bold text-[#667085] uppercase">Filter Year:</span>
              {distinctYears.map((year, idx) => (
                <button
                  key={year}
                  onClick={() => setActiveYear(year)}
                  className={`px-3 py-1.5 rounded-[12px] font-semibold transition-all ${
                    activeYear === year
                      ? 'bg-[#161C2D] text-white shadow-sm'
                      : 'text-[#667085] hover:text-[#161C2D]'
                  }`}
                >
                  {year} (Yr {idx + 1})
                </button>
              ))}
              <button
                onClick={() => setActiveYear('All')}
                className={`px-3 py-1.5 rounded-[12px] font-semibold transition-all ${
                  activeYear === 'All'
                    ? 'bg-[#161C2D] text-white shadow-sm'
                    : 'text-[#667085] hover:text-[#161C2D]'
                }`}
              >
                All Years
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="text-xs font-semibold px-4 py-2 rounded-[14px] bg-white text-[#161C2D] hover:bg-[#F9FBFD] border border-[#EEF2F7] transition-colors shadow-sm-clean"
            >
              Export CSV
            </button>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-5 rounded-[16px] bg-[#F9FBFD] border border-[#EEF2F7]">
          <p className="text-xs sm:text-sm text-[#667085]">
            Log your actual UK monthly savings below. Showing <span className="font-bold text-[#161C2D]">{activeYear === 'All' ? 'All Years' : `${activeYear} only`}</span>. Every pound logged dynamically recalibrates your India loan payoff target.
          </p>
          <div className="shrink-0 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B6F36A]" />
            <span className="text-xs font-bold figure text-[#161C2D]">£{derived.targetMonthlySavingsGBP.toLocaleString('en-GB')} / mo target</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 rounded-[16px] border border-[#EEF2F7] bg-white">
          <table className="w-full text-xs sm:text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-[#667085] border-b border-[#EEF2F7] bg-[#F9FBFD]">
                <th className="py-3.5 px-4">Timeline Period</th>
                <th className="py-3.5 px-4 figure">Target (£)</th>
                <th className="py-3.5 px-4 figure">Actual Saved (£)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 figure">% Complete</th>
                <th className="py-3.5 px-4 figure text-right">Cumulative (£)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {filteredRows.map((r) => {
                const behind = r.status === 'Pending'
                return (
                  <tr
                    key={r.key}
                    className="transition-colors hover:bg-[#F9FBFD]"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#161C2D] whitespace-nowrap">{r.label}</td>
                    <td className="py-3.5 px-4 figure text-[#667085]">£{derived.targetMonthlySavingsGBP.toLocaleString('en-GB')}</td>
                    <td className="py-3.5 px-4">
                      <div className="relative inline-flex items-center">
                        <span className="absolute left-3 text-[#667085] figure font-semibold">£</span>
                        <input
                          type="number"
                          min="0"
                          value={r.saved || ''}
                          placeholder="0"
                          onChange={(e) => updateEntry(r.key, { saved: Number(e.target.value) || 0 })}
                          className="figure w-32 rounded-[12px] border border-[#EEF2F7] bg-white pl-7 pr-3 py-1.5 text-[#161C2D] font-bold focus:border-[#B6F36A] focus:outline-none focus:ring-4 focus:ring-[#B6F36A]/15 transition-all shadow-sm-clean"
                          aria-label={`Saved amount for ${r.label}`}
                        />
                      </div>
                      {entries[r.key] && entries[r.key].saved !== undefined && r.saved < derived.targetMonthlySavingsGBP && (
                        <div className="mt-2 text-[10px] font-semibold text-white bg-[#161C2D] p-2 rounded-lg border border-[#334155] flex items-start gap-1.5 min-w-[180px] max-w-[220px] whitespace-normal leading-snug animate-slide-in-bottom shadow-sm">
                          <span className="text-[#B6F36A] shrink-0">ℹ️</span>
                          <span>Your entered amount is not equal to our target. Please make sure to add the remaining <span className="font-extrabold text-[#B6F36A]">£{(derived.targetMonthlySavingsGBP - r.saved).toLocaleString('en-GB')}</span> to your upcoming months.</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${
                          behind
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-[#B6F36A]/20 text-[#161C2D] border border-[#B6F36A]/40'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${behind ? 'bg-rose-500' : 'bg-[#B6F36A]'}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 figure">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${behind ? 'text-rose-600' : 'text-[#161C2D]'}`}>
                          {r.pctComplete}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 figure text-right font-bold text-[#161C2D]">
                      £{r.savedSoFar.toLocaleString('en-GB')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
