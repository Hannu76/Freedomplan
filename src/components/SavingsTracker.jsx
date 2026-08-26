import React, { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, MONTH_NAMES } from '../config'
import { downloadCSV } from '../utils/csv'
import { 
  Check, 
  Save, 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  Download, 
  Sparkles, 
  Info, 
  ChevronRight,
  RotateCcw,
  Clock,
  HelpCircle,
  X,
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
import LiquidProgressWave, { getProgressGradientCSS, getProgressRGB } from './LiquidProgressWave'
import DynamicFreedomPipeline from './DynamicFreedomPipeline'
import KpiLiquidWave from './KpiLiquidWave'

export default function SavingsTracker() {
  const { 
    timeline, 
    entries, 
    updateEntry, 
    timelineConfig, 
    updateTimelineConfig, 
    derived, 
    completeValueUpdate 
  } = useStore()
  
  // Local drafts state for uncommitted user inputs (Key -> string/number)
  const [drafts, setDrafts] = useState({})
  // Temporary save confirmation feedback per month key (Key -> boolean)
  const [savedFeedback, setSavedFeedback] = useState({})
  // Info popover state for rollover explanation (Key -> boolean)
  const [infoPopoverKey, setInfoPopoverKey] = useState(null)
  // Last save timestamp to trigger DynamicFreedomPipeline ripple reaction
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState(0)
  
  // No Income Modal state
  const [noIncomeModal, setNoIncomeModal] = useState({
    isOpen: false,
    monthKey: '',
    monthLabel: '',
    baseTarget: 0,
    selectedReason: 'Single Month Study / Transition Gap'
  })

  // ─────────────────────────────────────────────────────────────
  // 1. COMPUTE ENRICHED MONTHLY ROWS WITH CONSECUTIVE ROLLOVERS
  // ─────────────────────────────────────────────────────────────
  const { rows, zeroCount, zeroMonthsList } = useMemo(() => {
    let runningTotal = 0
    const zeroList = []

    // Pass 1: compute base values and cumulative totals
    const initialRows = timeline.map((m, idx) => {
      const entry = entries[m.key] || {}
      const isCommitted = entry.saved !== undefined
      const saved = isCommitted ? Number(entry.saved) : 0
      const isNoIncome = !!entry.isNoIncome
      const noIncomeReason = entry.noIncomeReason || ''
      runningTotal += saved

      if (isNoIncome || (isCommitted && saved === 0)) {
        zeroList.push(m.label)
      }

      const planYearIdx = Math.floor(idx / 12)
      const yearPlan = derived.threeYearPlan?.[planYearIdx] || derived.threeYearPlan?.[0]
      const baseTarget = yearPlan?.monthlyTargetGBP || derived.planMonthlySavingsGBP || 649

      return { 
        ...m, 
        index: idx,
        saved, 
        isCommitted,
        isNoIncome,
        noIncomeReason,
        baseTarget,
        savedSoFar: runningTotal,
      }
    })

    // Pass 2: Sequential Cascading Shortfall & Over-Target Saving Credit Calculation
    let carryBalance = 0 // >0: shortfall to add, <0: saving credit to deduct
    let lastAdjustmentMonthLabel = ''

    const finalRows = initialRows.map((m) => {
      const baseTarget = m.baseTarget
      let rolloverShortfall = 0
      let savingCredit = 0
      let sourceMonthLabel = lastAdjustmentMonthLabel
      let target = baseTarget

      if (carryBalance > 0) {
        // Net shortfall carried forward into this month
        rolloverShortfall = carryBalance
        target = baseTarget + rolloverShortfall
        carryBalance = 0 // Absorbed into current month's target
      } else if (carryBalance < 0) {
        // Net saving credit available from previous over-saving
        const availableCredit = Math.abs(carryBalance)
        savingCredit = Math.min(baseTarget, availableCredit)
        target = Math.max(0, baseTarget - savingCredit) // Clamped to min £0, never negative!
        const remainingCredit = availableCredit - savingCredit
        carryBalance = -remainingCredit // Unabsorbed surplus cascades to subsequent months
      }

      // Check if current month is committed / saved
      let isAhead = false
      let surplusAmount = 0

      if (m.isCommitted || m.isNoIncome) {
        if (m.isNoIncome) {
          // Zero income logs full current target as shortfall into carryBalance
          carryBalance += target
          lastAdjustmentMonthLabel = m.label
        } else {
          const diff = target - m.saved
          if (diff > 0) {
            // Shortfall saved
            carryBalance += diff
            lastAdjustmentMonthLabel = m.label
          } else if (diff < 0) {
            // Surplus saved! Over-target credit created
            surplusAmount = Math.abs(diff)
            isAhead = true
            carryBalance -= surplusAmount
            lastAdjustmentMonthLabel = m.label
          }
        }
      }

      // Calculate progress completion %
      let pctComplete = 0
      if (target === 0) {
        // Fully covered by saving credit
        pctComplete = 100
      } else {
        pctComplete = Math.min(100, Math.round((m.saved / target) * 100))
      }

      // Calculate status
      let status = 'Upcoming'
      if (m.isNoIncome) {
        status = 'No Income'
      } else if (m.isCommitted && m.saved >= target) {
        status = 'Completed'
      } else if (m.isCommitted && m.saved > 0) {
        status = 'Partial'
      } else if (m.isCommitted && m.saved === 0 && target > 0) {
        status = 'Partial'
      } else if (!m.isCommitted && target === 0 && savingCredit > 0) {
        status = 'Completed'
      }

      return {
        ...m,
        target,
        baseTarget,
        rolloverShortfall,
        savingCredit,
        sourceMonthLabel,
        isAhead,
        surplusAmount,
        pctComplete,
        status,
      }
    })

    return { 
      rows: finalRows, 
      zeroCount: zeroList.length, 
      zeroMonthsList: zeroList.slice(0, 3).join(', ') + (zeroList.length > 3 ? ` +${zeroList.length - 3} more` : '')
    }
  }, [timeline, entries, derived.planMonthlySavingsGBP, derived.threeYearPlan])

  // ─────────────────────────────────────────────────────────────
  // 2. UNIFIED PLAN YEAR FILTER SYSTEM (NO DUPLICATE CALENDAR YEARS)
  // ─────────────────────────────────────────────────────────────
  const planDuration = timelineConfig?.planDurationYears || PLAN.planYears || 3
  
  // Available filter tabs: All Years | Plan Year 1 | Plan Year 2 | Plan Year 3 | Grace Year
  const filterTabs = useMemo(() => {
    const tabs = [{ id: 'All', label: 'All Years' }]
    for (let i = 0; i < planDuration; i++) {
      const isGrace = (i === planDuration - 1 && planDuration >= 2)
      tabs.push({
        id: `Year-${i + 1}`,
        label: isGrace ? 'Grace Year' : `Plan Year ${i + 1}`,
        planYearNumber: i + 1,
        isGrace
      })
    }
    return tabs
  }, [planDuration])

  // All Years is first in the filter list, but initial view features Plan Year 1
  const [activeFilter, setActiveFilter] = useState('Year-1')

  // Overall KPI Metrics (Derived from Three-Year Plan targets)
  const overallSaved = rows[rows.length - 1]?.savedSoFar || 0
  const overallTarget = rows.reduce((sum, m) => sum + m.baseTarget, 0) || ((derived.planMonthlySavingsGBP || 649) * timeline.length)
  const overallPct = overallTarget > 0 ? ((overallSaved / overallTarget) * 100).toFixed(1) : '0.0'
  const remainingTarget = Math.max(0, overallTarget - overallSaved)

  // Dynamic recalibration metrics
  const activeMonthsCount = Math.max(1, rows.length - zeroCount)
  const adjustedMonthlyRequired = (remainingTarget / activeMonthsCount).toFixed(0)

  // ─────────────────────────────────────────────────────────────
  // 3. STRUCTURE TIMELINE INTO SOPHISTICATED PLAN YEAR CONTAINERS
  // ─────────────────────────────────────────────────────────────
  const planYearsData = useMemo(() => {
    const years = []
    for (let i = 0; i < planDuration; i++) {
      const yearMonths = rows.slice(i * 12, (i + 1) * 12)
      if (yearMonths.length > 0) {
        const firstM = yearMonths[0]
        const lastM = yearMonths[yearMonths.length - 1]
        const yearSaved = yearMonths.reduce((sum, m) => sum + (m.saved || 0), 0)
        const yearTarget = yearMonths.reduce((sum, m) => sum + m.target, 0)
        const yearPct = yearTarget > 0 ? Math.min(100, Math.round((yearSaved / yearTarget) * 100)) : 0
        const isGraceYear = (i === planDuration - 1 && planDuration >= 2)

        // Filter visibility
        let isVisible = true
        if (activeFilter !== 'All') {
          const filterNum = parseInt(activeFilter.replace('Year-', ''), 10)
          if (filterNum !== (i + 1)) {
            isVisible = false
          }
        }

        years.push({
          planYearNumber: i + 1,
          isGraceYear,
          title: isGraceYear ? 'GRACE YEAR' : `PLAN YEAR 0${i + 1}`,
          subtitle: isGraceYear ? 'Post-Study Repayment Period' : `Structured Savings Phase ${i + 1}`,
          periodRange: `${MONTH_NAMES[firstM.month]} ${firstM.year} — ${MONTH_NAMES[lastM.month]} ${lastM.year}`,
          months: yearMonths,
          isVisible,
          yearSaved,
          yearTarget,
          yearPct,
        })
      }
    }
    return years
  }, [rows, planDuration, activeFilter])

  // ─────────────────────────────────────────────────────────────
  // 4. ACTION HANDLERS: SAVE & NO INCOME
  // ─────────────────────────────────────────────────────────────
  const handleDraftChange = (key, val) => {
    setDrafts(prev => ({
      ...prev,
      [key]: val
    }))
  }

  const handleSaveMonth = (monthKey, targetVal) => {
    const committedVal = entries[monthKey]?.saved !== undefined ? Number(entries[monthKey].saved) : 0
    const rawVal = drafts[monthKey] !== undefined ? drafts[monthKey] : committedVal
    const parsedVal = Math.max(0, Number(rawVal) || 0)

    // Commit to persistent store & clear any previous no-income flag if positive
    updateEntry(monthKey, { 
      saved: parsedVal, 
      isNoIncome: parsedVal === 0 ? entries[monthKey]?.isNoIncome : false 
    })

    // Trigger validation & sound alerts
    completeValueUpdate({
      target: targetVal || derived.targetMonthlySavingsGBP,
      progress: parsedVal
    })

    // Trigger pipeline wave pulse
    setLastSaveTimestamp(Date.now())

    // Clear draft for this key
    setDrafts(prev => {
      const next = { ...prev }
      delete next[monthKey]
      return next
    })

    // Show temporary confirmation badge
    setSavedFeedback(prev => ({ ...prev, [monthKey]: true }))
    setTimeout(() => {
      setSavedFeedback(prev => ({ ...prev, [monthKey]: false }))
    }, 2200)
  }

  const handleOpenNoIncomeModal = (m) => {
    setNoIncomeModal({
      isOpen: true,
      monthKey: m.key,
      monthLabel: m.label,
      baseTarget: m.target || derived.targetMonthlySavingsGBP,
      selectedReason: 'Single Month Transition / Study Gap'
    })
  }

  const handleConfirmNoIncome = () => {
    if (!noIncomeModal.monthKey) return

    updateEntry(noIncomeModal.monthKey, {
      saved: 0,
      isNoIncome: true,
      noIncomeReason: noIncomeModal.selectedReason
    })

    // Trigger pipeline pulse
    setLastSaveTimestamp(Date.now())

    // Clear draft if any
    setDrafts(prev => {
      const next = { ...prev }
      delete next[noIncomeModal.monthKey]
      return next
    })

    setSavedFeedback(prev => ({ ...prev, [noIncomeModal.monthKey]: true }))
    setTimeout(() => {
      setSavedFeedback(prev => ({ ...prev, [noIncomeModal.monthKey]: false }))
    }, 2200)

    setNoIncomeModal(prev => ({ ...prev, isOpen: false }))
  }

  const toggleInfoPopover = (key) => {
    setInfoPopoverKey(prev => prev === key ? null : key)
  }

  // Export CSV Handler
  const handleExport = () => {
    downloadCSV(
      'savings-timeline-ledger.csv',
      rows.map((r, index) => {
        const planYearNum = Math.floor(index / 12) + 1
        return {
          'Plan Year': `Plan Year ${planYearNum}`,
          'Month': r.label,
          'Base Target (£)': r.baseTarget,
          'Saving Credit (£)': r.savingCredit,
          'Rollover Shortfall (£)': r.rolloverShortfall,
          'Adjusted Target (£)': r.target,
          'Actual Saved (£)': r.saved,
          'Status': r.status,
          '% Complete': `${r.pctComplete}%`,
          'Cumulative (£)': r.savedSoFar,
        }
      }),
      [
        { key: 'Plan Year', label: 'Plan Year' },
        { key: 'Month', label: 'Timeline Month' },
        { key: 'Base Target (£)', label: 'Base Target (£)' },
        { key: 'Saving Credit (£)', label: 'Saving Credit (£)' },
        { key: 'Rollover Shortfall (£)', label: 'Rollover Shortfall (£)' },
        { key: 'Adjusted Target (£)', label: 'Net Target (£)' },
        { key: 'Actual Saved (£)', label: 'Actual Saved (£)' },
        { key: 'Status', label: 'Status' },
        { key: '% Complete', label: '% Complete' },
        { key: 'Cumulative (£)', label: 'Cumulative Saved (£)' },
      ]
    )
  }

  return (
    <div className="space-y-8 animate-slide-up max-w-[1240px] mx-auto pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HIGH-END PRIVATE WEALTH KPI CARDS (With Subtle Living Liquid Waves)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Total Saved (Green Liquid + Minimal Drops) */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[172px]">
          {/* Subtle Green Liquid Wave Layer */}
          <KpiLiquidWave type="saved" pct={overallPct} />

          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                Total Saved So Far
              </p>
              <h3 className="font-display text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight mt-1.5 figure">
                £{overallSaved.toLocaleString('en-GB')}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 backdrop-blur-xs text-[#166534] text-[11px] font-black border border-emerald-200/80 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
              Verified Total
            </span>
          </div>

          <div className="relative z-10 mt-5 pt-3 border-t border-black/10">
            <div className="flex items-center justify-between text-xs font-black text-[#0F172A] mb-2">
              <span>Overall plan target</span>
              <span className="text-[#0F172A] font-black figure">of £{overallTarget.toLocaleString('en-GB')}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden p-0.5 border border-black/10">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#16A34A] transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(2, (overallSaved / Math.max(1, overallTarget)) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Overall Target Progress (Yellow -> Green Liquid + Drops) */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[172px]">
          {/* Subtle Progress Liquid Layer */}
          <KpiLiquidWave type="progress" pct={overallPct} />

          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                Overall Target Progress
              </p>
              <h3 className="font-display text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight mt-1.5 figure">
                {overallPct}%
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[#0F172A] text-[11px] font-black border border-black/10 shadow-xs">
              Milestone
            </span>
          </div>

          <div className="relative z-10 mt-5 pt-3 border-t border-black/10 flex items-center justify-between">
            <span className="text-xs font-black text-[#0F172A]">
              Timeline cadence
            </span>
            <span className="text-xs font-black text-[#0F172A] figure bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-black/10 shadow-xs">
              {timeline.length}-Month Horizon
            </span>
          </div>
        </div>

        {/* Card 3: Remaining Target (3-Color Payoff Freedom Wave) */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[172px]">
          {/* 3-Color Payoff Wave Layer */}
          <KpiLiquidWave type="payoff" pct={overallPct} />

          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                Remaining Target
              </p>
              <h3 className="font-display text-3xl sm:text-4xl font-black text-rose-700 tracking-tight mt-1.5 figure">
                £{remainingTarget.toLocaleString('en-GB')}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50/90 backdrop-blur-xs text-rose-700 text-[11px] font-black border border-rose-200 shadow-xs">
              Remaining
            </span>
          </div>

          <div className="relative z-10 mt-5 pt-3 border-t border-black/10 flex items-center justify-between">
            <span className="text-xs font-black text-[#0F172A]">
              Payoff target
            </span>
            <span className="text-xs font-black text-[#0F172A] bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-black/10 shadow-xs">
              100% Debt Freedom Path
            </span>
          </div>
        </div>

      </div>


      {/* ─────────────────────────────────────────────────────────────
          2. TIMELINE & STUDY INTAKE CONFIGURATION
          ───────────────────────────────────────────────────────────── */}
      <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-5 mb-5">
          <div>
            <h3 className="font-display text-base sm:text-lg font-black text-[#0F172A] tracking-tight flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#0F172A]" />
              Timeline & Study Intake Configuration
            </h3>
            <p className="text-xs text-[#64748B] mt-1 font-medium">
              Anchor your UK study start date and timeline structure. All monthly calculations synchronize automatically.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-[#166534] text-xs font-bold border border-emerald-200/80 shrink-0 w-fit shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
            Dynamic Recalibration Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Start Month Picker */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569] mb-2">
              Start Month (Intake)
            </label>
            <div className="relative">
              <select
                value={timelineConfig?.planStartMonth ?? new Date().getMonth()}
                onChange={(e) => updateTimelineConfig({ planStartMonth: Number(e.target.value) })}
                className="w-full rounded-[14px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-xs appearance-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Start Year Picker */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569] mb-2">
              Start Year
            </label>
            <div className="relative">
              <select
                value={timelineConfig?.planStartYear ?? new Date().getFullYear()}
                onChange={(e) => updateTimelineConfig({ planStartYear: Number(e.target.value) })}
                className="w-full rounded-[14px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-xs appearance-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Plan Duration Structure */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569] mb-2">
              Plan Duration & Grace Period Structure
            </label>
            <div className="relative">
              <select
                value={timelineConfig?.planDurationYears ?? PLAN.planYears}
                onChange={(e) => updateTimelineConfig({ planDurationYears: Number(e.target.value) })}
                className="w-full rounded-[14px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2.5 text-xs font-bold text-[#0F172A] focus:border-[#0F172A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-xs appearance-none cursor-pointer"
              >
                <option value={3}>3 Years — 2 Yr Study + 1 Yr Grace Period (36 mo)</option>
                <option value={2}>2 Years — 1 Yr Study + 1 Yr Grace Period (24 mo)</option>
                <option value={1}>1 Year — Study Only / Accelerated Plan (12 mo)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          3. MEANINGFUL SCHEDULE ADJUSTMENT INFORMATION BANNER
          ───────────────────────────────────────────────────────────── */}
      {zeroCount > 0 && (
        <div className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-r from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC] border border-[#E2E8F0] p-5 sm:p-6 shadow-sm transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-xs">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-[#0F172A] tracking-tight">
                    Schedule Recalibration Active:
                  </span>
                  <span className="text-xs font-bold text-[#64748B]">
                    {zeroCount} month{zeroCount > 1 ? 's' : ''} with zero income recorded ({zeroMonthsList})
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#475569] leading-relaxed max-w-3xl font-medium">
                  Because you have intentional zero-income gaps, your remaining{' '}
                  <span className="font-extrabold text-[#0F172A] figure">£{remainingTarget.toLocaleString('en-GB')}</span>{' '}
                  target is smoothly recalibrated across your remaining{' '}
                  <span className="font-extrabold text-[#0F172A] figure">{activeMonthsCount} active earning months</span>{' '}
                  at approximately{' '}
                  <span className="font-black text-[#166534] bg-emerald-100/80 px-2 py-0.5 rounded-md figure border border-emerald-200/50">
                    £{adjustedMonthlyRequired}/mo
                  </span>.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-xs font-extrabold text-[#0F172A] shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                Schedule Adjusted
              </span>
            </div>

          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          4. HERO SAVINGS TIMELINE SECTION & LIVING FINANCIAL FLOW
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Timeline Header & Segmented Year Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-[24px] border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#64748B]">
                {timeline.length}-Month Structured Journey
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
              Savings Timeline & Execution Ledger
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">
              Log monthly savings or mark zero-income gaps. Each committed action dynamically recalibrates your debt payoff schedule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Segmented Control: All | Year 1 | Year 2 | Grace */}
            <div className="inline-flex items-center bg-[#F1F5F9] p-1 rounded-2xl border border-[#E2E8F0] text-xs overflow-x-auto max-w-full">
              <span className="px-2.5 text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider hidden sm:inline">
                View:
              </span>
              
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2 rounded-2xl bg-white text-[#0F172A] hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#64748B]" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. DYNAMIC FREEDOM PIPELINE (Hero 3-Color Liquid Flow: Red -> Yellow -> Green)
            ───────────────────────────────────────────────────────────── */}
        <DynamicFreedomPipeline 
          overallSaved={overallSaved}
          overallTarget={overallTarget}
          overallPct={overallPct}
          monthlyTarget={derived.planMonthlySavingsGBP || 649}
          lastSaveTimestamp={lastSaveTimestamp}
        />

        {/* ─────────────────────────────────────────────────────────────
            6. PLAN YEAR CONTAINERS & MONTHLY CARDS
            ───────────────────────────────────────────────────────────── */}
        {planYearsData.map((planYear) => {
          if (!planYear.isVisible) return null

          return (
            <div 
              key={planYear.planYearNumber}
              className={`relative isolate overflow-hidden rounded-[26px] bg-white border transition-all duration-300 p-5 sm:p-7 space-y-6 shadow-sm hover:shadow-md ${
                planYear.isGraceYear 
                  ? 'border-slate-300 bg-gradient-to-b from-white to-[#F8FAFC]' 
                  : 'border-[#E2E8F0]'
              }`}
            >
              {/* Plan Year Container Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide uppercase shadow-xs ${
                    planYear.isGraceYear 
                      ? 'bg-[#0F172A] text-white border border-slate-700' 
                      : 'bg-[#0F172A] text-white'
                  }`}>
                    {planYear.title}
                  </span>
                  
                  <span className="text-sm font-extrabold text-[#0F172A]">
                    {planYear.periodRange}
                  </span>

                  <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2.5 py-0.5 rounded-lg border border-[#E2E8F0]">
                    {planYear.subtitle}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-[#64748B]">
                  <span>Year Saved:</span>
                  <span className="text-sm font-black text-[#0F172A] figure">
                    £{planYear.yearSaved.toLocaleString('en-GB')}
                  </span>
                  <span className="text-[#94A3B8]">/</span>
                  <span className="figure">
                    £{planYear.yearTarget.toLocaleString('en-GB')}
                  </span>
                  <span className="font-extrabold text-[#166534] bg-emerald-100/70 px-2 py-0.5 rounded-md figure ml-1 border border-emerald-200/50">
                    {planYear.yearPct}%
                  </span>
                </div>
              </div>

              {/* Monthly Cards Grid (Modern Financial Objects) */}
              <div className="grid grid-cols-1 gap-4">
                {planYear.months.map((m) => {
                  const committedSaved = m.saved
                  const currentDraft = drafts[m.key] !== undefined ? drafts[m.key] : (committedSaved === 0 ? '' : committedSaved)
                  const isDirty = drafts[m.key] !== undefined && Number(drafts[m.key]) !== committedSaved
                  const isSavedJustNow = !!savedFeedback[m.key]
                  
                  const isCompleted = m.status === 'Completed'
                  const isPartial = m.status === 'Partial'
                  const isUpcoming = m.status === 'Upcoming'
                  const isNoIncome = m.status === 'No Income'

                  return (
                    <div
                      key={m.key}
                      className={`relative isolate overflow-hidden rounded-[22px] p-5 sm:p-6 border transition-all duration-300 shadow-xs hover:shadow-sm ${
                        isDirty 
                          ? 'bg-amber-50/40 border-amber-300' 
                          : isCompleted || m.pctComplete >= 90
                            ? 'bg-white border-emerald-200/80 hover:border-emerald-300'
                            : m.pctComplete >= 75
                              ? 'bg-white border-lime-200/70 hover:border-lime-300'
                              : m.pctComplete >= 50
                                ? 'bg-white border-amber-200/70 hover:border-amber-300'
                                : isPartial
                                  ? 'bg-white border-rose-200/70 hover:border-rose-300'
                                  : isNoIncome
                                    ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                                    : 'bg-white hover:bg-[#F8FAFC]/60 border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {/* Physical Responsive Liquid Water Surface Wave: Behind content */}
                      <LiquidProgressWave 
                        pctComplete={m.pctComplete}
                        status={m.status}
                        isShortfall={isPartial}
                        isNoIncome={isNoIncome}
                      />

                      {/* Card Content Layout: Permanently visible */}
                      <div className="relative z-10 space-y-4">
                        
                        {/* Header Row: Month Name & Premium Tag */}
                        <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-lg sm:text-xl font-black text-[#0F172A] tracking-tight uppercase">
                                {m.label}
                              </span>
                              <span className="text-[11px] font-black text-[#334155]">
                                • {planYear.isGraceYear ? 'Grace Period' : `Plan Year 0${planYear.planYearNumber}`}
                              </span>
                            </div>
                          </div>

                          {/* Premium Tags */}
                          <div className="flex flex-wrap items-center gap-2">
                            {m.isAhead && m.surplusAmount > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-emerald-100 text-[#166534] border border-emerald-300 shadow-xs">
                                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                Ahead (+£{m.surplusAmount.toLocaleString('en-GB')})
                              </span>
                            )}
                            {m.savingCredit > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-[#166534] border border-emerald-200 shadow-xs">
                                <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
                                Ahead of Schedule
                              </span>
                            )}
                            {m.rolloverShortfall > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                                Includes Rollover
                              </span>
                            )}
                            {isCompleted && !m.isAhead && m.savingCredit === 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-[#166534] border border-emerald-200 shadow-xs">
                                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                Completed
                              </span>
                            )}
                            {isPartial && (
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs border ${
                                m.pctComplete >= 90 
                                  ? 'bg-emerald-50 text-[#166534] border-emerald-200' 
                                  : m.pctComplete >= 75
                                    ? 'bg-lime-50 text-lime-800 border-lime-200'
                                    : m.pctComplete >= 50
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                                  m.pctComplete >= 90 
                                    ? 'bg-[#16A34A]' 
                                    : m.pctComplete >= 75
                                      ? 'bg-lime-600'
                                      : m.pctComplete >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                }`} />
                                Partial ({m.pctComplete}%)
                              </span>
                            )}
                            {isNoIncome && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-slate-100 text-[#475569] border border-slate-200 shadow-xs">
                                <RotateCcw className="w-3 h-3 text-[#64748B]" />
                                No Income Recorded
                              </span>
                            )}
                            {isUpcoming && m.savingCredit === 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] shadow-xs">
                                <Clock className="w-3 h-3 text-[#94A3B8]" />
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Row: Financial Metrics (Target & Actual Saved) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                          
                          {/* 1. TARGET AREA (With Integrated Rollover, Saving Credit & Info Popover) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                Target
                              </span>
                              {m.savingCredit > 0 ? (
                                <span className="text-[10px] font-black text-[#166534] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  Includes Saving Credit
                                </span>
                              ) : m.rolloverShortfall > 0 ? (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  Includes Rollover
                                </span>
                              ) : null}
                            </div>

                            {m.savingCredit > 0 ? (
                              <div className="space-y-2">
                                {/* Saving Credit box directly inside Target */}
                                <div className="rounded-[14px] bg-white/90 backdrop-blur-xs border border-emerald-300 p-3 space-y-1.5 shadow-xs">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#334155] font-extrabold">Base monthly target</span>
                                    <span className="font-black text-[#0F172A] figure">£{m.baseTarget.toLocaleString('en-GB')}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs text-[#166534] font-bold pt-1.5 border-t border-emerald-100">
                                    <span className="flex items-center gap-1">
                                      ↳ Previous saving credit from {m.sourceMonthLabel}
                                      <button
                                        type="button"
                                        onClick={() => toggleInfoPopover(m.key)}
                                        className="text-[#0F172A] hover:text-black cursor-pointer p-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                                        title="Why this target is reduced"
                                        aria-label="Saving credit explanation"
                                      >
                                        <Info className="w-3.5 h-3.5 text-[#16A34A]" />
                                      </button>
                                    </span>
                                    <span className="figure font-black text-[#16A34A]">- £{m.savingCredit.toLocaleString('en-GB')}</span>
                                  </div>
                                </div>

                                {/* Info Popover Explanation */}
                                {infoPopoverKey === m.key && (
                                  <div className="p-3 rounded-xl bg-[#0F172A] text-white text-xs shadow-lg animate-fade-in space-y-1.5 border border-slate-700">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[#4DFC5A] flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5" />
                                        Saving Credit from {m.sourceMonthLabel}
                                      </span>
                                      <button 
                                        onClick={() => setInfoPopoverKey(null)}
                                        className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                      Your previous £{m.savingCredit.toLocaleString('en-GB')} extra saving in {m.sourceMonthLabel} has been carried forward to reduce this month's target.
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-baseline justify-between pt-0.5">
                                  <span className="text-[11px] font-black uppercase text-[#334155]">Adjusted Target</span>
                                  <span className="text-xl font-black text-[#0F172A] figure">£{m.target.toLocaleString('en-GB')}</span>
                                </div>
                              </div>
                            ) : m.rolloverShortfall > 0 ? (
                              <div className="space-y-2">
                                {/* Rollover box directly inside Target */}
                                <div className="rounded-[14px] bg-white/90 backdrop-blur-xs border border-[#CBD5E1] p-3 space-y-1.5 shadow-xs">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#334155] font-extrabold">Base monthly target</span>
                                    <span className="font-black text-[#0F172A] figure">£{m.baseTarget.toLocaleString('en-GB')}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs text-rose-700 font-bold pt-1.5 border-t border-[#E2E8F0]">
                                    <span className="flex items-center gap-1">
                                      ↳ Shortfall from {m.sourceMonthLabel}
                                      <button
                                        type="button"
                                        onClick={() => toggleInfoPopover(m.key)}
                                        className="text-[#0F172A] hover:text-black cursor-pointer p-0.5 rounded-md hover:bg-slate-200/60 transition-colors"
                                        title="Why this shortfall is carried forward"
                                        aria-label="Rollover explanation"
                                      >
                                        <Info className="w-3.5 h-3.5 text-[#0F172A]" />
                                      </button>
                                    </span>
                                    <span className="figure font-black text-rose-700">+ £{m.rolloverShortfall.toLocaleString('en-GB')}</span>
                                  </div>
                                </div>

                                {/* Info Popover Explanation */}
                                {infoPopoverKey === m.key && (
                                  <div className="p-3 rounded-xl bg-[#0F172A] text-white text-xs shadow-lg animate-fade-in space-y-1.5 border border-slate-700">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[#4DFC5A] flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5" />
                                        Carried forward from {m.sourceMonthLabel}
                                      </span>
                                      <button 
                                        onClick={() => setInfoPopoverKey(null)}
                                        className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                      {m.sourceMonthLabel}'s shortfall of £{m.rolloverShortfall.toLocaleString('en-GB')} has been carried forward according to your schedule rules.
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-baseline justify-between pt-0.5">
                                  <span className="text-[11px] font-black uppercase text-[#334155]">Adjusted Target</span>
                                  <span className="text-xl font-black text-[#0F172A] figure">£{m.target.toLocaleString('en-GB')}</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-2xl font-black text-[#0F172A] figure">
                                  £{m.target.toLocaleString('en-GB')}
                                </span>
                                <span className="block text-[10px] font-bold text-[#475569] mt-0.5">
                                  Standard Monthly Target
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2. ACTUAL SAVED WITH INPUT & COMMITTED VALUE */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                Actual Saved
                              </span>
                              {isNoIncome && (
                                <span className="text-[10px] font-black text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                                  Zero Income Intentional
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {/* Amount input */}
                              <div className="relative inline-flex items-center flex-1 min-w-[130px]">
                                <span className="absolute left-3 text-sm font-black text-[#0F172A] figure">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentDraft}
                                  placeholder="0"
                                  onChange={(e) => handleDraftChange(m.key, e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveMonth(m.key, m.target)}
                                  className={`w-full rounded-[14px] border pl-7 pr-3 py-2 text-sm font-black text-[#0F172A] figure transition-all focus:outline-none ${
                                    isDirty 
                                      ? 'bg-white border-amber-400 text-[#0F172A] ring-2 ring-amber-400/20' 
                                      : 'bg-white border-[#CBD5E1] text-[#0F172A] focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/5'
                                  }`}
                                  aria-label={`Actual saved amount for ${m.label}`}
                                />
                              </div>

                              {/* Primary Save Button */}
                              <button
                                onClick={() => handleSaveMonth(m.key, m.target)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                                  isSavedJustNow
                                    ? 'bg-[#16A34A] text-white shadow-emerald-500/20'
                                    : isDirty
                                      ? 'bg-[#0F172A] text-white hover:bg-slate-800 scale-102'
                                      : 'bg-[#0F172A] text-white hover:bg-slate-800'
                                }`}
                                title="Commit and calculate savings"
                              >
                                {isSavedJustNow ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-white" />
                                    Saved ✓
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    Save
                                  </>
                                )}
                              </button>

                              {/* Secondary No Income Button */}
                              <button
                                onClick={() => handleOpenNoIncomeModal(m)}
                                className="px-3.5 py-2 rounded-xl text-xs font-black transition-all border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] bg-white shrink-0 cursor-pointer active:scale-95"
                                title="Record an intentional zero-income month"
                              >
                                No income
                              </button>
                            </div>

                            {/* Status subtext */}
                            <p className="text-[10px] font-extrabold text-[#475569]">
                              {isDirty ? (
                                'Uncommitted draft — click Save to recalculate schedule.'
                              ) : m.isAhead && m.surplusAmount > 0 ? (
                                <span className="text-[#166534] font-black">
                                  ✓ £{m.surplusAmount.toLocaleString('en-GB')} ahead of target — carried forward as future saving credit
                                </span>
                              ) : (
                                `Committed: £${committedSaved.toLocaleString('en-GB')}`
                              )}
                            </p>
                          </div>

                        </div>

                        {/* Bottom Row: Progress Wave Bar & Cumulative Total */}
                        <div className="pt-3 border-t border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Progress Meter */}
                          <div className="flex-1 max-w-md space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-black">
                              <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                Progress
                              </span>
                              <span className="figure font-black text-[#0F172A] text-xs">
                                {m.pctComplete}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#F1F5F9] overflow-hidden p-0.5 border border-[#E2E8F0]/60">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(100, Math.max(0, m.pctComplete))}%`,
                                  background: m.pctComplete > 0 ? getProgressGradientCSS(m.pctComplete) : '#CBD5E1'
                                }}
                              />
                            </div>
                          </div>

                          {/* Cumulative Total */}
                          <div className="text-left sm:text-right">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-[#0F172A] mb-0.5">
                              Cumulative Saved
                            </span>
                            <span className="text-base font-black text-[#0F172A] figure">
                              £{m.savedSoFar.toLocaleString('en-GB')}
                            </span>
                          </div>

                        </div>

                      </div>

                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}

      </div>


      {/* ─────────────────────────────────────────────────────────────
          7. NO INCOME SCHEDULE ADJUSTMENT MODAL (Compact & Fully Responsive)
          ───────────────────────────────────────────────────────────── */}
      {noIncomeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-[calc(100vw-24px)] sm:w-full max-w-[580px] max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-48px)] rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] shadow-2xl flex flex-col overflow-hidden">
            
            {/* Fixed Modal Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#F1F5F9] shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs shrink-0">
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-black text-[#0F172A] tracking-tight leading-snug">
                    No income for {noIncomeModal.monthLabel}?
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#64748B] font-medium leading-normal">
                    Select the context to dynamically adapt your schedule.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setNoIncomeModal(prev => ({ ...prev, isOpen: false }))}
                className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-xl hover:bg-[#F1F5F9] cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
              
              {/* Scenario Options List */}
              <div className="space-y-2 sm:space-y-2.5">
                <label className="block text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#475569]">
                  Select Schedule Adjustment Context:
                </label>

                {[
                  {
                    id: 'Single Month Study / Transition Gap',
                    title: '1-Month Study / Transition Gap',
                    desc: 'Single month pause in earning. Target carries forward to the following month.'
                  },
                  {
                    id: '2-3 Months Exam / Study Break',
                    title: '2–3 Months Study / Exam Break',
                    desc: 'Redistribute remaining target evenly across remaining active earning months.'
                  },
                  {
                    id: 'Extended Grace Period Adjustment',
                    title: 'Extended Grace Period Adjustment',
                    desc: 'Smoothly defer target weight toward post-study grace period employment.'
                  },
                  {
                    id: 'General £0 Logged',
                    title: 'Confirmed Zero Income (£0)',
                    desc: 'Explicitly record zero income for this month without altering underlying rules.'
                  }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setNoIncomeModal(prev => ({ ...prev, selectedReason: opt.id }))}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                      noIncomeModal.selectedReason === opt.id
                        ? 'bg-slate-50 border-[#0F172A] ring-2 ring-slate-900/5'
                        : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">
                        {opt.title}
                      </span>
                      <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                        noIncomeModal.selectedReason === opt.id
                          ? 'border-[#0F172A] bg-[#0F172A]'
                          : 'border-[#CBD5E1]'
                      }`}>
                        {noIncomeModal.selectedReason === opt.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#64748B] mt-0.5 sm:mt-1 font-medium leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Compact Financial Impact Summary */}
              <div className="rounded-xl sm:rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#0F172A] font-bold text-[11px] sm:text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#16A34A] shrink-0" />
                  <span>Financial Impact Summary</span>
                </div>
                <p className="text-[#64748B] text-[10px] sm:text-[11px] font-medium leading-relaxed">
                  Recording an intentional zero-income month tells the system this was not an empty mistake. Your £{noIncomeModal.baseTarget} target will be carried forward and dynamically adjusted across active months according to existing loan rules.
                </p>
              </div>

            </div>

            {/* Fixed Modal Action Buttons Footer */}
            <div className="flex items-center justify-end gap-2.5 p-3.5 sm:p-4 border-t border-[#F1F5F9] bg-[#FAFAFA] shrink-0">
              <button
                type="button"
                onClick={() => setNoIncomeModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 sm:flex-initial px-4 py-2 sm:py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:text-[#0F172A] hover:bg-white cursor-pointer transition-colors h-[40px] sm:h-[44px]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmNoIncome}
                className="flex-1 sm:flex-initial px-5 py-2 sm:py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-black hover:bg-slate-800 transition-all shadow-xs cursor-pointer h-[40px] sm:h-[44px]"
              >
                Confirm No Income
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
