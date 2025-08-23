import { describe, it, expect, beforeEach } from 'vitest'
import { useTouch } from '../useTouch'

describe('useTouch', () => {
  let touch: ReturnType<typeof useTouch>
  
  beforeEach(() => {
    touch = useTouch()
  })
  
  describe('ポインター管理', () => {
    it('ポインターを追加できる', () => {
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      
      const pointer = touch.addPointer(event)
      
      expect(pointer).toEqual({
        id: 1,
        x: 100,
        y: 200
      })
      expect(touch.pointerCount.value).toBe(1)
    })
    
    it('ポインターを更新できる', () => {
      const addEvent = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      touch.addPointer(addEvent)
      
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 150,
        clientY: 250
      })
      const updated = touch.updatePointer(moveEvent)
      
      expect(updated).toEqual({
        id: 1,
        x: 150,
        y: 250
      })
    })
    
    it('ポインターを削除できる', () => {
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      touch.addPointer(event)
      
      const upEvent = new PointerEvent('pointerup', { pointerId: 1 })
      touch.removePointer(upEvent)
      
      expect(touch.pointerCount.value).toBe(0)
    })
    
    it('複数のポインターを管理できる', () => {
      const event1 = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      const event2 = new PointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 300,
        clientY: 400
      })
      
      touch.addPointer(event1)
      touch.addPointer(event2)
      
      expect(touch.pointerCount.value).toBe(2)
      
      const twoPointers = touch.getTwoPointers()
      expect(twoPointers).not.toBeNull()
      expect(twoPointers).toHaveLength(2)
    })
  })
  
  describe('ピンチジェスチャー', () => {
    beforeEach(() => {
      const event1 = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      const event2 = new PointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 200,
        clientY: 200
      })
      
      touch.addPointer(event1)
      touch.addPointer(event2)
    })
    
    it('ピンチを開始できる', () => {
      const started = touch.startPinch(1.0)
      
      expect(started).toBe(true)
      expect(touch.isPinching.value).toBe(true)
      expect(touch.initialPinchZoom.value).toBe(1.0)
    })
    
    it('ピンチの更新で距離を計算できる', () => {
      touch.startPinch(1.0)
      
      const moveEvent1 = new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 50,
        clientY: 200
      })
      const moveEvent2 = new PointerEvent('pointermove', {
        pointerId: 2,
        clientX: 250,
        clientY: 200
      })
      
      touch.updatePointer(moveEvent1)
      touch.updatePointer(moveEvent2)
      
      const pinchData = touch.updatePinch()
      
      expect(pinchData).not.toBeNull()
      expect(pinchData?.scale).toBeGreaterThan(1)
      expect(pinchData?.center).toEqual({ x: 150, y: 200 })
    })
    
    it('ピンチを終了できる', () => {
      touch.startPinch(1.0)
      touch.endPinch()
      
      expect(touch.isPinching.value).toBe(false)
    })
    
    it('ポインターが2つ未満の場合ピンチを開始できない', () => {
      touch.clearPointers()
      
      const event = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      touch.addPointer(event)
      
      const started = touch.startPinch(1.0)
      
      expect(started).toBe(false)
      expect(touch.isPinching.value).toBe(false)
    })
  })
  
  describe('距離と中心点の計算', () => {
    it('2点間の距離を計算できる', () => {
      const p1 = { id: 1, x: 0, y: 0 }
      const p2 = { id: 2, x: 3, y: 4 }
      
      const distance = touch.getDistance(p1, p2)
      
      expect(distance).toBe(5)
    })
    
    it('2点の中心点を計算できる', () => {
      const p1 = { id: 1, x: 100, y: 200 }
      const p2 = { id: 2, x: 300, y: 400 }
      
      const center = touch.getCenter(p1, p2)
      
      expect(center).toEqual({ x: 200, y: 300 })
    })
  })
  
  describe('トラックパッドピンチ', () => {
    it('Ctrl+ホイールでピンチを検出できる', () => {
      const event = {
        deltaY: -100,
        ctrlKey: true,
        clientX: 400,
        clientY: 300,
        preventDefault: () => {}
      } as WheelEvent
      
      const pinchData = touch.handleTrackpadPinch(event)
      
      expect(pinchData).not.toBeNull()
      expect(pinchData?.scale).toBeGreaterThan(1)
      expect(pinchData?.center).toEqual({ x: 400, y: 300 })
    })
    
    it('Ctrlキーなしの場合はnullを返す', () => {
      const event = {
        deltaY: -100,
        ctrlKey: false,
        clientX: 400,
        clientY: 300,
        preventDefault: () => {}
      } as WheelEvent
      
      const pinchData = touch.handleTrackpadPinch(event)
      
      expect(pinchData).toBeNull()
    })
    
    it('ホイール下方向でズームアウト', () => {
      const event = {
        deltaY: 100,
        ctrlKey: true,
        clientX: 400,
        clientY: 300,
        preventDefault: () => {}
      } as WheelEvent
      
      const pinchData = touch.handleTrackpadPinch(event)
      
      expect(pinchData).not.toBeNull()
      expect(pinchData?.scale).toBeLessThan(1)
    })
  })
  
  describe('ポインターのクリア', () => {
    it('すべてのポインターをクリアできる', () => {
      const event1 = new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: 100,
        clientY: 200
      })
      const event2 = new PointerEvent('pointerdown', {
        pointerId: 2,
        clientX: 300,
        clientY: 400
      })
      
      touch.addPointer(event1)
      touch.addPointer(event2)
      touch.startPinch(1.0)
      
      touch.clearPointers()
      
      expect(touch.pointerCount.value).toBe(0)
      expect(touch.isPinching.value).toBe(false)
    })
  })
})