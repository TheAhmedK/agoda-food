<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { useCartStore } from '../stores/cart'

const router = useRouter()
const cart = useCartStore()

const deliveryFee = 0 // mock: always free for now
const total = computed(() => cart.subtotal + deliveryFee)

const isPlacing = ref(false)

async function placeOrder() {
  isPlacing.value = true
  // Stage 1: just simulate a 1s delay
  await new Promise((resolve) => setTimeout(resolve, 1000))
  cart.clearCart()
  isPlacing.value = false
  router.push('/order-success')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <div class="max-w-2xl mx-auto px-4 py-6">
      <!-- Empty state -->
      <div v-if="cart.items.length === 0" class="text-center py-24">
        <div class="text-6xl mb-4">🛒</div>
        <h2 class="font-bold text-gray-800 text-xl mb-2">Your cart is empty</h2>
        <p class="text-gray-500 text-sm mb-6">Add some dishes from your favourite restaurant</p>
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
          <h1 class="font-bold text-gray-900 text-xl">Your order</h1>
        </div>

        <!-- From -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4 flex items-center gap-3">
          <span class="text-2xl">🏠</span>
          <div>
            <p class="text-xs text-gray-400 font-medium">From</p>
            <p class="font-semibold text-gray-900">{{ cart.items[0]?.restaurantName }}</p>
          </div>
        </div>

        <!-- Items -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 mb-4">
          <div
            v-for="item in cart.items"
            :key="item.menuItem.id"
            class="px-4 py-4 flex items-start gap-3"
          >
            <img
              :src="item.menuItem.imageUrl"
              :alt="item.menuItem.name"
              class="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 text-sm">{{ item.menuItem.name }}</p>
              <p class="text-gray-400 text-xs mt-0.5 line-clamp-1">{{ item.menuItem.description }}</p>

              <!-- Note -->
              <input
                :value="item.note"
                @input="cart.setNote(item.menuItem.id, ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="Add a note (optional)"
                class="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-300 text-gray-600 placeholder-gray-300"
              />
            </div>

            <div class="shrink-0 flex flex-col items-end gap-2">
              <p class="font-bold text-gray-900 text-sm">฿{{ item.menuItem.price * item.quantity }}</p>
              <div class="flex items-center gap-2">
                <button
                  @click="cart.removeItem(item.menuItem.id)"
                  class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm active:scale-95"
                >
                  −
                </button>
                <span class="text-sm font-bold w-4 text-center text-brand-600">{{ item.quantity }}</span>
                <button
                  @click="cart.addItem(item.menuItem, item.restaurantId, item.restaurantName)"
                  class="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white text-sm active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-6 space-y-2">
          <div class="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>฿{{ cart.subtotal }}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600">
            <span>Delivery fee</span>
            <span class="text-green-600 font-medium">{{ deliveryFee === 0 ? 'Free' : `฿${deliveryFee}` }}</span>
          </div>
          <div class="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>฿{{ total }}</span>
          </div>
        </div>

        <!-- Place order button -->
        <button
          @click="placeOrder"
          :disabled="isPlacing"
          class="w-full bg-brand-500 disabled:opacity-60 text-white rounded-2xl py-4 font-bold text-base shadow-lg active:scale-[0.97] transition-transform"
        >
          <span v-if="isPlacing">Placing order…</span>
          <span v-else>Place order · ฿{{ total }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
