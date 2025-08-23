import { ref } from 'vue'

export function useImageCache() {
  const imageCache = ref<Map<string, HTMLImageElement>>(new Map())
  const loadingImages = ref<Set<string>>(new Set())

  const getImage = (id: string, dataUrl: string): HTMLImageElement | null => {
    // キャッシュに存在する場合はそれを返す
    if (imageCache.value.has(id)) {
      return imageCache.value.get(id)!
    }

    // 読み込み中の場合はnullを返す
    if (loadingImages.value.has(id)) {
      return null
    }

    // 新しい画像を読み込む
    loadingImages.value.add(id)
    const img = new Image()
    
    img.onload = () => {
      imageCache.value.set(id, img)
      loadingImages.value.delete(id)
    }
    
    img.onerror = () => {
      loadingImages.value.delete(id)
    }
    
    img.src = dataUrl
    
    return null
  }

  const clearCache = () => {
    imageCache.value.clear()
    loadingImages.value.clear()
  }

  const removeFromCache = (id: string) => {
    imageCache.value.delete(id)
    loadingImages.value.delete(id)
  }

  return {
    getImage,
    clearCache,
    removeFromCache
  }
}