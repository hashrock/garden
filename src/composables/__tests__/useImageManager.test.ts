import { describe, it, expect, beforeEach } from 'vitest'
import { useImageManager } from '../useImageManager'

// Image のモック
global.Image = class {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 100
  height = 100
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
} as any

describe('useImageManager', () => {
  let imageManager: ReturnType<typeof useImageManager>
  
  beforeEach(() => {
    imageManager = useImageManager()
  })
  
  describe('画像の追加', () => {
    it('Fileから画像を追加できる', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const image = await imageManager.addImage(file, { x: 10, y: 20 })
      
      expect(image).not.toBeNull()
      expect(image?.filename).toBe('test.png')
      expect(image?.position).toEqual({ x: 10, y: 20 })
      expect(imageManager.images.value).toHaveLength(1)
    })
    
    it('DataURLから画像を追加できる', async () => {
      const dataUrl = 'data:image/png;base64,test'
      const image = await imageManager.addImageFromDataUrl(dataUrl, 'pasted.png', { x: 30, y: 40 })
      
      expect(image).not.toBeNull()
      expect(image?.filename).toBe('pasted.png')
      expect(image?.dataUrl).toBe(dataUrl)
      expect(imageManager.images.value).toHaveLength(1)
    })
  })
  
  describe('画像の選択', () => {
    beforeEach(async () => {
      const dataUrl = 'data:image/png;base64,test'
      await imageManager.addImageFromDataUrl(dataUrl, 'test1.png')
      await imageManager.addImageFromDataUrl(dataUrl, 'test2.png')
    })
    
    it('画像を選択できる', () => {
      const image = imageManager.images.value[0]
      imageManager.selectImage(image.id)
      
      expect(imageManager.selectedImageIds.value.has(image.id)).toBe(true)
      expect(imageManager.selectedImages.value).toHaveLength(1)
    })
    
    it('複数選択ができる', () => {
      const image1 = imageManager.images.value[0]
      const image2 = imageManager.images.value[1]
      
      imageManager.selectImage(image1.id, true)
      imageManager.selectImage(image2.id, true)
      
      expect(imageManager.selectedImageIds.value.size).toBe(2)
      expect(imageManager.selectedImages.value).toHaveLength(2)
    })
    
    it('全選択ができる', () => {
      imageManager.selectAll()
      
      expect(imageManager.selectedImageIds.value.size).toBe(2)
      expect(imageManager.selectedImages.value).toHaveLength(2)
    })
    
    it('選択をクリアできる', () => {
      imageManager.selectAll()
      imageManager.clearSelection()
      
      expect(imageManager.selectedImageIds.value.size).toBe(0)
      expect(imageManager.selectedImages.value).toHaveLength(0)
    })
  })
  
  describe('画像の削除', () => {
    beforeEach(async () => {
      const dataUrl = 'data:image/png;base64,test'
      await imageManager.addImageFromDataUrl(dataUrl, 'test1.png')
      await imageManager.addImageFromDataUrl(dataUrl, 'test2.png')
    })
    
    it('特定の画像を削除できる', () => {
      const image = imageManager.images.value[0]
      imageManager.removeImage(image.id)
      
      expect(imageManager.images.value).toHaveLength(1)
      expect(imageManager.images.value[0].id).not.toBe(image.id)
    })
    
    it('選択した画像を削除できる', () => {
      imageManager.selectAll()
      imageManager.removeSelectedImages()
      
      expect(imageManager.images.value).toHaveLength(0)
      expect(imageManager.selectedImageIds.value.size).toBe(0)
    })
  })
  
  describe('画像の位置とサイズ', () => {
    let image: any
    
    beforeEach(async () => {
      const dataUrl = 'data:image/png;base64,test'
      image = await imageManager.addImageFromDataUrl(dataUrl, 'test.png')
    })
    
    it('画像の位置を更新できる', () => {
      imageManager.updateImagePosition(image.id, { x: 50, y: 60 })
      
      const updatedImage = imageManager.images.value[0]
      expect(updatedImage.position).toEqual({ x: 50, y: 60 })
    })
    
    it('画像のサイズを更新できる', () => {
      imageManager.updateImageSize(image.id, { width: 200, height: 150 })
      
      const updatedImage = imageManager.images.value[0]
      expect(updatedImage.size).toEqual({ width: 200, height: 150 })
    })
  })
  
  describe('画像の検索', () => {
    beforeEach(async () => {
      const dataUrl = 'data:image/png;base64,test'
      await imageManager.addImageFromDataUrl(dataUrl, 'test1.png', { x: 0, y: 0 })
      await imageManager.addImageFromDataUrl(dataUrl, 'test2.png', { x: 200, y: 200 })
    })
    
    it('座標から画像を取得できる', () => {
      const image = imageManager.getImageAt({ x: 50, y: 50 })
      
      expect(image).not.toBeNull()
      expect(image?.filename).toBe('test1.png')
    })
    
    it('矩形範囲内の画像を取得できる', () => {
      const images = imageManager.getImagesInRect(0, 0, 150, 150)
      
      expect(images).toHaveLength(1)
      expect(images[0].filename).toBe('test1.png')
    })
    
    it('複数の画像が矩形範囲内にある場合', () => {
      const images = imageManager.getImagesInRect(0, 0, 300, 300)
      
      expect(images).toHaveLength(2)
    })
  })
  
  describe('zIndex管理', () => {
    beforeEach(async () => {
      const dataUrl = 'data:image/png;base64,test'
      await imageManager.addImageFromDataUrl(dataUrl, 'test1.png')
      await imageManager.addImageFromDataUrl(dataUrl, 'test2.png')
    })
    
    it('新しい画像は高いzIndexを持つ', () => {
      const [image1, image2] = imageManager.images.value
      expect(image2.zIndex).toBeGreaterThan(image1.zIndex)
    })
    
    it('画像を最前面に持ってこれる', () => {
      const image1 = imageManager.images.value[0]
      const originalZIndex = image1.zIndex
      
      imageManager.bringToFront(image1.id)
      
      expect(image1.zIndex).toBeGreaterThan(originalZIndex)
      expect(image1.zIndex).toBeGreaterThan(imageManager.images.value[1].zIndex)
    })
  })
})