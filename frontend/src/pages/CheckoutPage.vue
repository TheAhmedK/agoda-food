<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useCartStore } from '../stores/cart'
import { placeOrderBatch } from '../services/api'
import { readDraft, clearDraft, type CheckoutDraft } from '../services/checkoutDraft'
import { expandCartToBatchDays, formatServiceDateLabel } from '../lib/serviceDates'

const router = useRouter()
const cart = useCartStore()

const draft = ref<CheckoutDraft | null>(null)
const orderConfirmed = ref(false)
const isPaying = ref(false)
const payError = ref<string | null>(null)

const dayGroups = computed(() =>
  draft.value ? expandCartToBatchDays(draft.value.items) : [],
)

onMounted(() => {
  const d = readDraft()
  if (!d) {
    router.replace('/cart')
    return
  }
  draft.value = d
})

onBeforeRouteLeave(() => {
  if (orderConfirmed.value) return
  const d = readDraft()
  if (d) {
    cart.setItems(d.items)
    clearDraft()
  }
})

function shortRestaurantName(name: string) {
  return name.length > 32 ? name.slice(0, 32) + '…' : name
}

async function payWithPromptPay() {
  if (!draft.value) return
  isPaying.value = true
  payError.value = null
  try {
    const days = expandCartToBatchDays(draft.value.items).map((day) => ({
      serviceDate: day.serviceDate,
      items: day.items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        note: i.note || undefined,
      })),
    }))

    const result = await placeOrderBatch({
      restaurantId: draft.value.restaurantId,
      days,
    })

    orderConfirmed.value = true
    clearDraft()
    router.replace(`/batch/${result.batchId}`)
  } catch (e) {
    const err = e as Error & { code?: string; status?: number }
    if (err.code === 'EMAIL_VERIFICATION_REQUIRED') {
      router.replace('/cart')
      return
    }
    payError.value = err.message ?? 'Failed to place order'
    isPaying.value = false
  }
}

function backToCart() {
  router.push('/cart')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <div v-if="draft" class="max-w-2xl mx-auto px-4 py-6">
      <div class="flex items-center gap-3 mb-4">
        <button @click="backToCart" class="text-brand-500 text-sm">← Back</button>
      </div>

      <div class="flex flex-col items-center text-center">
        <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-4xl mb-5 shadow-inner">📝</div>
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Review your pre-order</h1>
        <p class="text-gray-500 text-sm mb-6">
          {{ draft.lunchCount }} lunch{{ draft.lunchCount > 1 ? 'es' : '' }} · one PromptPay payment
        </p>

        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 w-full text-left mb-4">
          <p class="text-xs text-gray-400 font-medium mb-1">From</p>
          <p class="font-semibold text-gray-900 mb-4">{{ shortRestaurantName(draft.restaurantName) }}</p>

          <div v-for="day in dayGroups" :key="day.serviceDate" class="mb-4 last:mb-0">
            <p class="text-xs font-semibold text-brand-600 mb-2">
              {{ formatServiceDateLabel(day.serviceDate) }}
            </p>
            <div class="divide-y divide-gray-100">
              <div
                v-for="item in day.items"
                :key="`${day.serviceDate}-${item.menuItemId}`"
                class="py-2 flex justify-between text-sm"
              >
                <span>{{ item.name }} ×{{ item.quantity }}</span>
                <span class="font-medium">฿{{ item.price * item.quantity }}</span>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-gray-900">
            <span>Total</span><span>฿{{ draft.total }}</span>
          </div>
        </div>

        <div v-if="payError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 w-full">
          ⚠️ {{ payError }}
        </div>

        <div class="w-full space-y-3">
          <button
            @click="payWithPromptPay"
            :disabled="isPaying"
            class="w-full bg-brand-500 disabled:opacity-60 text-white rounded-2xl py-4 font-bold text-base shadow-lg"
          >
            {{ isPaying ? 'Processing…' : `Place order · ฿${draft.total}` }}
          </button>
          <button
            @click="backToCart"
            :disabled="isPaying"
            class="w-full border border-gray-200 text-gray-600 rounded-2xl py-3 font-medium text-sm"
          >
            Back to cart
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
