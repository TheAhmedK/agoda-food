import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../data/types'

const STORAGE_KEY = 'agoda-food:user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

// Minimal stub store for Stage 3. Stage 4 (LINE login) will replace the
// login() implementation but keep the same public API, so consumers don't
// need to change.
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(readStoredUser())

  const isLoggedIn = computed(() => user.value !== null)

  function setUser(next: User) {
    user.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function clear() {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    user,
    isLoggedIn,
    setUser,
    clear,
  }
})
