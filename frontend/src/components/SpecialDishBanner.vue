<script setup lang="ts">
import { computed } from 'vue'
import type { MenuItem, OrderWindow } from '../data/types'
import { TAG_STYLES } from '../lib/menuItemTags'
import { formatServiceDateLong } from '../lib/serviceDates'
import {
  isSpecialDishOrderable,
  specialDishCloseLabel,
} from '../lib/specialDish'
import { useCartStore } from '../stores/cart'

const props = defineProps<{
  menuItem: MenuItem
  restaurantId: string
  restaurantName: string
  orderWindow: OrderWindow
}>()

const emit = defineEmits<{
  (e: 'request-switch-restaurant', payload: { menuItem: MenuItem; restaurantId: string; restaurantName: string }): void
}>()

const cart = useCartStore()

const availability = computed(() => props.menuItem.availability!)
const deliveryDate = computed(() => availability.value.deliveryDate)

const orderingEnabled = computed(() =>
  isSpecialDishOrderable(availability.value, props.orderWindow),
)

const qty = computed(() => cart.getQuantity(props.menuItem.id, deliveryDate.value))

const closeLabel = computed(() =>
  specialDishCloseLabel(availability.value, props.orderWindow),
)

function tryAdd() {
  if (!orderingEnabled.value) return
  if (cart.wouldClearCartFor(props.restaurantId)) {
    emit('request-switch-restaurant', {
      menuItem: props.menuItem,
      restaurantId: props.restaurantId,
      restaurantName: props.restaurantName,
    })
    return
  }
  cart.addItem(
    props.menuItem,
    props.restaurantId,
    props.restaurantName,
    deliveryDate.value,
  )
}

function removeOne() {
  cart.removeItem(props.menuItem.id, deliveryDate.value)
}
</script>

<template>
  <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm overflow-hidden">
    <div class="px-4 py-2 bg-brand-600 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
      <span>✨</span>
      <span>Special pre-order</span>
    </div>

    <div class="p-4 flex gap-4">
      <div
        v-if="menuItem.imageUrl"
        class="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-amber-100"
      >
        <img :src="menuItem.imageUrl" :alt="menuItem.name" class="w-full h-full object-cover" />
      </div>
      <div
        v-else
        class="w-24 h-24 rounded-xl bg-amber-100 shrink-0 flex items-center justify-center text-3xl"
      >
        🍽️
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap gap-1 mb-1">
          <span
            v-for="tag in menuItem.tags"
            :key="tag"
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="TAG_STYLES[tag].classes"
          >
            {{ TAG_STYLES[tag].label }}
          </span>
        </div>
        <h3 class="font-bold text-gray-900 text-base leading-tight">{{ menuItem.name }}</h3>
        <p class="text-gray-600 text-sm mt-1 line-clamp-2">{{ menuItem.description }}</p>

        <div class="mt-2 space-y-0.5 text-xs text-amber-900">
          <p>
            <span class="font-medium">Delivery:</span>
            {{ formatServiceDateLong(deliveryDate) }}
          </p>
          <p v-if="orderingEnabled">
            <span class="font-medium">Order by:</span>
            {{ closeLabel }}
          </p>
          <p v-else class="text-amber-700 font-medium">Pre-ordering has closed</p>
        </div>
      </div>
    </div>

    <div class="px-4 pb-4 flex items-center justify-between">
      <span class="font-bold text-gray-900 text-lg">฿{{ menuItem.price }}</span>

      <div v-if="qty === 0">
        <button
          @click="tryAdd"
          :disabled="!orderingEnabled"
          class="flex items-center gap-1 bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition-transform"
        >
          <span class="text-base leading-none">+</span> Pre-order
        </button>
      </div>
      <div v-else class="flex items-center gap-2">
        <button
          @click="removeOne"
          class="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center font-bold text-gray-700 active:scale-95"
        >
          −
        </button>
        <span class="font-bold text-amber-700 w-4 text-center">{{ qty }}</span>
        <button
          @click="tryAdd"
          :disabled="!orderingEnabled"
          class="w-8 h-8 rounded-full bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-white active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>
