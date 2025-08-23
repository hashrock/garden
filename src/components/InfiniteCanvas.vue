<template>
  <div class="relative w-full h-full overflow-hidden bg-gray-100">
    <Toolbar
      :images="images"
      :selectedImageIds="selectedImageIds"
      :viewport="viewport"
      :canvasSize="{ width: 10000, height: 10000 }"
      @newProject="handleNewProject"
      @loadProject="handleLoadProject"
      @addImage="handleAddImageFromToolbar"
      @removeSelected="removeSelectedImages"
      @selectAll="selectAll"
      @clearSelection="clearSelection"
      @zoom="handleZoomFromToolbar"
      @resetViewport="resetViewport"
    />
    
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="absolute left-0 right-0 bottom-0 cursor-grab"
      :style="{ top: '48px' }"
      :class="{
        'cursor-grabbing': isPanning,
        'cursor-crosshair': isSelecting
      }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @wheel="handleWheel"
      @dragover.prevent
      @drop="handleDrop"
      style="touch-action: none"
    />
    
    <div
      v-if="selectionRect"
      class="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none"
      :style="{
        left: `${selectionRect.x}px`,
        top: `${selectionRect.y + headerHeight}px`,
        width: `${selectionRect.width}px`,
        height: `${selectionRect.height}px`
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Toolbar from './Toolbar.vue'
import { useCanvas } from '../composables/useCanvas'
import { useImageManager } from '../composables/useImageManager'
import { useSelection } from '../composables/useSelection'
import { useDragResize } from '../composables/useDragResize'
import { useTouch } from '../composables/useTouch'
import { useInputMode } from '../composables/useInputMode'
import type { Point, ImageItem } from '../types'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const headerHeight = 48
const canvasWidth = ref(window.innerWidth)
const canvasHeight = ref(window.innerHeight - headerHeight)

const canvas = useCanvas(canvasRef)
const imageManager = useImageManager()
const selection = useSelection()
const dragResize = useDragResize()
const touch = useTouch()
const inputMode = useInputMode()

const isSpacePressed = ref(false)

const { isPanning, viewport, screenToCanvas, startPan, updatePan, endPan, zoom, resetViewport } = canvas
const { images, selectedImageIds, getImageAt, getImagesInRect, selectImage, clearSelection, toggleImageSelection, removeSelectedImages, selectAll, clearAllImages, addImage } = imageManager
const { isSelecting, selectionRect, startSelection, updateSelection, endSelection } = selection
const { isDragging, isResizing, startDrag, updateDrag, endDrag, getResizeHandle, startResize, updateResize, endResize, getCursor } = dragResize

const handlePointerDown = (e: PointerEvent) => {
  if (!canvasRef.value) return
  canvasRef.value.setPointerCapture(e.pointerId)
  
  const config = inputMode.getInputConfig()
  
  touch.addPointer(e)
  
  // タッチジェスチャーが有効な場合のピンチ処理
  if (config.enableTouchGestures && touch.pointerCount.value === 2) {
    endPan()
    endDrag()
    endResize()
    endSelection()
    touch.startPinch(viewport.value.zoom)
    return
  }
  
  if (touch.pointerCount.value > 2) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)
  
  // パン操作の判定
  const shouldPan = 
    (config.enableMiddleButtonPan && e.button === 1) ||
    (config.enableAltPan && e.button === 0 && e.altKey) ||
    (config.enableSpacePan && e.button === 0 && isSpacePressed.value)
  
  if (shouldPan) {
    startPan(e.clientX, e.clientY)
    return
  }
  
  if (e.button === 0 && e.pointerType !== 'touch') {
    const clickedImage = getImageAt(canvasPoint)
    
    if (clickedImage) {
      const handle = getResizeHandle(clickedImage, canvasPoint)
      
      if (handle && selectedImageIds.value.has(clickedImage.id)) {
        startResize(clickedImage, handle, canvasPoint)
      } else {
        if (e.ctrlKey || e.metaKey) {
          toggleImageSelection(clickedImage.id)
        } else if (!selectedImageIds.value.has(clickedImage.id)) {
          selectImage(clickedImage.id, false)
        }
        
        const selectedImages = images.value.filter(img => selectedImageIds.value.has(img.id))
        startDrag(clickedImage, canvasPoint, selectedImages)
      }
    } else {
      if (!e.ctrlKey && !e.metaKey) {
        clearSelection()
      }
      startSelection(screenPoint)
    }
  } else if (e.pointerType === 'touch') {
    const clickedImage = getImageAt(canvasPoint)
    
    if (clickedImage) {
      if (!selectedImageIds.value.has(clickedImage.id)) {
        selectImage(clickedImage.id, false)
      }
      const selectedImages = images.value.filter(img => selectedImageIds.value.has(img.id))
      startDrag(clickedImage, canvasPoint, selectedImages)
    } else {
      startPan(e.clientX, e.clientY)
    }
  }
}

