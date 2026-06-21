import type { OrderWindow } from '../data/types'

const TZ = 'Asia/Bangkok'

export const DEFAULT_SERVING_DAYS = [1, 2, 3, 4, 5]
export const SERVICE_DATE_HORIZON = 14

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

export function isOrderableForDate(
  window: OrderWindow,
  serviceDateStr: string,
  now: Date = new Date(),
): boolean {
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

export function listEligibleServiceDates(
  servingDays: number[],
  window: OrderWindow,
  horizonDays = SERVICE_DATE_HORIZON,
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

export function defaultOrderWindow(): OrderWindow {
  return { openHour: 17, closeHour: 10, deliveryHour: 12 }
}

export function defaultSelectedServiceDate(now: Date = new Date()): string {
  const eligible = listEligibleServiceDates(
    DEFAULT_SERVING_DAYS,
    defaultOrderWindow(),
    SERVICE_DATE_HORIZON,
    now,
  )
  return eligible[0] ?? addDaysToDateStr(bangkokDateStr(now), 1)
}

export function deliveryTimeLabel(window: OrderWindow): string {
  const h = window.deliveryHour
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

/** Expand cart lines (each with multiple serviceDates) into per-day payloads. */
export function expandCartToBatchDays(
  items: { menuItem: { id: string; name: string; price: number }; quantity: number; note: string; serviceDates: string[] }[],
): { serviceDate: string; items: DayCartLine[] }[] {
  const byDay = new Map<string, DayCartLine[]>()

  for (const item of items) {
    for (const serviceDate of item.serviceDates) {
      const list = byDay.get(serviceDate) ?? []
      list.push({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity,
        note: item.note,
      })
      byDay.set(serviceDate, list)
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([serviceDate, dayItems]) => ({ serviceDate, items: dayItems }))
}

export function lineTotal(price: number, quantity: number, dayCount: number): number {
  return price * quantity * dayCount
}
