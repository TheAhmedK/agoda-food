<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import {
  fetchBatch,
  payBatch,
  fetchBatchPayment,
  cancelBatch,
  uploadBatchPaymentProof,
} from '../services/api'
import type { OrderBatch, PromptPayQR } from '../data/types'
import { formatServiceDateLabel } from '../lib/serviceDates'

const route = useRoute()
const router = useRouter()

const batch = ref<OrderBatch | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const qr = ref<PromptPayQR | null>(null)
const requesting = ref(false)
const paymentError = ref<string | null>(null)
const cancelling = ref(false)

const proofFile = ref<File | null>(null)
const proofPreview = ref<string | null>(null)
const proofInputRef = ref<HTMLInputElement | null>(null)
const uploadingProof = ref(false)
const proofError = ref<string | null>(null)

let pollHandle: ReturnType<typeof setInterval> | null = null

const isAwaitingPayment = computed(() => batch.value?.status === 'awaiting_payment')
const isPendingVerification = computed(() => batch.value?.status === 'pending_verification')
const isRejected = computed(() => batch.value?.paymentProof?.status === 'rejected')
const isPaid = computed(() => batch.value?.orders.every((o) => o.paymentStatus === 'paid'))

const restaurantName = computed(() => batch.value?.orders[0]?.restaurantName ?? '')

onMounted(async () => {
  try {
    batch.value = await fetchBatch(route.params.id as string)
    if (batch.value.status === 'awaiting_payment') {
      try {
        qr.value = await fetchBatchPayment(batch.value.id)
      } catch {
        /* merchant may not have QR yet */
      }
    }
    if (batch.value.status === 'pending_verification') startPolling()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load batch'
  } finally {
    loading.value = false
  }
})

onUnmounted(stopPolling)

function shortId(id: string) {
  return id.slice(-6).toUpperCase()
}

async function generateQR() {
  if (!batch.value) return
  requesting.value = true
  paymentError.value = null
  try {
    qr.value = await payBatch(batch.value.id)
  } catch (e) {
    paymentError.value = e instanceof Error ? e.message : 'Could not load payment QR'
  } finally {
    requesting.value = false
  }
}

function pickProof() {
  proofInputRef.value?.click()
}

function onProofChosen(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  proofFile.value = file
  if (proofPreview.value) URL.revokeObjectURL(proofPreview.value)
  proofPreview.value = URL.createObjectURL(file)
}

async function submitProof() {
  if (!batch.value || !proofFile.value) return
  uploadingProof.value = true
  proofError.value = null
  try {
    batch.value = await uploadBatchPaymentProof(batch.value.id, proofFile.value)
    proofFile.value = null
    if (proofPreview.value) URL.revokeObjectURL(proofPreview.value)
    proofPreview.value = null
    qr.value = null
    startPolling()
  } catch (e) {
    proofError.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploadingProof.value = false
  }
}

async function confirmCancel() {
  if (!batch.value) return
  cancelling.value = true
  try {
    batch.value = await cancelBatch(batch.value.id)
    stopPolling()
  } catch (e) {
    paymentError.value = e instanceof Error ? e.message : 'Could not cancel'
  } finally {
    cancelling.value = false
  }
}

function startPolling() {
  stopPolling()
  pollHandle = setInterval(async () => {
    if (!batch.value) return
    try {
      const fresh = await fetchBatch(batch.value.id)
      batch.value = fresh
      if (fresh.status === 'confirmed' || fresh.status === 'cancelled') stopPolling()
      else if (fresh.status === 'awaiting_payment' && isRejected.value) {
        try {
          qr.value = await fetchBatchPayment(fresh.id)
        } catch {
          /* noop */
        }
      }
    } catch {
      /* retry next tick */
    }
  }, 4000)
}

