// ─── Timezone-aware helpers ────────────────────────────────────────────────────
// All "WithTz" functions accept an IANA timezone string (e.g. 'Asia/Dubai').
// They use Intl.DateTimeFormat so DST is handled correctly for any timezone.
//
// The returned Date objects use a "local-time trick": year/month/day/hour values
// correspond to the target timezone, so getHours(), getDate(), etc. give the
// correct local values regardless of the browser's own timezone.

// ─── internal ─────────────────────────────────────────────────────────────────

function parseTzParts(d: Date, timezone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
  return {
    year: get('year'), month: get('month'), day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),  // Intl can return 24 at midnight
    minute: get('minute'), second: get('second'),
  }
}

// ─── public API (timezone-aware) ──────────────────────────────────────────────

/** Convert a UTC ISO string to a Date whose local values match the given timezone. */
export function toLocalTimeWithTz(utcDate: string, timezone: string): Date {
  const p = parseTzParts(new Date(utcDate), timezone)
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

/** Format hour:minute in the given timezone. Returns '—' for null input. */
export function formatHoraWithTz(utcDate: string | null, timezone: string): string {
  if (!utcDate) return '—'
  const d = toLocalTimeWithTz(utcDate, timezone)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Return decimal hour (e.g. 9.5 = 09:30) in the given timezone. */
export function getHoraDecimalWithTz(utcDate: string, timezone: string): number {
  const d = toLocalTimeWithTz(utcDate, timezone)
  return d.getHours() + d.getMinutes() / 60
}

/**
 * Convert a local date ("YYYY-MM-DD") + time ("HH:MM" or "HH:MM:SS") in the
 * given timezone to a UTC ISO string. Handles DST correctly via a single-pass
 * offset calculation using Intl.
 */
export function localToUTCWithTz(fecha: string, hora: string, timezone: string): string {
  const horaParts = hora.split(':').map(Number)
  const h = horaParts[0] ?? 0, m = horaParts[1] ?? 0, s = horaParts[2] ?? 0

  // Treat the local time as UTC to get a reference epoch, then compute the real offset.
  const localAsUTC = Date.UTC(
    parseInt(fecha.slice(0, 4)),
    parseInt(fecha.slice(5, 7)) - 1,
    parseInt(fecha.slice(8, 10)),
    h, m, s,
  )
  const refDate = new Date(localAsUTC)
  const p = parseTzParts(refDate, timezone)
  const tzAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  const offsetMs = tzAsUTC - localAsUTC   // positive = timezone is ahead of UTC
  return new Date(localAsUTC - offsetMs).toISOString()
}

/** Returns today's date as a Date whose local values match the given timezone. */
export function getTodayWithTz(timezone: string): Date {
  return toLocalTimeWithTz(new Date().toISOString(), timezone)
}

/**
 * Returns the UTC ISO range {start, end} that covers the full calendar day
 * represented by `date` in the given timezone.
 * `date` must be a Date whose local year/month/day values are the desired day
 * (i.e. the output of getTodayWithTz or toLocalTimeWithTz).
 */
export function dayRangeWithTz(date: Date, timezone: string): { start: string; end: string } {
  const y  = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return {
    start: localToUTCWithTz(`${y}-${mo}-${d}`, '00:00:00', timezone),
    end:   localToUTCWithTz(`${y}-${mo}-${d}`, '23:59:59', timezone),
  }
}

// ─── legacy exports (Dubai-hardcoded) — kept for backward compatibility ───────
// @deprecated Use the *WithTz equivalents and pass timezone from CompanyContext.

const DUBAI = 'Asia/Dubai'

/** @deprecated Use toLocalTimeWithTz(utcDate, timezone) */
export const toDubaiTime = (utcDate: string) => toLocalTimeWithTz(utcDate, DUBAI)

/** @deprecated Use formatHoraWithTz(utcDate, timezone) */
export const formatHoraDubai = (utcDate: string | null) => formatHoraWithTz(utcDate, DUBAI)

/** @deprecated Use getHoraDecimalWithTz(utcDate, timezone) */
export const getHoraDecimalDubai = (utcDate: string) => getHoraDecimalWithTz(utcDate, DUBAI)

/** @deprecated Use localToUTCWithTz(fecha, hora, timezone) */
export const dubaiToUTC = (fecha: string, hora: string) => localToUTCWithTz(fecha, hora, DUBAI)

/** @deprecated Use getTodayWithTz(timezone) */
export const getDubaiToday = () => getTodayWithTz(DUBAI)

/** @deprecated Use dayRangeWithTz(date, timezone) */
export const dubaiDayRange = (date: Date) => dayRangeWithTz(date, DUBAI)