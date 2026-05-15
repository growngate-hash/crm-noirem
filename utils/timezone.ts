// Dubai is UTC+4 — all helpers convert UTC ISO strings to Dubai local time
const DUBAI_OFFSET_MIN = 4 * 60 // 240 minutes

export function toDubaiTime(utcDate: string): Date {
  const date = new Date(utcDate)
  // getTimezoneOffset() returns minutes BEHIND UTC (negative for UTC+)
  const localOffset = date.getTimezoneOffset()
  const totalOffset = DUBAI_OFFSET_MIN + localOffset
  return new Date(date.getTime() + totalOffset * 60 * 1000)
}

export function formatHoraDubai(utcDate: string | null): string {
  if (!utcDate) return '—'
  const d = toDubaiTime(utcDate)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function getHoraDecimalDubai(utcDate: string): number {
  const d = toDubaiTime(utcDate)
  return d.getHours() + d.getMinutes() / 60
}

// Convert a Dubai local date+time string to UTC ISO
// fecha: "2026-05-14"   hora: "09:00"
export function dubaiToUTC(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00+04:00`).toISOString()
}

// Returns today's date expressed in Dubai local time
export function getDubaiToday(): Date {
  const now = new Date()
  const localOffset = now.getTimezoneOffset()
  const totalOffset = DUBAI_OFFSET_MIN + localOffset
  return new Date(now.getTime() + totalOffset * 60 * 1000)
}

// Returns the UTC ISO range that covers the full Dubai calendar day
export function dubaiDayRange(dubaiDay: Date): { start: string; end: string } {
  const y = dubaiDay.getFullYear()
  const m = String(dubaiDay.getMonth() + 1).padStart(2, '0')
  const d = String(dubaiDay.getDate()).padStart(2, '0')
  return {
    start: new Date(`${y}-${m}-${d}T00:00:00+04:00`).toISOString(),
    end:   new Date(`${y}-${m}-${d}T23:59:59+04:00`).toISOString(),
  }
}
