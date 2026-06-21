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

const selectedIndex = computed(() =>
  dayOptions.value.findIndex((d) => d.dateStr === props.modelValue),
)

function select(dateStr: string) {
  emit('update:modelValue', dateStr)
}

function prev() {
  const idx = selectedIndex.value
  if (idx > 0) select(dayOptions.value[idx - 1]!.dateStr)
}

function next() {
  const idx = selectedIndex.value
  if (idx >= 0 && idx < dayOptions.value.length - 1) {
    select(dayOptions.value[idx + 1]!.dateStr)
  }
}
</script>

<template>
  <div class="mb-5">
    <p class="text-brand-100 text-xs font-medium uppercase tracking-wide mb-2">
      Order lunch for
    </p>
    <div class="flex items-center justify-between gap-2 mb-3">
      <button
        type="button"
        @click="prev"
        :disabled="selectedIndex <= 0"
        class="w-9 h-9 rounded-full bg-white/20 disabled:opacity-30 text-white font-bold"
      >
        ◀
      </button>
      <p class="text-lg font-bold text-center flex-1">
        {{ formatServiceDateLong(modelValue) }}
      </p>
      <button
        type="button"
        @click="next"
        :disabled="selectedIndex >= dayOptions.length - 1"
        class="w-9 h-9 rounded-full bg-white/20 disabled:opacity-30 text-white font-bold"
      >
        ▶
      </button>
    </div>
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