const handlePointerMove = (e: PointerEvent) => {
  if (!canvasRef.value) return
  
  const config = inputMode.getInputConfig()
  
  touch.updatePointer(e)
  
  if (config.enableTouchGestures && touch.isPinching.value) {
    const pinchData = touch.updatePinch()
    if (pinchData) {
      const initialZoom = touch.initialPinchZoom
      const newZoom = initialZoom.value * pinchData.scale
      const clampedZoom = Math.max(0.1, Math.min(5, newZoom))
      viewport.value.zoom = clampedZoom
      
      const rect = canvasRef.value.getBoundingClientRect()
      const centerX = pinchData.center.x - rect.left
      const centerY = pinchData.center.y - rect.top
      
      const scale = clampedZoom / initialZoom.value
      viewport.value.x = centerX - (centerX - viewport.value.x) * scale
      viewport.value.y = centerY - (centerY - viewport.value.y) * scale
    }
    return
  }
  
  const rect = canvasRef.value.getBoundingClientRect()
  const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)
  
  if (isPanning.value) {
    updatePan(e.clientX, e.clientY)
  } else if (isDragging.value) {
    updateDrag(canvasPoint)
  } else if (isResizing.value) {
    updateResize(canvasPoint, e.shiftKey)
  } else if (isSelecting.value) {
    updateSelection(screenPoint)
  } else if (e.pointerType !== 'touch') {
    const hoveredImage = getImageAt(canvasPoint)
    if (hoveredImage && selectedImageIds.value.has(hoveredImage.id)) {
      const handle = getResizeHandle(hoveredImage, canvasPoint)
      if (canvasRef.value) {
        canvasRef.value.style.cursor = handle ? getCursor(handle) : 'move'
      }
    } else if (canvasRef.value) {
      canvasRef.value.style.cursor = 'grab'
    }
  }
}

const handlePointerUp = (e: PointerEvent) => {
  if (!canvasRef.value) return
  canvasRef.value.releasePointerCapture(e.pointerId)
  
  touch.removePointer(e)
  
  if (touch.isPinching.value && touch.pointerCount.value < 2) {
    touch.endPinch()
  }
  
  if (touch.pointerCount.value > 0) return
  
  if (isPanning.value) {
    endPan()
  } else if (isDragging.value) {
    endDrag()
  } else if (isResizing.value) {
    endResize()
  } else if (isSelecting.value && selectionRect.value) {
    const rect = selectionRect.value
    const canvasRect = {
      x: screenToCanvas(rect.x, rect.y).x,
      y: screenToCanvas(rect.x, rect.y).y,
      width: rect.width / viewport.value.zoom,
      height: rect.height / viewport.value.zoom
    }
    
    const selectedImages = getImagesInRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height)
    
    if (!e.ctrlKey && !e.metaKey) {
      clearSelection()
    }
    
    selectedImages.forEach(img => {
      selectImage(img.id, true)
    })
    
    endSelection()
  }
}

const handlePointerCancel = (e: PointerEvent) => {
  if (!canvasRef.value) return
  canvasRef.value.releasePointerCapture(e.pointerId)
  
  touch.removePointer(e)
  
  if (touch.pointerCount.value === 0) {
    touch.clearPointers()
    endPan()
    endDrag()
    endResize()
    endSelection()
  }
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  if (!canvasRef.value) return
  const config = inputMode.getInputConfig()
  const rect = canvasRef.value.getBoundingClientRect()
  const offsetX = e.clientX - rect.left
  const offsetY = e.clientY - rect.top
  
  // トラックパッドモード: Ctrl+ホイールでズーム
  if (config.enableCtrlWheelZoom && e.ctrlKey) {
    const pinchData = touch.handleTrackpadPinch(e)
    if (pinchData) {
      const currentZoom = viewport.value.zoom
      const newZoom = currentZoom * pinchData.scale
      const clampedZoom = Math.max(0.1, Math.min(5, newZoom))
      
      const scale = clampedZoom / currentZoom
      viewport.value.zoom = clampedZoom
      viewport.value.x = offsetX - (offsetX - viewport.value.x) * scale
      viewport.value.y = offsetY - (offsetY - viewport.value.y) * scale
    }
  } 
  // マウスモード: ホイールでズーム（Ctrlなし）
  else if (config.enableWheelZoom && !e.ctrlKey) {
    const delta = e.deltaY > 0 ? -1 : 1
    zoom(delta, offsetX, offsetY)
  }
  // トラックパッドモードで2本指スクロール（パン）
  else if (config.enableTwoFingerPan && !e.ctrlKey) {
    viewport.value.x -= e.deltaX
    viewport.value.y -= e.deltaY
  }
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files || [])
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  
  const dropPoint = screenToCanvas(e.offsetX, e.offsetY)
  
  for (const file of imageFiles) {
    await imageManager.addImage(file, dropPoint)
  }
}

