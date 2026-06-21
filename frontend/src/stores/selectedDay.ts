import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { defaultSelectedServiceDate, bangkokDateStr, listNextWeekdays } from '../lib/serviceDates'

const STORAGE_KEY = 'agoda_food_selected_day_v1'

function load(): string {
  const options = listNextWeekdays()
  const fallback = options[0] ?? defaultSelectedServiceDate()
  if (typeof sessionStorage === 'undefined') return fallback
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored || stored <= bangkokDateStr() || !options.includes(stored)) return fallback
    return stored
  } catch {
    return fallback
  }
}

export const useSelectedDayStore = defineStore('selectedDay', () => {
  const serviceDate = ref<string>(load())

  watch(serviceDate, (date) => {
    const options = listNextWeekdays()
    if (date <= bangkokDateStr() || !options.includes(date)) {
      serviceDate.value = options[0] ?? defaultSelectedServiceDate()
    }
  }, { immediate: true })

  watch(serviceDate, (next) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* noop */
    }
  })

  function setServiceDate(dateStr: string) {
    serviceDate.value = dateStr
  }

  return { serviceDate, setServiceDate }
})
