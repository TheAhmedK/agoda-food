<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import { login } from '../services/api'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const email = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function submit() {
  const value = email.value.trim().toLowerCase()
  if (!value) {
    error.value = 'Please enter your email'
    return
  }

  loading.value = true
  error.value = null
  try {
    const me = await login(value)
    user.setUser(me)
    // Send the user back where they came from, or home.
    const next = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(next)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}

function quickLogin(value: string) {
  email.value = value
  submit()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <div class="max-w-md mx-auto px-4 py-10">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">👋</div>
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p class="text-gray-500 text-sm">Sign in with your email to place an order.</p>
      </div>

      <form
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
        @submit.prevent="submit"
      >
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="alice@agoda.com"
            autocapitalize="off"
            autocomplete="email"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div
          v-if="error"
          class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2"
        >
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand-500 disabled:opacity-60 text-white rounded-xl py-3 font-semibold"
        >
          <span v-if="loading">Signing in…</span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <!-- Dev helper: quick pick. LINE login replaces this in Stage 4. -->
      <div class="mt-6 text-center">
        <p class="text-xs text-gray-400 mb-2">Try a demo account</p>
        <div class="flex gap-2 justify-center">
          <button
            type="button"
            @click="quickLogin('alice@agoda.com')"
            class="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm hover:bg-gray-50"
          >
            alice@agoda.com
          </button>
          <button
            type="button"
            @click="quickLogin('bob@agoda.com')"
            class="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm hover:bg-gray-50"
          >
            bob@agoda.com
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
