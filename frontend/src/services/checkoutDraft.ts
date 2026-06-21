// Holds an unsubmitted cart in sessionStorage between CartPage → CheckoutPage.
import type { CartItem } from '../data/types'

const KEY = 'agoda_food_checkout_draft_v2'

export interface CheckoutDraft {
  restaurantId: string
  restaurantName: string
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  minOrder: number
  total: number
  lunchCount: number
  savedAt: string
}

export function saveDraft(draft: CheckoutDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* noop */
  }
}

export function readDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as CheckoutDraft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function hasDraft(): boolean {
  return readDraft() !== null
}
