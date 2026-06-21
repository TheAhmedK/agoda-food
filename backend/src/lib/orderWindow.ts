const TZ = 'Asia/Bangkok'

/** Mon–Fri when a restaurant has no explicit schedule. 0 = Sun … 6 = Sat. */
export const DEFAULT_SERVING_DAYS = [1, 2, 3, 4, 5]

export const SERVICE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface OrderWindowConfig {
  openHour: number   // hour ordering becomes available (0-23)
  closeHour: number  // hour ordering closes (0-23)
  deliveryHour: number // hour food is delivered (0-23)
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

export function serviceDateToDate(dateStr: string, deliveryHour: number): Date {
  const hh = String(deliveryHour).padStart(2, '0')
  return new Date(`${dateStr}T${hh}:00:00+07:00`)
}

export function isServingDay(servingDays: number[], dateStr: string): boolean {
  const days = servingDays.length > 0 ? servingDays : DEFAULT_SERVING_DAYS
  return days.includes(bangkokWeekday(dateStr))
}

/**
 * For a fixed delivery day, ordering opens the previous calendar day at
 * `openHour` and closes on the delivery day at `closeHour` (Bangkok time).
 * Matches the overnight window used by getServiceDate().
 */
export function isOrderableForDate(
  window: OrderWindowConfig,
  serviceDateStr: string,
  now: Date = new Date(),
): boolean {
  if (!isValidServiceDateStr(serviceDateStr)) return false
  const [y, m, d] = serviceDateStr.split('-').map(Number)
  const prev = addDaysToDateStr(serviceDateStr, -1)
  const [py, pm, pd] = prev.split('-').map(Number)
  const openAt = new Date(
    `${py}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}T${String(window.openHour).padStart(2, '0')}:00:00+07:00`,
  )
  const closeAt = new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(window.closeHour).padStart(2, '0')}:00:00+07:00`,
  )
  return now >= openAt && now < closeAt
}

/** Upcoming YYYY-MM-DD strings the customer can order for. */
export function listEligibleServiceDates(
  servingDays: number[],
  window: OrderWindowConfig,
  horizonDays = 14,
  now: Date = new Date(),
): string[] {
  const today = bangkokDateStr(now)
  const out: string[] = []
  for (let i = 0; i < horizonDays; i++) {
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

function getBangkokParts(date: Date): { hour: number; year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') }
}

/**
 * Returns the service Date for an order placed at `now`, or null if ordering
 * is currently closed.
 *
 * When openHour > closeHour the window wraps midnight:
 *   e.g. openHour=17, closeHour=10 → open 17:00–10:00 the next morning.
 *   - Order at 18:00 Mon → service Tuesday at deliveryHour
 *   - Order at 09:00 Tue → service Tuesday at deliveryHour
 */
export function getServiceDate(window: OrderWindowConfig, now: Date = new Date()): Date | null {
  const { hour, year, month, day } = getBangkokParts(now)
  const { openHour, closeHour, deliveryHour } = window

  let isOpen: boolean
  let daysAhead = 0

  if (openHour > closeHour) {
    // Window wraps midnight
    if (hour >= openHour) {
      isOpen = true
      daysAhead = 1 // delivery is the next calendar day
    } else if (hour < closeHour) {
      isOpen = true
      daysAhead = 0 // delivery is today
    } else {
      isOpen = false
    }
  } else {
    isOpen = hour >= openHour && hour < closeHour
    daysAhead = 0
  }

  if (!isOpen) return null

  // Compute the target calendar day
  const base = new Date(Date.UTC(year, month - 1, day))
  base.setUTCDate(base.getUTCDate() + daysAhead)
  const sy = base.getUTCFullYear()
  const sm = String(base.getUTCMonth() + 1).padStart(2, '0')
  const sd = String(base.getUTCDate()).padStart(2, '0')
  const sh = String(deliveryHour).padStart(2, '0')

  // Bangkok is UTC+7
  return new Date(`${sy}-${sm}-${sd}T${sh}:00:00+07:00`)
}

/**
 * Returns a human-readable status label for use in the UI banner.
 */
export function getWindowStatus(
  window: OrderWindowConfig,
  now: Date = new Date(),
): { isOpen: boolean; label: string } {
  const { hour, day: _day, month: _month, year: _year } = getBangkokParts(now)
  const mins = now.getMinutes()
  const { openHour, closeHour } = window

  let isOpen: boolean
  let minutesUntil: number

  if (openHour > closeHour) {
    if (hour >= openHour) {
      isOpen = true
      minutesUntil = (24 - hour + closeHour) * 60 - mins
    } else if (hour < closeHour) {
      isOpen = true
      minutesUntil = (closeHour - hour) * 60 - mins
    } else {
      isOpen = false
      minutesUntil = (openHour - hour) * 60 - mins
    }
  } else {
    isOpen = hour >= openHour && hour < closeHour
    minutesUntil = isOpen ? (closeHour - hour) * 60 - mins : (openHour - hour + 24) * 60 % (24 * 60) - mins
    if (minutesUntil <= 0) minutesUntil += 24 * 60
  }

  const h = Math.floor(Math.abs(minutesUntil) / 60)
  const m = Math.abs(minutesUntil) % 60
  const timeLabel = h > 0 ? `${h}h ${m}m` : `${m}m`

  return {
    isOpen,
    label: isOpen ? `Closes in ${timeLabel}` : `Opens in ${timeLabel}`,
  }
}
