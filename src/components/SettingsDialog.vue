<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
    
    <!-- Dialog -->
    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            @click="$emit('close')"
            class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="px-6 py-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
        <!-- Statistics -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Project Statistics</h3>
          <div class="space-y-2">
            <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">Images</span>
              <span class="text-sm font-medium text-gray-900">{{ imageCount }}</span>
            </div>
            <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">Artboards</span>
              <span class="text-sm font-medium text-gray-900">{{ artboardCount }}</span>
            </div>
          </div>
        </div>

        <!-- Input Mode Settings -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Input Mode</h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <span class="text-sm text-gray-700">Mouse Mode</span>
              <input
                type="radio"
                v-model="inputMode"
                value="mouse"
                @change="updateInputMode"
                class="text-gray-900"
              />
            </label>
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <span class="text-sm text-gray-700">Trackpad Mode</span>
              <input
                type="radio"
                v-model="inputMode"
                value="trackpad"
                @change="updateInputMode"
                class="text-gray-900"
              />
            </label>
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <span class="text-sm text-gray-700">Touch Mode</span>
              <input
                type="radio"
                v-model="inputMode"
                value="touch"
                @change="updateInputMode"
                class="text-gray-900"
              />
            </label>
          </div>
        </div>

        <!-- Navigation Settings -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Navigation</h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-sm text-gray-700">Space + Drag to Pan</span>
              <input
                type="checkbox"
                v-model="settings.enableSpacePan"
                @change="updateSettings"
                class="rounded border-gray-300"
              />
            </label>
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-sm text-gray-700">Right Click to Pan</span>
              <input
                type="checkbox"
                v-model="settings.enableRightButtonPan"
                @change="updateSettings"
                class="rounded border-gray-300"
              />
            </label>
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-sm text-gray-700">Middle Click to Pan</span>
              <input
                type="checkbox"
                v-model="settings.enableMiddleButtonPan"
                @change="updateSettings"
                class="rounded border-gray-300"
              />
            </label>
          </div>
        </div>

        <!-- Zoom Settings -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Zoom</h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-sm text-gray-700">Wheel to Zoom</span>
              <input
                type="checkbox"
                v-model="settings.enableWheelZoom"
                @change="updateSettings"
                class="rounded border-gray-300"
              />
            </label>
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-sm text-gray-700">Ctrl + Wheel to Zoom</span>
              <input
                type="checkbox"
                v-model="settings.enableCtrlWheelZoom"
                @change="updateSettings"
                class="rounded border-gray-300"
              />
            </label>
            <label class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-sm text-gray-700">Touch Gestures</span>
              <input
                type="checkbox"
                v-model="settings.enableTouchGestures"
                @change="updateSettings"
                class="rounded border-gray-300"
              />
            </label>
          </div>
        </div>

        <!-- About -->
        <div class="pt-4 border-t border-gray-200">
          <div class="text-xs text-gray-500 text-center">
            Garden v1.0.0 • Image Reference Tool
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useInputMode } from '../composables/useInputMode'

defineProps<{
  imageCount: number
  artboardCount: number
}>()

defineEmits<{
  close: []
}>()

const inputModeManager = useInputMode()
const inputMode = ref('mouse')
const settings = ref({
  enableSpacePan: true,
  enableRightButtonPan: false,
  enableMiddleButtonPan: true,
  enableWheelZoom: false,
  enableCtrlWheelZoom: true,
  enableTouchGestures: true,
})

onMounted(() => {
  // Load current mode
  const config = inputModeManager.getInputConfig()
  if (config.enableTouchGestures && !config.enableWheelZoom) {
    inputMode.value = 'touch'
  } else if (config.enableTwoFingerPan) {
    inputMode.value = 'trackpad'
  } else {
    inputMode.value = 'mouse'
  }
  
  // Load current settings
  settings.value = {
    enableSpacePan: config.enableSpacePan,
    enableRightButtonPan: config.enableRightButtonPan,
    enableMiddleButtonPan: config.enableMiddleButtonPan,
    enableWheelZoom: config.enableWheelZoom,
    enableCtrlWheelZoom: config.enableCtrlWheelZoom,
    enableTouchGestures: config.enableTouchGestures,
  }
})

const updateInputMode = () => {
  inputModeManager.setMode(inputMode.value as 'mouse' | 'trackpad' | 'touch')
  // Reload settings after mode change
  const config = inputModeManager.getInputConfig()
  settings.value = {
    enableSpacePan: config.enableSpacePan,
    enableRightButtonPan: config.enableRightButtonPan,
    enableMiddleButtonPan: config.enableMiddleButtonPan,
    enableWheelZoom: config.enableWheelZoom,
    enableCtrlWheelZoom: config.enableCtrlWheelZoom,
    enableTouchGestures: config.enableTouchGestures,
  }
}

const updateSettings = () => {
  // Custom settings override
  const currentConfig = inputModeManager.getInputConfig()
  Object.assign(currentConfig, settings.value)
}
</script>