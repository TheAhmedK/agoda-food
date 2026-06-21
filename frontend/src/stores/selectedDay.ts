import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { defaultSelectedServiceDate } from '../lib/serviceDates'

const STORAGE_KEY = 'agoda_food_selected_day_v1'

function load(): string {
  if (typeof sessionStorage === 'undefined') return defaultSelectedServiceDate()
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? defaultSelectedServiceDate()
  } catch {
    return defaultSelectedServiceDate()
  }
}

export const useSelectedDayStore = defineStore('selectedDay', () => {
  const serviceDate = ref<string>(load())

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
