import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem, MenuItem } from '../data/types'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalItems = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0)
  )

  const activeRestaurantId = computed(() =>
    items.value.length > 0 ? items.value[0]!.restaurantId : null
  )

  function addItem(menuItem: MenuItem, restaurantId: string, restaurantName: string) {
    // If adding from a different restaurant, clear cart first
    if (activeRestaurantId.value && activeRestaurantId.value !== restaurantId) {
      items.value = []
    }

    const existing = items.value.find((i) => i.menuItem.id === menuItem.id)
    if (existing) {
      existing.quantity += 1
    } else {
      items.value.push({ menuItem, restaurantId, restaurantName, quantity: 1, note: '' })
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

  function clearCart() {
    items.value = []
  }

  function getQuantity(menuItemId: string): number {
    return items.value.find((i) => i.menuItem.id === menuItemId)?.quantity ?? 0
  }

  return {
    items,
    totalItems,
    subtotal,
    activeRestaurantId,
    addItem,
    removeItem,
    setNote,
    clearCart,
    getQuantity,
  }
})
