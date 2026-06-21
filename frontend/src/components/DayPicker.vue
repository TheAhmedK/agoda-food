<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  formatServiceDateLabel,
  formatServiceDateLong,
  listNextWeekdays,
} from '../lib/serviceDates'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [dateStr: string]
}>()

const dayOptions = computed(() =>
  listNextWeekdays().map((dateStr) => ({
    dateStr,
    label: formatServiceDateLabel(dateStr),
  })),
)

watch(
  dayOptions,
  (opts) => {
    if (opts.length === 0) return
    if (!opts.some((o) => o.dateStr === props.modelValue)) {
      emit('update:modelValue', opts[0]!.dateStr)
    }
  },
  { immediate: true },
)

function select(dateStr: string) {
  emit('update:modelValue', dateStr)
}
</script>

<template>
  <div class="mb-5">
    <p class="text-brand-50 text-xs text-center uppercase tracking-wide">
      <strong>Order lunch for</strong>
    </p>
    <p class="text-lg font-bold text-center mb-3">
      {{ formatServiceDateLong(modelValue) }}
    </p>
    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="opt in dayOptions"
        :key="opt.dateStr"
        type="button"
        @click="select(opt.dateStr)"
        class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
        :class="
          opt.dateStr === modelValue
            ? 'bg-white text-brand-700'
            : 'bg-white/15 text-white hover:bg-white/25'
        "
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
