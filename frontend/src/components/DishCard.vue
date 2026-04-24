<script setup lang="ts">
import type { Dish, DishTag } from '../data/types'
import { useCartStore } from '../stores/cart'

defineProps<{
  dish: Dish
  restaurantId: string
  restaurantName: string
}>()

const cart = useCartStore()

// Per-tag label + color. Centralising here keeps tag rendering consistent across the app.
const TAG_STYLES: Record<DishTag, { label: string; classes: string }> = {
  Popular: { label: '⭐ Popular', classes: 'bg-brand-500 text-white' },
  Vegetarian: { label: '🌿 Veg', classes: 'bg-green-500 text-white' },
  Vegan: { label: '🌱 Vegan', classes: 'bg-emerald-600 text-white' },
  Spicy: { label: '🌶️ Spicy', classes: 'bg-red-500 text-white' },
  GlutenFree: { label: 'GF', classes: 'bg-amber-500 text-white' },
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
    <div class="relative h-36 overflow-hidden">
      <img
        :src="dish.imageUrl"
        :alt="dish.name"
        class="w-full h-full object-cover"
      />
      <div class="absolute top-2 left-2 flex flex-wrap gap-1">
        <span
          v-for="tag in dish.tags"
          :key="tag"
          class="text-xs font-semibold px-2 py-0.5 rounded-full"
          :class="TAG_STYLES[tag].classes"
        >
          {{ TAG_STYLES[tag].label }}
        </span>
      </div>
    </div>

    <div class="p-3 flex-1 flex flex-col">
      <h4 class="font-semibold text-gray-900 text-sm leading-tight">{{ dish.name }}</h4>
      <p class="text-gray-500 text-xs mt-1 flex-1 line-clamp-2">{{ dish.description }}</p>

      <div class="flex items-center justify-between mt-3">
        <span class="font-bold text-gray-900">฿{{ dish.price }}</span>

        <div v-if="cart.getQuantity(dish.id) === 0">
          <button
            @click="cart.addItem(dish, restaurantId, restaurantName)"
            class="flex items-center gap-1 bg-brand-500 text-white text-sm font-medium px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            <span class="text-base leading-none">+</span> Add
          </button>
        </div>

        <div v-else class="flex items-center gap-2">
          <button
            @click="cart.removeItem(dish.id)"
            class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 active:scale-95 transition-transform"
          >
            −
          </button>
          <span class="font-bold text-brand-600 w-4 text-center">{{ cart.getQuantity(dish.id) }}</span>
          <button
            @click="cart.addItem(dish, restaurantId, restaurantName)"
            class="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white active:scale-95 transition-transform"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
