<script setup lang="ts">
import { computed } from 'vue'
import {
  listPickerServiceDates,
  formatServiceDateLabel,
  DEFAULT_SERVING_DAYS,
} from '../lib/serviceDates'

const props = defineProps<{
  /** Dates this menu item is currently in the cart on (highlighted). */
  activeDates: string[]
  servingDays?: number[]
}>()

const emit = defineEmits<{
  toggle: [dateStr: string]
}>()

const eligibleDates = computed(() =>
  listPickerServiceDates(props.servingDays ?? DEFAULT_SERVING_DAYS),
)

function isSelected(dateStr: string) {
  return props.activeDates.includes(dateStr)
}

function onToggle(dateStr: string) {
  if (isSelected(dateStr) && props.activeDates.length <= 1) return
  emit('toggle', dateStr)
}
</script>

<template>
  <div v-if="eligibleDates.length > 0" class="mt-2">
    <p class="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1.5">
      Also order on
    </p>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="dateStr in eligibleDates"
        :key="dateStr"
        type="button"
        @click="onToggle(dateStr)"
        class="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
        :class="
          isSelected(dateStr)
            ? 'bg-brand-700 text-white'
            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-700'
        "
      >
        {{ formatServiceDateLabel(dateStr) }}
      </button>
    </div>
  </div>
</template>
