export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface Group {
  id: string
  name: string
  position: Point
  size: Size
  children: string[]
  zIndex: number
  selected?: boolean
  expanded: boolean
  backgroundColor?: string
  borderColor?: string
}

export interface ImageItem {
  id: string
  filename: string
  dataUrl: string
  position: Point
  size: Size
  originalSize: Size
  rotation: number
  zIndex: number
  selected?: boolean
  groupId?: string
}

export interface ProjectMetadata {
  version: string
  created: string
  modified: string
}

export interface CanvasState {
  width: number
  height: number
  viewport: Viewport
}

export interface ProjectData {
  version: string
  metadata: ProjectMetadata
  canvas: CanvasState
  images: Omit<ImageItem, 'dataUrl'>[]
}