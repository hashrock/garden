<template>
  <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
      <!-- Header -->
      <div class="px-8 py-6 text-center border-b border-gray-100">
        <h2 class="text-2xl font-bold text-gray-900">Welcome to Garden</h2>
        <p class="mt-2 text-sm text-gray-600">Choose your preferred input method to get started</p>
      </div>
      
      <!-- Content -->
      <div class="px-8 py-6">
        <div class="space-y-4">
          <!-- Mouse Option -->
          <button
            @click="selectMode('mouse')"
            class="w-full p-6 text-left border-2 rounded-xl transition-all hover:border-blue-500 hover:bg-blue-50/50"
            :class="selectedMode === 'mouse' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-gray-100 rounded-lg">
                <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Mouse</h3>
                <p class="mt-1 text-sm text-gray-600">Traditional mouse with scroll wheel</p>
                <ul class="mt-2 text-xs text-gray-500 space-y-1">
                  <li>• Scroll wheel to zoom</li>
                  <li>• Right-click or middle-click to pan</li>
                  <li>• Left-click to select and drag</li>
                </ul>
              </div>
            </div>
          </button>

          <!-- Trackpad Option -->
          <button
            @click="selectMode('trackpad')"
            class="w-full p-6 text-left border-2 rounded-xl transition-all hover:border-blue-500 hover:bg-blue-50/50"
            :class="selectedMode === 'trackpad' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-gray-100 rounded-lg">
                <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Trackpad</h3>
                <p class="mt-1 text-sm text-gray-600">Laptop trackpad or Magic Trackpad</p>
                <ul class="mt-2 text-xs text-gray-500 space-y-1">
                  <li>• Pinch to zoom</li>
                  <li>• Two-finger drag to pan</li>
                  <li>• Click to select and drag</li>
                </ul>
              </div>
            </div>
          </button>

          <!-- Touch Option -->
          <button
            @click="selectMode('touch')"
            class="w-full p-6 text-left border-2 rounded-xl transition-all hover:border-blue-500 hover:bg-blue-50/50"
            :class="selectedMode === 'touch' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-gray-100 rounded-lg">
                <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Touch Screen</h3>
                <p class="mt-1 text-sm text-gray-600">Tablet or touch-enabled display</p>
                <ul class="mt-2 text-xs text-gray-500 space-y-1">
                  <li>• Pinch to zoom</li>
                  <li>• Drag to pan</li>
                  <li>• Tap to select</li>
                </ul>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-6 bg-gray-50 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500">You can change this later in Settings</p>
          <button
            @click="confirmSelection"
            :disabled="!selectedMode"
            class="px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useInputMode } from '../composables/useInputMode'

// const emit = defineEmits<{
//   complete: []
// }>()

const inputModeManager = useInputMode()
const selectedMode = ref<'mouse' | 'trackpad' | 'touch' | null>(null)

const selectMode = (mode: 'mouse' | 'trackpad' | 'touch') => {
  selectedMode.value = mode
}

const confirmSelection = () => {
  if (selectedMode.value) {
    inputModeManager.setMode(selectedMode.value)
    // Save to localStorage to remember the user has completed setup
    localStorage.setItem('garden-setup-complete', 'true')
    // Reload the page to apply settings
    window.location.reload()
  }
}
</script>