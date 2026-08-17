/**
 * Converts a numeric amount to human-readable Indian currency representation in words
 * e.g.,
 *   50000     -> "50 Thousand"
 *   100000    -> "1 Lakh"
 *   200000    -> "2 Lakhs"
 *   500000    -> "5 Lakhs"
 *   1000000   -> "10 Lakhs"
 *   2500000   -> "25 Lakhs"
 *   4000000   -> "40 Lakhs"
 *   10000000  -> "1 Crore"
 *   20000000  -> "2 Crores"
 *   25000000  -> "2.5 Crores"
 */
export function formatIndianCurrencyWords(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''))
  if (isNaN(num) || num <= 0) return ''

  if (num >= 10000000) {
    // 1 Crore = 10,000,000
    const cr = num / 10000000
    const formatted = cr % 1 === 0 ? cr.toString() : parseFloat(cr.toFixed(2)).toString()
    return `${formatted} ${cr === 1 ? 'Crore' : 'Crores'}`
  } else if (num >= 100000) {
    // 1 Lakh = 100,000
    const lakh = num / 100000
    const formatted = lakh % 1 === 0 ? lakh.toString() : parseFloat(lakh.toFixed(2)).toString()
    return `${formatted} ${lakh === 1 ? 'Lakh' : 'Lakhs'}`
  } else if (num >= 1000) {
    // 1 Thousand = 1,000
    const th = num / 1000
    const formatted = th % 1 === 0 ? th.toString() : parseFloat(th.toFixed(2)).toString()
    return `${formatted} Thousand`
  } else {
    return num.toLocaleString('en-IN')
  }
}
