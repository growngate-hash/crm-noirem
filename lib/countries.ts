export const COUNTRIES = [
  // ── Golfo / Middle East ──────────────────────────────────────────
  { code: 'AE', name: 'United Arab Emirates', timezone: 'Asia/Dubai',              currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia',          timezone: 'Asia/Riyadh',             currency: 'SAR' },
  { code: 'QA', name: 'Qatar',                 timezone: 'Asia/Qatar',              currency: 'QAR' },
  { code: 'KW', name: 'Kuwait',                timezone: 'Asia/Kuwait',             currency: 'KWD' },
  { code: 'BH', name: 'Bahrain',               timezone: 'Asia/Bahrain',            currency: 'BHD' },
  { code: 'OM', name: 'Oman',                  timezone: 'Asia/Muscat',             currency: 'OMR' },
  // ── Latam ────────────────────────────────────────────────────────
  { code: 'CO', name: 'Colombia',              timezone: 'America/Bogota',          currency: 'COP' },
  { code: 'US', name: 'United States',         timezone: 'America/New_York',        currency: 'USD' },
  { code: 'CA', name: 'Canada',                timezone: 'America/Toronto',         currency: 'CAD' },
  { code: 'MX', name: 'Mexico',                timezone: 'America/Mexico_City',     currency: 'MXN' },
  { code: 'CL', name: 'Chile',                 timezone: 'America/Santiago',        currency: 'CLP' },
  { code: 'PE', name: 'Peru',                  timezone: 'America/Lima',            currency: 'PEN' },
  { code: 'PA', name: 'Panama',                timezone: 'America/Panama',          currency: 'USD' },
  { code: 'VE', name: 'Venezuela',             timezone: 'America/Caracas',         currency: 'VES' },
  { code: 'BR', name: 'Brazil',                timezone: 'America/Sao_Paulo',       currency: 'BRL' },
  { code: 'AR', name: 'Argentina',             timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS' },
  // ── Europa ───────────────────────────────────────────────────────
  { code: 'GB', name: 'United Kingdom',        timezone: 'Europe/London',           currency: 'GBP' },
  { code: 'ES', name: 'Spain',                 timezone: 'Europe/Madrid',           currency: 'EUR' },
  { code: 'FR', name: 'France',                timezone: 'Europe/Paris',            currency: 'EUR' },
  { code: 'DE', name: 'Germany',               timezone: 'Europe/Berlin',           currency: 'EUR' },
  { code: 'IT', name: 'Italy',                 timezone: 'Europe/Rome',             currency: 'EUR' },
  { code: 'PT', name: 'Portugal',              timezone: 'Europe/Lisbon',           currency: 'EUR' },
  // ── Asia / Pacífico ──────────────────────────────────────────────
  { code: 'AU', name: 'Australia',             timezone: 'Australia/Sydney',        currency: 'AUD' },
  { code: 'SG', name: 'Singapore',             timezone: 'Asia/Singapore',          currency: 'SGD' },
  // ── África ───────────────────────────────────────────────────────
  { code: 'ZA', name: 'South Africa',          timezone: 'Africa/Johannesburg',     currency: 'ZAR' },
] as const

export type Country = typeof COUNTRIES[number]
export type CountryCode = Country['code']