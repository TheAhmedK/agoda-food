<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import ServiceDateChips from '../components/ServiceDateChips.vue'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
import { useSelectedDayStore } from '../stores/selectedDay'
import { sendOtp, verifyOtp, fetchRestaurantWithMenu } from '../services/api'
import { saveDraft } from '../services/checkoutDraft'
import {
  formatServiceDateLong,
  defaultOrderWindow,
  DEFAULT_SERVING_DAYS,
  isOrderableForDate,
} from '../lib/serviceDates'
import type { RestaurantWithMenu } from '../data/types'

const router = useRouter()
const cart = useCartStore()
const user = useUserStore()
const selectedDay = useSelectedDayStore()

const restaurant = ref<RestaurantWithMenu | null>(null)
const isPlacing = ref(false)
const orderError = ref<string | null>(null)

const lunchCount = computed(() => cart.datesInCart.length)

// Date sections, with the day the user is shopping for pinned first.
const orderedDates = computed(() => {
  const dates = [...cart.datesInCart]
  const sel = selectedDay.serviceDate
  if (dates.includes(sel)) {
    return [sel, ...dates.filter((d) => d !== sel)]
  }
  return dates
})

onMounted(async () => {
  if (!cart.activeRestaurantId) return
  try {
    restaurant.value = await fetchRestaurantWithMenu(cart.activeRestaurantId)
  } catch {
    /* chips fall back to defaults */
  }
})

type OtpStep = 'email' | 'code'
const showOtpModal = ref(false)
const otpStep = ref<OtpStep>('email')
const otpEmail = ref(user.user?.email ?? '')
const otpCode = ref('')
const otpSending = ref(false)
const otpVerifying = ref(false)
const otpError = ref<string | null>(null)

const orderWindow = computed(() => restaurant.value?.orderWindow ?? defaultOrderWindow())

const closedDatesInCart = computed(() =>
  cart.datesInCart.filter((d) => !isOrderableForDate(orderWindow.value, d)),
)

const hasClosedDates = computed(() => closedDatesInCart.value.length > 0)

function isDateClosed(date: string) {
  return !isOrderableForDate(orderWindow.value, date)
}

function removeClosedDates() {
  for (const date of closedDatesInCart.value) {
    cart.clearDate(date)
  }
  orderError.value = null
}

function proceedToCheckout() {
  if (cart.items.length === 0 || !cart.activeRestaurantId) return
  if (hasClosedDates.value) {
    orderError.value = 'Some days in your cart have passed their order cut-off. Remove them to continue.'
    return
  }
  saveDraft({
    restaurantId: cart.activeRestaurantId,
    restaurantName: cart.items[0]!.restaurantName,
    items: JSON.parse(JSON.stringify(cart.items)),
    subtotal: cart.subtotal,
    deliveryFee: 0,
    total: cart.subtotal,
    lunchCount: lunchCount.value,
    savedAt: new Date().toISOString(),
  })
  cart.clearCart()
  router.push('/checkout')
}

function submitOrder() {
  if (cart.items.length === 0 || !cart.activeRestaurantId) return
  if (hasClosedDates.value) {
    orderError.value = 'Some days in your cart have passed their order cut-off. Remove them to continue.'
    return
  }

  if (!user.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: '/cart' } })
    return
  }

  if (!user.emailVerified) {
    openOtpModal()
    return
  }

  proceedToCheckout()
}

function openOtpModal() {
  otpStep.value = 'email'
  otpEmail.value = user.user?.email ?? ''
  otpCode.value = ''
  otpError.value = null
  showOtpModal.value = true
}

function dismissOtpModal() {
  if (otpSending.value || otpVerifying.value) return
  showOtpModal.value = false
  otpError.value = null
  otpCode.value = ''
}

async function sendOtpCode() {
  if (!otpEmail.value.trim()) {
    otpError.value = 'Please enter your email address'
    return
  }
  otpSending.value = true
  otpError.value = null
  try {
    await sendOtp(otpEmail.value.trim(), 'user_verify')
    otpStep.value = 'code'
  } catch (e) {
    otpError.value = e instanceof Error ? e.message : 'Failed to send OTP'
  } finally {
    otpSending.value = false
  }
}

