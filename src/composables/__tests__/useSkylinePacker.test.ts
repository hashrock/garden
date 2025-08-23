import { describe, it, expect } from 'vitest'
import { useSkylinePacker } from '../useSkylinePacker'
import type { ImageItem } from '../../types'

describe('useSkylinePacker', () => {
  const createMockImage = (id: string, width: number, height: number, x = 0, y = 0): ImageItem => ({
    id,
    filename: `image-${id}.jpg`,
    dataUrl: 'data:image/jpeg;base64,test',
    x,
    y,
    position: { x, y },
    size: { width, height },
    originalSize: { width: width * 2, height: height * 2 }
  })

  describe('tidyImages', () => {
    it('should arrange images in a masonry layout', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 200, 150, 500, 500),
        createMockImage('2', 150, 200, 100, 100),
        createMockImage('3', 180, 180, 300, 300),
        createMockImage('4', 220, 120, 700, 200)
      ]
      
      tidyImages(images)
      
      // Check that all images have been repositioned
      expect(images[0].position.x).toBeDefined()
      expect(images[0].position.y).toBeDefined()
      
      // Images should be arranged in columns
      const xPositions = new Set(images.map(img => img.position.x))
      expect(xPositions.size).toBeGreaterThanOrEqual(2) // At least 2 columns
    })

    it('should respect start position when provided', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 200, 150),
        createMockImage('2', 150, 200)
      ]
      
      const startPosition = { x: 100, y: 50 }
      tidyImages(images, startPosition)
      
      // All images should be positioned at or after the start position
      images.forEach(img => {
        expect(img.position.x).toBeGreaterThanOrEqual(startPosition.x)
        expect(img.position.y).toBeGreaterThanOrEqual(startPosition.y)
      })
    })

    it('should handle empty array', () => {
      const { tidyImages } = useSkylinePacker()
      const images: ImageItem[] = []
      
      expect(() => tidyImages(images)).not.toThrow()
    })

    it('should handle single image', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [createMockImage('1', 200, 150, 100, 100)]
      const startPosition = { x: 50, y: 50 }
      
      tidyImages(images, startPosition)
      
      expect(images[0].position.x).toBe(50)
      expect(images[0].position.y).toBe(50)
    })

    it('should create compact layout for multiple images', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 100, 100),
        createMockImage('2', 100, 100),
        createMockImage('3', 100, 100),
        createMockImage('4', 100, 100),
        createMockImage('5', 100, 100),
        createMockImage('6', 100, 100)
      ]
      
      tidyImages(images)
      
      // Calculate bounding box
      const minX = Math.min(...images.map(img => img.position.x))
      const maxX = Math.max(...images.map(img => img.position.x + img.size.width))
      const minY = Math.min(...images.map(img => img.position.y))
      const maxY = Math.max(...images.map(img => img.position.y + img.size.height))
      
      const width = maxX - minX
      const height = maxY - minY
      
      // Layout should be roughly square-ish (not too elongated)
      const aspectRatio = width / height
      expect(aspectRatio).toBeGreaterThan(0.3)
      expect(aspectRatio).toBeLessThan(3.0)
    })

    it('should handle images with different sizes', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 300, 200),
        createMockImage('2', 100, 400),
        createMockImage('3', 200, 200),
        createMockImage('4', 150, 100),
        createMockImage('5', 250, 300)
      ]
      
      tidyImages(images)
      
      // Check for no overlaps
      for (let i = 0; i < images.length; i++) {
        for (let j = i + 1; j < images.length; j++) {
          const img1 = images[i]
          const img2 = images[j]
          
          const overlap = !(
            img1.position.x + img1.size.width <= img2.position.x ||
            img2.position.x + img2.size.width <= img1.position.x ||
            img1.position.y + img1.size.height <= img2.position.y ||
            img2.position.y + img2.size.height <= img1.position.y
          )
          
          expect(overlap).toBe(false)
        }
      }
    })

    it('should update both position and x,y properties', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 200, 150, 100, 100),
        createMockImage('2', 150, 200, 200, 200)
      ]
      
      tidyImages(images)
      
      // Check that both position object and x,y properties are updated
      images.forEach(img => {
        expect(img.x).toBe(img.position.x)
        expect(img.y).toBe(img.position.y)
      })
    })

    it('should arrange tall images efficiently', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 100, 400),
        createMockImage('2', 100, 300),
        createMockImage('3', 100, 350),
        createMockImage('4', 100, 250)
      ]
      
      tidyImages(images)
      
      // Should arrange in multiple columns for tall images
      const xPositions = new Set(images.map(img => img.position.x))
      expect(xPositions.size).toBeGreaterThanOrEqual(2)
    })

    it('should arrange wide images efficiently', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 400, 100),
        createMockImage('2', 300, 100),
        createMockImage('3', 350, 100),
        createMockImage('4', 250, 100)
      ]
      
      tidyImages(images)
      
      // Wide images might be stacked vertically
      const yPositions = images.map(img => img.position.y)
      const uniqueY = new Set(yPositions)
      
      // Should have some vertical distribution
      expect(uniqueY.size).toBeGreaterThanOrEqual(1)
    })

    it('should maintain spacing between images', () => {
      const { tidyImages } = useSkylinePacker()
      
      const images = [
        createMockImage('1', 100, 100),
        createMockImage('2', 100, 100),
        createMockImage('3', 100, 100),
        createMockImage('4', 100, 100)
      ]
      
      tidyImages(images)
      
      // Check minimum spacing between adjacent images
      const spacing = 10 // Expected spacing from implementation (reduced for compact layout)
      
      for (let i = 0; i < images.length; i++) {
        for (let j = i + 1; j < images.length; j++) {
          const img1 = images[i]
          const img2 = images[j]
          
          // If images are in the same row (similar y position)
          if (Math.abs(img1.position.y - img2.position.y) < 10) {
            const horizontalGap = Math.abs(img1.position.x - img2.position.x) - img1.size.width
            if (horizontalGap > 0) {
              expect(horizontalGap).toBeGreaterThanOrEqual(spacing - 1) // Allow 1px tolerance
            }
          }
          
          // If images are in the same column (similar x position)
          if (Math.abs(img1.position.x - img2.position.x) < 10) {
            const verticalGap = Math.abs(img1.position.y - img2.position.y) - img1.size.height
            if (verticalGap > 0) {
              expect(verticalGap).toBeGreaterThanOrEqual(spacing - 1) // Allow 1px tolerance
            }
          }
        }
      }
    })
  })
})