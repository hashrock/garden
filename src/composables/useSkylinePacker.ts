import type { ImageItem, Point } from '../types'

export function useSkylinePacker() {
  
  // Square Grid Packing Algorithm - arranges items in a square-like grid
  // Kept for reference - not used anymore
  /*
  const tidyImages = (images: ImageItem[], startPosition?: Point): void => {
    if (images.length === 0) return
    
    // Calculate total area and estimate square dimensions
    let totalArea = 0
    let maxWidth = 0
    let maxHeight = 0
    
    for (const img of images) {
      totalArea += img.size.width * img.size.height
      maxWidth = Math.max(maxWidth, img.size.width)
      maxHeight = Math.max(maxHeight, img.size.height)
    }
    
    // Estimate the target square side length
    const targetSide = Math.sqrt(totalArea) * 1.3 // Add some padding factor
    
    // Calculate grid dimensions based on number of images
    const n = images.length
    const cols = Math.ceil(Math.sqrt(n * 1.5)) // Slightly more columns than rows for better aspect ratio
    // const rows = Math.ceil(n / cols)
    
    // Sort images by area (largest first) for better packing
    const sortedImages = [...images].sort((a, b) => {
      const areaA = a.size.width * a.size.height
      const areaB = b.size.width * b.size.height
      return areaB - areaA
    })
    
    // Use a bin packing approach with rows
    const spacing = 20 // Spacing between images
    let currentX = startPosition?.x || 0
    let currentY = startPosition?.y || 0
    let rowHeight = 0
    let itemsInRow = 0
    let rowWidth = 0
    
    // Calculate average dimensions for better layout
    const avgWidth = images.reduce((sum, img) => sum + img.size.width, 0) / images.length
    // const avgHeight = images.reduce((sum, img) => sum + img.size.height, 0) / images.length
    
    // Target row width based on square layout
    const targetRowWidth = Math.max(
      targetSide,
      cols * avgWidth + (cols - 1) * spacing
    )
    
    // Simple grid packing with dynamic rows
    for (let i = 0; i < sortedImages.length; i++) {
      const image = sortedImages[i]
      
      // Check if we need to start a new row
      if (itemsInRow > 0 && (
        rowWidth + image.size.width + spacing > targetRowWidth ||
        itemsInRow >= cols
      )) {
        // Move to next row
        currentX = startPosition?.x || 0
        currentY += rowHeight + spacing
        rowHeight = 0
        itemsInRow = 0
        rowWidth = 0
      }
      
      // Place the image
      image.position = { x: currentX, y: currentY }
      
      // Update position for next image
      currentX += image.size.width + spacing
      rowWidth += image.size.width + (itemsInRow > 0 ? spacing : 0)
      rowHeight = Math.max(rowHeight, image.size.height)
      itemsInRow++
    }
  }
  */
  
  // Compact Bin Packing - much tighter packing algorithm
  const tidyImagesCompact = (images: ImageItem[], startPosition?: Point): void => {
    if (images.length === 0) return
    
    const spacing = 10 // Reduced spacing for more compact layout
    const startX = startPosition?.x || 0
    const startY = startPosition?.y || 0
    
    // Sort images by area (largest first) for better packing
    const sortedImages = [...images].sort((a, b) => {
      const areaA = a.size.width * a.size.height
      const areaB = b.size.width * b.size.height
      return areaB - areaA
    })
    
    // Calculate optimal container width based on total area
    // const totalArea = sortedImages.reduce((sum, img) => 
    //   sum + (img.size.width + spacing) * (img.size.height + spacing), 0
    // )
    // const containerWidth = Math.sqrt(totalArea) * 1.1 // Slightly wider than square
    
    // Track occupied spaces for tighter packing
    interface Space {
      x: number
      y: number
      width: number
      height: number
    }
    
    const occupiedSpaces: Space[] = []
    
    // Find the lowest available position that fits the image
    const findBestPosition = (width: number, height: number): Point => {
      let bestX = startX
      let bestY = startY
      let minWaste = Infinity
      
      // Try to place at the start first
      if (occupiedSpaces.length === 0) {
        return { x: startX, y: startY }
      }
      
      // Generate potential positions
      const potentialPositions: Point[] = [
        { x: startX, y: startY }
      ]
      
      // Add positions to the right and below existing items
      for (const space of occupiedSpaces) {
        potentialPositions.push(
          { x: space.x + space.width + spacing, y: space.y },
          { x: space.x, y: space.y + space.height + spacing }
        )
      }
      
      // Test each position
      for (const pos of potentialPositions) {
        // Check if position is valid (no overlaps)
        let isValid = true
        for (const space of occupiedSpaces) {
          if (!(pos.x + width + spacing <= space.x || 
                pos.x >= space.x + space.width + spacing ||
                pos.y + height + spacing <= space.y || 
                pos.y >= space.y + space.height + spacing)) {
            isValid = false
            break
          }
        }
        
        if (isValid) {
          // Calculate waste (distance from origin + empty area)
          const waste = Math.sqrt(pos.x * pos.x + pos.y * pos.y)
          
          // Prefer positions that keep layout compact
          if (waste < minWaste || 
              (waste === minWaste && pos.y < bestY) ||
              (waste === minWaste && pos.y === bestY && pos.x < bestX)) {
            bestX = pos.x
            bestY = pos.y
            minWaste = waste
          }
        }
      }
      
      return { x: bestX, y: bestY }
    }
    
    // Place each image
    for (const image of sortedImages) {
      const position = findBestPosition(image.size.width, image.size.height)
      
      image.position = position
      
      // Mark space as occupied
      occupiedSpaces.push({
        x: position.x,
        y: position.y,
        width: image.size.width,
        height: image.size.height
      })
    }
    
    // Final adjustment: shift all images to remove any gap at the start
    if (occupiedSpaces.length > 0) {
      const minX = Math.min(...occupiedSpaces.map(s => s.x))
      const minY = Math.min(...occupiedSpaces.map(s => s.y))
      const offsetX = startX - minX
      const offsetY = startY - minY
      
      if (offsetX !== 0 || offsetY !== 0) {
        for (const image of images) {
          image.position.x += offsetX
          image.position.y += offsetY
        }
      }
    }
  }
  
  return {
    tidyImages: tidyImagesCompact // Use compact bin packing for tighter arrangement
  }
}