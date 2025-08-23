import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Viewport } from '../types'

export const useCanvasStore = defineStore('canvas', () => {
  const viewport = ref<Viewport>({
    x: 0,
    y: 0,
    zoom: 1
  })

  const canvasSize = ref({
    width: 10000,
    height: 10000
  })

  const setViewport = (newViewport: Viewport) => {
    viewport.value = newViewport
  }

  const resetViewport = () => {
    viewport.value = {
      x: 0,
      y: 0,
      zoom: 1
    }
  }

  return {
    viewport,
    canvasSize,
    setViewport,
    resetViewport
  }
})