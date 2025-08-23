<template>
  <div class="relative w-full h-full overflow-hidden bg-gray-100">
    <Toolbar
      :images="images"
      :artboards="artboards"
      :selectedImageIds="selectedImageIds"
      :selectedArtboardIds="selectedArtboardIds"
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
      @createArtboard="handleCreateArtboard"
      @deleteArtboard="handleDeleteArtboard"
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
      @contextmenu.prevent
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
import { useImageCache } from '../composables/useImageCache'
import { useArtboardManager } from '../composables/useArtboardManager'
import type { Point, ImageItem, Artboard } from '../types'

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
const imageCache = useImageCache()
const artboardManager = useArtboardManager()

const isSpacePressed = ref(false)
const animationFrameId = ref<number | null>(null)

const { isPanning, viewport, screenToCanvas, startPan, updatePan, endPan, zoom, resetViewport } = canvas
const { images, selectedImageIds, getImageAt, getImagesInRect, selectImage, clearSelection, toggleImageSelection, removeSelectedImages, selectAll, clearAllImages, addImage } = imageManager
const { isSelecting, selectionRect, startSelection, updateSelection, endSelection } = selection
const { isDragging, isDraggingArtboard, isResizing, isResizingArtboard, startDrag, updateDrag, endDrag, startDragArtboard, updateDragArtboard, getResizeHandle, startResize, updateResize, endResize, startResizeArtboard, updateResizeArtboard, getCursor } = dragResize
const { artboards, selectedArtboardIds, getArtboardAt, getArtboardNameAt, selectArtboard, clearArtboardSelection, createArtboardFromSelection, removeItemsFromArtboard, moveArtboardChildren, autoResizeArtboard, createArtboard } = artboardManager

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
    (config.enableRightButtonPan && e.button === 2) ||
    (config.enableAltPan && e.button === 0 && e.altKey) ||
    (config.enableSpacePan && e.button === 0 && isSpacePressed.value)
  
  if (shouldPan) {
    startPan(e.clientX, e.clientY)
    return
  }
  
  if (e.button === 0 && e.pointerType !== 'touch') {
    const clickedArtboard = getArtboardAt(canvasPoint)
    const clickedImage = getImageAt(canvasPoint)
    
    // Check for artboard resize handle (with larger hit area)
    if (clickedArtboard && selectedArtboardIds.value.has(clickedArtboard.id)) {
      const handle = artboardManager.getResizeHandle(clickedArtboard, canvasPoint, 20)
      if (handle) {
        startResizeArtboard(clickedArtboard, handle, canvasPoint)
        return
      }
    }
    
    if (clickedArtboard && !clickedImage) {
      if (e.ctrlKey || e.metaKey) {
        if (selectedArtboardIds.value.has(clickedArtboard.id)) {
          artboardManager.deselectArtboard(clickedArtboard.id)
        } else {
          selectArtboard(clickedArtboard.id, true)
        }
      } else {
        clearSelection()
        clearArtboardSelection()
        selectArtboard(clickedArtboard.id)
      }
      
      const selectedArtboards = artboards.value.filter(a => selectedArtboardIds.value.has(a.id))
      if (selectedArtboards.length > 0) {
        dragResize.startDragArtboard(clickedArtboard, canvasPoint, selectedArtboards)
      }
    } else if (clickedImage) {
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
        clearArtboardSelection()
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
  } else if (isDraggingArtboard.value) {
    updateDragArtboard(canvasPoint, images.value)
  } else if (isDragging.value) {
    updateDrag(canvasPoint)
    
    // Visual feedback: highlight target artboard
    const targetArtboard = getArtboardAt(canvasPoint)
    artboards.value.forEach(artboard => {
      // Reset all artboards' drop target state
      artboard.isDropTarget = false
    })
    if (targetArtboard) {
      // Mark as drop target
      targetArtboard.isDropTarget = true
    }
  } else if (isResizingArtboard.value) {
    updateResizeArtboard(canvasPoint, e.shiftKey)
  } else if (isResizing.value) {
    updateResize(canvasPoint, e.shiftKey)
  } else if (isSelecting.value) {
    updateSelection(screenPoint)
  } else if (e.pointerType !== 'touch') {
    // Check for artboard resize handle hover
    const hoveredArtboard = getArtboardAt(canvasPoint)
    if (hoveredArtboard && selectedArtboardIds.value.has(hoveredArtboard.id)) {
      const artboardHandle = artboardManager.getResizeHandle(hoveredArtboard, canvasPoint, 20)
      if (artboardHandle && canvasRef.value) {
        canvasRef.value.style.cursor = getCursor(artboardHandle)
        return
      }
    }
    
    // Check for image resize handle hover
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
  } else if (isDraggingArtboard.value) {
    endDrag()
  } else if (isDragging.value) {
    // Check if image was dropped on an artboard
    const rect = canvasRef.value.getBoundingClientRect()
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)
    
    // Find which artboard the image is over
    const targetArtboard = getArtboardAt(canvasPoint)
    
    // Update image artboard assignment
    const draggedImages = images.value.filter(img => selectedImageIds.value.has(img.id))
    draggedImages.forEach(img => {
      // Remove from previous artboard
      if (img.artboardId) {
        const prevArtboard = artboards.value.find(a => a.id === img.artboardId)
        if (prevArtboard) {
          artboardManager.removeFromArtboard(prevArtboard.id, [img.id])
        }
      }
      
      // Add to new artboard
      if (targetArtboard) {
        img.artboardId = targetArtboard.id
        artboardManager.addToArtboard(targetArtboard.id, [img.id])
        // Auto-resize the artboard to fit the new image
        autoResizeArtboard(targetArtboard.id, images.value)
      } else {
        // Remove from artboard if dropped outside
        delete img.artboardId
      }
    })
    
    // Clear drop target state
    artboards.value.forEach(artboard => {
      artboard.isDropTarget = false
    })
    
    endDrag()
  } else if (isResizingArtboard.value) {
    endResize()
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
    
    // Clear drop target state
    artboards.value.forEach(artboard => {
      artboard.isDropTarget = false
    })
    
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
  
  // Ctrl+ホイールでピンチズーム（トラックパッドのピンチジェスチャー）
  if (e.ctrlKey && config.enableCtrlWheelZoom) {
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
  // マウスモード: 通常のホイールでズーム
  else if (!e.ctrlKey && config.enableWheelZoom) {
    const delta = e.deltaY > 0 ? -1 : 1
    zoom(delta, offsetX, offsetY)
  }
  // トラックパッドモード: 2本指スワイプでパン
  else if (!e.ctrlKey && config.enableTwoFingerPan) {
    // deltaX/deltaYでパン操作
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
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    // Create new artboard at center of viewport
    const centerX = (canvasWidth.value / 2 - viewport.value.x) / viewport.value.zoom
    const centerY = (canvasHeight.value / 2 - viewport.value.y) / viewport.value.zoom
    const artboard = createArtboard(
      `Artboard ${artboards.value.length + 1}`,
      { x: centerX - 400, y: centerY - 300 },
      { width: 800, height: 600 }
    )
    clearSelection()
    clearArtboardSelection()
    selectArtboard(artboard.id)
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
  imageCache.clearCache()
}

const handleLoadProject = (loadedImages: ImageItem[], loadedViewport: any) => {
  clearAllImages()
  imageCache.clearCache()
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

const handleCreateArtboard = () => {
  const centerX = (canvasWidth.value / 2 - viewport.value.x) / viewport.value.zoom
  const centerY = (canvasHeight.value / 2 - viewport.value.y) / viewport.value.zoom
  const artboard = createArtboard(
    `Artboard ${artboards.value.length + 1}`,
    { x: centerX - 400, y: centerY - 300 },
    { width: 800, height: 600 }
  )
  clearSelection()
  clearArtboardSelection()
  selectArtboard(artboard.id)
}

const handleDeleteArtboard = () => {
  selectedArtboardIds.value.forEach(artboardId => {
    removeItemsFromArtboard(artboardId, images.value)
  })
  clearArtboardSelection()
}

const draw = () => {
  if (!canvasRef.value) return
  
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  ctx.save()
  ctx.translate(viewport.value.x, viewport.value.y)
  ctx.scale(viewport.value.zoom, viewport.value.zoom)
  
  // Canvas background (light gray)
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, 10000, 10000)
  
  // Draw artboards
  const sortedArtboards = [...artboards.value].sort((a, b) => a.zIndex - b.zIndex)
  for (const artboard of sortedArtboards) {
    // Artboard background
    ctx.fillStyle = artboard.backgroundColor || '#ffffff'
    ctx.fillRect(
      artboard.position.x,
      artboard.position.y,
      artboard.size.width,
      artboard.size.height
    )
    
    // Artboard grid
    const gridSize = 20
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 0.5 / viewport.value.zoom
    
    // Clip to artboard bounds
    ctx.save()
    ctx.beginPath()
    ctx.rect(
      artboard.position.x,
      artboard.position.y,
      artboard.size.width,
      artboard.size.height
    )
    ctx.clip()
    
    // Draw grid lines
    for (let x = artboard.position.x; x <= artboard.position.x + artboard.size.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, artboard.position.y)
      ctx.lineTo(x, artboard.position.y + artboard.size.height)
      ctx.stroke()
    }
    
    for (let y = artboard.position.y; y <= artboard.position.y + artboard.size.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(artboard.position.x, y)
      ctx.lineTo(artboard.position.x + artboard.size.width, y)
      ctx.stroke()
    }
    
    ctx.restore()
    
    // Artboard border
    ctx.strokeStyle = artboard.isDropTarget ? '#3b82f6' : (artboard.borderColor || '#e0e0e0')
    ctx.lineWidth = artboard.isDropTarget ? 2 / viewport.value.zoom : 1 / viewport.value.zoom
    ctx.strokeRect(
      artboard.position.x,
      artboard.position.y,
      artboard.size.width,
      artboard.size.height
    )
    
    // Artboard name (inside the artboard, top-left corner)
    ctx.fillStyle = '#666'
    ctx.font = `${12 / viewport.value.zoom}px sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(
      artboard.name,
      artboard.position.x + 10 / viewport.value.zoom,
      artboard.position.y + 10 / viewport.value.zoom
    )
    
    // Selection state
    if (selectedArtboardIds.value.has(artboard.id)) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2 / viewport.value.zoom
      ctx.strokeRect(
        artboard.position.x,
        artboard.position.y,
        artboard.size.width,
        artboard.size.height
      )
      
      // Draw resize handles
      if (selectedArtboardIds.value.size === 1) {
        const handleSize = 8 / viewport.value.zoom
        ctx.fillStyle = '#3b82f6'
        
        const handles = [
          { x: artboard.position.x, y: artboard.position.y },
          { x: artboard.position.x + artboard.size.width / 2, y: artboard.position.y },
          { x: artboard.position.x + artboard.size.width, y: artboard.position.y },
          { x: artboard.position.x + artboard.size.width, y: artboard.position.y + artboard.size.height / 2 },
          { x: artboard.position.x + artboard.size.width, y: artboard.position.y + artboard.size.height },
          { x: artboard.position.x + artboard.size.width / 2, y: artboard.position.y + artboard.size.height },
          { x: artboard.position.x, y: artboard.position.y + artboard.size.height },
          { x: artboard.position.x, y: artboard.position.y + artboard.size.height / 2 }
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
  
  // 画像の描画（キャッシュを使用）
  const sortedImages = [...images.value].sort((a, b) => a.zIndex - b.zIndex)
  let needsRedraw = false
  
  for (const image of sortedImages) {
    const cachedImg = imageCache.getImage(image.id, image.dataUrl)
    
    if (cachedImg && cachedImg.complete) {
      ctx.drawImage(
        cachedImg,
        image.position.x,
        image.position.y,
        image.size.width,
        image.size.height
      )
      
      // 選択状態の描画
      if (selectedImageIds.value.has(image.id)) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2 / viewport.value.zoom
        ctx.strokeRect(
          image.position.x,
          image.position.y,
          image.size.width,
          image.size.height
        )
        
        // リサイズハンドルの描画
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
    } else {
      // 画像がまだ読み込まれていない場合は再描画が必要
      needsRedraw = true
    }
  }
  
  ctx.restore()
  
  // 再描画のスケジューリング
  animationFrameId.value = requestAnimationFrame(draw)
  
  // 画像が読み込み中の場合は少し待ってから再描画
  if (needsRedraw) {
    setTimeout(() => {
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value)
      }
      animationFrameId.value = requestAnimationFrame(draw)
    }, 16)
  }
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
  
  // Create default artboard if none exists
  if (artboards.value.length === 0) {
    const centerX = (canvasWidth.value / 2 - viewport.value.x) / viewport.value.zoom
    const centerY = (canvasHeight.value / 2 - viewport.value.y) / viewport.value.zoom
    createArtboard(
      'Artboard 1',
      { x: centerX - 400, y: centerY - 300 },
      { width: 800, height: 600 }
    )
  }
  
  // 初回描画の開始
  animationFrameId.value = requestAnimationFrame(draw)
})

onUnmounted(() => {
  // アニメーションフレームのキャンセル
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  
  // イベントリスナーの削除
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('paste', handlePaste)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  
  // 画像キャッシュのクリア
  imageCache.clearCache()
})

watch([images, viewport, selectedImageIds], () => {
  
}, { deep: true })
</script>