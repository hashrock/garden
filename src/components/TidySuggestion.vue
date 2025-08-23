<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="show"
      class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-3"
    >
      <span class="text-sm text-gray-700">{{ imageCount }} images added</span>
      <button
        @click="$emit('tidy')"
        class="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
      >
        Tidy Images
      </button>
      <button
        @click="$emit('dismiss')"
        class="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  show: boolean
  imageCount: number
}>()

const emit = defineEmits<{
  tidy: []
  dismiss: []
}>()

// Auto-dismiss after 10 seconds
let timeoutId: ReturnType<typeof setTimeout> | null = null

const startAutoDismiss = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    emit('dismiss')
  }, 10000)
}

const stopAutoDismiss = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

// Watch for show prop changes
watch(() => props.show, (newValue) => {
  if (newValue) {
    startAutoDismiss()
  } else {
    stopAutoDismiss()
  }
})

onMounted(() => {
  if (props.show) {
    startAutoDismiss()
  }
})

onUnmounted(() => {
  stopAutoDismiss()
})
</script>