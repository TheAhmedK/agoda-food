import type { OrderWindow } from '../data/types'
import {
  addDaysToDateStr,
  bangkokDateStr,
  getCutoffAt,
} from './serviceDates'

export interface SpecialDishAvailability {
  deliveryDate: string
  orderOpens: string
  orderCloses: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function normalizeSpecialAvailability(
  partial: { deliveryDate: string; orderOpens?: string; orderCloses?: string },
  now: Date = new Date(),
): SpecialDishAvailability {
  const today = bangkokDateStr(now)
  return {
    deliveryDate: partial.deliveryDate,
    orderOpens: partial.orderOpens ?? today,
    orderCloses: partial.orderCloses ?? addDaysToDateStr(partial.deliveryDate, -1),
  }
}

export function getSpecialOrderOpenAt(availability: SpecialDishAvailability): Date {
  const [y, m, d] = availability.orderOpens.split('-').map(Number)
  return new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+07:00`)
}

export function getSpecialOrderCloseAt(
  availability: SpecialDishAvailability,
  window: OrderWindow,
): Date {
  const defaultCloses = addDaysToDateStr(availability.deliveryDate, -1)
  if (availability.orderCloses === defaultCloses) {
    return getCutoffAt(window, availability.deliveryDate)
  }
  const [y, m, d] = availability.orderCloses.split('-').map(Number)
  return new Date(`${y}-${pad2(m)}-${pad2(d)}T${pad2(window.cutoffHour)}:00:00+07:00`)
}

export function isSpecialDishDeliveryPast(
  availability: SpecialDishAvailability,
  now: Date = new Date(),
): boolean {
  return availability.deliveryDate < bangkokDateStr(now)
}

export function isSpecialDishOrderable(
  availability: SpecialDishAvailability,
  window: OrderWindow,
  now: Date = new Date(),
): boolean {
  return (
    now >= getSpecialOrderOpenAt(availability) &&
    now < getSpecialOrderCloseAt(availability, window)
  )
}

export function specialDishCloseLabel(
  availability: SpecialDishAvailability,
  window: OrderWindow,
): string {
  const closeAt = getSpecialOrderCloseAt(availability, window)
  return closeAt.toLocaleString('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
