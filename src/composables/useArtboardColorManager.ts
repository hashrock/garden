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
    console.log(`[ColorManager] Finding largest image in artboard ${artboard.id}`)
    console.log(`[ColorManager] Artboard children: ${artboard.children.length}`, artboard.children)
    console.log(`[ColorManager] Total images in system: ${images.value.length}`)
    
    // Log all images with their IDs and artboardIds
    images.value.forEach(img => {
      console.log(`[ColorManager] Image ${img.id}: artboardId=${img.artboardId}, in children=${artboard.children.includes(img.id)}`)
    })
    
    // Check both methods: children array and artboardId
    const artboardImages = images.value.filter(img => 
      artboard.children.includes(img.id) || img.artboardId === artboard.id
    )
    
    console.log(`[ColorManager] Images with artboardId: ${images.value.filter(img => img.artboardId === artboard.id).length}`)
    console.log(`[ColorManager] Found ${artboardImages.length} images in artboard`)
    
    if (artboardImages.length === 0) return null
    
    return artboardImages.reduce((largest, current) => {
      const currentArea = current.size.width * current.size.height
      const largestArea = largest.size.width * largest.size.height
      return currentArea > largestArea ? current : largest
    })
  }

  // Update artboard colors based on largest image
  const updateArtboardColors = async (artboardId: string) => {
    console.log(`[ColorManager] Updating colors for artboard: ${artboardId}`)
    
    const artboard = artboards.value.find(a => a.id === artboardId)
    if (!artboard) {
      console.log(`[ColorManager] Artboard not found: ${artboardId}`)
      return
    }

    console.log(`[ColorManager] Artboard children:`, artboard.children)
    const largestImage = findLargestImage(artboard)
    
    if (!largestImage) {
      console.log(`[ColorManager] No images found in artboard, resetting to default colors`)
      // Reset to default colors if no images
      artboard.backgroundColor = 'rgba(255, 255, 255, 1)'
      artboard.textColor = '#000000'
      return
    }

    console.log(`[ColorManager] Largest image found:`, {
      id: largestImage.id,
      size: largestImage.size,
      area: largestImage.size.width * largestImage.size.height
    })

    // Extract primary color from the largest image
    const color = await extractColorFromImage(largestImage.dataUrl)
    
    if (color) {
      const [r, g, b] = color
      const newBgColor = `rgba(${r}, ${g}, ${b}, 1)`
      const newTextColor = getTextColor(r, g, b)
      
      console.log(`[ColorManager] Extracted color RGB(${r}, ${g}, ${b})`)
      console.log(`[ColorManager] Setting backgroundColor: ${newBgColor}`)
      console.log(`[ColorManager] Setting textColor: ${newTextColor}`)
      
      artboard.backgroundColor = newBgColor
      artboard.textColor = newTextColor
    } else {
      console.log(`[ColorManager] Failed to extract color, using defaults`)
      // Fallback to default colors
      artboard.backgroundColor = 'rgba(255, 255, 255, 1)'
      artboard.textColor = '#000000'
    }
    
    console.log(`[ColorManager] Final artboard colors:`, {
      backgroundColor: artboard.backgroundColor,
      textColor: artboard.textColor
    })
  }

  // Update all artboards
  const updateAllArtboardColors = async () => {
    console.log(`[ColorManager] Updating all ${artboards.value.length} artboards`)
    const updatePromises = artboards.value.map(artboard => 
      updateArtboardColors(artboard.id)
    )
    await Promise.all(updatePromises)
  }

  // Watch for changes in images (size, position, artboard assignment)
  watch(
    images,
    async (newImages, oldImages) => {
      console.log('[ColorManager] Images changed, checking for updates')
      console.log(`[ColorManager] New images count: ${newImages.length}, Old images count: ${oldImages ? oldImages.length : 0}`)
      
      if (!oldImages) {
        console.log('[ColorManager] Initial load, updating all artboards')
        // Initial load, update all artboards
        await updateAllArtboardColors()
        return
      }

      const affectedArtboards = new Set<string>()

      // Check for added or removed images
      const newIds = new Set(newImages.map(img => img.id))
      const oldIds = new Set(oldImages.map(img => img.id))
      
      console.log(`[ColorManager] New image IDs:`, Array.from(newIds))
      console.log(`[ColorManager] Old image IDs:`, Array.from(oldIds))
      
      // Find removed images
      oldImages.forEach(img => {
        if (!newIds.has(img.id) && img.artboardId) {
          console.log(`[ColorManager] Image removed from artboard: ${img.id} from ${img.artboardId}`)
          affectedArtboards.add(img.artboardId)
        }
      })
      
      // Find added or modified images
      newImages.forEach(newImg => {
        const oldImg = oldImages.find(img => img.id === newImg.id)
        
        if (!oldImg) {
          // New image added
          console.log(`[ColorManager] New image detected: ${newImg.id}, artboardId: ${newImg.artboardId}`)
          if (newImg.artboardId) {
            console.log(`[ColorManager] New image added to artboard: ${newImg.id} to ${newImg.artboardId}`)
            affectedArtboards.add(newImg.artboardId)
          }
        } else {
          // Check for changes
          if (
            newImg.artboardId !== oldImg.artboardId ||
            newImg.size.width !== oldImg.size.width ||
            newImg.size.height !== oldImg.size.height
          ) {
            console.log(`[ColorManager] Image modified: ${newImg.id}`, {
              oldArtboard: oldImg.artboardId,
              newArtboard: newImg.artboardId,
              sizeChanged: newImg.size.width !== oldImg.size.width || newImg.size.height !== oldImg.size.height
            })
            if (newImg.artboardId) affectedArtboards.add(newImg.artboardId)
            if (oldImg.artboardId && oldImg.artboardId !== newImg.artboardId) {
              affectedArtboards.add(oldImg.artboardId)
            }
          }
        }
      })

      console.log(`[ColorManager] Affected artboards:`, Array.from(affectedArtboards))
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
      console.log('[ColorManager] Artboards changed, checking for updates')
      console.log('[ColorManager] New artboards count:', newArtboards.length)
      
      if (!oldArtboards) {
        console.log('[ColorManager] Initial artboards load, updating all')
        // Initial load, update all artboards
        await updateAllArtboardColors()
        return
      }
      
      console.log('[ColorManager] Old artboards count:', oldArtboards.length)

      const affectedArtboards = new Set<string>()

      newArtboards.forEach(newArtboard => {
        const oldArtboard = oldArtboards.find(a => a.id === newArtboard.id)
        
        if (!oldArtboard) {
          console.log(`[ColorManager] New artboard created: ${newArtboard.id}`, {
            children: newArtboard.children,
            childrenCount: newArtboard.children.length
          })
          // New artboard
          affectedArtboards.add(newArtboard.id)
        } else {
          // Check if children changed
          const oldChildrenStr = JSON.stringify(oldArtboard.children || [])
          const newChildrenStr = JSON.stringify(newArtboard.children || [])
          
          if (oldChildrenStr !== newChildrenStr) {
            console.log(`[ColorManager] Artboard children changed: ${newArtboard.id}`, {
              oldChildren: oldArtboard.children,
              newChildren: newArtboard.children,
              oldCount: oldArtboard.children.length,
              newCount: newArtboard.children.length
            })
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
            
            if (propsChanged.length > 0) {
              console.log(`[ColorManager] Artboard ${newArtboard.id} properties changed:`, propsChanged)
            }
          }
        }
      })

      console.log(`[ColorManager] Affected artboards from artboard watch:`, Array.from(affectedArtboards))
      // Update affected artboards
      const updatePromises = Array.from(affectedArtboards).map(artboardId =>
        updateArtboardColors(artboardId)
      )
      await Promise.all(updatePromises)
    },
    { deep: true }
  )

  // Initial color setup
  console.log('[ColorManager] Initializing color manager')
  console.log('[ColorManager] Initial artboards:', artboards.value.length)
  console.log('[ColorManager] Initial images:', images.value.length)
  
  // Check initial state
  artboards.value.forEach(artboard => {
    console.log(`[ColorManager] Initial artboard ${artboard.id}:`, {
      children: artboard.children,
      childrenCount: artboard.children.length
    })
  })
  
  images.value.forEach(img => {
    if (img.artboardId) {
      console.log(`[ColorManager] Initial image ${img.id} belongs to artboard:`, img.artboardId)
    }
  })
  
  updateAllArtboardColors()

  return {
    updateArtboardColors,
    updateAllArtboardColors
  }
}