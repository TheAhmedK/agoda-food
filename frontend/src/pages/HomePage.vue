<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import DayPicker from '../components/DayPicker.vue'
import RestaurantCard from '../components/RestaurantCard.vue'
import { fetchRestaurants } from '../services/api'
import { useSelectedDayStore } from '../stores/selectedDay'
import {
  isServingDay,
  DEFAULT_SERVING_DAYS,
  formatServiceDateLabel,
} from '../lib/serviceDates'
import type { Restaurant } from '../data/types'

const router = useRouter()
const selectedDay = useSelectedDayStore()

const search = ref('')
const restaurants = ref<Restaurant[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadRestaurants() {
  loading.value = true
  error.value = null
  try {
    restaurants.value = await fetchRestaurants(selectedDay.serviceDate)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load restaurants'
  } finally {
    loading.value = false
  }
}

onMounted(loadRestaurants)

function serves(r: Restaurant): boolean {
  return isServingDay(r.servingDays ?? DEFAULT_SERVING_DAYS, selectedDay.serviceDate)
}

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  const matches = q
    ? restaurants.value.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      )
    : restaurants.value
  // Serving restaurants first, closed-for-this-day ones after.
  return [...matches].sort(
    (a, b) => Number(serves(b)) - Number(serves(a)),
  )
})

const servingCount = computed(() => filtered.value.filter(serves).length)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <!-- Hero -->
    <div class="bg-gradient-to-br from-brand-500 to-brand-700 text-white px-4 pt-6 pb-8">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-1">Pre-order office lunch 🍜</h1>
        <p class="text-brand-100 text-sm mb-5">Pick a day, choose a restaurant, order ahead</p>

        <DayPicker v-model="selectedDay.serviceDate" />

        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            v-model="search"
            type="text"
            placeholder="Search restaurants or cuisine…"
            class="w-full bg-white text-gray-900 placeholder-gray-400 rounded-2xl pl-11 pr-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>
    </div>

    <!-- Restaurant list -->
    <div class="max-w-2xl mx-auto px-4 py-6">
      <div v-if="loading" class="flex flex-col gap-4">
        <div
          v-for="n in 3"
          :key="n"
          class="bg-white rounded-2xl h-64 animate-pulse border border-gray-100"
        />
      </div>

      <div v-else-if="error" class="text-center py-16">
        <div class="text-5xl mb-3">⚠️</div>
        <p class="font-medium text-gray-700">{{ error }}</p>
        <p class="text-sm text-gray-400 mt-1">Make sure the backend is running on port 3000</p>
      </div>

      <template v-else>
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-900 text-lg">
            {{ servingCount }} serving on {{ formatServiceDateLabel(selectedDay.serviceDate) }}
          </h2>
        </div>

        <div v-if="filtered.length === 0" class="text-center py-16 text-gray-400">
          <div class="text-5xl mb-3">🔍</div>
          <p class="font-medium">No restaurants found</p>
          <p class="text-sm mt-1">Try a different search</p>
        </div>

        <div v-else class="flex flex-col gap-4">
          <div
            v-for="restaurant in filtered"
            :key="restaurant.id"
            @click="restaurant.isOpen && serves(restaurant) && router.push(`/restaurant/${restaurant.id}`)"
          >
            <RestaurantCard
              :restaurant="restaurant"
              :available="serves(restaurant)"
              unavailable-label="Not serving this day"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
