import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CartItem, MenuItem } from '../data/types'
import { lineTotal } from '../lib/serviceDates'

const STORAGE_KEY = 'agoda_food_cart_v2'

function loadFromStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as CartItem[]).map((item) => ({
      ...item,
      serviceDates: Array.isArray(item.serviceDates) ? item.serviceDates : [],
    }))
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
  } catch {
    /* noop */
  }
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(loadFromStorage())

  watch(
    items,
    (next) => saveToStorage(next),
    { deep: true },
  )

  const totalItems = computed(() =>
    items.value.reduce(
      (sum, item) => sum + item.quantity * item.serviceDates.length,
      0,
    ),
  )

  const subtotal = computed(() =>
    items.value.reduce(
      (sum, item) =>
        sum + lineTotal(item.menuItem.price, item.quantity, item.serviceDates.length),
      0,
    ),
  )

  const activeRestaurantId = computed(() =>
    items.value.length > 0 ? items.value[0]!.restaurantId : null,
  )

  function addItem(
    menuItem: MenuItem,
    restaurantId: string,
    restaurantName: string,
    defaultServiceDate: string,
  ) {
    if (activeRestaurantId.value && activeRestaurantId.value !== restaurantId) {
      items.value = []
    }

    const existing = items.value.find((i) => i.menuItem.id === menuItem.id)
    if (existing) {
      existing.quantity += 1
      if (!existing.serviceDates.includes(defaultServiceDate)) {
        existing.serviceDates.push(defaultServiceDate)
        existing.serviceDates.sort()
      }
    } else {
      items.value.push({
        menuItem,
        restaurantId,
        restaurantName,
        quantity: 1,
        note: '',
        serviceDates: [defaultServiceDate],
      })
    }
  }

  function removeItem(menuItemId: string) {
    const idx = items.value.findIndex((i) => i.menuItem.id === menuItemId)
    if (idx === -1) return
    const item = items.value[idx]!
    if (item.quantity > 1) {
      item.quantity -= 1
    } else {
      items.value.splice(idx, 1)
    }
  }

  function setNote(menuItemId: string, note: string) {
    const item = items.value.find((i) => i.menuItem.id === menuItemId)
    if (item) item.note = note
  }

  function toggleServiceDate(menuItemId: string, dateStr: string) {
    const item = items.value.find((i) => i.menuItem.id === menuItemId)
    if (!item) return

    const idx = item.serviceDates.indexOf(dateStr)
    if (idx >= 0) {
      if (item.serviceDates.length <= 1) return
      item.serviceDates.splice(idx, 1)
    } else {
      item.serviceDates.push(dateStr)
      item.serviceDates.sort()
    }
  }

  function clearCart() {
    items.value = []
  }

  function setItems(next: CartItem[]) {
    items.value = next
  }

  function getQuantity(menuItemId: string): number {
    return items.value.find((i) => i.menuItem.id === menuItemId)?.quantity ?? 0
  }

  function wouldClearCartFor(restaurantId: string): boolean {
    return items.value.length > 0 && activeRestaurantId.value !== restaurantId
  }

  return {
    items,
    totalItems,
    subtotal,
    activeRestaurantId,
    addItem,
    removeItem,
    setNote,
    toggleServiceDate,
    clearCart,
    setItems,
    getQuantity,
    wouldClearCartFor,
  }
})
