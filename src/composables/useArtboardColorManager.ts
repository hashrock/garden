import { watch, type Ref } from 'vue'
import ColorThief from 'colorthief'
import type { Artboard, ImageItem } from '../types'

export function useArtboardColorManager(
  artboards: Ref<Artboard[]>,
  images: Ref<ImageItem[]>
) {
  const colorThief = new ColorThief()

  // Calculate luminance to determine if color is light or dark
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  // Get text color (black or white) based on background
  const getTextColor = (r: number, g: number, b: number): string => {
    const luminance = getLuminance(r, g, b)
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  // Extract primary color from image
  const extractColorFromImage = async (dataUrl: string): Promise<[number, number, number] | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const color = colorThief.getColor(img)
          resolve(color)
        } catch (error) {
          console.error('Error extracting color:', error)
          resolve(null)
        }
      }
      
      img.onerror = () => {
        resolve(null)
      }
      
      img.src = dataUrl
    })
  }

  // Find the largest image in an artboard
  const findLargestImage = (artboard: Artboard): ImageItem | null => {
    // Check both methods: children array and artboardId
    const artboardImages = images.value.filter(img => 
      artboard.children.includes(img.id) || img.artboardId === artboard.id
    )
    
    if (artboardImages.length === 0) return null
    
    return artboardImages.reduce((largest, current) => {
      const currentArea = current.size.width * current.size.height
      const largestArea = largest.size.width * largest.size.height
      return currentArea > largestArea ? current : largest
    })
  }

  // Update artboard colors based on largest image
  const updateArtboardColors = async (artboardId: string) => {
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (!artboard) {
      return
    }

    const largestImage = findLargestImage(artboard)
    
    if (!largestImage) {
      // Reset to default colors if no images
      artboard.backgroundColor = 'rgba(255, 255, 255, 1)'
      artboard.textColor = '#000000'
      return
    }

    // Extract primary color from the largest image
    const color = await extractColorFromImage(largestImage.dataUrl)
    
    if (color) {
      const [r, g, b] = color
      const newBgColor = `rgba(${r}, ${g}, ${b}, 1)`
      const newTextColor = getTextColor(r, g, b)
      
      artboard.backgroundColor = newBgColor
      artboard.textColor = newTextColor
    } else {
      // Fallback to default colors
      artboard.backgroundColor = 'rgba(255, 255, 255, 1)'
      artboard.textColor = '#000000'
    }
  }

  // Update all artboards
  const updateAllArtboardColors = async () => {
    const updatePromises = artboards.value.map(artboard => 
      updateArtboardColors(artboard.id)
    )
    await Promise.all(updatePromises)
  }

  // Watch for changes in images (size, position, artboard assignment)
  watch(
    images,
    async (newImages, oldImages) => {
      if (!oldImages) {
        // Initial load, update all artboards
        await updateAllArtboardColors()
        return
      }

      const affectedArtboards = new Set<string>()

      // Check for added or removed images
      const newIds = new Set(newImages.map(img => img.id))
      const oldIds = new Set(oldImages.map(img => img.id))
      
      // Find removed images
      oldImages.forEach(img => {
        if (!newIds.has(img.id) && img.artboardId) {
          affectedArtboards.add(img.artboardId)
        }
      })
      
      // Find added or modified images
      newImages.forEach(newImg => {
        const oldImg = oldImages.find(img => img.id === newImg.id)
        
        if (!oldImg) {
          // New image added
          if (newImg.artboardId) {
            affectedArtboards.add(newImg.artboardId)
          }
        } else {
          // Check for changes
          if (
            newImg.artboardId !== oldImg.artboardId ||
            newImg.size.width !== oldImg.size.width ||
            newImg.size.height !== oldImg.size.height
          ) {
            if (newImg.artboardId) affectedArtboards.add(newImg.artboardId)
            if (oldImg.artboardId && oldImg.artboardId !== newImg.artboardId) {
              affectedArtboards.add(oldImg.artboardId)
            }
          }
        }
      })

      // Update affected artboards
      const updatePromises = Array.from(affectedArtboards).map(artboardId =>
        updateArtboardColors(artboardId)
      )
      await Promise.all(updatePromises)
    },
    { deep: true }
  )

  // Watch for changes in artboard children
  watch(
    artboards,
    async (newArtboards, oldArtboards) => {
      if (!oldArtboards) {
        // Initial load, update all artboards
        await updateAllArtboardColors()
        return
      }

      const affectedArtboards = new Set<string>()

      newArtboards.forEach(newArtboard => {
        const oldArtboard = oldArtboards.find(a => a.id === newArtboard.id)
        
        if (!oldArtboard) {
          // New artboard
          affectedArtboards.add(newArtboard.id)
        } else {
          // Check if children changed
          const oldChildrenStr = JSON.stringify(oldArtboard.children || [])
          const newChildrenStr = JSON.stringify(newArtboard.children || [])
          
          if (oldChildrenStr !== newChildrenStr) {
            // Children changed - need to update colors
            affectedArtboards.add(newArtboard.id)
          } else {
            // Check other properties that might have changed
            const propsChanged = []
            if (newArtboard.backgroundColor !== oldArtboard.backgroundColor) {
              propsChanged.push('backgroundColor')
            }
            if (newArtboard.position?.x !== oldArtboard.position?.x || newArtboard.position?.y !== oldArtboard.position?.y) {
              propsChanged.push('position')
            }
            if (newArtboard.size?.width !== oldArtboard.size?.width || newArtboard.size?.height !== oldArtboard.size?.height) {
              propsChanged.push('size')
            }
          }
        }
      })

      // Update affected artboards
      const updatePromises = Array.from(affectedArtboards).map(artboardId =>
        updateArtboardColors(artboardId)
      )
      await Promise.all(updatePromises)
    },
    { deep: true }
  )

  // Initial color setup
  updateAllArtboardColors()

  return {
    updateArtboardColors,
    updateAllArtboardColors
  }
}