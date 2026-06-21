import type { OrderWindow } from '../data/types'

const TZ = 'Asia/Bangkok'

export const DEFAULT_SERVING_DAYS = [1, 2, 3, 4, 5]
export const SERVICE_DATE_HORIZON = 14
/** How many upcoming weekdays the homepage day picker shows. */
export const PICKER_WEEKDAY_COUNT = 10

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

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

export function formatServiceDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`)
  return d.toLocaleDateString('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatServiceDateLong(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`)
  return d.toLocaleDateString('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

export function isServingDay(servingDays: number[], dateStr: string): boolean {
  const days = servingDays.length > 0 ? servingDays : DEFAULT_SERVING_DAYS
  return days.includes(bangkokWeekday(dateStr))
}

/**
 * The moment ordering closes for a delivery day: `cutoffHour` on the previous
 * calendar day (Bangkok time).
 */
export function getCutoffAt(window: OrderWindow, serviceDateStr: string): Date {
  const prev = addDaysToDateStr(serviceDateStr, -1)
  const [py, pm, pd] = prev.split('-').map(Number)
  const hh = String(window.cutoffHour).padStart(2, '0')
  return new Date(`${py}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}T${hh}:00:00+07:00`)
}

export function isOrderableForDate(
  window: OrderWindow,
  serviceDateStr: string,
  now: Date = new Date(),
): boolean {
  return now < getCutoffAt(window, serviceDateStr)
}

/** Human label for the order cut-off, e.g. "Tue, 17 Jun, 18:00". */
export function cutoffLabel(window: OrderWindow, serviceDateStr: string): string {
  const prev = addDaysToDateStr(serviceDateStr, -1)
  return `${formatServiceDateLabel(prev)}, ${String(window.cutoffHour).padStart(2, '0')}:00`
}

export function isToday(dateStr: string, now: Date = new Date()): boolean {
  return dateStr === bangkokDateStr(now)
}

/**
 * Next N weekdays (Mon–Fri) starting tomorrow. Skips today, Saturday, and Sunday.
 * E.g. on Sunday → Mon, Tue, Wed, Thu, Fri.
 */
export function listNextWeekdays(
  count = PICKER_WEEKDAY_COUNT,
  now: Date = new Date(),
): string[] {
  const today = bangkokDateStr(now)
  const out: string[] = []
  for (let offset = 1; out.length < count && offset <= 60; offset++) {
    const dateStr = addDaysToDateStr(today, offset)
    const wd = bangkokWeekday(dateStr)
    if (wd === 0 || wd === 6) continue
    out.push(dateStr)
  }
  return out
}

/** Next N weekdays that a restaurant serves (for day picker & cart chips). */
export function listPickerServiceDates(
  servingDays: number[] = DEFAULT_SERVING_DAYS,
  count = PICKER_WEEKDAY_COUNT,
  now: Date = new Date(),
): string[] {
  return listNextWeekdays(count, now).filter((d) => isServingDay(servingDays, d))
}

export function listEligibleServiceDates(
  servingDays: number[],
  window: OrderWindow,
  horizonDays = SERVICE_DATE_HORIZON,
  now: Date = new Date(),
): string[] {
  const today = bangkokDateStr(now)
  const out: string[] = []
  // Pre-orders only — skip today; lunch is ordered ahead for future days.
  for (let i = 1; i <= horizonDays; i++) {
    const dateStr = addDaysToDateStr(today, i)
    if (isServingDay(servingDays, dateStr) && isOrderableForDate(window, dateStr, now)) {
      out.push(dateStr)
    }
  }
  return out
}

export function defaultOrderWindow(): OrderWindow {
  return { cutoffHour: 18, pickupHour: 12 }
}

export function defaultSelectedServiceDate(now: Date = new Date()): string {
  return listNextWeekdays(PICKER_WEEKDAY_COUNT, now)[0]
    ?? addDaysToDateStr(bangkokDateStr(now), 1)
}

export function deliveryTimeLabel(window: OrderWindow): string {
  const h = window.pickupHour
  const period = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${period}`
}

export interface DayCartLine {
  menuItemId: string
  name: string
  price: number
  quantity: number
  note: string
}

/** Group single-date cart lines into per-day batch payloads. */
export function expandCartToBatchDays(
  items: { menuItem: { id: string; name: string; price: number }; quantity: number; note: string; serviceDate: string }[],
): { serviceDate: string; items: DayCartLine[] }[] {
  const byDay = new Map<string, DayCartLine[]>()

  for (const item of items) {
    const list = byDay.get(item.serviceDate) ?? []
    list.push({
      menuItemId: item.menuItem.id,
      name: item.menuItem.name,
      price: item.menuItem.price,
      quantity: item.quantity,
      note: item.note,
    })
    byDay.set(item.serviceDate, list)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([serviceDate, dayItems]) => ({ serviceDate, items: dayItems }))
}
