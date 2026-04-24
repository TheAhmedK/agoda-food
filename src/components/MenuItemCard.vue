<script setup lang="ts">
import type { MenuItem } from '../data/types'
import { useCartStore } from '../stores/cart'

const props = defineProps<{
  item: MenuItem
  restaurantId: string
  restaurantName: string
}>()

const cart = useCartStore()
</script>

<template>
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
    <div class="relative h-36 overflow-hidden">
      <img
        :src="item.imageUrl"
        :alt="item.name"
        class="w-full h-full object-cover"
      />
      <div class="absolute top-2 left-2 flex gap-1">
        <span v-if="item.isPopular" class="bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Popular</span>
        <span v-if="item.isVegetarian" class="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">🌿 Veg</span>
      </div>
    </div>

    <div class="p-3 flex-1 flex flex-col">
      <h4 class="font-semibold text-gray-900 text-sm leading-tight">{{ item.name }}</h4>
      <p class="text-gray-500 text-xs mt-1 flex-1 line-clamp-2">{{ item.description }}</p>

      <div class="flex items-center justify-between mt-3">
        <span class="font-bold text-gray-900">฿{{ item.price }}</span>

        <div v-if="cart.getQuantity(item.id) === 0">
          <button
            @click="cart.addItem(item, restaurantId, restaurantName)"
            class="flex items-center gap-1 bg-brand-500 text-white text-sm font-medium px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            <span class="text-base leading-none">+</span> Add
          </button>
        </div>

        <div v-else class="flex items-center gap-2">
          <button
            @click="cart.removeItem(item.id)"
            class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 active:scale-95 transition-transform"
          >
            −
          </button>
          <span class="font-bold text-brand-600 w-4 text-center">{{ cart.getQuantity(item.id) }}</span>
          <button
            @click="cart.addItem(item, restaurantId, restaurantName)"
            class="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white active:scale-95 transition-transform"
          >
            +
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
