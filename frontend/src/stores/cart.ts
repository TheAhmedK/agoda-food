import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CartItem, MenuItem } from '../data/types'

const STORAGE_KEY = 'agoda_food_cart_v3'
const LEGACY_STORAGE_KEY = 'agoda_food_cart_v2'

/** A line from the legacy cart that grouped multiple dates under one entry. */
interface LegacyCartItem extends Omit<CartItem, 'serviceDate'> {
  serviceDates?: string[]
  serviceDate?: string
}

/** Expand any legacy multi-date lines into one line per (item, date). */
function normalize(parsed: LegacyCartItem[]): CartItem[] {
  const out: CartItem[] = []
  for (const item of parsed) {
    const dates =
      Array.isArray(item.serviceDates) && item.serviceDates.length > 0
        ? item.serviceDates
        : item.serviceDate
          ? [item.serviceDate]
          : []
    for (const serviceDate of dates) {
      out.push({
        menuItem: item.menuItem,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        quantity: item.quantity,
        note: item.note,
        serviceDate,
      })
    }
  }
  return out
}

function loadFromStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return normalize(parsed as LegacyCartItem[])
  } catch {
    return []
  }
}

function saveToStorage(items: CartItem[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* noop */
  }
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(loadFromStorage())

  watch(items, (next) => saveToStorage(next), { deep: true })

  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  )

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
  )

  const activeRestaurantId = computed(() =>
    items.value.length > 0 ? items.value[0]!.restaurantId : null,
  )

  /** Unique delivery days currently in the cart, chronologically. */
  const datesInCart = computed(() =>
    [...new Set(items.value.map((i) => i.serviceDate))].sort(),
  )

  function find(menuItemId: string, serviceDate: string): CartItem | undefined {
    return items.value.find(
      (i) => i.menuItem.id === menuItemId && i.serviceDate === serviceDate,
    )
  }

  function itemsForDate(serviceDate: string): CartItem[] {
    return items.value.filter((i) => i.serviceDate === serviceDate)
  }

  function subtotalForDate(serviceDate: string): number {
    return itemsForDate(serviceDate).reduce(
      (sum, i) => sum + i.menuItem.price * i.quantity,
      0,
    )
  }

  /** Dates on which a given menu item currently appears (for "Also order on"). */
  function datesForMenuItem(menuItemId: string): string[] {
    return items.value
      .filter((i) => i.menuItem.id === menuItemId)
      .map((i) => i.serviceDate)
  }

  function addItem(
    menuItem: MenuItem,
    restaurantId: string,
    restaurantName: string,
    serviceDate: string,
  ) {
    if (activeRestaurantId.value && activeRestaurantId.value !== restaurantId) {
      items.value = []
    }

    const existing = find(menuItem.id, serviceDate)
    if (existing) {
      existing.quantity += 1
    } else {
      items.value.push({
        menuItem,
        restaurantId,
        restaurantName,
        quantity: 1,
        note: '',
        serviceDate,
      })
    }
  }

  function removeItem(menuItemId: string, serviceDate: string) {
    const idx = items.value.findIndex(
      (i) => i.menuItem.id === menuItemId && i.serviceDate === serviceDate,
    )
    if (idx === -1) return
    const item = items.value[idx]!
    if (item.quantity > 1) {
      item.quantity -= 1
    } else {
      items.value.splice(idx, 1)
    }
  }

  function setNote(menuItemId: string, serviceDate: string, note: string) {
    const item = find(menuItemId, serviceDate)
    if (item) item.note = note
  }

  /**
   * "Also order on" — add the same item (quantity + note carried over) to
   * another delivery day, creating that day's section if it doesn't exist yet.
   * Clicking a day the item is already on removes it from that day, unless it
   * would leave the item with no days at all.
   */
  function toggleItemDate(menuItemId: string, serviceDate: string) {
    const source = items.value.find((i) => i.menuItem.id === menuItemId)
    if (!source) return

    const existing = find(menuItemId, serviceDate)
    if (existing) {
      if (datesForMenuItem(menuItemId).length <= 1) return
      items.value.splice(items.value.indexOf(existing), 1)
      return
    }

    items.value.push({
      menuItem: source.menuItem,
      restaurantId: source.restaurantId,
      restaurantName: source.restaurantName,
      quantity: source.quantity,
      note: source.note,
      serviceDate,
    })
  }

  function clearDate(serviceDate: string) {
    items.value = items.value.filter((i) => i.serviceDate !== serviceDate)
  }

  function clearCart() {
    items.value = []
  }

  function setItems(next: CartItem[]) {
    items.value = next
  }

  function getQuantity(menuItemId: string, serviceDate: string): number {
    return find(menuItemId, serviceDate)?.quantity ?? 0
  }

  function wouldClearCartFor(restaurantId: string): boolean {
    return items.value.length > 0 && activeRestaurantId.value !== restaurantId
  }

  return {
    items,
    totalItems,
    subtotal,
    activeRestaurantId,
    datesInCart,
    itemsForDate,
    subtotalForDate,
    datesForMenuItem,
    addItem,
    removeItem,
    setNote,
    toggleItemDate,
    clearDate,
    clearCart,
    setItems,
    getQuantity,
    wouldClearCartFor,
  }
})
