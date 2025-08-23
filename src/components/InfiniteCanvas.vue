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
      class="absolute inset-0 cursor-grab mt-12"
      :class="{
        'cursor-grabbing': isPanning,
        'cursor-crosshair': isSelecting
      }"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
      @dragover.prevent
      @drop="handleDrop"
    />
    
    <div
      v-if="selectionRect"
      class="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none"
      :style="{
        left: `${selectionRect.x}px`,
        top: `${selectionRect.y}px`,
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
import type { Point, ImageItem } from '../types'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(window.innerWidth)
const canvasHeight = ref(window.innerHeight)

const canvas = useCanvas(canvasRef)
const imageManager = useImageManager()
const selection = useSelection()
const dragResize = useDragResize()

const { isPanning, viewport, screenToCanvas, startPan, updatePan, endPan, zoom, resetViewport } = canvas
const { images, selectedImageIds, getImageAt, getImagesInRect, selectImage, clearSelection, toggleImageSelection, removeSelectedImages, selectAll, clearAllImages, addImage } = imageManager
const { isSelecting, selectionRect, startSelection, updateSelection, endSelection } = selection
const { isDragging, isResizing, startDrag, updateDrag, endDrag, getResizeHandle, startResize, updateResize, endResize, getCursor } = dragResize

const handleMouseDown = (e: MouseEvent) => {
  const screenPoint = { x: e.offsetX, y: e.offsetY }
  const canvasPoint = screenToCanvas(e.offsetX, e.offsetY)
  
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    startPan(e.clientX, e.clientY)
    return
  }
  
  if (e.button === 0) {
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
  }
}

const handleMouseMove = (e: MouseEvent) => {
  const screenPoint = { x: e.offsetX, y: e.offsetY }
  const canvasPoint = screenToCanvas(e.offsetX, e.offsetY)
  
  if (isPanning.value) {
    updatePan(e.clientX, e.clientY)
  } else if (isDragging.value) {
    updateDrag(canvasPoint)
  } else if (isResizing.value) {
    updateResize(canvasPoint, e.shiftKey)
  } else if (isSelecting.value) {
    updateSelection(screenPoint)
  } else {
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

const handleMouseUp = (e: MouseEvent) => {
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

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -1 : 1
  zoom(delta, e.offsetX, e.offsetY)
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
  if (e.key === 'Delete' || e.key === 'Backspace') {
    removeSelectedImages()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault()
    imageManager.selectAll()
  } else if (e.key === 'Escape') {
    clearSelection()
    endSelection()
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
  canvasHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('paste', handlePaste)
  window.addEventListener('keydown', handleKeyDown)
  draw()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('paste', handlePaste)
  window.removeEventListener('keydown', handleKeyDown)
})

watch([images, viewport, selectedImageIds], () => {
  
}, { deep: true })
</script>