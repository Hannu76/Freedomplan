import { MONTH_NAMES } from '../config'

/** Returns a "YYYY-MM" key for a given year/month (0-indexed month). */
export function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** Human label like "Jul 2026" for a given year/month (0-indexed month). */
export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`
}

/**
 * Builds an ordered list of { year, month, key, label } for `count` months
 * starting from the given start date (defaults to the current month).
 */
export function buildMonthTimeline(count, start = new Date()) {
  const months = []
  let year = start.getFullYear()
  let month = start.getMonth() // 0-indexed
  for (let i = 0; i < count; i++) {
    months.push({ year, month, key: monthKey(year, month), label: monthLabel(year, month) })
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return months
}

/** Days remaining until the next 31 December from today. */
export function daysUntilNextDec31(today = new Date()) {
  let target = new Date(today.getFullYear(), 11, 31, 23, 59, 59)
  if (target < today) {
    target = new Date(today.getFullYear() + 1, 11, 31, 23, 59, 59)
  }
  const ms = target - today
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
