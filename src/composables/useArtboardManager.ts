import { ref } from 'vue'
import type { Artboard, ImageItem, Point, Size } from '../types'

export function useArtboardManager(onArtboardChildrenChange?: (artboardId: string) => void) {
  const artboards = ref<Artboard[]>([])
  const selectedArtboardIds = ref<Set<string>>(new Set())

  const createArtboard = (name: string, position: Point, size: Size): Artboard => {
    const artboard: Artboard = {
      id: `artboard-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      position,
      size,
      children: [],
      zIndex: Math.max(...artboards.value.map(a => a.zIndex), 0) + 1,
      selected: false,
      backgroundColor: 'rgba(255, 255, 255, 1)',
      borderColor: '#e0e0e0'
    }
    artboards.value.push(artboard)
    return artboard
  }

  const addToArtboard = (artboardId: string, itemIds: string[]) => {
    console.log(`[ArtboardManager] Adding items to artboard ${artboardId}:`, itemIds)
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (artboard) {
      console.log(`[ArtboardManager] Found artboard, current children:`, artboard.children)
      const newChildren = [...artboard.children]
      itemIds.forEach(id => {
        if (!newChildren.includes(id)) {
          newChildren.push(id)
          console.log(`[ArtboardManager] Added ${id} to artboard`)
        } else {
          console.log(`[ArtboardManager] ${id} already in artboard`)
        }
      })
      // Replace the array to trigger Vue reactivity
      artboard.children = newChildren
      console.log(`[ArtboardManager] Updated children:`, artboard.children)
      
      // Trigger color update callback if provided
      if (onArtboardChildrenChange) {
        console.log(`[ArtboardManager] Triggering color update for artboard ${artboardId}`)
        onArtboardChildrenChange(artboardId)
      }
    } else {
      console.log(`[ArtboardManager] Artboard not found: ${artboardId}`)
    }
  }

  const removeFromArtboard = (artboardId: string, itemIds: string[]) => {
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (artboard) {
      // Replace the array to trigger Vue reactivity
      artboard.children = artboard.children.filter(id => !itemIds.includes(id))
      
      // Trigger color update callback if provided
      if (onArtboardChildrenChange) {
        console.log(`[ArtboardManager] Triggering color update for artboard ${artboardId} after removal`)
        onArtboardChildrenChange(artboardId)
      }
    }
  }

  const deleteArtboard = (artboardId: string) => {
    const index = artboards.value.findIndex(a => a.id === artboardId)
    if (index !== -1) {
      artboards.value.splice(index, 1)
      selectedArtboardIds.value.delete(artboardId)
    }
  }

  const selectArtboard = (artboardId: string, addToSelection = false) => {
    if (!addToSelection) {
      selectedArtboardIds.value.clear()
    }
    selectedArtboardIds.value.add(artboardId)
  }

  const deselectArtboard = (artboardId: string) => {
    selectedArtboardIds.value.delete(artboardId)
  }

  const clearArtboardSelection = () => {
    selectedArtboardIds.value.clear()
  }

  const updateArtboardPosition = (artboardId: string, position: Point) => {
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (artboard) {
      artboard.position = position
    }
  }

  const updateArtboardSize = (artboardId: string, size: Size) => {
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (artboard) {
      artboard.size = size
    }
  }

  const getArtboardAt = (point: Point): Artboard | null => {
    const sortedArtboards = [...artboards.value].sort((a, b) => b.zIndex - a.zIndex)
    
    for (const artboard of sortedArtboards) {
      if (
        point.x >= artboard.position.x &&
        point.x <= artboard.position.x + artboard.size.width &&
        point.y >= artboard.position.y &&
        point.y <= artboard.position.y + artboard.size.height
      ) {
        return artboard
      }
    }
    return null
  }

  const getArtboardNameAt = (point: Point): Artboard | null => {
    const sortedArtboards = [...artboards.value].sort((a, b) => b.zIndex - a.zIndex)
    
    for (const artboard of sortedArtboards) {
      // Check if click is on the name area (top area of artboard)
      if (
        point.x >= artboard.position.x &&
        point.x <= artboard.position.x + artboard.size.width &&
        point.y >= artboard.position.y - 25 &&
        point.y <= artboard.position.y
      ) {
        return artboard
      }
    }
    return null
  }

  const getArtboardsInRect = (x: number, y: number, width: number, height: number): Artboard[] => {
    return artboards.value.filter(artboard => {
      const artboardRight = artboard.position.x + artboard.size.width
      const artboardBottom = artboard.position.y + artboard.size.height
      const rectRight = x + width
      const rectBottom = y + height
      
      return !(
        artboard.position.x > rectRight ||
        artboardRight < x ||
        artboard.position.y > rectBottom ||
        artboardBottom < y
      )
    })
  }

  const createArtboardFromSelection = (selectedImages: ImageItem[], name?: string): Artboard | null => {
    if (selectedImages.length === 0) return null

    const minX = Math.min(...selectedImages.map(img => img.position.x))
    const minY = Math.min(...selectedImages.map(img => img.position.y))
    const maxX = Math.max(...selectedImages.map(img => img.position.x + img.size.width))
    const maxY = Math.max(...selectedImages.map(img => img.position.y + img.size.height))

    const padding = 40
    const artboard = createArtboard(
      name || `Artboard ${artboards.value.length + 1}`,
      { x: minX - padding, y: minY - padding },
      { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 }
    )

    addToArtboard(artboard.id, selectedImages.map(img => img.id))
    
    selectedImages.forEach(img => {
      img.artboardId = artboard.id
    })

    return artboard
  }

  const removeItemsFromArtboard = (artboardId: string, images: ImageItem[]) => {
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (!artboard) return

    artboard.children.forEach(childId => {
      const image = images.find(img => img.id === childId)
      if (image) {
        delete image.artboardId
      }
    })

    deleteArtboard(artboardId)
  }

  const moveArtboardChildren = (artboard: Artboard, deltaX: number, deltaY: number, images: ImageItem[]) => {
    artboard.children.forEach(childId => {
      const image = images.find(img => img.id === childId)
      if (image) {
        image.position.x += deltaX
        image.position.y += deltaY
      }
    })
  }

  const autoResizeArtboard = (artboardId: string, images: ImageItem[]) => {
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (!artboard || artboard.children.length === 0) return

    const childImages = images.filter(img => artboard.children.includes(img.id))
    if (childImages.length === 0) return

    const minX = Math.min(...childImages.map(img => img.position.x))
    const minY = Math.min(...childImages.map(img => img.position.y))
    const maxX = Math.max(...childImages.map(img => img.position.x + img.size.width))
    const maxY = Math.max(...childImages.map(img => img.position.y + img.size.height))

    // Larger padding for better spacing
    const padding = 80
    const newX = minX - padding
    const newY = minY - padding
    const newWidth = maxX - minX + padding * 2
    const newHeight = maxY - minY + padding * 2
    
    // Only expand, never shrink
    const currentRight = artboard.position.x + artboard.size.width
    const currentBottom = artboard.position.y + artboard.size.height
    const newRight = newX + newWidth
    const newBottom = newY + newHeight
    
    // Calculate the expanded bounds with extra margin
    const extraMargin = 20
    const finalX = Math.min(artboard.position.x, newX - extraMargin)
    const finalY = Math.min(artboard.position.y, newY - extraMargin)
    const finalRight = Math.max(currentRight, newRight + extraMargin)
    const finalBottom = Math.max(currentBottom, newBottom + extraMargin)
    
    artboard.position = { x: finalX, y: finalY }
    artboard.size = { 
      width: finalRight - finalX, 
      height: finalBottom - finalY 
    }
  }

  const getResizeHandle = (artboard: Artboard, point: Point, handleSize: number = 20): string | null => {
    const { position, size } = artboard
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

  return {
    artboards,
    selectedArtboardIds,
    createArtboard,
    addToArtboard,
    removeFromArtboard,
    deleteArtboard,
    selectArtboard,
    deselectArtboard,
    clearArtboardSelection,
    updateArtboardPosition,
    updateArtboardSize,
    getArtboardAt,
    getArtboardNameAt,
    getArtboardsInRect,
    createArtboardFromSelection,
    removeItemsFromArtboard,
    moveArtboardChildren,
    autoResizeArtboard,
    getResizeHandle
  }
}