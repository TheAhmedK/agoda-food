const TZ = 'Asia/Bangkok'

/** Mon–Fri when a restaurant has no explicit schedule. 0 = Sun … 6 = Sat. */
export const DEFAULT_SERVING_DAYS = [1, 2, 3, 4, 5]

export const SERVICE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface OrderWindowConfig {
  /** Hour (0-23) on the PREVIOUS calendar day after which ordering closes. */
  cutoffHour: number
  /** Hour (0-23) the food is ready for pickup on the delivery day. */
  pickupHour: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isValidServiceDateStr(s: string): boolean {
  if (!SERVICE_DATE_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

export function bangkokDateStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

export function bangkokWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00+07:00`)
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d)
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  return map[wd] ?? 0
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function serviceDateToDate(dateStr: string, pickupHour: number): Date {
  return new Date(`${dateStr}T${pad2(pickupHour)}:00:00+07:00`)
}

export function isServingDay(servingDays: number[], dateStr: string): boolean {
  const days = servingDays.length > 0 ? servingDays : DEFAULT_SERVING_DAYS
  return days.includes(bangkokWeekday(dateStr))
}

/**
 * The moment ordering closes for `serviceDateStr`: `cutoffHour` on the
 * previous calendar day (Bangkok time). E.g. cutoffHour=18 → orders for
 * Wednesday close at 18:00 on Tuesday.
 */
export function getCutoffAt(window: OrderWindowConfig, serviceDateStr: string): Date {
  const prev = addDaysToDateStr(serviceDateStr, -1)
  const [py, pm, pd] = prev.split('-').map(Number)
  return new Date(`${py}-${pad2(pm)}-${pad2(pd)}T${pad2(window.cutoffHour)}:00:00+07:00`)
}

/**
 * Ordering for a delivery day is open until `cutoffHour` on the day before.
 * This naturally excludes today and any past day.
 */
export function isOrderableForDate(
  window: OrderWindowConfig,
  serviceDateStr: string,
  now: Date = new Date(),
): boolean {
  if (!isValidServiceDateStr(serviceDateStr)) return false
  return now < getCutoffAt(window, serviceDateStr)
}

export function isToday(dateStr: string, now: Date = new Date()): boolean {
  return dateStr === bangkokDateStr(now)
}

/** Upcoming YYYY-MM-DD strings the customer can pre-order for (excludes today). */
export function listEligibleServiceDates(
  servingDays: number[],
  window: OrderWindowConfig,
  horizonDays = 14,
  now: Date = new Date(),
): string[] {
  const today = bangkokDateStr(now)
  const out: string[] = []
  for (let i = 1; i <= horizonDays; i++) {
    const dateStr = addDaysToDateStr(today, i)
    if (isServingDay(servingDays, dateStr) && isOrderableForDate(window, dateStr, now)) {
      out.push(dateStr)
    }
  }
  return out
}

export function defaultSelectedServiceDate(
  servingDays: number[],
  window: OrderWindowConfig,
  now: Date = new Date(),
): string | null {
  const eligible = listEligibleServiceDates(servingDays, window, 14, now)
  return eligible[0] ?? null
}

/**
 * Returns the soonest upcoming delivery day still open for ordering at `now`
 * (as a Date at the pickup hour), or null if none within the horizon.
 */
export function getServiceDate(window: OrderWindowConfig, now: Date = new Date()): Date | null {
  const today = bangkokDateStr(now)
  for (let i = 1; i <= 14; i++) {
    const dateStr = addDaysToDateStr(today, i)
    if (isOrderableForDate(window, dateStr, now)) {
      return serviceDateToDate(dateStr, window.pickupHour)
    }
  }
  return null
}
