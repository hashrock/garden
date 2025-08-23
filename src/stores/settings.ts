import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const autoScaleImages = ref(true) // Default to enabled
  const maxImageSize = ref(1200) // Maximum size in pixels
  
  const toggleAutoScaleImages = () => {
    autoScaleImages.value = !autoScaleImages.value
  }
  
  const setMaxImageSize = (size: number) => {
    maxImageSize.value = size
  }
  
  // Calculate scaled dimensions using logarithmic scaling
  const getScaledDimensions = (originalWidth: number, originalHeight: number): { width: number, height: number } => {
    if (!autoScaleImages.value) {
      return { width: originalWidth, height: originalHeight }
    }
    
    const maxDim = Math.max(originalWidth, originalHeight)
    
    if (maxDim <= maxImageSize.value) {
      return { width: originalWidth, height: originalHeight }
    }
    
    // Use logarithmic scaling for smooth size reduction
    // The larger the image, the more aggressive the scaling
    const scaleFactor = maxImageSize.value / maxDim
    
    // Apply a logarithmic curve to make the scaling more gradual
    // This ensures very large images are scaled more aggressively
    // while images close to the limit are scaled less
    const logScale = 1 - Math.log10(maxDim / maxImageSize.value) / 3
    const adjustedScale = scaleFactor * logScale
    
    // Ensure minimum scale of 0.1 (10% of original)
    const finalScale = Math.max(adjustedScale, 0.1)
    
    return {
      width: Math.round(originalWidth * finalScale),
      height: Math.round(originalHeight * finalScale)
    }
  }
  
  return {
    autoScaleImages,
    maxImageSize,
    toggleAutoScaleImages,
    setMaxImageSize,
    getScaledDimensions
  }
})