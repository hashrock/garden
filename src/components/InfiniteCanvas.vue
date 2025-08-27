<template>
  <div class="relative w-full h-full overflow-hidden bg-gray-100">
    <FloatingToolbar
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
      class="absolute inset-0 cursor-grab"
      :class="{
        'cursor-grabbing': isPanning,
        'cursor-crosshair': isSelecting
      }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @wheel="handleWheel"
      @contextmenu="handleContextMenu"
      @dblclick="handleDoubleClick"
      @dragover.prevent
      @drop="handleDrop"
      style="touch-action: none"
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
    
    <!-- Empty State -->
    <div
      v-if="images.length === 0 && artboards.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <button
        @click="handleAddImageFromEmpty"
        class="pointer-events-auto px-6 py-3 bg-white/90 backdrop-blur border border-gray-200 rounded-xl hover:bg-white transition-colors flex items-center gap-2 shadow-sm"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-gray-700 font-medium">Add Image to Get Started</span>
      </button>
    </div>
    
    <!-- Context Menu -->
    <ContextMenu
      v-if="showContextMenu"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :hasSelection="selectedImageIds.size > 0 || selectedArtboardIds.size > 0"
      :hasImageSelection="selectedImageIds.size > 0"
      :hasArtboardSelection="selectedArtboardIds.size > 0"
      :imageCount="selectedImageIds.size"
      @close="showContextMenu = false"
      @addImage="handleAddImageFromContext"
      @paste="handlePaste"
      @delete="handleDeleteFromContext"
      @createArtboard="handleCreateArtboard"
      @editDescription="handleEditDescription"
      @tidyImages="handleTidyImages"
      @renameArtboard="handleRenameArtboard"
      @exportAsHtml="handleExportAsHtml"
    />
    
    <!-- Image Text Editor -->
    <ImageTextEditor
      v-if="editingImage"
      :editingImage="editingImage"
      :position="textEditorPosition"
      @save="handleSaveImageText"
      @close="editingImage = null"
    />
    
    <!-- Artboard Name Editor -->
    <ArtboardNameEditor
      v-if="editingArtboard"
      :editingArtboard="editingArtboard"
      :position="artboardEditorPosition"
      @save="handleSaveArtboardName"
      @close="editingArtboard = null"
    />
    
    <!-- Tidy Suggestion -->
    <TidySuggestion
      :show="showTidySuggestion"
      :imageCount="recentlyAddedImages.length"
      @tidy="handleTidySuggestion"
      @dismiss="dismissTidySuggestion"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import FloatingToolbar from './FloatingToolbar.vue'
import ContextMenu from './ContextMenu.vue'
import ImageTextEditor from './ImageTextEditor.vue'
import ArtboardNameEditor from './ArtboardNameEditor.vue'
import TidySuggestion from './TidySuggestion.vue'
import { useCanvas } from '../composables/useCanvas'
import { useImageManager } from '../composables/useImageManager'
import { useSelection } from '../composables/useSelection'
import { useDragResize } from '../composables/useDragResize'
import { useTouch } from '../composables/useTouch'
import { useInputMode } from '../composables/useInputMode'
import { useImageCache } from '../composables/useImageCache'
import { useArtboardManager } from '../composables/useArtboardManager'
import { useArtboardColorManager } from '../composables/useArtboardColorManager'
import { useHtmlExport } from '../composables/useHtmlExport'
import { useSkylinePacker } from '../composables/useSkylinePacker'
import type { Point, ImageItem, ResizeHandle, Viewport, Artboard } from '../types'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(window.innerWidth)
const canvasHeight = ref(window.innerHeight)

const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

const editingImage = ref<ImageItem | null>(null)
const textEditorPosition = ref({ x: 0, y: 0 })
const editingArtboard = ref<Artboard | null>(null)
const artboardEditorPosition = ref({ x: 0, y: 0 })
const showTidySuggestion = ref(false)
const recentlyAddedImages = ref<ImageItem[]>([])

const canvas = useCanvas(canvasRef)

// Initialize artboard color manager first
let updateArtboardColorsCallback: ((artboardId: string) => void) | undefined

// Create artboard manager with color update callback
const artboardManager = useArtboardManager((artboardId) => {
  if (updateArtboardColorsCallback) {
    updateArtboardColorsCallback(artboardId)
  }
})

const imageManager = useImageManager(artboardManager.getArtboardAt, artboardManager.addToArtboard)
const selection = useSelection()
const dragResize = useDragResize()
const touch = useTouch()
const inputMode = useInputMode()
const imageCache = useImageCache()
const { exportAsHtmlArchive } = useHtmlExport()
const { tidyImages } = useSkylinePacker()