const handlePaste = async (e: ClipboardEvent) => {
  const items = Array.from(e.clipboardData?.items || [])
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      if (blob) {
        const centerPoint = screenToCanvas(canvasWidth.value / 2, canvasHeight.value / 2)
        await imageManager.addImage(blob, centerPoint)
      }
    }
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault()
    isSpacePressed.value = true
    if (canvasRef.value) {
      canvasRef.value.style.cursor = 'grab'
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    removeSelectedImages()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault()
    imageManager.selectAll()
  } else if (e.key === 'Escape') {
    clearSelection()
    endSelection()
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === ' ' || e.key === 'Space') {
    isSpacePressed.value = false
    if (canvasRef.value && !isPanning.value) {
      canvasRef.value.style.cursor = 'default'
    }
  }
}

const handleNewProject = () => {
  clearAllImages()
  resetViewport()
}

const handleLoadProject = (loadedImages: ImageItem[], loadedViewport: any) => {
  clearAllImages()
  loadedImages.forEach(img => {
    images.value.push(img)
  })
  if (loadedViewport) {
    canvas.viewport.value = loadedViewport
  }
}

const handleAddImageFromToolbar = async (file: File, position: Point) => {
  const canvasPosition = screenToCanvas(position.x, position.y)
  await addImage(file, canvasPosition)
}

const handleZoomFromToolbar = (delta: number, centerX: number, centerY: number) => {
  zoom(delta, centerX, centerY)
}

const draw = () => {
  if (!canvasRef.value) return
  
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  ctx.save()
  ctx.translate(viewport.value.x, viewport.value.y)
  ctx.scale(viewport.value.zoom, viewport.value.zoom)
  
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, 10000, 10000)
  
  const pattern = 20
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  
  for (let x = 0; x <= 10000; x += pattern) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 10000)
    ctx.stroke()
  }
  
  for (let y = 0; y <= 10000; y += pattern) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(10000, y)
    ctx.stroke()
  }
  
  const sortedImages = [...images.value].sort((a, b) => a.zIndex - b.zIndex)
  
  for (const image of sortedImages) {
    const img = new Image()
    img.src = image.dataUrl
    
    if (img.complete) {
      ctx.drawImage(
        img,
        image.position.x,
        image.position.y,
        image.size.width,
        image.size.height
      )
      
      if (selectedImageIds.value.has(image.id)) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2 / viewport.value.zoom
        ctx.strokeRect(
          image.position.x,
          image.position.y,
          image.size.width,
          image.size.height
        )
        
        const handleSize = 8 / viewport.value.zoom
        ctx.fillStyle = '#3b82f6'
        
        const handles = [
          { x: image.position.x, y: image.position.y },
          { x: image.position.x + image.size.width / 2, y: image.position.y },
          { x: image.position.x + image.size.width, y: image.position.y },
          { x: image.position.x + image.size.width, y: image.position.y + image.size.height / 2 },
          { x: image.position.x + image.size.width, y: image.position.y + image.size.height },
          { x: image.position.x + image.size.width / 2, y: image.position.y + image.size.height },
          { x: image.position.x, y: image.position.y + image.size.height },
          { x: image.position.x, y: image.position.y + image.size.height / 2 }
        ]
        
        handles.forEach(handle => {
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          )
        })
      }
    }
  }
  
  ctx.restore()
  
  requestAnimationFrame(draw)
}

const handleResize = () => {
  canvasWidth.value = window.innerWidth
  canvasHeight.value = window.innerHeight - headerHeight
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('paste', handlePaste)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  draw()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('paste', handlePaste)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

watch([images, viewport, selectedImageIds], () => {
  
}, { deep: true })
</script>