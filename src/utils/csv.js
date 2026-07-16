/**
 * Builds a CSV string from an array of row objects and triggers a
 * browser download. No external dependency needed for a table this size.
 */
export function downloadCSV(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key]
          // Quote any value containing a comma to keep the CSV valid
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        })
        .join(',')
    )
    .join('\n')

  const csvContent = `${header}\n${body}`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