const isSpacePressed = ref(false)
const animationFrameId = ref<number | null>(null)

const { isPanning, viewport, screenToCanvas, startPan, updatePan, endPan, zoom, resetViewport } = canvas
const { images, selectedImageIds, getImageAt, getImagesInRect, selectImage, clearSelection, toggleImageSelection, removeSelectedImages, clearAllImages, addImage } = imageManager
const { isSelecting, selectionRect, startSelection, updateSelection, endSelection } = selection
const { isDragging, isDraggingArtboard, isResizing, isResizingArtboard, startDrag, updateDrag, endDrag, updateDragArtboard, getResizeHandle, startResize, updateResize, endResize, startResizeArtboard, updateResizeArtboard, getCursor } = dragResize
const { artboards, selectedArtboardIds, getArtboardAt, selectArtboard, clearArtboardSelection, autoResizeArtboard, createArtboard } = artboardManager

// Initialize artboard color manager
const { updateArtboardColors } = useArtboardColorManager(artboards, images)
updateArtboardColorsCallback = updateArtboardColors

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
        startResizeArtboard(clickedArtboard, handle as ResizeHandle, canvasPoint)
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
      const handle = getResizeHandle(clickedImage, canvasPoint, 25)
      
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
    updateResizeArtboard(canvasPoint)
  } else if (isResizing.value) {
    updateResize(canvasPoint, !e.shiftKey)
  } else if (isSelecting.value) {
    updateSelection(screenPoint)
  } else if (e.pointerType !== 'touch') {
    // Check for artboard resize handle hover
    const hoveredArtboard = getArtboardAt(canvasPoint)
    if (hoveredArtboard && selectedArtboardIds.value.has(hoveredArtboard.id)) {
      const artboardHandle = artboardManager.getResizeHandle(hoveredArtboard, canvasPoint, 20)
      if (artboardHandle && canvasRef.value) {
        canvasRef.value.style.cursor = getCursor(artboardHandle as ResizeHandle)
        return
      }
    }
    
    // Check for image resize handle hover
    const hoveredImage = getImageAt(canvasPoint)
    if (hoveredImage && selectedImageIds.value.has(hoveredImage.id)) {
      const handle = getResizeHandle(hoveredImage, canvasPoint, 25)
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
  const addedImages: ImageItem[] = []
  
  for (let i = 0; i < imageFiles.length; i++) {
    const image = await imageManager.addImage(imageFiles[i], dropPoint, i)
    if (image) {
      addedImages.push(image)
    }
  }
  
  // Show tidy suggestion for multiple dropped images
  if (addedImages.length > 1) {
    recentlyAddedImages.value = addedImages
    showTidySuggestion.value = true
  }
}

const handlePasteEvent = async (e: ClipboardEvent) => {
  const items = Array.from(e.clipboardData?.items || [])
  const centerPoint = screenToCanvas(canvasWidth.value / 2, canvasHeight.value / 2)
  const addedImages: ImageItem[] = []
  
  let imageIndex = 0
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      if (blob) {
        const image = await imageManager.addImage(blob, centerPoint, imageIndex++)
        if (image) {
          addedImages.push(image)
        }
      }
    }
  }
  
  // Show tidy suggestion for multiple pasted images
  if (addedImages.length > 1) {
    recentlyAddedImages.value = addedImages
    showTidySuggestion.value = true
  }
}

// For context menu paste action
const handlePaste = () => {
  // Create a fake paste event or use navigator.clipboard API
  navigator.clipboard.read?.().then(async (items) => {
    const centerPoint = screenToCanvas(canvasWidth.value / 2, canvasHeight.value / 2)
    const addedImages: ImageItem[] = []
    
    let imageIndex = 0
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          const image = await imageManager.addImage(blob as File, centerPoint, imageIndex++)
          if (image) {
            addedImages.push(image)
          }
        }
      }
    }
    
    // Show tidy suggestion for multiple pasted images
    if (addedImages.length > 1) {
      recentlyAddedImages.value = addedImages
      showTidySuggestion.value = true
    }
  }).catch(() => {
    // Fallback: prompt user to use Ctrl+V
    console.log('Please use Ctrl+V or Cmd+V to paste images')
  })
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault()
    isSpacePressed.value = true
    if (canvasRef.value) {
      canvasRef.value.style.cursor = 'grab'
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    // Delete selected images
    if (selectedImageIds.value.size > 0) {
      removeSelectedImages()
    }
    // Delete selected artboards
    if (selectedArtboardIds.value.size > 0) {
      handleDeleteArtboard()
    }
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

const handleLoadProject = (loadedImages: ImageItem[], loadedViewport: Viewport) => {
  clearAllImages()
  imageCache.clearCache()
  loadedImages.forEach(img => {
    images.value.push(img)
  })
  if (loadedViewport) {
    viewport.value.x = loadedViewport.x
    viewport.value.y = loadedViewport.y
    viewport.value.zoom = loadedViewport.zoom
  }
}

const handleAddImageFromToolbar = async (file: File, position: Point) => {
  const canvasPosition = screenToCanvas(position.x, position.y)
  await addImage(file, canvasPosition)
}

const handleZoomFromToolbar = (delta: number, centerX: number, centerY: number) => {
  zoom(delta, centerX, centerY)
}

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  showContextMenu.value = true
  contextMenuPosition.value = { x: e.clientX, y: e.clientY }
}

