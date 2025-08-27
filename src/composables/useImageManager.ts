import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { ImageItem, Point, Size, Artboard } from '../types'
import { useSettingsStore } from '../stores/settings'

export function useImageManager(
  getArtboardAt?: (point: Point) => Artboard | null,
  addToArtboard?: (artboardId: string, itemIds: string[]) => void
) {
  const settingsStore = useSettingsStore()
  const images = ref<ImageItem[]>([])
  const selectedImageIds = ref<Set<string>>(new Set())
  let nextZIndex = 1

  const selectedImages = computed(() => 
    images.value.filter(img => selectedImageIds.value.has(img.id))
  )

  const addImage = async (file: File, position: Point = { x: 100, y: 100 }, offset: number = 0): Promise<ImageItem | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const img = new Image()
        
        img.onload = () => {
          // Apply stagger offset for bulk uploads
          const staggerOffset = offset * 30
          
          // Get scaled dimensions
          const scaledSize = settingsStore.getScaledDimensions(img.width, img.height)
          
          const imagePosition = { 
            x: position.x + staggerOffset, 
            y: position.y + staggerOffset 
          }
          
          const imageItem: ImageItem = {
            id: uuidv4(),
            filename: file.name,
            dataUrl,
            position: imagePosition,
            size: scaledSize,
            originalSize: { width: img.width, height: img.height },
            rotation: 0,
            zIndex: nextZIndex++,
            selected: false
          }
          
          // Add image to the list first
          images.value.push(imageItem)
          
          // Then check if image is placed on an artboard
          if (getArtboardAt) {
            const imageCenterPoint = {
              x: imagePosition.x + scaledSize.width / 2,
              y: imagePosition.y + scaledSize.height / 2
            }
            const targetArtboard = getArtboardAt(imageCenterPoint)
            if (targetArtboard) {
              imageItem.artboardId = targetArtboard.id
              // Add to artboard's children array after image is in the list
              if (addToArtboard) {
                addToArtboard(targetArtboard.id, [imageItem.id])
              }
            }
          }
          resolve(imageItem)
        }
        
        img.onerror = () => {
          resolve(null)
        }
        
        img.src = dataUrl
      }
      
      reader.onerror = () => {
        resolve(null)
      }
      
      reader.readAsDataURL(file)
    })
  }

  const addImageFromDataUrl = async (dataUrl: string, filename: string = 'pasted-image.png', position: Point = { x: 100, y: 100 }, offset: number = 0): Promise<ImageItem | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      
      img.onload = () => {
        // Apply stagger offset for bulk pastes
        const staggerOffset = offset * 30
        
        // Get scaled dimensions
        const scaledSize = settingsStore.getScaledDimensions(img.width, img.height)
        
        const imagePosition = { 
          x: position.x + staggerOffset, 
          y: position.y + staggerOffset 
        }
        
        const imageItem: ImageItem = {
          id: uuidv4(),
          filename,
          dataUrl,
          position: imagePosition,
          size: scaledSize,
          originalSize: { width: img.width, height: img.height },
          rotation: 0,
          zIndex: nextZIndex++,
          selected: false
        }
        
        // Add image to the list first
        images.value.push(imageItem)
        
        // Then check if image is placed on an artboard
        if (getArtboardAt) {
          const imageCenterPoint = {
            x: imagePosition.x + scaledSize.width / 2,
            y: imagePosition.y + scaledSize.height / 2
          }
          const targetArtboard = getArtboardAt(imageCenterPoint)
          if (targetArtboard) {
            imageItem.artboardId = targetArtboard.id
            // Add to artboard's children array after image is in the list
            if (addToArtboard) {
              addToArtboard(targetArtboard.id, [imageItem.id])
            }
          }
        }
        resolve(imageItem)
      }
      
      img.onerror = () => {
        resolve(null)
      }
      
      img.src = dataUrl
    })
  }

  const removeImage = (id: string) => {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
      selectedImageIds.value.delete(id)
    }
  }

  const removeSelectedImages = () => {
    const idsToRemove = Array.from(selectedImageIds.value)
    idsToRemove.forEach(id => removeImage(id))
    selectedImageIds.value.clear()
  }

  const updateImagePosition = (id: string, position: Point) => {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.position = position
    }
  }

  const updateImageSize = (id: string, size: Size) => {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.size = size
    }
  }

  const selectImage = (id: string, multiSelect: boolean = false) => {
    if (!multiSelect) {
      selectedImageIds.value.clear()
    }
    selectedImageIds.value.add(id)
  }

  const deselectImage = (id: string) => {
    selectedImageIds.value.delete(id)
  }

  const toggleImageSelection = (id: string) => {
    if (selectedImageIds.value.has(id)) {
      deselectImage(id)
    } else {
      selectImage(id, true)
    }
  }

  const clearSelection = () => {
    selectedImageIds.value.clear()
  }

  const selectAll = () => {
    images.value.forEach(img => {
      selectedImageIds.value.add(img.id)
    })
  }

  const bringToFront = (id: string) => {
    const image = images.value.find(img => img.id === id)
    if (image) {
      image.zIndex = nextZIndex++
    }
  }

  const getImageAt = (point: Point): ImageItem | null => {
    const sortedImages = [...images.value].sort((a, b) => b.zIndex - a.zIndex)
    
    for (const image of sortedImages) {
      const { position, size } = image
      if (
        point.x >= position.x &&
        point.x <= position.x + size.width &&
        point.y >= position.y &&
        point.y <= position.y + size.height
      ) {
        return image
      }
    }
    
    return null
  }

  const getImagesInRect = (x: number, y: number, width: number, height: number): ImageItem[] => {
    return images.value.filter(image => {
      const { position, size } = image
      const imageRight = position.x + size.width
      const imageBottom = position.y + size.height
      const rectRight = x + width
      const rectBottom = y + height
      
      return !(
        position.x > rectRight ||
        imageRight < x ||
        position.y > rectBottom ||
        imageBottom < y
      )
    })
  }

  const clearAllImages = () => {
    images.value = []
    selectedImageIds.value.clear()
    nextZIndex = 1
  }

  return {
    images: computed(() => images.value),
    selectedImages,
    selectedImageIds: computed(() => selectedImageIds.value),
    addImage,
    addImageFromDataUrl,
    removeImage,
    removeSelectedImages,
    updateImagePosition,
    updateImageSize,
    selectImage,
    deselectImage,
    toggleImageSelection,
    clearSelection,
    selectAll,
    bringToFront,
    getImageAt,
    getImagesInRect,
    clearAllImages
  }
}