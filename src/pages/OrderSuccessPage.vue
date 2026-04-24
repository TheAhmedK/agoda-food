<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <div class="max-w-2xl mx-auto px-4 flex flex-col items-center text-center py-20">
      <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl mb-6 shadow-inner">
        ✅
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Order placed!</h1>
      <p class="text-gray-500 text-sm mb-2">Your lunch order has been confirmed.</p>
      <p class="text-gray-400 text-xs mb-8">(Stage 1 — mock order, no backend yet)</p>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 w-full max-w-xs mb-8">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">🕐</span>
          <div class="text-left">
            <p class="text-xs text-gray-400">Estimated delivery</p>
            <p class="font-bold text-gray-900">20–30 minutes</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-2xl">📍</span>
          <div class="text-left">
            <p class="text-xs text-gray-400">Delivering to</p>
            <p class="font-bold text-gray-900">Agoda HQ, Bangkok</p>
          </div>
        </div>
      </div>

      <button
        @click="router.push('/')"
        class="bg-brand-500 text-white px-8 py-3 rounded-2xl font-semibold text-base"
      >
        Order more food
      </button>
    </div>
  </div>
</template>
