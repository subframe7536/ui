function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function parseParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number)
  return [y || 2026, (m || 1) - 1, d || 1]
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayDate(): string {
  return formatDate(new Date())
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parseParts(iso)
  return formatDate(new Date(y, m, d + days))
}

export function startOfMonth(iso: string): string {
  const [y, m] = parseParts(iso)
  return formatDate(new Date(y, m, 1))
}

export function endOfMonth(iso: string): string {
  const [y, m] = parseParts(iso)
  return formatDate(new Date(y, m + 1, 0))
}
