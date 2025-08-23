import { TarBuilder, TarExtractor } from '../utils/tar'
import type { ImageItem, ProjectData } from '../types'

export function useProjectIO() {
  const compressData = async (data: Uint8Array): Promise<Uint8Array> => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      }
    })
    
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
    const chunks: Uint8Array[] = []
    const reader = compressedStream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    
    return result
  }

  const decompressData = async (data: Uint8Array): Promise<Uint8Array> => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      }
    })
    
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
    const chunks: Uint8Array[] = []
    const reader = decompressedStream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    
    return result
  }

  const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    
    return bytes
  }

  const uint8ArrayToDataUrl = (bytes: Uint8Array, mimeType: string): string => {
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    const base64 = btoa(binary)
    return `data:${mimeType};base64,${base64}`
  }

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  const saveProject = async (images: ImageItem[], viewport: any, canvasSize: any): Promise<Blob> => {
    const projectData: ProjectData = {
      version: '1.0.0',
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      canvas: {
        width: canvasSize.width,
        height: canvasSize.height,
        viewport
      },
      images: images.map(({ dataUrl, ...rest }) => rest)
    }
    
    const tarBuilder = new TarBuilder()
    
    tarBuilder.addFile('project.json', JSON.stringify(projectData, null, 2))
    
    for (const image of images) {
      const imageData = dataUrlToUint8Array(image.dataUrl)
      tarBuilder.addFile(`images/${image.filename}`, imageData)
    }
    
    const tarData = tarBuilder.build()
    const compressedData = await compressData(tarData)
    
    return new Blob([compressedData], { type: 'application/gzip' })
  }

  const loadProject = async (file: File): Promise<{
    projectData: ProjectData
    images: ImageItem[]
  } | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const compressed = new Uint8Array(arrayBuffer)
      const tarData = await decompressData(compressed)
      
      const extractor = new TarExtractor()
      const files = extractor.extract(tarData)
      
      const projectFile = files.find(f => f.name === 'project.json')
      if (!projectFile) {
        throw new Error('Invalid project file: missing project.json')
      }
      
      const projectJson = new TextDecoder().decode(projectFile.data)
      const projectData = JSON.parse(projectJson) as ProjectData
      
      const imageMap = new Map<string, string>()
      for (const file of files) {
        if (file.name.startsWith('images/')) {
          const filename = file.name.replace('images/', '')
          const mimeType = getMimeType(filename)
          const dataUrl = uint8ArrayToDataUrl(file.data, mimeType)
          imageMap.set(filename, dataUrl)
        }
      }
      
      const images: ImageItem[] = projectData.images.map(imageData => ({
        ...imageData,
        dataUrl: imageMap.get(imageData.filename) || ''
      }))
      
      return { projectData, images }
    } catch (error) {
      console.error('Failed to load project:', error)
      return null
    }
  }

  const downloadProject = async (images: ImageItem[], viewport: any, canvasSize: any) => {
    const blob = await saveProject(images, viewport, canvasSize)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `garden-project-${Date.now()}.garden`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    saveProject,
    loadProject,
    downloadProject
  }
}