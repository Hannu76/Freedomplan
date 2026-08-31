import React, { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, MONTH_NAMES } from '../config'
import { downloadCSV } from '../utils/csv'
import { 
  Check, 
  Save, 
  Calendar, 
  TrendingUp, 
  RotateCcw, 
  Sparkles, 
  Info, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Download, 
  Clock, 
  ChevronDown,
  Trash2,
  Edit3
} from 'lucide-react'
import LiquidProgressWave, { getProgressGradientCSS } from './LiquidProgressWave'
import DynamicFreedomPipeline from './DynamicFreedomPipeline'
import KpiLiquidWave from './KpiLiquidWave'

/**
 * Returns the number of days in a given year and month (0-indexed month).
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Formats a date range cleanly: e.g. "Oct 1 – Nov 30, 2026" or "Sep 1 – Sep 5, 2026"
 */
function formatDateRange(startYear, startMonth, startDay, endYear, endMonth, endDay) {
  const startStr = `${MONTH_NAMES[startMonth]} ${startDay}`
  const endStr = `${MONTH_NAMES[endMonth]} ${endDay}, ${endYear}`
  if (startYear === endYear && startMonth === endMonth) {
    if (startDay === endDay) {
      return `${startStr}, ${startYear}`
    }
    return `${MONTH_NAMES[startMonth]} ${startDay} – ${endDay}, ${startYear}`
  }
  return `${startStr} – ${endStr}`
}

/**
 * Formats GBP amount cleanly (e.g. £654 or £54.50 when decimal).
 */
