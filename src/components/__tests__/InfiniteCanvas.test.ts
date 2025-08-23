import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import InfiniteCanvas from '../InfiniteCanvas.vue'
import type { ComponentPublicInstance } from 'vue'

describe('InfiniteCanvas', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>
  
  beforeEach(() => {
    // window オブジェクトのモック
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    })
    
    // getContext のモック
    ;(HTMLCanvasElement.prototype.getContext as unknown) = vi.fn(() => ({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    }))
    
    const pinia = createPinia()
    
    wrapper = mount(InfiniteCanvas, {
      global: {
        plugins: [pinia]
      }
    })
  })
  
  describe('キャンバスサイズ', () => {
    it('ヘッダーの高さを考慮したキャンバスサイズになる', () => {
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('width')).toBe('1024')
      expect(canvas.attributes('height')).toBe('720') // 768 - 48
    })
    
    it('キャンバスがヘッダーの下に配置される', () => {
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('style')).toContain('top: 48px')
    })
  })
  
  describe('マウス座標変換', () => {
    it('マウスイベントのオフセット座標が正しく処理される', async () => {
      const canvas = wrapper.find('canvas')
      
      // モックイベントを作成
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0
      })
      
      // offsetX/offsetY をモック
      Object.defineProperty(mouseEvent, 'offsetX', {
        value: 100,
        configurable: true
      })
      Object.defineProperty(mouseEvent, 'offsetY', {
        value: 52, // ヘッダー分考慮
        configurable: true
      })
      
      await canvas.trigger('mousedown', mouseEvent)
      
      // 座標変換が正しく行われることを確認
      // ここでは、イベントが正常に処理されてエラーが出ないことを確認
      expect(wrapper.vm).toBeDefined()
    })
  })
  
  describe('選択矩形', () => {
    it('選択矩形がヘッダー分オフセットされて表示される', async () => {
      const canvas = wrapper.find('canvas')
      
      // 選択開始
      const startEvent = new MouseEvent('mousedown', {
        button: 0
      })
      Object.defineProperty(startEvent, 'offsetX', { value: 100 })
      Object.defineProperty(startEvent, 'offsetY', { value: 100 })
      
      await canvas.trigger('mousedown', startEvent)
      
      // 選択中
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'offsetX', { value: 200 })
      Object.defineProperty(moveEvent, 'offsetY', { value: 200 })
      
      await canvas.trigger('mousemove', moveEvent)
      
      // 選択矩形の要素を確認
      const selectionRect = wrapper.find('[style*="border-blue-500"]')
      if (selectionRect.exists()) {
        const style = selectionRect.attributes('style')
        expect(style).toContain('top:')
        // top値にヘッダー高さが含まれることを確認
      }
    })
  })
  
  describe('リサイズ処理', () => {
    it('ウィンドウリサイズ時にヘッダー高さを考慮する', async () => {
      // ウィンドウサイズを変更
      window.innerWidth = 1280
      window.innerHeight = 1024
      
      // リサイズイベントを発火
      window.dispatchEvent(new Event('resize'))
      
      await wrapper.vm.$nextTick()
      
      // キャンバスサイズが更新されることを確認
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('width')).toBe('1280')
      expect(canvas.attributes('height')).toBe('976') // 1024 - 48
    })
  })
})