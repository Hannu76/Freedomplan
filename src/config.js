// ── Plan constants ───────────────────────────────────────────────────────
// Everything here comes straight from the brief. Change these if your
// numbers change — nothing else in the app hardcodes them.

export const PLAN = {
  monthlyIncome: 1300,
  expenses: {
    rent: { min: 250, max: 300 },
    bills: 100,
    travel: 90,
    food: 70,
  },
  monthlySavingsTarget: 456,
  yearlyTarget: 5469, // target £ per year toward the loan pre-payment
  planYears: 3,
  totalTarget: 16407, // 5469 * 3
}

export const LOAN = {
  startingBalanceINR: 2400000, // ₹24,00,000
  monthlyEMIINR: 5000,
  yearlyLumpSumINR: 700000, // ₹7,00,000 every December
  lumpSumMonth: 12, // December
  years: 3,
}

export const CURRENCY = {
  defaultRate: 128, // 1 GBP = ₹128
  lowRateWarningThreshold: 125,
}

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
