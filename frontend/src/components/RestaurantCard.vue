<script setup lang="ts">
import { computed } from 'vue'
import type { Restaurant } from '../data/types'

const props = withDefaults(
  defineProps<{
    restaurant: Restaurant
    /** Whether this restaurant serves the currently selected day. */
    available?: boolean
    /** Overlay label shown when unavailable (defaults to "Closed"). */
    unavailableLabel?: string
  }>(),
  { available: true, unavailableLabel: 'Closed' },
)

const dimmed = computed(() => !props.restaurant.isOpen || !props.available)
</script>

<template>
  <div
    class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 transition-transform"
    :class="dimmed
      ? 'opacity-60 cursor-not-allowed'
      : 'active:scale-[0.98] cursor-pointer'"
  >
    <div class="relative h-44 overflow-hidden">
      <img
        :src="restaurant.imageUrl"
        :alt="restaurant.name"
        class="w-full h-full object-cover"
      />
      <div v-if="dimmed" class="absolute inset-0 bg-black/40 flex items-center justify-center">
        <span class="bg-white text-gray-700 text-sm font-semibold px-3 py-1 rounded-full">
          {{ !restaurant.isOpen ? 'Closed' : unavailableLabel }}
        </span>
      </div>
      <div v-if="restaurant.deliveryFee === 0" class="absolute top-3 left-3">
        <span class="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Free delivery</span>
      </div>
    </div>

    <div class="p-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-bold text-gray-900 text-base">{{ restaurant.name }}</h3>
          <p class="text-gray-500 text-sm mt-0.5">{{ restaurant.cuisine }}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0 bg-brand-50 px-2 py-1 rounded-lg">
          <span class="text-yellow-400 text-sm">★</span>
          <span class="font-semibold text-gray-800 text-sm">{{ restaurant.rating }}</span>
          <span class="text-gray-400 text-xs">({{ restaurant.reviewCount }})</span>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-3 text-sm text-gray-500">
        <span class="flex items-center gap-1">
          <span>🕐</span>{{ restaurant.deliveryTime }}
        </span>
        <span>·</span>
        <span>{{ restaurant.deliveryFee === 0 ? 'Free' : `฿${restaurant.deliveryFee}` }} delivery</span>
        <span>·</span>
        <span>Min ฿{{ restaurant.minOrder }}</span>
      </div>

      <div class="flex flex-wrap gap-1.5 mt-3">
        <span
          v-for="tag in restaurant.tags"
          :key="tag"
          class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>
