import { ref, computed } from 'vue'
import type { Point } from '../types'

export function useSelection() {
  const isSelecting = ref(false)
  const selectionStart = ref<Point | null>(null)
  const selectionEnd = ref<Point | null>(null)

  const selectionRect = computed(() => {
    if (!selectionStart.value || !selectionEnd.value || !isSelecting.value) {
      return null
    }

    const x = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const y = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
    const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)

    return { x, y, width, height }
  })

  const startSelection = (point: Point) => {
    isSelecting.value = true
    selectionStart.value = point
    selectionEnd.value = point
  }

  const updateSelection = (point: Point) => {
    if (isSelecting.value) {
      selectionEnd.value = point
    }
  }

  const endSelection = () => {
    isSelecting.value = false
    selectionStart.value = null
    selectionEnd.value = null
  }

  const cancelSelection = () => {
    endSelection()
  }

  return {
    isSelecting: computed(() => isSelecting.value),
    selectionRect,
    startSelection,
    updateSelection,
    endSelection,
    cancelSelection
  }
}