function formatGBP(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0'
  const num = Number(amount)
  const isInt = Math.abs(num - Math.round(num)) < 0.005
  return isInt 
    ? Math.round(num).toLocaleString('en-GB') 
    : num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SavingsTracker() {
  const { 
    timeline, 
    entries, 
    updateEntry, 
    timelineConfig, 
    updateTimelineConfig, 
    derived, 
    completeValueUpdate,
    noIncomePeriods,
    addNoIncomePeriod,
    updateNoIncomePeriod,
    removeNoIncomePeriod,
    resetScheduleAdjustments,
    graceAllocationMode,
    setGraceAllocationMode,
  } = useStore()
  
  // Local drafts state for uncommitted user inputs (Key -> string/number)
  const [drafts, setDrafts] = useState({})
  // Temporary save confirmation feedback per month key (Key -> boolean)
  const [savedFeedback, setSavedFeedback] = useState({})
  // Info popover state for rollover explanation (Key -> boolean)
  const [infoPopoverKey, setInfoPopoverKey] = useState(null)
  // Last save timestamp to trigger DynamicFreedomPipeline ripple reaction
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState(0)

  // Reset Schedule confirmation modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetFeedback, setResetFeedback] = useState(false)
  
  // No Income Modal state
  const [noIncomeModal, setNoIncomeModal] = useState({
    isOpen: false,
    monthKey: '',
    monthLabel: '',
    monthIdx: 0,
    existingPeriodId: null,
    durationPreset: '1 Month', // '1 Month', '2 Months', '3 Months', 'Custom'
    durationNum: 1,
    durationUnit: 'Months', // 'Days', 'Weeks', 'Months'
    selectedReason: 'No income',
    customReasonText: '',
  })

  // Skipped Months Auto-Detection Modal state (when user saves £0 or skips 1, 2, 3 months)
  const [skipDetectionModal, setSkipDetectionModal] = useState({
    isOpen: false,
    mode: 'zero', // 'zero' | 'skipped_prior'
    pendingSaveMonthKey: null,
    pendingSaveTargetVal: null,
    pendingSaveAmount: null,
    skippedMonths: [],
    selectedReason: 'No income',
    customReasonText: '',
  })

  // ─────────────────────────────────────────────────────────────
  // 1. PURE DERIVED SCHEDULE RECALCULATION ENGINE
  // ─────────────────────────────────────────────────────────────
  const scheduleData = useMemo(() => {
    const baseMonthlyTarget = derived.planMonthlySavingsGBP || 649
    const originalTarget = baseMonthlyTarget * timeline.length

    // Map all active No Income periods onto specific months in the timeline
    // Key -> { periodId, durationLabel, reason, periodDates, daysExcluded, totalDays, ratioExcluded, isFullMonth }
    const monthNoIncomeMap = {}

    ;(noIncomePeriods || []).forEach((period) => {
      const startIdx = timeline.findIndex(m => m.key === period.startMonthKey)
      if (startIdx === -1) return

      const durationNum = Math.max(1, Number(period.duration) || 1)
      const unit = (period.unit || 'months').toLowerCase()
      const reasonLabel = period.reason === 'Other' && period.customReasonText 
        ? period.customReasonText 
        : (period.reason || 'No Income Period')

      if (unit.startsWith('month')) {
        // Exclude entire calendar months
        const count = durationNum
        const endIdx = Math.min(timeline.length - 1, startIdx + count - 1)
        const startMonthObj = timeline[startIdx]
        const endMonthObj = timeline[endIdx]
        const endMonthDays = getDaysInMonth(endMonthObj.year, endMonthObj.month)
        const datesLabel = formatDateRange(
          startMonthObj.year, startMonthObj.month, 1,
          endMonthObj.year, endMonthObj.month, endMonthDays
        )
        const durationLabel = `${count} Month${count > 1 ? 's' : ''}`

        for (let i = startIdx; i <= endIdx; i++) {
          const m = timeline[i]
          const totalDays = getDaysInMonth(m.year, m.month)
          monthNoIncomeMap[m.key] = {
            periodId: period.id,
            durationLabel,
            reason: reasonLabel,
            periodDates: datesLabel,
            daysExcluded: totalDays,
            totalDays,
            ratioExcluded: 1.0,
            isFullMonth: true,
          }
        }
      } else if (unit.startsWith('week') || unit.startsWith('day')) {
        // Exclude specific number of days
        const totalDaysToExclude = unit.startsWith('week') ? durationNum * 7 : durationNum
        let remainingDays = totalDaysToExclude
        let currIdx = startIdx

        const startMonthObj = timeline[startIdx]
        // Calculate theoretical end date
        let tempDays = totalDaysToExclude
        let tempIdx = startIdx
        let endYear = startMonthObj.year
        let endMonth = startMonthObj.month
        let endDay = 1
        while (tempDays > 0 && tempIdx < timeline.length) {
          const dInM = getDaysInMonth(timeline[tempIdx].year, timeline[tempIdx].month)
          if (tempDays <= dInM) {
            endYear = timeline[tempIdx].year
            endMonth = timeline[tempIdx].month
            endDay = tempDays
            break
          } else {
            tempDays -= dInM
            tempIdx++
          }
        }
        const datesLabel = formatDateRange(startMonthObj.year, startMonthObj.month, 1, endYear, endMonth, endDay)
        const durationLabel = unit.startsWith('week') 
          ? `${durationNum} Week${durationNum > 1 ? 's' : ''}` 
          : `${durationNum} Day${durationNum > 1 ? 's' : ''}`

        while (remainingDays > 0 && currIdx < timeline.length) {
          const m = timeline[currIdx]
          const totalDays = getDaysInMonth(m.year, m.month)
          const daysExcluded = Math.min(remainingDays, totalDays)
          const ratioExcluded = Math.min(1.0, daysExcluded / totalDays)

          monthNoIncomeMap[m.key] = {
            periodId: period.id,
            durationLabel,
            reason: reasonLabel,
            periodDates: datesLabel,
            daysExcluded,
            totalDays,
            ratioExcluded,
            isFullMonth: ratioExcluded >= 1.0,
          }

          remainingDays -= daysExcluded
          currIdx++
        }
      }
    })

    // Compute verified actual savings (only actual confirmed entries count)
    let totalConfirmedSaved = 0
    timeline.forEach(m => {
      const entry = entries[m.key]
      if (entry?.saved !== null && entry?.saved !== undefined && entry?.saved !== '' && !isNaN(Number(entry.saved))) {
        totalConfirmedSaved += Math.max(0, Number(entry.saved))
      }
    })

    const remainingTarget = Math.max(0, originalTarget - totalConfirmedSaved)
    const overallProgressPct = originalTarget > 0 ? ((totalConfirmedSaved / originalTarget) * 100).toFixed(1) : '0.0'

    // Compute active earning months
    let totalExcludedMonthsCount = 0
    timeline.forEach(m => {
      const info = monthNoIncomeMap[m.key]
      if (info) {
        totalExcludedMonthsCount += info.ratioExcluded
      }
    })
    const activeMonthsCount = Math.max(1, Math.round((timeline.length - totalExcludedMonthsCount) * 10) / 10)
    const recalibratedMonthlyAmount = Math.round(remainingTarget / Math.max(1, activeMonthsCount))

    const planDuration = timelineConfig?.planDurationYears || PLAN.planYears || 3
    const graceStartIndex = (planDuration >= 2) ? (planDuration - 1) * 12 : -1
    const graceMonthsCount = (planDuration >= 2 && graceStartIndex >= 0) ? (timeline.length - graceStartIndex) : 0

    // Compute total skipped savings before Grace Period
    let studySkippedAmount = 0
    let studySkippedCount = 0
    timeline.forEach((m, idx) => {
      const isGrace = (graceStartIndex >= 0 && idx >= graceStartIndex)
      const noIncomeInfo = monthNoIncomeMap[m.key] || null
      const isFullNoIncome = noIncomeInfo ? noIncomeInfo.isFullMonth : false
      if (!isGrace && isFullNoIncome) {
        studySkippedAmount += baseMonthlyTarget
        studySkippedCount++
      }
    })

    // Sequential Rollover Calculation Pass
    let carryBalance = 0 // > 0: shortfall to add, < 0: saving credit to deduct
    let lastAdjustmentMonthLabel = ''
    let runningCumulativeSaved = 0
    const noIncomeMonthsList = []

    const rows = timeline.map((m, idx) => {
      const isGraceMonth = (graceStartIndex >= 0 && idx >= graceStartIndex)
      const graceMonthIndex = isGraceMonth ? (idx - graceStartIndex) : -1
      const noIncomeInfo = monthNoIncomeMap[m.key] || null
      const isFullNoIncome = noIncomeInfo ? noIncomeInfo.isFullMonth : false
      const ratioExcluded = noIncomeInfo ? noIncomeInfo.ratioExcluded : 0

      if (noIncomeInfo) {
        noIncomeMonthsList.push(m.label)
      }

      const isSkipped = isFullNoIncome
      const skippedAmount = isSkipped ? baseMonthlyTarget : 0

      // Base monthly target for this month
      let monthBaseTarget = baseMonthlyTarget
      if (isFullNoIncome) {
        monthBaseTarget = 0
      } else if (ratioExcluded > 0) {
        monthBaseTarget = Math.round(baseMonthlyTarget * (1.0 - ratioExcluded))
      }

      // Grace Period added carry-forward amount for this month
      let monthAddedSkipped = 0
      if (isGraceMonth && studySkippedAmount > 0 && !isFullNoIncome) {
        if (graceAllocationMode === 'first_month') {
          monthAddedSkipped = graceMonthIndex === 0 ? studySkippedAmount : 0
        } else {
          // 'split' mode (default)
          monthAddedSkipped = studySkippedAmount / Math.max(1, graceMonthsCount)
        }
      }

      // Effective base with Grace Period added carry-forward
      const effectiveBaseTarget = isFullNoIncome ? 0 : (monthBaseTarget + monthAddedSkipped)

      // 2. Apply sequential rollover / surplus from previous month
      let rolloverShortfall = 0
      let savingCredit = 0
      let sourceMonthLabel = lastAdjustmentMonthLabel
      let target = effectiveBaseTarget

      if (isFullNoIncome) {
        target = 0
        rolloverShortfall = 0
        savingCredit = 0
        sourceMonthLabel = ''
      } else {
        if (carryBalance > 0) {
          // Shortfall carried forward from previous month
          rolloverShortfall = carryBalance
          target = effectiveBaseTarget + rolloverShortfall
          carryBalance = 0 // Absorbed into current month's target
        } else if (carryBalance < 0) {
          // Saving credit available from previous over-saving
          const availableCredit = Math.abs(carryBalance)
          savingCredit = Math.min(effectiveBaseTarget, availableCredit)
          target = Math.max(0, effectiveBaseTarget - savingCredit)
          const remainingCredit = availableCredit - savingCredit
          carryBalance = -remainingCredit // Unabsorbed surplus cascades
        }
      }

      // 3. Evaluate User Actual Savings Input
      const entry = entries[m.key]
      const isEntered = entry?.saved !== null && entry?.saved !== undefined && entry?.saved !== '' && !isNaN(Number(entry?.saved))
      const savedVal = isEntered ? Math.max(0, Number(entry.saved)) : null

      let isAhead = false
      let surplusAmount = 0
      let remainingAmount = 0

      if (savedVal !== null) {
        runningCumulativeSaved += savedVal

        if (!isFullNoIncome) {
          const diff = target - savedVal
          if (diff > 0) {
            // Under-saved: Shortfall carried forward
            remainingAmount = diff
            carryBalance += diff
            lastAdjustmentMonthLabel = m.label
          } else if (diff < 0) {
            // Over-saved: Surplus carried forward as saving credit
            surplusAmount = Math.abs(diff)
            isAhead = true
            carryBalance -= surplusAmount
            lastAdjustmentMonthLabel = m.label
          }
        }
      } else {
        // Unentered / empty amount -> Does NOT create a shortfall!
      }

      // 4. Calculate progress completion % & status
      let pctComplete = 0
      let status = 'Upcoming'

      if (isSkipped) {
        pctComplete = 0
        status = 'Skipped'
      } else if (savedVal !== null) {
        if (target === 0) {
          pctComplete = 100
          status = 'Completed'
        } else {
          pctComplete = Math.min(100, Math.round((savedVal / target) * 100))
          status = savedVal >= target ? 'Completed' : 'Partial'
        }
      } else {
        if (target === 0 && savingCredit > 0) {
          pctComplete = 100
          status = 'Completed'
        } else {
          pctComplete = 0
          status = 'Upcoming'
        }
      }

      const planYearIdx = Math.floor(idx / 12) + 1

      return {
        ...m,
        index: idx,
        planYearIdx,
        baseTargetWithoutSkipped: monthBaseTarget,
        baseTarget: effectiveBaseTarget,
        originalBaseTarget: baseMonthlyTarget,
        monthAddedSkipped,
        isGraceMonth,
        graceMonthIndex,
        target,
        rolloverShortfall,
        savingCredit,
        sourceMonthLabel,
        saved: savedVal,
        isEntered,
        isAhead,
        surplusAmount,
        remainingAmount,
        pctComplete,
        status,
        cumulativeSaved: runningCumulativeSaved,
        noIncomeInfo,
        isFullNoIncome,
        isSkipped,
        skippedAmount,
      }
    })

    // Attach postNoIncomeNotice to first active month after skipped months
    for (let i = 1; i < rows.length; i++) {
      const currentMonth = rows[i]
      const prevMonth = rows[i - 1]
      
      if (!currentMonth.isFullNoIncome && prevMonth.isFullNoIncome) {
        let skipCount = 0
        let lastReason = prevMonth.noIncomeInfo?.reason || 'No Income'
        let startIdx = i - 1
        while (startIdx >= 0 && rows[startIdx].isFullNoIncome) {
          skipCount++
          if (rows[startIdx].noIncomeInfo?.reason) {
            lastReason = rows[startIdx].noIncomeInfo.reason
          }
          startIdx--
        }
        const firstSkippedMonth = rows[startIdx + 1]
        const lastSkippedMonth = prevMonth
        const periodDates = firstSkippedMonth === lastSkippedMonth 
          ? firstSkippedMonth.label 
          : `${MONTH_NAMES[firstSkippedMonth.month]} – ${MONTH_NAMES[lastSkippedMonth.month]} ${lastSkippedMonth.year}`

        currentMonth.postNoIncomeNotice = {
          durationLabel: skipCount === 1 ? '1 month' : `${skipCount} months`,
          periodDates,
          reason: lastReason,
        }
      }
    }

    return {
      rows,
      baseMonthlyTarget,
      originalTarget,
      totalConfirmedSaved,
      remainingTarget,
      overallProgressPct,
      activeMonthsCount,
      recalibratedMonthlyAmount,
      totalExcludedMonthsCount,
      hasNoIncomeAdjustments: noIncomePeriods && noIncomePeriods.length > 0,
      noIncomeCount: (noIncomePeriods || []).length,
      noIncomeMonthsList: noIncomeMonthsList.slice(0, 4).join(', ') + (noIncomeMonthsList.length > 4 ? ` +${noIncomeMonthsList.length - 4} more` : ''),
      totalSkippedAmount: studySkippedAmount,
      totalSkippedMonthsCount: studySkippedCount,
    }
  }, [timeline, entries, derived.planMonthlySavingsGBP, noIncomePeriods, timelineConfig, graceAllocationMode])

  const {
    rows,
    originalTarget,
    totalConfirmedSaved,
    remainingTarget,
    overallProgressPct,
    activeMonthsCount,
    recalibratedMonthlyAmount,
    hasNoIncomeAdjustments,
    noIncomeCount,
    noIncomeMonthsList,
    totalSkippedAmount,
    totalSkippedMonthsCount,
  } = scheduleData

  // ─────────────────────────────────────────────────────────────
  // 2. CENTERED YEAR SELECTOR (First Year Default, No "All Years")
  // ─────────────────────────────────────────────────────────────
  const planDuration = timelineConfig?.planDurationYears || PLAN.planYears || 3
  
  const yearFilterTabs = useMemo(() => {
    const tabs = []
    for (let i = 0; i < planDuration; i++) {
      const isGrace = (i === planDuration - 1 && planDuration >= 2)
      let label = `Plan Year ${i + 1}`
      if (i === 0) label = 'First Year'
      else if (i === 1) label = 'Second Year'
      else if (isGrace) label = 'Grace Period'
      else label = `Year ${i + 1}`

      tabs.push({
        id: `Year-${i + 1}`,
        label,
        planYearNumber: i + 1,
        isGrace
      })
    }
    return tabs
  }, [planDuration])

  // Default to First Year
  const [activeFilter, setActiveFilter] = useState('Year-1')

  // Group rows by plan year
  const planYearsData = useMemo(() => {
    const years = []
    for (let i = 0; i < planDuration; i++) {
      const yearMonths = rows.slice(i * 12, (i + 1) * 12)
      if (yearMonths.length > 0) {
        const firstM = yearMonths[0]
        const lastM = yearMonths[yearMonths.length - 1]
        const yearSaved = yearMonths.reduce((sum, m) => sum + (m.saved !== null ? m.saved : 0), 0)
        const baseYearTarget = yearMonths.reduce((sum, m) => sum + (m.isSkipped ? 0 : m.baseTargetWithoutSkipped), 0)
        const isGraceYear = (i === planDuration - 1 && planDuration >= 2)

        // Incorporate accumulated skipped amount into the Grace Period yearly target
        const yearTarget = isGraceYear ? (baseYearTarget + totalSkippedAmount) : baseYearTarget
        const yearPct = yearTarget > 0 ? Math.min(100, Math.round((yearSaved / yearTarget) * 100)) : 0

        const filterNum = parseInt(activeFilter.replace('Year-', ''), 10)
        const isVisible = filterNum === (i + 1)

        years.push({
          planYearNumber: i + 1,
          isGraceYear,
          title: isGraceYear ? 'GRACE PERIOD' : (i === 0 ? 'FIRST YEAR' : i === 1 ? 'SECOND YEAR' : `PLAN YEAR 0${i + 1}`),
          subtitle: isGraceYear ? 'Post-Study Repayment Phase' : `Structured Savings Phase ${i + 1}`,
          periodRange: `${MONTH_NAMES[firstM.month]} ${firstM.year} — ${MONTH_NAMES[lastM.month]} ${lastM.year}`,
          months: yearMonths,
          isVisible,
          yearSaved,
          baseYearTarget,
          yearTarget,
          yearPct,
          totalSkippedAmount,
          totalSkippedCount: totalSkippedMonthsCount,
        })
      }
    }
    return years
  }, [rows, planDuration, activeFilter, totalSkippedAmount, totalSkippedMonthsCount])

  // ─────────────────────────────────────────────────────────────
  // 3. ACTION HANDLERS: INPUTS, SAVE, CLEAR & NO INCOME
  // ─────────────────────────────────────────────────────────────
  const handleDraftChange = (key, val) => {
    setDrafts(prev => ({
      ...prev,
      [key]: val
    }))
  }

  const commitMonthSave = (monthKey, targetVal, finalSaved) => {
    updateEntry(monthKey, { saved: finalSaved })

    // Trigger validation & sound alerts if applicable
    if (finalSaved !== null) {
      completeValueUpdate({
        target: targetVal || derived.targetMonthlySavingsGBP,
        progress: finalSaved
      })
    }

    // Trigger living pipeline ripple
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
    }, 2000)
  }

  const handleSaveMonth = (monthKey, targetVal) => {
    const committedEntry = entries[monthKey]
    const rawVal = drafts[monthKey] !== undefined 
      ? drafts[monthKey] 
      : (committedEntry?.saved !== null && committedEntry?.saved !== undefined ? String(committedEntry.saved) : '')

    // Strict state differentiation:
    // Empty string / null -> Clear entry (null, unentered)
    // "0" -> Explicit £0 intentional
    // > 0 -> Confirmed saved amount
    let finalSaved = null
    if (rawVal.trim() !== '') {
      const parsed = Number(rawVal)
      if (!isNaN(parsed) && parsed >= 0) {
        finalSaved = parsed
      }
    }

    // 1. If saving £0 on this month -> Prompt why skipping this month
    if (finalSaved === 0) {
      const currentMonthRow = rows.find(r => r.key === monthKey)
      if (currentMonthRow && !currentMonthRow.isFullNoIncome) {
        setSkipDetectionModal({
          isOpen: true,
          mode: 'zero',
          pendingSaveMonthKey: monthKey,
          pendingSaveTargetVal: targetVal,
          pendingSaveAmount: 0,
          skippedMonths: [currentMonthRow],
          selectedReason: 'No income',
          customReasonText: '',
        })
        return
      }
    }

    // 2. If saving an amount for a future month while 1, 2, or 3 preceding months are unentered / skipped
    const currentIdx = rows.findIndex(r => r.key === monthKey)
    if (currentIdx > 0 && finalSaved !== null && finalSaved > 0) {
      const unenteredPriorMonths = []
      let checkIdx = currentIdx - 1
      while (checkIdx >= 0) {
        const row = rows[checkIdx]
        if (row.saved === null && !row.isFullNoIncome) {
          unenteredPriorMonths.unshift(row)
        } else {
          break
        }
        checkIdx--
      }

      if (unenteredPriorMonths.length >= 1 && unenteredPriorMonths.length <= 6) {
        setSkipDetectionModal({
          isOpen: true,
          mode: 'skipped_prior',
          pendingSaveMonthKey: monthKey,
          pendingSaveTargetVal: targetVal,
          pendingSaveAmount: finalSaved,
          skippedMonths: unenteredPriorMonths,
          selectedReason: 'No income',
          customReasonText: '',
        })
        return
      }
    }

    // Direct commit if no skipped months prompt needed
    commitMonthSave(monthKey, targetVal, finalSaved)
  }

  const handleClearMonth = (monthKey) => {
    updateEntry(monthKey, { saved: null })
    setDrafts(prev => {
      const next = { ...prev }
      delete next[monthKey]
      return next
    })
    setLastSaveTimestamp(Date.now())
  }

  // Open No Income modal
  const handleOpenNoIncomeModal = (m) => {
    const existingPeriodId = m.noIncomeInfo ? m.noIncomeInfo.periodId : null
    const existingPeriod = existingPeriodId 
      ? (noIncomePeriods || []).find(p => p.id === existingPeriodId) 
      : null

    if (existingPeriod) {
      const unit = existingPeriod.unit || 'months'
      let preset = 'Custom'
      if (unit.toLowerCase() === 'months') {
        if (existingPeriod.duration === 1) preset = '1 Month'
        else if (existingPeriod.duration === 2) preset = '2 Months'
        else if (existingPeriod.duration === 3) preset = '3 Months'
      }

      setNoIncomeModal({
        isOpen: true,
        monthKey: m.key,
        monthLabel: m.label,
        monthIdx: m.index,
        existingPeriodId: existingPeriod.id,
        durationPreset: preset,
        durationNum: existingPeriod.duration || 1,
        durationUnit: unit.charAt(0).toUpperCase() + unit.slice(1),
        selectedReason: existingPeriod.reason || 'No income',
        customReasonText: existingPeriod.customReasonText || '',
      })
    } else {
      setNoIncomeModal({
        isOpen: true,
        monthKey: m.key,
        monthLabel: m.label,
        monthIdx: m.index,
        existingPeriodId: null,
        durationPreset: '1 Month',
        durationNum: 1,
        durationUnit: 'Months',
        selectedReason: 'No income',
        customReasonText: '',
      })
    }
  }

  // Calculate live preview metrics inside No Income modal
  const modalLivePreview = useMemo(() => {
    if (!noIncomeModal.isOpen) return null

    let previewDurationNum = noIncomeModal.durationNum
    let previewUnit = noIncomeModal.durationUnit.toLowerCase()

    if (noIncomeModal.durationPreset === '1 Month') {
      previewDurationNum = 1
      previewUnit = 'months'
    } else if (noIncomeModal.durationPreset === '2 Months') {
      previewDurationNum = 2
      previewUnit = 'months'
    } else if (noIncomeModal.durationPreset === '3 Months') {
      previewDurationNum = 3
      previewUnit = 'months'
    }

    let excludedMonthsEquiv = 0
    if (previewUnit.startsWith('month')) {
      excludedMonthsEquiv = previewDurationNum
    } else if (previewUnit.startsWith('week')) {
      excludedMonthsEquiv = (previewDurationNum * 7) / 30.4
    } else {
      excludedMonthsEquiv = previewDurationNum / 30.4
    }

    // Existing excluded count excluding current edited period if any
    const otherPeriods = (noIncomePeriods || []).filter(p => p.id !== noIncomeModal.existingPeriodId)
    let existingOtherExcludedMonths = 0
    otherPeriods.forEach(p => {
      const u = (p.unit || 'months').toLowerCase()
      const d = Number(p.duration) || 1
      if (u.startsWith('month')) existingOtherExcludedMonths += d
      else if (u.startsWith('week')) existingOtherExcludedMonths += (d * 7) / 30.4
      else existingOtherExcludedMonths += d / 30.4
    })

    const previewActiveMonths = Math.max(1, Math.round((timeline.length - existingOtherExcludedMonths - excludedMonthsEquiv) * 10) / 10)
    const previewRecommendedMonthly = Math.round(remainingTarget / Math.max(1, previewActiveMonths))
    const previewDurationText = previewUnit.startsWith('month') 
      ? `${previewDurationNum} Month${previewDurationNum > 1 ? 's' : ''}` 
      : previewUnit.startsWith('week') 
        ? `${previewDurationNum} Week${previewDurationNum > 1 ? 's' : ''}` 
        : `${previewDurationNum} Day${previewDurationNum > 1 ? 's' : ''}`

    return {
      durationText: previewDurationText,
      activeMonths: previewActiveMonths,
      recommendedMonthly: previewRecommendedMonthly,
      remainingTarget,
    }
  }, [noIncomeModal, noIncomePeriods, timeline.length, remainingTarget])

  const handleApplyNoIncome = () => {
    if (!noIncomeModal.monthKey) return

    let finalDuration = noIncomeModal.durationNum
    let finalUnit = noIncomeModal.durationUnit.toLowerCase()

    if (noIncomeModal.durationPreset === '1 Month') {
      finalDuration = 1
      finalUnit = 'months'
    } else if (noIncomeModal.durationPreset === '2 Months') {
      finalDuration = 2
      finalUnit = 'months'
    } else if (noIncomeModal.durationPreset === '3 Months') {
      finalDuration = 3
      finalUnit = 'months'
    }

    const finalReason = noIncomeModal.selectedReason === 'Other' && noIncomeModal.customReasonText.trim()
      ? noIncomeModal.customReasonText.trim()
      : noIncomeModal.selectedReason

    const payload = {
      startMonthKey: noIncomeModal.monthKey,
      duration: Math.max(1, Number(finalDuration) || 1),
      unit: finalUnit,
      reason: finalReason,
      customReasonText: noIncomeModal.customReasonText,
    }

    if (noIncomeModal.existingPeriodId) {
      updateNoIncomePeriod(noIncomeModal.existingPeriodId, payload)
    } else {
      addNoIncomePeriod(payload)
    }

    setLastSaveTimestamp(Date.now())
    setNoIncomeModal(prev => ({ ...prev, isOpen: false }))
  }

  const handleRemoveNoIncome = () => {
    if (noIncomeModal.existingPeriodId) {
      removeNoIncomePeriod(noIncomeModal.existingPeriodId)
      setLastSaveTimestamp(Date.now())
    }
    setNoIncomeModal(prev => ({ ...prev, isOpen: false }))
  }

  // Reset Schedule Handler
  const handleConfirmResetSchedule = () => {
    resetScheduleAdjustments()
    setDrafts({})
    setLastSaveTimestamp(Date.now())
    setIsResetModalOpen(false)
    setResetFeedback(true)
    setTimeout(() => setResetFeedback(false), 3000)
  }

  const toggleInfoPopover = (key) => {
    setInfoPopoverKey(prev => prev === key ? null : key)
  }

  // Export CSV Ledger
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
          'Actual Saved (£)': r.saved !== null ? r.saved : '—',
          'Status': r.status,
          '% Complete': `${r.pctComplete}%`,
          'Cumulative (£)': r.cumulativeSaved,
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
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. DYNAMIC SUMMARY KPI CARDS (Derived from pure canonical state)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Total Saved So Far */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[172px]">
          <KpiLiquidWave type="saved" pct={overallProgressPct} />

          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                Total Saved So Far
              </p>
              <h3 className="font-display text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight mt-1.5 figure">
                £{totalConfirmedSaved.toLocaleString('en-GB')}
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
              <span className="text-[#0F172A] font-black figure">of £{originalTarget.toLocaleString('en-GB')}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden p-0.5 border border-black/10">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#16A34A] transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(2, (totalConfirmedSaved / Math.max(1, originalTarget)) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Overall Target Progress */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[172px]">
          <KpiLiquidWave type="progress" pct={overallProgressPct} />

          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                Overall Target Progress
              </p>
              <h3 className="font-display text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight mt-1.5 figure">
                {overallProgressPct}%
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

        {/* Card 3: Remaining Target */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[172px]">
          <KpiLiquidWave type="payoff" pct={overallProgressPct} />

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
          2. TIMELINE CONFIGURATION & RESET BANNER
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
          
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-[#166534] text-xs font-bold border border-emerald-200/80 shrink-0 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
              Dynamic Recalibration Active
            </span>
          </div>
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
                <ChevronDown className="w-4 h-4" />
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
                <ChevronDown className="w-4 h-4" />
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
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          3. SCHEDULE RECALIBRATION & RESET SCHEDULE BANNER
          ───────────────────────────────────────────────────────────── */}
      {hasNoIncomeAdjustments && (
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
                    {noIncomeCount} No Income period{noIncomeCount > 1 ? 's' : ''} recorded ({noIncomeMonthsList})
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#475569] leading-relaxed max-w-3xl font-medium">
                  Because you have intentional zero-income gaps, your remaining{' '}
                  <span className="font-extrabold text-[#0F172A] figure">£{remainingTarget.toLocaleString('en-GB')}</span>{' '}
                  target is smoothly recalibrated across your remaining{' '}
                  <span className="font-extrabold text-[#0F172A] figure">{activeMonthsCount} active earning months</span>{' '}
                  at approximately{' '}
                  <span className="font-black text-[#166534] bg-emerald-100/80 px-2 py-0.5 rounded-md figure border border-emerald-200/50">
                    £{recalibratedMonthlyAmount.toLocaleString('en-GB')}/mo
                  </span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Schedule
              </button>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-extrabold text-[#0F172A] shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                Schedule Adjusted
              </span>
            </div>

          </div>
        </div>
      )}

      {resetFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#166534] flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#16A34A]" />
            <span>Original plan restored successfully. Schedule adjustments removed while actual savings remain intact.</span>
          </div>
          <button onClick={() => setResetFeedback(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          4. HERO SAVINGS TIMELINE SECTION & CENTERED YEAR FILTER
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Timeline Header Bar */}
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
              Log monthly savings or customize No Income periods. Every input reactively updates all downstream months.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Export CSV Button */}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-2xl bg-white text-[#0F172A] hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#64748B]" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. DYNAMIC FREEDOM PIPELINE (Hero 3-Color Liquid Flow with Embedded Year Selector)
            ───────────────────────────────────────────────────────────── */}
        <DynamicFreedomPipeline 
          overallSaved={totalConfirmedSaved}
          overallTarget={originalTarget}
          overallPct={overallProgressPct}
          monthlyTarget={derived.planMonthlySavingsGBP || 649}
          lastSaveTimestamp={lastSaveTimestamp}
          yearFilterTabs={yearFilterTabs}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />

        {/* ─────────────────────────────────────────────────────────────
            6. PLAN YEAR CONTAINERS & STANDARDIZED MONTHLY CARDS
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
              {/* Plan Year Container Header - Centered with Bold Red Yearly Target */}
              <div className="flex flex-col items-center justify-center text-center gap-2 border-b border-[#F1F5F9] pb-5">
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-center">
                  <span className="text-sm sm:text-base font-black text-[#0F172A] whitespace-nowrap">
                    {planYear.periodRange}
                  </span>

                  <span className="text-[11px] font-extrabold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#E2E8F0] whitespace-nowrap">
                    {planYear.subtitle}
                  </span>
                </div>

                {/* Bold Red Centered Yearly Target */}
                <div className="flex items-center justify-center gap-2 my-1">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#475569]">
                    YEARLY TARGET:
                  </span>
                  <span className="font-display text-2xl sm:text-3xl font-black text-[#DC2626] figure tracking-tight">
                    £{formatGBP(planYear.yearTarget)}
                  </span>
                </div>

                {/* Centered Year Saved Progress Pill */}
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] bg-slate-50/90 px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-xs whitespace-nowrap">
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#475569]">Year Saved:</span>
                  <span className="text-xs sm:text-sm font-black text-[#0F172A] figure">
                    £{formatGBP(planYear.yearSaved)}
                  </span>
                  <span className="text-[#94A3B8]">/</span>
                  <span className="text-xs sm:text-sm font-black text-[#0F172A] figure">
                    £{formatGBP(planYear.yearTarget)}
                  </span>
                  <span className="font-extrabold text-[#166534] bg-emerald-100/90 text-[11px] px-2 py-0.5 rounded-md figure border border-emerald-200/70">
                    {planYear.yearPct}%
                  </span>
                </div>

                {/* Grace Period Skipped Carry-Forward Banner with Allocation Switcher */}
                {planYear.isGraceYear && planYear.totalSkippedAmount > 0 && (
                  <div className="w-full max-w-2xl mx-auto rounded-2xl bg-amber-50/90 border border-amber-200/90 p-4 sm:p-5 shadow-xs text-left my-2 animate-fade-in space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <RotateCcw className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-[#0F172A]">
                            Skipped savings carried forward
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-[#475569] bg-white px-2.5 py-0.5 rounded-md border border-amber-200">
                              Skipped Months: <strong className="text-[#0F172A]">{planYear.totalSkippedCount}</strong>
                            </span>
                            <span className="text-[10px] font-black uppercase text-rose-700 bg-white px-2.5 py-0.5 rounded-md border border-rose-200 figure">
                              Skipped Amount: <strong className="text-rose-700 font-black">+£{formatGBP(planYear.totalSkippedAmount)}</strong>
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-[#475569] leading-relaxed">
                          You skipped {planYear.totalSkippedCount} month{planYear.totalSkippedCount > 1 ? 's' : ''} during your savings plan. The total skipped amount (£{formatGBP(planYear.totalSkippedAmount)}) has been added to your Grace Period so you have additional time to complete those skipped savings.
                        </p>

                        {/* Allocation Mode Selector */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                          <span className="text-[11px] font-extrabold text-[#475569]">Allocation:</span>
                          <button
                            type="button"
                            onClick={() => setGraceAllocationMode('split')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              graceAllocationMode === 'split'
                                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                                : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-amber-100/50'
                            }`}
                          >
                            Split across Grace Period (+£{formatGBP(planYear.totalSkippedAmount / Math.max(1, planYear.months.length))}/mo)
                          </button>
                          <button
                            type="button"
                            onClick={() => setGraceAllocationMode('first_month')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              graceAllocationMode === 'first_month'
                                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                                : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-amber-100/50'
                            }`}
                          >
                            Add to 1st Grace Month (+£{formatGBP(planYear.totalSkippedAmount)})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Cards Grid (Standardized Architecture, No Decorative Images) */}
              <div className="grid grid-cols-1 gap-4">
                {planYear.months.map((m) => {
                  const isEntered = m.isEntered
                  const committedEntry = entries[m.key]
                  const committedVal = m.saved !== null ? m.saved : ''
                  const committedEntryDate = committedEntry?.savedAt ? new Date(committedEntry.savedAt).toLocaleDateString('en-GB') : null
                  const currentDraft = drafts[m.key] !== undefined ? drafts[m.key] : committedVal
                  const isDirty = drafts[m.key] !== undefined && drafts[m.key] !== String(committedVal)
                  const isSavedJustNow = !!savedFeedback[m.key]
                  
                  const isCompleted = m.status === 'Completed'
                  const isPartial = m.status === 'Partial'
                  const isUpcoming = m.status === 'Upcoming'
                  const isSkipped = m.isSkipped || m.status === 'Skipped'
                  const isNoIncome = m.status === 'No Income' || m.isFullNoIncome

                  return (
                    <div
                      key={m.key}
                      className={`relative isolate overflow-hidden rounded-[22px] p-5 sm:p-6 border transition-all duration-300 shadow-xs hover:shadow-sm ${
                        isDirty 
                          ? 'bg-amber-50/40 border-amber-300' 
                          : isSkipped
                            ? 'bg-white border-rose-200/80 hover:border-rose-300'
                            : isNoIncome
                              ? 'bg-slate-50/90 border-slate-300/80 hover:border-slate-400'
                              : isCompleted || m.pctComplete >= 90
                                ? 'bg-white border-emerald-200/80 hover:border-emerald-300'
                                : m.pctComplete >= 75
                                  ? 'bg-white border-lime-200/70 hover:border-lime-300'
                                  : m.pctComplete >= 50
                                    ? 'bg-white border-amber-200/70 hover:border-amber-300'
                                    : isPartial
                                      ? 'bg-white border-rose-200/70 hover:border-rose-300'
                                      : 'bg-white hover:bg-[#F8FAFC]/60 border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {/* Physical Responsive Liquid Water Surface Wave */}
                      <LiquidProgressWave 
                        pctComplete={m.pctComplete}
                        status={m.status}
                        isShortfall={isPartial}
                        isNoIncome={isNoIncome || isSkipped}
                      />

                      {/* Card Content Layout */}
                      <div className="relative z-10 space-y-4">

                        {/* Schedule Adjusted Notice on First Active Month After No Income */}
                        {m.postNoIncomeNotice && (
                          <div className="rounded-xl bg-amber-50/90 border border-amber-200/80 p-2.5 sm:p-3 flex items-start gap-2.5 text-xs shadow-xs mb-1">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black block text-[#0F172A]">Schedule Adjusted</span>
                              <span className="text-[#475569] text-[11px] leading-relaxed">
                                You skipped {m.postNoIncomeNotice.durationLabel} ({m.postNoIncomeNotice.periodDates}). Reason: <strong className="text-[#0F172A]">{m.postNoIncomeNotice.reason}</strong>. Your remaining schedule has been recalculated.
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Header Row: Month Name & Status Chips */}
                        <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-lg sm:text-xl font-black text-[#0F172A] tracking-tight uppercase">
                              {m.label}
                            </span>
                            <span className="text-[11px] font-black text-[#334155]">
                              • {planYear.isGraceYear ? 'Grace Period' : `Plan Year 0${planYear.planYearNumber}`}
                            </span>
                          </div>

                          {/* Status Chips */}
                          <div className="flex flex-wrap items-center gap-2">
                            {isSkipped && (
                              <span className="animate-stamp inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1 rounded-full bg-[#DC2626] text-white border border-[#B91C1C] shadow-sm uppercase tracking-wider">
                                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                SKIPPED
                              </span>
                            )}

                            {!isSkipped && m.monthAddedSkipped > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-xs">
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                Carried Forward (+£{formatGBP(m.monthAddedSkipped)})
                              </span>
                            )}

                            {m.isAhead && m.surplusAmount > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-emerald-100 text-[#166534] border border-emerald-300 shadow-xs">
                                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                Ahead (+£{formatGBP(m.surplusAmount)})
                              </span>
                            )}

                            {!isSkipped && !isNoIncome && m.savingCredit > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-[#166534] border border-emerald-200 shadow-xs">
                                <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
                                Ahead of Schedule
                              </span>
                            )}

                            {!isSkipped && !isNoIncome && m.rolloverShortfall > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                                Includes Rollover
                              </span>
                            )}

                            {isCompleted && !m.isAhead && m.savingCredit === 0 && !isNoIncome && !isSkipped && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-[#166534] border border-emerald-200 shadow-xs">
                                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                Completed
                              </span>
                            )}

                            {isPartial && !isNoIncome && !isSkipped && (
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
                                  m.pctComplete >= 90 ? 'bg-[#16A34A]' : m.pctComplete >= 75 ? 'bg-lime-600' : m.pctComplete >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`} />
                                Partial ({m.pctComplete}%)
                              </span>
                            )}

                            {isUpcoming && m.savingCredit === 0 && !isNoIncome && !isSkipped && m.monthAddedSkipped === 0 && (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] shadow-xs">
                                <Clock className="w-3 h-3 text-[#94A3B8]" />
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Row: Content layout depends on whether month is Skipped, No Income or Normal */}
                        {isSkipped ? (
                          /* Standardized Skipped Month State preserving exact card layout */
                          <div className="space-y-4 pt-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* 1. TARGET / SKIPPED AMOUNT */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                    Target
                                  </span>
                                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    Skipped Month
                                  </span>
                                </div>
                                <div>
                                  <span className="text-2xl font-black text-[#0F172A] figure">
                                    £{formatGBP(m.skippedAmount)}
                                  </span>
                                  <span className="block text-[10px] font-bold text-[#475569] mt-0.5">
                                    Planned Monthly Target
                                  </span>
                                  <span className="block text-[10px] font-semibold text-[#64748B]">
                                    Year {planYear.planYearNumber} Target: £{formatGBP(planYear.yearTarget)}
                                  </span>
                                </div>
                              </div>

                              {/* 2. ACTUAL SAVED AREA */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                    Actual Saved
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNoIncomeModal(m)}
                                    className="text-[10px] font-bold text-[#64748B] hover:text-[#0F172A] cursor-pointer flex items-center gap-1 hover:underline"
                                    title="Edit skip reason or duration"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    Edit Reason
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  <div className="relative inline-flex items-center flex-1 min-w-[120px]">
                                    <span className="absolute left-3 text-sm font-black text-[#64748B] figure">£</span>
                                    <input
                                      type="text"
                                      readOnly
                                      value="0"
                                      className="w-full rounded-[14px] border border-[#CBD5E1] bg-slate-50 pl-7 pr-3 py-2 text-sm font-black text-[#64748B] figure cursor-not-allowed focus:outline-none"
                                      aria-label={`Actual saved amount for ${m.label} (Skipped)`}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenNoIncomeModal(m)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-black border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F1F5F9] transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 flex items-center gap-1.5"
                                    title="Edit skipped status"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
                                    Edit Skip
                                  </button>
                                </div>

                                <p className="text-[10px] text-[#64748B] font-semibold flex items-center gap-1 pt-0.5">
                                  <span>Reason: {m.noIncomeInfo?.reason || 'No income'}</span>
                                </p>
                              </div>
                            </div>

                            {/* Vibrant Red/Rose Explanatory Message Box */}
                            <div className="rounded-xl bg-rose-50/90 border border-rose-200/90 p-3 flex items-start gap-2.5 text-xs shadow-xs">
                              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-black text-[#0F172A] block">
                                  This month has been skipped.
                                </span>
                                <p className="text-[#475569] text-[11px] leading-relaxed">
                                  Your planned savings amount of <strong className="text-[#0F172A] figure">£{formatGBP(m.skippedAmount)}</strong> hasn't been lost. It will be carried forward and added to your Grace Period at the end of your savings plan.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Normal Month State */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                            
                            {/* 1. TARGET AREA */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                  Target
                                </span>
                                {m.monthAddedSkipped > 0 ? (
                                  <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                                    Includes Skipped Carry-Forward
                                  </span>
                                ) : m.savingCredit > 0 ? (
                                  <span className="text-[10px] font-black text-[#166534] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Includes Saving Credit
                                  </span>
                                ) : m.rolloverShortfall > 0 ? (
                                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    Includes Rollover
                                  </span>
                                ) : null}
                              </div>

                              {m.monthAddedSkipped > 0 ? (
                                /* Grace Period Month with Carry-Forward Addition Breakdown */
                                <div className="space-y-2">
                                  <div className="rounded-[14px] bg-white/90 backdrop-blur-xs border border-amber-300 p-3 space-y-1.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-[#334155] font-extrabold">Standard monthly target</span>
                                      <span className="font-black text-[#0F172A] figure">£{formatGBP(m.baseTargetWithoutSkipped)}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs text-amber-800 font-bold pt-1.5 border-t border-amber-100">
                                      <span className="flex items-center gap-1">
                                        ↳ Skipped savings carried forward
                                      </span>
                                      <span className="figure font-black text-amber-800">+ £{formatGBP(m.monthAddedSkipped)}</span>
                                    </div>

                                    {m.rolloverShortfall > 0 && (
                                      <div className="flex items-center justify-between text-xs text-rose-700 font-bold pt-1.5 border-t border-rose-100">
                                        <span className="flex items-center gap-1">
                                          ↳ Shortfall from {m.sourceMonthLabel || 'previous month'}
                                        </span>
                                        <span className="figure font-black text-rose-700">+ £{formatGBP(m.rolloverShortfall)}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-baseline justify-between pt-0.5">
                                    <div>
                                      <span className="text-[11px] font-black uppercase text-[#334155] block">Adjusted Target</span>
                                      <span className="text-[10px] font-semibold text-[#64748B]">Year {planYear.planYearNumber} Target: £{formatGBP(planYear.yearTarget)}</span>
                                    </div>
                                    <span className="text-xl font-black text-[#0F172A] figure">£{formatGBP(m.target)}</span>
                                  </div>
                                </div>
                              ) : m.savingCredit > 0 ? (
                                <div className="space-y-2">
                                  <div className="rounded-[14px] bg-white/90 backdrop-blur-xs border border-emerald-300 p-3 space-y-1.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-[#334155] font-extrabold">Base monthly target</span>
                                      <span className="font-black text-[#0F172A] figure">£{formatGBP(m.baseTarget)}</span>
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
                                      <span className="figure font-black text-[#16A34A]">- £{formatGBP(m.savingCredit)}</span>
                                    </div>
                                  </div>

                                  {infoPopoverKey === m.key && (
                                    <div className="p-3 rounded-xl bg-[#0F172A] text-white text-xs shadow-lg animate-fade-in space-y-1.5 border border-slate-700">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#4DFC5A] flex items-center gap-1.5">
                                          <Info className="w-3.5 h-3.5" />
                                          Saving Credit from {m.sourceMonthLabel}
                                        </span>
                                        <button onClick={() => setInfoPopoverKey(null)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-slate-300 text-[11px] leading-relaxed">
                                        Your previous £{formatGBP(m.savingCredit)} surplus saving in {m.sourceMonthLabel} has been carried forward to reduce this month's target.
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-baseline justify-between pt-0.5">
                                    <div>
                                      <span className="text-[11px] font-black uppercase text-[#334155] block">Adjusted Target</span>
                                      <span className="text-[10px] font-semibold text-[#64748B]">Year {planYear.planYearNumber} Target: £{formatGBP(planYear.yearTarget)}</span>
                                    </div>
                                    <span className="text-xl font-black text-[#0F172A] figure">£{formatGBP(m.target)}</span>
                                  </div>
                                </div>
                              ) : m.rolloverShortfall > 0 ? (
                                <div className="space-y-2">
                                  <div className="rounded-[14px] bg-white/90 backdrop-blur-xs border border-[#CBD5E1] p-3 space-y-1.5 shadow-xs">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-[#334155] font-extrabold">Base monthly target</span>
                                      <span className="font-black text-[#0F172A] figure">£{formatGBP(m.baseTarget)}</span>
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
                                      <span className="figure font-black text-rose-700">+ £{formatGBP(m.rolloverShortfall)}</span>
                                    </div>
                                  </div>

                                  {infoPopoverKey === m.key && (
                                    <div className="p-3 rounded-xl bg-[#0F172A] text-white text-xs shadow-lg animate-fade-in space-y-1.5 border border-slate-700">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#4DFC5A] flex items-center gap-1.5">
                                          <Info className="w-3.5 h-3.5" />
                                          Shortfall from {m.sourceMonthLabel}
                                        </span>
                                        <button onClick={() => setInfoPopoverKey(null)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-slate-300 text-[11px] leading-relaxed">
                                        {m.sourceMonthLabel}'s shortfall of £{formatGBP(m.rolloverShortfall)} has been carried forward to this month.
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-baseline justify-between pt-0.5">
                                    <div>
                                      <span className="text-[11px] font-black uppercase text-[#334155] block">Adjusted Target</span>
                                      <span className="text-[10px] font-semibold text-[#64748B]">Year {planYear.planYearNumber} Target: £{formatGBP(planYear.yearTarget)}</span>
                                    </div>
                                    <span className="text-xl font-black text-[#0F172A] figure">£{formatGBP(m.target)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-2xl font-black text-[#0F172A] figure">
                                    £{formatGBP(m.target)}
                                  </span>
                                  <span className="block text-[10px] font-bold text-[#475569] mt-0.5">
                                    Standard Monthly Target
                                  </span>
                                  <span className="block text-[10px] font-semibold text-[#64748B]">
                                    Year {planYear.planYearNumber} Target: £{formatGBP(planYear.yearTarget)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 2. ACTUAL SAVED AREA */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-[#0F172A]">
                                  Actual Saved
                                </span>
                                {isEntered && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearMonth(m.key)}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1 hover:underline"
                                    title="Clear saved amount and reset downstream rollover"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Clear Amount
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5">
                                {/* Amount input */}
                                <div className="relative inline-flex items-center flex-1 min-w-[120px]">
                                  <span className="absolute left-3 text-sm font-black text-[#0F172A] figure">£</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
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
                                  type="button"
                                  onClick={() => handleSaveMonth(m.key, m.target)}
                                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 ${
                                    isSavedJustNow
                                      ? 'bg-[#16A34A] text-white shadow-emerald-500/20'
                                      : isDirty
                                        ? 'bg-[#0F172A] text-white hover:bg-slate-800 scale-102'
                                        : 'bg-[#0F172A] text-white hover:bg-slate-800'
                                  }`}
                                  title="Commit and recalculate schedule"
                                >
                                  {isSavedJustNow ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-white" />
                                      Saved ✓
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5 text-slate-300" />
                                      Save
                                    </>
                                  )}
                                </button>

                                {/* No Income Trigger Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenNoIncomeModal(m)}
                                  className="px-3 py-2 rounded-xl text-xs font-bold border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                                  title="Mark this month or custom duration as No Income"
                                >
                                  No Income
                                </button>
                              </div>

                              {isEntered && m.remainingAmount > 0 && (
                                <p className="text-[11px] text-rose-600 font-extrabold flex items-center gap-1 pt-1">
                                  <RotateCcw className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Remaining: £{formatGBP(m.remainingAmount)} (carried to next month)</span>
                                </p>
                              )}

                              {isEntered && m.isAhead && m.surplusAmount > 0 && (
                                <p className="text-[11px] text-[#166534] font-extrabold flex items-center gap-1 pt-1">
                                  <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                                  <span>Ahead: +£{formatGBP(m.surplusAmount)} (surplus credit for next month)</span>
                                </p>
                              )}

                              {isEntered && committedEntryDate && (
                                <p className="text-[10px] text-[#64748B] font-semibold flex items-center gap-1 pt-0.5">
                                  <span>Saved on {committedEntryDate}</span>
                                </p>
                              )}
                            </div>

                          </div>
                        )}

                        {/* Bottom Row: Physical Progress Bar & Cumulative Metrics */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/10">
                          
                          {/* Left: Progress percent and bar */}
                          <div className="flex-1 max-w-md">
                            <div className="flex items-center justify-between text-xs font-black text-[#0F172A] mb-1.5">
                              <span className="uppercase text-[10px] tracking-wider text-[#475569]">
                                Progress
                              </span>
                              <span className="figure text-xs">
                                {m.pctComplete}%
                              </span>
                            </div>
                            
                            <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden p-0.5 border border-black/10">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${Math.min(100, Math.max(0, m.pctComplete))}%`,
                                  background: getProgressGradientCSS(m.pctComplete, isPartial, isNoIncome),
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
                              £{m.cumulativeSaved.toLocaleString('en-GB')}
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
          7. COMPACT RECTANGULAR "NO INCOME" POPUP (Section 4 & 5)
          ───────────────────────────────────────────────────────────── */}
      {noIncomeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[390px] rounded-2xl bg-white border border-[#CBD5E1] shadow-2xl p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0F172A]" />
                <h3 className="font-display text-base font-black text-[#0F172A]">
                  No Income
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNoIncomeModal(prev => ({ ...prev, isOpen: false }))}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] cursor-pointer"
                aria-label="Close popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question 1: How long do you want to skip? */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0F172A]">
                How long do you want to skip?
              </label>
              
              {/* Preset Selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {['1 Month', '2 Months', '3 Months', 'Custom'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNoIncomeModal(prev => ({ ...prev, durationPreset: preset }))}
                    className={`py-1.5 px-1 text-center rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      noIncomeModal.durationPreset === preset
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom Duration Inputs */}
              {noIncomeModal.durationPreset === 'Custom' && (
                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={noIncomeModal.durationNum}
                    onChange={(e) => setNoIncomeModal(prev => ({ ...prev, durationNum: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-1/2 rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-black text-[#0F172A] focus:border-[#0F172A] focus:outline-none shadow-xs"
                    placeholder="Number"
                  />
                  <div className="w-1/2 relative">
                    <select
                      value={noIncomeModal.durationUnit}
                      onChange={(e) => setNoIncomeModal(prev => ({ ...prev, durationUnit: e.target.value }))}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 text-xs font-bold text-[#0F172A] focus:border-[#0F172A] appearance-none cursor-pointer"
                    >
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                      <option value="Months">Months</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#64748B]">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Question 2: Why are you skipping the month(s)? */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0F172A]">
                {noIncomeModal.durationPreset === '1 Month' ? 'Why are you skipping this month?' : 'Why are you skipping these months?'}
              </label>
              <div className="relative">
                <select
                  value={noIncomeModal.selectedReason}
                  onChange={(e) => setNoIncomeModal(prev => ({ ...prev, selectedReason: e.target.value }))}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#0F172A] appearance-none cursor-pointer"
                >
                  <option value="No income">No income</option>
                  <option value="Study">Study</option>
                  <option value="Unemployment">Unemployment</option>
                  <option value="Personal break">Personal break</option>
                  <option value="Financial difficulty">Financial difficulty</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#64748B]">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {noIncomeModal.selectedReason === 'Other' && (
                <input
                  type="text"
                  value={noIncomeModal.customReasonText}
                  onChange={(e) => setNoIncomeModal(prev => ({ ...prev, customReasonText: e.target.value }))}
                  placeholder="Enter reason..."
                  className="w-full mt-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:border-[#0F172A] focus:outline-none shadow-xs"
                />
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
              {noIncomeModal.existingPeriodId ? (
                <button
                  type="button"
                  onClick={handleRemoveNoIncome}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setNoIncomeModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleApplyNoIncome}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-black bg-[#0F172A] text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer text-center"
              >
                Apply
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          7B. AUTO-DETECTED SKIPPED MONTHS POPUP
          ───────────────────────────────────────────────────────────── */}
      {skipDetectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white border border-[#CBD5E1] shadow-2xl p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <h3 className="font-display text-base font-black text-[#0F172A]">
                  {skipDetectionModal.mode === 'zero' 
                    ? 'No Savings this Month?' 
                    : `Skipped ${skipDetectionModal.skippedMonths.length} Month${skipDetectionModal.skippedMonths.length > 1 ? 's' : ''} Detected`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  commitMonthSave(
                    skipDetectionModal.pendingSaveMonthKey,
                    skipDetectionModal.pendingSaveTargetVal,
                    skipDetectionModal.pendingSaveAmount
                  )
                  setSkipDetectionModal(prev => ({ ...prev, isOpen: false }))
                }}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] cursor-pointer"
                aria-label="Close popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              {skipDetectionModal.mode === 'zero' ? (
                <>You entered <strong>£0</strong> for <strong>{skipDetectionModal.skippedMonths[0]?.label}</strong>.</>
              ) : (
                <>
                  You are saving for <strong>{rows.find(r => r.key === skipDetectionModal.pendingSaveMonthKey)?.label}</strong> while skipping{' '}
                  <strong>
                    {skipDetectionModal.skippedMonths.map(m => m.label).join(', ')}
                  </strong>.
                </>
              )}
            </p>

            {/* Question: Why are you skipping the month(s)? */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0F172A]">
                {skipDetectionModal.skippedMonths.length === 1 
                  ? 'Why are you skipping this month?' 
                  : 'Why are you skipping these months?'}
              </label>
              
              <div className="relative">
                <select
                  value={skipDetectionModal.selectedReason}
                  onChange={(e) => setSkipDetectionModal(prev => ({ ...prev, selectedReason: e.target.value }))}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-bold text-[#0F172A] focus:border-[#0F172A] appearance-none cursor-pointer"
                >
                  <option value="No income">No income</option>
                  <option value="Study">Study</option>
                  <option value="Unemployment">Unemployment</option>
                  <option value="Personal break">Personal break</option>
                  <option value="Financial difficulty">Financial difficulty</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#64748B]">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {skipDetectionModal.selectedReason === 'Other' && (
                <input
                  type="text"
                  value={skipDetectionModal.customReasonText}
                  onChange={(e) => setSkipDetectionModal(prev => ({ ...prev, customReasonText: e.target.value }))}
                  placeholder="Enter reason..."
                  className="w-full mt-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:border-[#0F172A] focus:outline-none shadow-xs"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#F1F5F9] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const finalReason = skipDetectionModal.selectedReason === 'Other' && skipDetectionModal.customReasonText.trim()
                    ? skipDetectionModal.customReasonText.trim()
                    : skipDetectionModal.selectedReason

                  // Add No Income period for skipped months
                  addNoIncomePeriod({
                    startMonthKey: skipDetectionModal.skippedMonths[0].key,
                    duration: skipDetectionModal.skippedMonths.length,
                    unit: 'months',
                    reason: finalReason,
                    customReasonText: skipDetectionModal.customReasonText,
                  })

                  // Commit save if not mode 'zero' (since zero is now marked as No Income)
                  if (skipDetectionModal.mode !== 'zero') {
                    commitMonthSave(
                      skipDetectionModal.pendingSaveMonthKey,
                      skipDetectionModal.pendingSaveTargetVal,
                      skipDetectionModal.pendingSaveAmount
                    )
                  }

                  setSkipDetectionModal(prev => ({ ...prev, isOpen: false }))
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-[#0F172A] text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer text-center"
              >
                {skipDetectionModal.mode === 'zero' 
                  ? 'Mark as No Income (Recalibrate Schedule)' 
                  : `Mark ${skipDetectionModal.skippedMonths.length} Month${skipDetectionModal.skippedMonths.length > 1 ? 's' : ''} as No Income & Save`}
              </button>

              <button
                type="button"
                onClick={() => {
                  commitMonthSave(
                    skipDetectionModal.pendingSaveMonthKey,
                    skipDetectionModal.pendingSaveTargetVal,
                    skipDetectionModal.pendingSaveAmount
                  )
                  setSkipDetectionModal(prev => ({ ...prev, isOpen: false }))
                }}
                className="w-full py-2 px-4 rounded-xl text-xs font-bold text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all cursor-pointer text-center"
              >
                {skipDetectionModal.mode === 'zero' 
                  ? 'Save as £0 Shortfall (Carry to Next Month)' 
                  : 'Just Save without No Income Adjustment'}
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────
          8. RESET SCHEDULE CONFIRMATION MODAL (Section 11, 12)
          ───────────────────────────────────────────────────────────── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-[480px] rounded-[26px] bg-white border border-[#E2E8F0] shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-black text-[#0F172A]">
                  Reset Schedule?
                </h3>
                <p className="text-xs text-[#64748B] font-medium">
                  Restore original plan structure.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed font-medium">
              This will remove all schedule adjustments, No Income periods, rollovers, and recalibrations and restore your original 36-month baseline plan.
            </p>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#166534] font-bold flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <span>Your actual historical savings entries will be safely preserved.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmResetSchedule}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer transition-all"
              >
                Reset Schedule
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
