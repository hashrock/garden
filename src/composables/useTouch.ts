import { ref, computed } from 'vue'
import type { Point } from '../types'

interface PointerInfo {
  id: number
  x: number
  y: number
}

export function useTouch() {
  const activePointers = ref<Map<number, PointerInfo>>(new Map())
  const isPinching = ref(false)
  const initialPinchDistance = ref(0)
  const initialPinchZoom = ref(1)
  const pinchCenter = ref<Point | null>(null)
  
  const pointerCount = computed(() => activePointers.value.size)
  
  const addPointer = (e: PointerEvent): PointerInfo => {
    const pointer: PointerInfo = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    }
    activePointers.value.set(e.pointerId, pointer)
    return pointer
  }
  
  const updatePointer = (e: PointerEvent): PointerInfo | null => {
    const pointer = activePointers.value.get(e.pointerId)
    if (pointer) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      return pointer
    }
    return null
  }
  
  const removePointer = (e: PointerEvent): void => {
    activePointers.value.delete(e.pointerId)
  }
  
  const getDistance = (p1: PointerInfo, p2: PointerInfo): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  const getCenter = (p1: PointerInfo, p2: PointerInfo): Point => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    }
  }
  
  const getTwoPointers = (): [PointerInfo, PointerInfo] | null => {
    if (activePointers.value.size !== 2) return null
    const pointers = Array.from(activePointers.value.values())
    return [pointers[0], pointers[1]]
  }
  
  const startPinch = (currentZoom: number): boolean => {
    const pointers = getTwoPointers()
    if (!pointers) return false
    
    const [p1, p2] = pointers
    initialPinchDistance.value = getDistance(p1, p2)
    initialPinchZoom.value = currentZoom
    pinchCenter.value = getCenter(p1, p2)
    isPinching.value = true
    return true
  }
  
  const updatePinch = (): { scale: number; center: Point } | null => {
    if (!isPinching.value) return null
    
    const pointers = getTwoPointers()
    if (!pointers) {
      endPinch()
      return null
    }
    
    const [p1, p2] = pointers
    const currentDistance = getDistance(p1, p2)
    const scale = currentDistance / initialPinchDistance.value
    const center = getCenter(p1, p2)
    
    return { scale, center }
  }
  
  const endPinch = (): void => {
    isPinching.value = false
    initialPinchDistance.value = 0
    pinchCenter.value = null
  }
  
  const handleTrackpadPinch = (e: WheelEvent): { scale: number; center: Point } | null => {
    if (!e.ctrlKey) return null
    
    if (e.preventDefault) {
      e.preventDefault()
    }
    
    const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05
    
    return {
      scale: scaleFactor,
      center: { x: e.clientX, y: e.clientY }
    }
  }
  
  const clearPointers = (): void => {
    activePointers.value.clear()
    endPinch()
  }
  
  return {
    activePointers: computed(() => activePointers.value),
    pointerCount,
    isPinching: computed(() => isPinching.value),
    pinchCenter: computed(() => pinchCenter.value),
    initialPinchZoom,
    addPointer,
    updatePointer,
    removePointer,
    getTwoPointers,
    startPinch,
    updatePinch,
    endPinch,
    handleTrackpadPinch,
    clearPointers,
    getDistance,
    getCenter
  }
}