async function verifyOtpCode() {
  if (!otpCode.value.trim()) {
    otpError.value = 'Please enter the 6-digit code'
    return
  }
  otpVerifying.value = true
  otpError.value = null
  try {
    const { user: updatedUser } = await verifyOtp(
      otpEmail.value.trim(),
      'user_verify',
      otpCode.value.trim(),
    )
    user.updateUser(updatedUser)
    showOtpModal.value = false
    proceedToCheckout()
  } catch (e) {
    const err = e as Error & { code?: string }
    otpError.value =
      err.code === 'OTP_INVALID'
        ? 'Invalid or expired code. Please try again.'
        : e instanceof Error
          ? e.message
          : 'Failed to verify OTP'
  } finally {
    otpVerifying.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <div class="max-w-2xl mx-auto px-4 py-6">
      <div v-if="cart.items.length === 0" class="text-center py-24">
        <div class="text-6xl mb-4">🛒</div>
        <h2 class="font-bold text-gray-800 text-xl mb-2">Your cart is empty</h2>
        <button
          @click="router.push('/')"
          class="bg-brand-500 text-white px-6 py-3 rounded-2xl font-semibold"
        >
          Browse restaurants
        </button>
      </div>

      <div v-else>
        <div class="flex items-center gap-3 mb-6">
          <button @click="router.back()" class="text-brand-500 text-sm">← Back</button>
          <h1 class="font-bold text-gray-900 text-xl">Your pre-order</h1>
        </div>

        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4 flex items-center gap-3">
          <span class="text-2xl">🏠</span>
          <div>
            <p class="text-xs text-gray-400 font-medium">From</p>
            <p class="font-semibold text-gray-900">{{ cart.items[0]?.restaurantName }}</p>
          </div>
        </div>

        <div
          v-if="hasClosedDates"
          class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 mb-4"
        >
          <p class="font-medium mb-1">Some days have passed their cut-off</p>
          <p class="text-xs text-amber-700 mb-2">
            Orders close at {{ String(orderWindow.cutoffHour).padStart(2, '0') }}:00 the day before delivery.
          </p>
          <button
            type="button"
            @click="removeClosedDates"
            class="text-xs font-semibold text-amber-900 underline"
          >
            Remove closed days from cart
          </button>
        </div>

        <!-- One section per delivery day; the selected day comes first. -->
        <div
          v-for="(date, index) in orderedDates"
          :key="date"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b"
            :class="isDateClosed(date)
              ? 'bg-amber-50 border-amber-100'
              : 'bg-brand-50 border-brand-100'"
          >
            <div class="flex items-center gap-2">
              <span>📅</span>
              <span
                class="font-semibold text-sm"
                :class="isDateClosed(date) ? 'text-amber-800' : 'text-brand-800'"
              >
                {{ formatServiceDateLong(date) }}
              </span>
              <span
                v-if="isDateClosed(date)"
                class="text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-white border border-amber-200 rounded-full px-2 py-0.5"
              >
                Closed
              </span>
            </div>
            <span
              v-if="index === 0"
              class="text-[10px] uppercase tracking-wide font-semibold text-brand-600 bg-white border border-brand-200 rounded-full px-2 py-0.5"
            >
              Selected day
            </span>
          </div>

          <div class="divide-y divide-gray-100">
            <div
              v-for="item in cart.itemsForDate(date)"
              :key="`${date}-${item.menuItem.id}`"
              class="px-4 py-4 flex items-start gap-3"
            >
              <img
                v-if="item.menuItem.imageUrl"
                :src="item.menuItem.imageUrl"
                :alt="item.menuItem.name"
                class="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div
                v-else
                class="w-16 h-16 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center text-2xl"
              >
                🍽️
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">{{ item.menuItem.name }}</p>
                <input
                  :value="item.note"
                  @input="cart.setNote(item.menuItem.id, date, ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="Add a note (optional)"
                  class="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-300 text-gray-600"
                />
                <ServiceDateChips
                  :active-dates="cart.datesForMenuItem(item.menuItem.id)"
                  :serving-days="restaurant?.servingDays ?? DEFAULT_SERVING_DAYS"
                  @toggle="cart.toggleItemDate(item.menuItem.id, $event)"
                />
              </div>
              <div class="shrink-0 flex flex-col items-end gap-2">
                <p class="font-bold text-gray-900 text-sm">฿{{ item.menuItem.price * item.quantity }}</p>
                <div class="flex items-center gap-2">
                  <button
                    @click="cart.removeItem(item.menuItem.id, date)"
                    class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm"
                  >
                    −
                  </button>
                  <span class="text-sm font-bold w-4 text-center text-brand-600">{{ item.quantity }}</span>
                  <button
                    @click="cart.addItem(item.menuItem, item.restaurantId, item.restaurantName, date)"
                    :disabled="isDateClosed(date)"
                    class="w-7 h-7 rounded-full bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-white text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between px-4 py-3 text-sm border-t border-gray-100 bg-gray-50">
            <span class="text-gray-500">Day subtotal</span>
            <span class="font-semibold text-gray-900">฿{{ cart.subtotalForDate(date) }}</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-4 space-y-2">
          <div class="flex justify-between text-sm text-gray-600">
            <span>{{ lunchCount }} lunch{{ lunchCount > 1 ? 'es' : '' }}</span>
            <span>฿{{ cart.subtotal }}</span>
          </div>
          <div class="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>฿{{ cart.subtotal }}</span>
          </div>
        </div>

        <div v-if="orderError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          ⚠️ {{ orderError }}
        </div>

        <button
          @click="submitOrder"
          :disabled="isPlacing || hasClosedDates"
          class="w-full bg-brand-500 disabled:opacity-60 text-white rounded-2xl py-4 font-bold text-base shadow-lg"
        >
          Checkout · {{ lunchCount }} lunch{{ lunchCount > 1 ? 'es' : '' }} · ฿{{ cart.subtotal }}
        </button>
      </div>
    </div>

    <!-- OTP modal unchanged structure -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showOtpModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        @click.self="dismissOtpModal"
      >
        <div class="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-xl px-6 pt-6 pb-5">
          <h2 class="text-lg font-bold text-gray-900 mb-4 text-center">Verify your email</h2>
          <div v-if="otpStep === 'email'" class="space-y-3">
            <input
              v-model="otpEmail"
              type="email"
              placeholder="you@agoda.com"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
            <div v-if="otpError" class="text-red-600 text-xs">{{ otpError }}</div>
            <button @click="sendOtpCode" class="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm">
              Send code
            </button>
          </div>
          <div v-else class="space-y-3">
            <input
              v-model="otpCode"
              type="text"
              maxlength="6"
              placeholder="123456"
              class="w-full border border-gray-200 rounded-xl px-3 py-3 text-center font-mono text-lg"
            />
            <div v-if="otpError" class="text-red-600 text-xs">{{ otpError }}</div>
            <button @click="verifyOtpCode" class="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm">
              Verify & continue
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
