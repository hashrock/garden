import { ref, computed } from 'vue'
import type { Point, Size, ImageItem, Artboard } from '../types'

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

export function useDragResize() {
  const isDragging = ref(false)
  const isDraggingArtboard = ref(false)
  const isResizing = ref(false)
  const isResizingArtboard = ref(false)
  const dragStart = ref<Point | null>(null)
  const draggedImage = ref<ImageItem | null>(null)
  const draggedImages = ref<ImageItem[]>([])
  const draggedArtboard = ref<Artboard | null>(null)
  const draggedArtboards = ref<Artboard[]>([])
  const initialPositions = ref<Map<string, Point>>(new Map())
  const initialArtboardPositions = ref<Map<string, Point>>(new Map())
  
  const resizeHandle = ref<ResizeHandle>(null)
  const resizeStart = ref<Point | null>(null)
  const resizedImage = ref<ImageItem | null>(null)
  const resizedArtboard = ref<Artboard | null>(null)
  const initialSize = ref<Size | null>(null)
  const initialPosition = ref<Point | null>(null)

  const startDrag = (image: ImageItem, startPoint: Point, selectedImages: ImageItem[] = []) => {
    isDragging.value = true
    dragStart.value = startPoint
    draggedImage.value = image
    draggedImages.value = selectedImages.length > 0 ? selectedImages : [image]
    
    initialPositions.value.clear()
    draggedImages.value.forEach(img => {
      initialPositions.value.set(img.id, { ...img.position })
    })
  }

  const updateDrag = (currentPoint: Point) => {
    if (!isDragging.value || !dragStart.value) return

    const deltaX = currentPoint.x - dragStart.value.x
    const deltaY = currentPoint.y - dragStart.value.y

    draggedImages.value.forEach(img => {
      const initialPos = initialPositions.value.get(img.id)
      if (initialPos) {
        img.position = {
          x: initialPos.x + deltaX,
          y: initialPos.y + deltaY
        }
      }
    })
  }

  const endDrag = () => {
    isDragging.value = false
    isDraggingArtboard.value = false
    dragStart.value = null
    draggedImage.value = null
    draggedImages.value = []
    draggedArtboard.value = null
    draggedArtboards.value = []
    initialPositions.value.clear()
    initialArtboardPositions.value.clear()
  }

  const startDragArtboard = (artboard: Artboard, startPoint: Point, selectedArtboards: Artboard[] = []) => {
    isDraggingArtboard.value = true
    dragStart.value = startPoint
    draggedArtboard.value = artboard
    draggedArtboards.value = selectedArtboards.length > 0 ? selectedArtboards : [artboard]
    
    initialArtboardPositions.value.clear()
    draggedArtboards.value.forEach(a => {
      initialArtboardPositions.value.set(a.id, { ...a.position })
    })
  }

  const updateDragArtboard = (currentPoint: Point, images: ImageItem[]) => {
    if (!isDraggingArtboard.value || !dragStart.value) return

    const deltaX = currentPoint.x - dragStart.value.x
    const deltaY = currentPoint.y - dragStart.value.y

    draggedArtboards.value.forEach(artboard => {
      const initialPos = initialArtboardPositions.value.get(artboard.id)
      if (initialPos) {
        const oldPosition = { ...artboard.position }
        artboard.position = {
          x: initialPos.x + deltaX,
          y: initialPos.y + deltaY
        }
        
        const artboardDeltaX = artboard.position.x - oldPosition.x
        const artboardDeltaY = artboard.position.y - oldPosition.y
        
        artboard.children.forEach(childId => {
          const image = images.find(img => img.id === childId)
          if (image) {
            image.position.x += artboardDeltaX
            image.position.y += artboardDeltaY
          }
        })
      }
    })
  }

  const getResizeHandle = (image: ImageItem, point: Point, handleSize: number = 10): ResizeHandle => {
    const { position, size } = image
    const threshold = handleSize
    
    const relX = point.x - position.x
    const relY = point.y - position.y
    
    const isLeft = relX < threshold
    const isRight = relX > size.width - threshold
    const isTop = relY < threshold
    const isBottom = relY > size.height - threshold
    
    if (isTop && isLeft) return 'nw'
    if (isTop && isRight) return 'ne'
    if (isBottom && isLeft) return 'sw'
    if (isBottom && isRight) return 'se'
    if (isTop) return 'n'
    if (isBottom) return 's'
    if (isLeft) return 'w'
    if (isRight) return 'e'
    
    return null
  }

  const startResize = (image: ImageItem, handle: ResizeHandle, startPoint: Point) => {
    isResizing.value = true
    resizeHandle.value = handle
    resizeStart.value = startPoint
    resizedImage.value = image
    initialSize.value = { ...image.size }
    initialPosition.value = { ...image.position }
  }

  const updateResize = (currentPoint: Point, maintainAspectRatio: boolean = false) => {
    if (!isResizing.value || !resizeStart.value || !resizedImage.value || 
        !initialSize.value || !initialPosition.value || !resizeHandle.value) return

    const deltaX = currentPoint.x - resizeStart.value.x
    const deltaY = currentPoint.y - resizeStart.value.y
    
    let newWidth = initialSize.value.width
    let newHeight = initialSize.value.height
    let newX = initialPosition.value.x
    let newY = initialPosition.value.y
    
    const aspectRatio = resizedImage.value.originalSize.width / resizedImage.value.originalSize.height

    switch (resizeHandle.value) {
      case 'se':
        newWidth = initialSize.value.width + deltaX
        newHeight = maintainAspectRatio ? newWidth / aspectRatio : initialSize.value.height + deltaY
        break
      case 'sw':
        newWidth = initialSize.value.width - deltaX
        newHeight = maintainAspectRatio ? newWidth / aspectRatio : initialSize.value.height + deltaY
        newX = initialPosition.value.x + deltaX
        break
      case 'ne':
        newWidth = initialSize.value.width + deltaX
        newHeight = maintainAspectRatio ? newWidth / aspectRatio : initialSize.value.height - deltaY
        newY = initialPosition.value.y + deltaY
        break
      case 'nw':
        newWidth = initialSize.value.width - deltaX
        newHeight = maintainAspectRatio ? newWidth / aspectRatio : initialSize.value.height - deltaY
        newX = initialPosition.value.x + deltaX
        newY = initialPosition.value.y + deltaY
        break
      case 'e':
        newWidth = initialSize.value.width + deltaX
        if (maintainAspectRatio) {
          newHeight = newWidth / aspectRatio
        }
        break
      case 'w':
        newWidth = initialSize.value.width - deltaX
        newX = initialPosition.value.x + deltaX
        if (maintainAspectRatio) {
          newHeight = newWidth / aspectRatio
        }
        break
      case 'n':
        newHeight = initialSize.value.height - deltaY
        newY = initialPosition.value.y + deltaY
        if (maintainAspectRatio) {
          newWidth = newHeight * aspectRatio
        }
        break
      case 's':
        newHeight = initialSize.value.height + deltaY
        if (maintainAspectRatio) {
          newWidth = newHeight * aspectRatio
        }
        break
    }
    
    const minSize = 20
    newWidth = Math.max(minSize, newWidth)
    newHeight = Math.max(minSize, newHeight)
    
    resizedImage.value.size = { width: newWidth, height: newHeight }
    resizedImage.value.position = { x: newX, y: newY }
  }

  const endResize = () => {
    isResizing.value = false
    isResizingArtboard.value = false
    resizeHandle.value = null
    resizeStart.value = null
    resizedImage.value = null
    resizedArtboard.value = null
    initialSize.value = null
    initialPosition.value = null
  }

  const getCursor = (handle: ResizeHandle): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize'
      case 'ne':
      case 'sw':
        return 'nesw-resize'
      case 'n':
      case 's':
        return 'ns-resize'
      case 'e':
      case 'w':
        return 'ew-resize'
      default:
        return 'default'
    }
  }

  const startResizeArtboard = (artboard: Artboard, handle: ResizeHandle, startPoint: Point) => {
    isResizingArtboard.value = true
    resizeHandle.value = handle
    resizeStart.value = startPoint
    resizedArtboard.value = artboard
    initialSize.value = { ...artboard.size }
    initialPosition.value = { ...artboard.position }
  }

  const updateResizeArtboard = (currentPoint: Point, maintainAspectRatio: boolean = false) => {
    if (!isResizingArtboard.value || !resizeStart.value || !resizedArtboard.value || 
        !initialSize.value || !initialPosition.value || !resizeHandle.value) return

    const deltaX = currentPoint.x - resizeStart.value.x
    const deltaY = currentPoint.y - resizeStart.value.y
    
    let newWidth = initialSize.value.width
    let newHeight = initialSize.value.height
    let newX = initialPosition.value.x
    let newY = initialPosition.value.y

    switch (resizeHandle.value) {
      case 'se':
        newWidth = initialSize.value.width + deltaX
        newHeight = initialSize.value.height + deltaY
        break
      case 'sw':
        newWidth = initialSize.value.width - deltaX
        newHeight = initialSize.value.height + deltaY
        newX = initialPosition.value.x + deltaX
        break
      case 'ne':
        newWidth = initialSize.value.width + deltaX
        newHeight = initialSize.value.height - deltaY
        newY = initialPosition.value.y + deltaY
        break
      case 'nw':
        newWidth = initialSize.value.width - deltaX
        newHeight = initialSize.value.height - deltaY
        newX = initialPosition.value.x + deltaX
        newY = initialPosition.value.y + deltaY
        break
      case 'e':
        newWidth = initialSize.value.width + deltaX
        break
      case 'w':
        newWidth = initialSize.value.width - deltaX
        newX = initialPosition.value.x + deltaX
        break
      case 'n':
        newHeight = initialSize.value.height - deltaY
        newY = initialPosition.value.y + deltaY
        break
      case 's':
        newHeight = initialSize.value.height + deltaY
        break
    }
    
    const minSize = 100
    newWidth = Math.max(minSize, newWidth)
    newHeight = Math.max(minSize, newHeight)
    
    resizedArtboard.value.size = { width: newWidth, height: newHeight }
    resizedArtboard.value.position = { x: newX, y: newY }
  }

  return {
    isDragging: computed(() => isDragging.value),
    isDraggingArtboard: computed(() => isDraggingArtboard.value),
    isResizing: computed(() => isResizing.value),
    isResizingArtboard: computed(() => isResizingArtboard.value),
    resizeHandle: computed(() => resizeHandle.value),
    startDrag,
    updateDrag,
    endDrag,
    startDragArtboard,
    updateDragArtboard,
    getResizeHandle,
    startResize,
    updateResize,
    endResize,
    startResizeArtboard,
    updateResizeArtboard,
    getCursor
  }
}