const handleAddImageFromContext = () => {
  showContextMenu.value = false
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = async (event) => {
    const files = Array.from((event.target as HTMLInputElement).files || [])
    const centerPoint = screenToCanvas(canvasWidth.value / 2, canvasHeight.value / 2)
    const addedImages: ImageItem[] = []
    
    for (let i = 0; i < files.length; i++) {
      const image = await imageManager.addImage(files[i], centerPoint, i)
      if (image) {
        addedImages.push(image)
      }
    }
    
    // Show tidy suggestion for bulk uploads
    if (addedImages.length > 1) {
      recentlyAddedImages.value = addedImages
      showTidySuggestion.value = true
    }
  }
  input.click()
}

const handleDeleteFromContext = () => {
  showContextMenu.value = false
  if (selectedImageIds.value.size > 0) {
    removeSelectedImages()
  }
  if (selectedArtboardIds.value.size > 0) {
    handleDeleteArtboard()
  }
}

const handleAddImageFromEmpty = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = async (event) => {
    const files = Array.from((event.target as HTMLInputElement).files || [])
    const centerPoint = screenToCanvas(canvasWidth.value / 2, canvasHeight.value / 2)
    const addedImages: ImageItem[] = []
    
    for (let i = 0; i < files.length; i++) {
      const image = await imageManager.addImage(files[i], centerPoint, i)
      if (image) {
        addedImages.push(image)
      }
    }
    
    // Show tidy suggestion for multiple images
    if (addedImages.length > 1) {
      recentlyAddedImages.value = addedImages
      showTidySuggestion.value = true
    }
  }
  input.click()
}

const handleSaveImageText = (title: string, description: string) => {
  if (editingImage.value) {
    editingImage.value.title = title
    editingImage.value.description = description
    editingImage.value.showText = title || description ? true : false
    editingImage.value = null
  }
}

const handleDoubleClick = (e: MouseEvent) => {
  if (!canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)
  
  const clickedImage = getImageAt(canvasPoint)
  
  if (clickedImage) {
    // Select the image first
    selectImage(clickedImage.id, false)
    
    // Calculate position for text editor (below the image)
    const screenX = clickedImage.position.x * viewport.value.zoom + viewport.value.x + rect.left
    const screenY = (clickedImage.position.y + clickedImage.size.height + 10) * viewport.value.zoom + viewport.value.y + rect.top
    
    textEditorPosition.value = {
      x: screenX,
      y: screenY
    }
    
    editingImage.value = clickedImage
    clickedImage.showText = true
  }
}

const handleEditDescription = () => {
  showContextMenu.value = false
  
  if (selectedImageIds.value.size === 1) {
    const imageId = Array.from(selectedImageIds.value)[0]
    const image = images.value.find(img => img.id === imageId)
    
    if (image) {
      // Calculate position for text editor (below the image)
      const rect = canvasRef.value?.getBoundingClientRect()
      if (!rect) return
      
      const screenX = image.position.x * viewport.value.zoom + viewport.value.x + rect.left
      const screenY = (image.position.y + image.size.height + 10) * viewport.value.zoom + viewport.value.y + rect.top
      
      textEditorPosition.value = {
        x: screenX,
        y: screenY
      }
      
      editingImage.value = image
      image.showText = true
    }
  }
}


