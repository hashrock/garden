import { describe, it, expect, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useCanvas } from '../useCanvas'

describe('useCanvas', () => {
  let canvasRef: Ref<HTMLCanvasElement | null>
  let canvas: ReturnType<typeof useCanvas>

  beforeEach(() => {
    const mockCanvas = {
      width: 800,
      height: 600
    } as HTMLCanvasElement
    canvasRef = ref(mockCanvas) as Ref<HTMLCanvasElement | null>
    canvas = useCanvas(canvasRef)
  })

  describe('座標変換', () => {
    it('スクリーン座標をキャンバス座標に変換できる', () => {
      const result = canvas.screenToCanvas(100, 100)
      expect(result).toEqual({ x: 100, y: 100 })
    })

    it('ズーム時の座標変換が正しい', () => {
      canvas.zoom(1, 400, 300)
      const result = canvas.screenToCanvas(400, 300)
      expect(result.x).toBeCloseTo(400, 2)
      expect(result.y).toBeCloseTo(300, 2)
    })

    it('キャンバス座標をスクリーン座標に変換できる', () => {
      const result = canvas.canvasToScreen(100, 100)
      expect(result).toEqual({ x: 100, y: 100 })
    })

    it('パン後の座標変換が正しい', () => {
      canvas.startPan(0, 0)
      canvas.updatePan(50, 50)
      const result = canvas.screenToCanvas(150, 150)
      expect(result).toEqual({ x: 100, y: 100 })
    })
  })

  describe('パン操作', () => {
    it('パンを開始できる', () => {
      canvas.startPan(100, 100)
      expect(canvas.isPanning.value).toBe(true)
    })

    it('パンを更新できる', () => {
      canvas.startPan(100, 100)
      canvas.updatePan(150, 150)
      expect(canvas.viewport.value.x).toBe(50)
      expect(canvas.viewport.value.y).toBe(50)
    })

    it('パンを終了できる', () => {
      canvas.startPan(100, 100)
      canvas.endPan()
      expect(canvas.isPanning.value).toBe(false)
    })

    it('パン開始前は更新されない', () => {
      canvas.updatePan(150, 150)
      expect(canvas.viewport.value.x).toBe(0)
      expect(canvas.viewport.value.y).toBe(0)
    })
  })

  describe('ズーム操作', () => {
    it('ズームインできる', () => {
      const initialZoom = canvas.viewport.value.zoom
      canvas.zoom(1, 400, 300)
      expect(canvas.viewport.value.zoom).toBeGreaterThan(initialZoom)
    })

    it('ズームアウトできる', () => {
      const initialZoom = canvas.viewport.value.zoom
      canvas.zoom(-1, 400, 300)
      expect(canvas.viewport.value.zoom).toBeLessThan(initialZoom)
    })

    it('最小ズームレベルを超えない', () => {
      for (let i = 0; i < 100; i++) {
        canvas.zoom(-1, 400, 300)
      }
      expect(canvas.viewport.value.zoom).toBeGreaterThanOrEqual(0.1)
    })

    it('最大ズームレベルを超えない', () => {
      for (let i = 0; i < 100; i++) {
        canvas.zoom(1, 400, 300)
      }
      expect(canvas.viewport.value.zoom).toBeLessThanOrEqual(5)
    })

    it('ズーム中心が保持される', () => {
      const centerBefore = canvas.screenToCanvas(400, 300)
      canvas.zoom(1, 400, 300)
      const centerAfter = canvas.screenToCanvas(400, 300)
      expect(centerAfter.x).toBeCloseTo(centerBefore.x, 1)
      expect(centerAfter.y).toBeCloseTo(centerBefore.y, 1)
    })
  })

  describe('ビューポート管理', () => {
    it('ビューポートをリセットできる', () => {
      canvas.zoom(2, 400, 300)
      canvas.startPan(0, 0)
      canvas.updatePan(100, 100)
      canvas.resetViewport()
      
      expect(canvas.viewport.value).toEqual({
        x: 0,
        y: 0,
        zoom: 1
      })
    })

    it('コンテンツを画面にフィットできる', () => {
      canvas.fitToScreen(1000, 1000)
      
      expect(canvas.viewport.value.zoom).toBeCloseTo(0.54, 2)
      expect(canvas.viewport.value.x).toBeCloseTo(130, 0)
      expect(canvas.viewport.value.y).toBeCloseTo(30, 0)
    })

    it('キャンバスが存在しない場合はフィット処理をスキップ', () => {
      canvasRef.value = null
      const initialViewport = { ...canvas.viewport.value }
      canvas.fitToScreen(1000, 1000)
      
      expect(canvas.viewport.value).toEqual(initialViewport)
    })
  })
})