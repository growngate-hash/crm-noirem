import { useCompany } from '@/contexts/CompanyContext'
import {
  toLocalTimeWithTz,
  formatHoraWithTz,
  getHoraDecimalWithTz,
  localToUTCWithTz,
  getTodayWithTz,
  dayRangeWithTz,
} from '@/utils/timezone'

/**
 * Returns timezone helpers pre-bound to the active company's timezone.
 * Components never need to pass the timezone string manually.
 *
 * Usage:
 *   const tz = useTimezone()
 *   tz.toLocalTime(booking.scheduled_at)  // → Date in company timezone
 *   tz.getToday()                         // → today's Date in company timezone
 *   tz.dayRange(tz.getToday())            // → { start, end } UTC ISO strings
 */
export type UseTimezoneReturn = ReturnType<typeof useTimezone>

export function useTimezone() {
  const { timezone, loaded } = useCompany()

  return {
    /** True once the timezone has been fetched from business_settings. */
    ready: loaded,

    /** The raw IANA timezone string, e.g. 'Asia/Dubai'. */
    timezone,

    /** Convert a UTC ISO string to a Date whose local values match the company timezone. */
    toLocalTime: (utcDate: string) =>
      toLocalTimeWithTz(utcDate, timezone),

    /** Format a UTC ISO string as "HH:MM" in the company timezone. Returns '—' for null. */
    formatHora: (utcDate: string | null) =>
      formatHoraWithTz(utcDate, timezone),

    /** Return decimal hour in the company timezone (e.g. 9.5 = 09:30). */
    getHoraDecimal: (utcDate: string) =>
      getHoraDecimalWithTz(utcDate, timezone),

    /**
     * Convert a local date ("YYYY-MM-DD") + time ("HH:MM" or "HH:MM:SS") in
     * the company timezone to a UTC ISO string. Handles DST.
     */
    localToUTC: (fecha: string, hora: string) =>
      localToUTCWithTz(fecha, hora, timezone),

    /** Today's Date whose local values match the company timezone. */
    getToday: () =>
      getTodayWithTz(timezone),

    /**
     * UTC ISO range {start, end} covering the full calendar day represented by
     * `date` in the company timezone. Pass the output of getToday() or toLocalTime().
     */
    dayRange: (date: Date) =>
      dayRangeWithTz(date, timezone),
  }
}