import { ref, computed, type Ref } from 'vue'
import type { Point, Viewport } from '../types'

export function useCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const viewport = ref<Viewport>({
    x: 0,
    y: 0,
    zoom: 1
  })

  const isPanning = ref(false)
  const panStart = ref<Point>({ x: 0, y: 0 })
  const viewportStart = ref<Point>({ x: 0, y: 0 })

  const minZoom = 0.1
  const maxZoom = 5
  const zoomStep = 0.1

  const screenToCanvas = (screenX: number, screenY: number): Point => {
    return {
      x: (screenX - viewport.value.x) / viewport.value.zoom,
      y: (screenY - viewport.value.y) / viewport.value.zoom
    }
  }

  const canvasToScreen = (canvasX: number, canvasY: number): Point => {
    return {
      x: canvasX * viewport.value.zoom + viewport.value.x,
      y: canvasY * viewport.value.zoom + viewport.value.y
    }
  }

  const startPan = (x: number, y: number) => {
    isPanning.value = true
    panStart.value = { x, y }
    viewportStart.value = { 
      x: viewport.value.x, 
      y: viewport.value.y 
    }
  }

  const updatePan = (x: number, y: number) => {
    if (!isPanning.value) return
    
    viewport.value.x = viewportStart.value.x + (x - panStart.value.x)
    viewport.value.y = viewportStart.value.y + (y - panStart.value.y)
  }

  const endPan = () => {
    isPanning.value = false
  }

  const zoom = (delta: number, centerX: number, centerY: number) => {
    const oldZoom = viewport.value.zoom
    const zoomFactor = delta > 0 ? (1 + zoomStep) : (1 - zoomStep)
    const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * zoomFactor))
    
    if (newZoom === oldZoom) return

    const scale = newZoom / oldZoom
    
    viewport.value.zoom = newZoom
    viewport.value.x = centerX - (centerX - viewport.value.x) * scale
    viewport.value.y = centerY - (centerY - viewport.value.y) * scale
  }

  const resetViewport = () => {
    viewport.value = {
      x: 0,
      y: 0,
      zoom: 1
    }
  }

  const fitToScreen = (contentWidth: number, contentHeight: number) => {
    if (!canvasRef.value) return
    
    const canvas = canvasRef.value
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    const scaleX = canvasWidth / contentWidth
    const scaleY = canvasHeight / contentHeight
    const scale = Math.min(scaleX, scaleY) * 0.9
    
    viewport.value.zoom = scale
    viewport.value.x = (canvasWidth - contentWidth * scale) / 2
    viewport.value.y = (canvasHeight - contentHeight * scale) / 2
  }

  return {
    viewport: computed(() => viewport.value),
    isPanning: computed(() => isPanning.value),
    screenToCanvas,
    canvasToScreen,
    startPan,
    updatePan,
    endPan,
    zoom,
    resetViewport,
    fitToScreen
  }
}