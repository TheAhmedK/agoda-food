import {
  addDaysToDateStr,
  bangkokDateStr,
  getCutoffAt,
  isValidServiceDateStr,
  type OrderWindowConfig,
} from '@lib/orderWindow'

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

/** Last moment a customer can place a pre-order for this special dish. */
export function getSpecialOrderCloseAt(
  availability: SpecialDishAvailability,
  window: OrderWindowConfig,
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
  return availability.deliveryDate <= bangkokDateStr(now)
}

export function isSpecialDishOrderable(
  availability: SpecialDishAvailability,
  window: OrderWindowConfig,
  now: Date = new Date(),
): boolean {
  if (!isValidServiceDateStr(availability.deliveryDate)) return false
  return (
    now >= getSpecialOrderOpenAt(availability) &&
    now < getSpecialOrderCloseAt(availability, window)
  )
}

export function validateSpecialAvailabilityInput(
  raw: unknown,
): { ok: true; value: SpecialDishAvailability } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'availability is required for special dishes' }
  }
  const obj = raw as Record<string, unknown>
  const deliveryDate = typeof obj.deliveryDate === 'string' ? obj.deliveryDate.trim() : ''
  if (!deliveryDate || !isValidServiceDateStr(deliveryDate)) {
    return { ok: false, error: 'deliveryDate must be YYYY-MM-DD' }
  }
  const orderOpens =
    typeof obj.orderOpens === 'string' && obj.orderOpens.trim()
      ? obj.orderOpens.trim()
      : ''
  const orderCloses =
    typeof obj.orderCloses === 'string' && obj.orderCloses.trim()
      ? obj.orderCloses.trim()
      : ''
  if (!orderOpens || !isValidServiceDateStr(orderOpens)) {
    return { ok: false, error: 'orderOpens must be YYYY-MM-DD' }
  }
  if (!orderCloses || !isValidServiceDateStr(orderCloses)) {
    return { ok: false, error: 'orderCloses must be YYYY-MM-DD' }
  }
  if (orderOpens >= deliveryDate || orderCloses >= deliveryDate) {
    return {
      ok: false,
      error: 'orderOpens and orderCloses must be before deliveryDate',
    }
  }
  if (orderOpens >= orderCloses) {
    return { ok: false, error: 'orderOpens must be before orderCloses' }
  }
  return {
    ok: true,
    value: { deliveryDate, orderOpens, orderCloses },
  }
}