const handleCreateArtboard = () => {
  showContextMenu.value = false
  
  // If images are selected, create artboard around them
  if (selectedImageIds.value.size > 0) {
    const selectedImages = images.value.filter(img => selectedImageIds.value.has(img.id))
    
    if (selectedImages.length > 0) {
      // Calculate bounding box of selected images
      const minX = Math.min(...selectedImages.map(img => img.position.x))
      const minY = Math.min(...selectedImages.map(img => img.position.y))
      const maxX = Math.max(...selectedImages.map(img => img.position.x + img.size.width))
      const maxY = Math.max(...selectedImages.map(img => img.position.y + img.size.height))
      
      const padding = 40
      const artboard = createArtboard(
        `Artboard ${artboards.value.length + 1}`,
        { x: minX - padding, y: minY - padding },
        { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 }
      )
      
      // Assign images to the new artboard
      selectedImages.forEach(img => {
        img.artboardId = artboard.id
      })
      artboardManager.addToArtboard(artboard.id, selectedImages.map(img => img.id))
      
      clearSelection()
      clearArtboardSelection()
      selectArtboard(artboard.id)
    }
  } else {
    // Default behavior: create empty artboard at center
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
}

const handleDeleteArtboard = () => {
  selectedArtboardIds.value.forEach(artboardId => {
    artboardManager.removeItemsFromArtboard(artboardId, images.value)
  })
  clearArtboardSelection()
}

const handleRenameArtboard = () => {
  showContextMenu.value = false
  
  if (selectedArtboardIds.value.size > 0) {
    const artboardId = Array.from(selectedArtboardIds.value)[0]
    const artboard = artboards.value.find(a => a.id === artboardId)
    
    if (artboard) {
      // Calculate position for name editor (center of artboard)
      const rect = canvasRef.value?.getBoundingClientRect()
      if (!rect) return
      
      const screenX = artboard.position.x * viewport.value.zoom + viewport.value.x + rect.left
      const screenY = artboard.position.y * viewport.value.zoom + viewport.value.y + rect.top
      
      artboardEditorPosition.value = {
        x: screenX,
        y: screenY
      }
      
      editingArtboard.value = artboard
    }
  }
}

const handleSaveArtboardName = (newName: string) => {
  if (editingArtboard.value && newName.trim()) {
    editingArtboard.value.name = newName.trim()
  }
  editingArtboard.value = null
}

const handleTidySuggestion = () => {
  showTidySuggestion.value = false
  if (recentlyAddedImages.value.length > 0) {
    // Get the starting position from the first image
    const minX = Math.min(...recentlyAddedImages.value.map(img => img.position.x))
    const minY = Math.min(...recentlyAddedImages.value.map(img => img.position.y))
    
    // Apply tidy to recently added images
    tidyImages(recentlyAddedImages.value, { x: minX, y: minY })
    
    // Select the tidied images
    clearSelection()
    recentlyAddedImages.value.forEach(img => {
      selectedImageIds.value.add(img.id)
    })
    
    recentlyAddedImages.value = []
  }
}

const dismissTidySuggestion = () => {
  showTidySuggestion.value = false
  recentlyAddedImages.value = []
}

const handleTidyImages = () => {
  showContextMenu.value = false
  
  if (selectedImageIds.value.size > 1) {
    const selectedImages = images.value.filter(img => selectedImageIds.value.has(img.id))
    
    if (selectedImages.length > 0) {
      // Calculate the bounding box of selected images to determine start position
      const minX = Math.min(...selectedImages.map(img => img.position.x))
      const minY = Math.min(...selectedImages.map(img => img.position.y))
      
      // Check if images are in an artboard
      const artboardId = selectedImages[0].artboardId
      const inArtboard = artboardId && selectedImages.every(img => img.artboardId === artboardId)
      
      let startPosition: Point
      
      if (inArtboard && artboardId) {
        // If all images are in the same artboard, arrange within artboard bounds
        const artboard = artboards.value.find(a => a.id === artboardId)
        if (artboard) {
          startPosition = {
            x: artboard.position.x + 20, // Add some padding
            y: artboard.position.y + 40  // Leave space for artboard name
          }
        } else {
          startPosition = { x: minX, y: minY }
        }
      } else {
        // Use current minimum position as start
        startPosition = { x: minX, y: minY }
      }
      
      // Apply tidy arrangement using Skyline algorithm
      tidyImages(selectedImages, startPosition)
      
      // If images are in an artboard, auto-resize the artboard to fit
      if (inArtboard && artboardId) {
        autoResizeArtboard(artboardId, images.value)
      }
    }
  }
}

const handleExportAsHtml = async () => {
  showContextMenu.value = false
  
  if (selectedArtboardIds.value.size > 0) {
    const artboardId = Array.from(selectedArtboardIds.value)[0]
    const artboard = artboards.value.find(a => a.id === artboardId)
    
    if (artboard) {
      try {
        await exportAsHtmlArchive(artboard, images.value)
        console.log('HTML gallery exported successfully')
      } catch (error) {
        console.error('Failed to export HTML gallery:', error)
        alert('Failed to export HTML gallery. Please make sure the artboard contains images.')
      }
    }
  }
}

const draw = () => {
  if (!canvasRef.value) return
  
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  ctx.save()
  ctx.translate(viewport.value.x, viewport.value.y)
  ctx.scale(viewport.value.zoom, viewport.value.zoom)
  
  // Draw artboards
  const sortedArtboards = [...artboards.value].sort((a, b) => a.zIndex - b.zIndex)
  for (const artboard of sortedArtboards) {
    // Artboard background
    const bgColor = artboard.backgroundColor || '#ffffff'
    if (artboard.backgroundColor && artboard.backgroundColor !== 'rgba(255, 255, 255, 1)') {
      console.log(`[Canvas] Drawing artboard ${artboard.id} with background: ${bgColor}`)
    }
    ctx.fillStyle = bgColor
    ctx.fillRect(
      artboard.position.x,
      artboard.position.y,
      artboard.size.width,
      artboard.size.height
    )
    
    // Artboard grid (only draw if background is light enough)
    const gridSize = 20
    
    // Determine if we should draw a grid based on background color
    let shouldDrawGrid = true
    let gridColor = 'rgba(0, 0, 0, 0.05)' // Default subtle grid
    
    if (artboard.backgroundColor && artboard.backgroundColor !== 'rgba(255, 255, 255, 1)') {
      // Parse the background color to determine if it's light or dark
      const match = artboard.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const [_, r, g, b] = match.map(Number)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        
        if (luminance > 0.7) {
          // Light background - use dark grid
          gridColor = 'rgba(0, 0, 0, 0.08)'
        } else if (luminance > 0.3) {
          // Medium background - use contrasting grid
          gridColor = luminance > 0.5 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
        } else {
          // Dark background - use light grid
          gridColor = 'rgba(255, 255, 255, 0.08)'
        }
      }
    }
    
    if (shouldDrawGrid) {
      ctx.strokeStyle = gridColor
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
    }
    
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
    ctx.fillStyle = artboard.textColor || '#666'
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
      
      // Draw text if showText is true
      if (image.showText && (image.title || image.description)) {
        ctx.save()
        
        // Background for text
        const textY = image.position.y + image.size.height + (5 / viewport.value.zoom)
        const padding = 8 / viewport.value.zoom
        const lineHeight = 16 / viewport.value.zoom
        const titleHeight = image.title ? lineHeight : 0
        const descHeight = image.description ? lineHeight * Math.min(3, Math.ceil(image.description.length / 40)) : 0
        const textHeight = titleHeight + descHeight + padding * 2
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.fillRect(
          image.position.x,
          textY,
          image.size.width,
          textHeight
        )
        
        // Border for text box
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1 / viewport.value.zoom
        ctx.strokeRect(
          image.position.x,
          textY,
          image.size.width,
          textHeight
        )
        
        // Draw title
        if (image.title) {
          ctx.fillStyle = '#111827'
          ctx.font = `bold ${14 / viewport.value.zoom}px sans-serif`
          ctx.textBaseline = 'top'
          ctx.fillText(
            image.title,
            image.position.x + padding,
            textY + padding,
            image.size.width - padding * 2
          )
        }
        
        // Draw description
        if (image.description) {
          ctx.fillStyle = '#6b7280'
          ctx.font = `${12 / viewport.value.zoom}px sans-serif`
          ctx.textBaseline = 'top'
          const descY = textY + padding + (image.title ? lineHeight : 0)
          
          // Word wrap for description
          const words = image.description.split(' ')
          let line = ''
          let y = descY
          const maxLines = 3 // Limit to 3 lines for better display
          let linesDrawn = 0
          
          for (let n = 0; n < words.length && linesDrawn < maxLines; n++) {
            const testLine = line + words[n] + ' '
            const metrics = ctx.measureText(testLine)
            const testWidth = metrics.width
            
            if (testWidth > image.size.width - padding * 2 && n > 0) {
              ctx.fillText(line, image.position.x + padding, y)
              line = words[n] + ' '
              y += lineHeight
              linesDrawn++
            } else {
              line = testLine
            }
          }
          if (line && linesDrawn < maxLines) {
            ctx.fillText(line, image.position.x + padding, y)
          }
        }
        
        ctx.restore()
      }
      
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
  canvasHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('paste', handlePasteEvent)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  
  // Close context menu on click outside
  window.addEventListener('click', () => {
    showContextMenu.value = false
  })
  
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
  window.removeEventListener('paste', handlePasteEvent)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  
  // 画像キャッシュのクリア
  imageCache.clearCache()
})

watch([images, viewport, selectedImageIds], () => {
  
}, { deep: true })
</script>