function stopPolling() {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <div v-if="loading" class="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>

    <div v-else-if="error" class="max-w-2xl mx-auto px-4 py-20 text-center">
      <p class="font-medium text-gray-700">{{ error }}</p>
      <button @click="router.push('/')" class="mt-6 bg-brand-700 text-white px-6 py-3 rounded-2xl font-semibold">
        Back to home
      </button>
    </div>

    <div v-else-if="batch" class="max-w-2xl mx-auto px-4 py-6">
      <div class="text-center mb-6">
        <template v-if="isAwaitingPayment">
          <div class="text-4xl mb-3">📱</div>
          <h1 class="text-2xl font-bold text-gray-900">Pay for {{ batch.orders.length }} lunch{{ batch.orders.length > 1 ? 'es' : '' }}</h1>
          <p class="text-gray-500 text-sm mt-1">One PromptPay covers all days below</p>
        </template>
        <template v-else-if="isPendingVerification">
          <div class="text-4xl mb-3">⏳</div>
          <h1 class="text-2xl font-bold">Verifying payment…</h1>
        </template>
        <template v-else-if="isPaid || batch.status === 'confirmed'">
          <div class="text-4xl mb-3">✅</div>
          <h1 class="text-2xl font-bold">Pre-order confirmed!</h1>
        </template>
        <p class="text-xs text-gray-400 font-mono mt-2">Batch #{{ shortId(batch.id) }}</p>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
        <p class="font-semibold text-gray-900 mb-3">{{ restaurantName }}</p>
        <div v-for="order in batch.orders" :key="order.id" class="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-0 border-gray-100">
          <p class="text-xs font-semibold text-brand-600 mb-1">
            {{ order.serviceDate ? formatServiceDateLabel(order.serviceDate.slice(0, 10)) : 'Lunch' }}
          </p>
          <div v-for="item in order.items" :key="item.menuItemId" class="flex justify-between text-sm text-gray-600">
            <span>{{ item.name }} ×{{ item.quantity }}</span>
            <span>฿{{ item.price * item.quantity }}</span>
          </div>
        </div>
        <div class="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span>฿{{ batch.grandTotal }}</span>
        </div>
      </div>

      <template v-if="isAwaitingPayment">
        <div v-if="!qr" class="mb-4">
          <button
            @click="generateQR"
            :disabled="requesting"
            class="w-full bg-brand-700 text-white rounded-2xl py-4 font-bold"
          >
            {{ requesting ? 'Loading…' : `Show PromptPay · ฿${batch.grandTotal}` }}
          </button>
        </div>
        <div v-else class="bg-white rounded-2xl border p-6 mb-4 text-center">
          <img :src="qr.qrImageUrl" alt="PromptPay QR" class="mx-auto w-56 h-56 rounded-xl" />
          <p class="mt-4 text-2xl font-bold">฿{{ batch.grandTotal }}</p>
        </div>

        <div class="bg-white rounded-2xl border p-5 mb-4">
          <input ref="proofInputRef" type="file" accept="image/*" class="hidden" @change="onProofChosen" />
          <button
            v-if="!proofPreview"
            @click="pickProof"
            class="w-full border-2 border-dashed border-brand-300 rounded-xl py-6 text-brand-600 font-semibold"
          >
            Have you paid? — upload screenshot
          </button>
          <div v-else class="space-y-3">
            <img :src="proofPreview" class="w-full rounded-xl border" />
            <button
              @click="submitProof"
              :disabled="uploadingProof"
              class="w-full bg-brand-700 text-white rounded-xl py-3 font-semibold"
            >
              {{ uploadingProof ? 'Uploading…' : 'Send to restaurant' }}
            </button>
          </div>
          <p v-if="proofError" class="text-red-600 text-sm mt-2">{{ proofError }}</p>
        </div>

        <button
          @click="confirmCancel"
          :disabled="cancelling"
          class="w-full border border-gray-200 text-gray-600 rounded-2xl py-3 text-sm"
        >
          Cancel batch
        </button>
      </template>

      <template v-else-if="isPendingVerification">
        <p class="text-center text-sm text-gray-500 mb-4">Restaurant is reviewing your payment for all days.</p>
      </template>

      <template v-else>
        <p class="text-center text-sm text-gray-500 mb-4">Pickup at Agoda HQ around lunch on each day.</p>
        <button @click="router.push('/orders')" class="w-full bg-brand-700 text-white rounded-2xl py-3 font-semibold">
          View my orders
        </button>
      </template>

      <p v-if="paymentError" class="text-red-600 text-sm mt-4 text-center">{{ paymentError }}</p>
    </div>
  </div>
</template>
