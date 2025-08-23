import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ImageTextEditor from '../ImageTextEditor.vue'
import type { ImageItem } from '../../types'

describe('ImageTextEditor UI Tests', () => {
  let mockImage: ImageItem

  beforeEach(() => {
    mockImage = {
      id: 'test-id',
      filename: 'test.jpg',
      dataUrl: 'data:image/jpeg;base64,test',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 150 },
      originalSize: { width: 400, height: 300 },
      rotation: 0,
      zIndex: 1,
      title: 'Test Title',
      description: 'Test Description'
    }
    
    // Clear all timers after each test
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('should not close when typing in title input', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    
    // Type multiple characters
    await titleInput.setValue('N')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await titleInput.setValue('Ne')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await titleInput.setValue('New')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await titleInput.setValue('New Title')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Editor should still be visible
    expect(wrapper.find('.image-text-editor').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('should not close when typing in description textarea', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const descriptionTextarea = wrapper.find('textarea')
    
    // Type multiple characters
    await descriptionTextarea.setValue('N')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await descriptionTextarea.setValue('Ne')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await descriptionTextarea.setValue('New')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await descriptionTextarea.setValue('New Description Text')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Editor should still be visible
    expect(wrapper.find('.image-text-editor').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('should close when clicking outside the editor', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    // Create and click an element outside the editor
    const outsideElement = document.createElement('div')
    document.body.appendChild(outsideElement)
    
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    
    outsideElement.dispatchEvent(clickEvent)
    await nextTick()
    
    // Should emit close event
    expect(wrapper.emitted('close')).toBeTruthy()
    
    document.body.removeChild(outsideElement)
    wrapper.unmount()
  })

  it('should not close when clicking inside the editor', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const editorElement = wrapper.find('.image-text-editor')
    
    // Click inside the editor
    await editorElement.trigger('click')
    await nextTick()
    
    // Should not emit close event
    expect(wrapper.emitted('close')).toBeFalsy()
    
    wrapper.unmount()
  })

  it('should handle rapid typing without closing', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')
    
    // Simulate rapid typing in title
    const titleText = 'This is a very long title with many characters'
    for (let i = 1; i <= titleText.length; i++) {
      await titleInput.setValue(titleText.slice(0, i))
      await nextTick()
    }
    
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Simulate rapid typing in description
    const descText = 'This is a very long description with many characters and multiple lines'
    for (let i = 1; i <= descText.length; i++) {
      await descriptionTextarea.setValue(descText.slice(0, i))
      await nextTick()
    }
    
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Editor should still be visible
    expect(wrapper.find('.image-text-editor').exists()).toBe(true)
    
    wrapper.unmount()
  })

  it('should handle focus changes between inputs without closing', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')
    
    // Focus title
    await titleInput.trigger('focus')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Type in title
    await titleInput.setValue('Title Text')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Focus description (blur title, focus description)
    await descriptionTextarea.trigger('focus')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Type in description
    await descriptionTextarea.setValue('Description Text')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Focus back to title
    await titleInput.trigger('focus')
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    wrapper.unmount()
  })

  it('should emit save events while typing without closing', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    
    // Type and verify save events are emitted
    await titleInput.setValue('A')
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await titleInput.setValue('AB')
    expect(wrapper.emitted('save')?.length).toBeGreaterThan(1)
    expect(wrapper.emitted('close')).toBeFalsy()
    
    await titleInput.setValue('ABC')
    expect(wrapper.emitted('save')?.length).toBeGreaterThan(2)
    expect(wrapper.emitted('close')).toBeFalsy()
    
    wrapper.unmount()
  })

  it('should handle paste events without closing', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')
    
    // Simulate paste in title
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer(),
      bubbles: true
    })
    
    titleInput.element.dispatchEvent(pasteEvent)
    await titleInput.setValue('Pasted Title Content')
    await nextTick()
    
    expect(wrapper.emitted('close')).toBeFalsy()
    
    // Simulate paste in description
    descriptionTextarea.element.dispatchEvent(pasteEvent)
    await descriptionTextarea.setValue('Pasted Description Content')
    await nextTick()
    
    expect(wrapper.emitted('close')).toBeFalsy()
    
    wrapper.unmount()
  })

  it('should handle special characters and spaces without closing', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')
    
    // Test special characters in title
    const specialChars = 'Title with spaces & special chars! @#$%'
    await titleInput.setValue(specialChars)
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    expect((titleInput.element as HTMLInputElement).value).toBe(specialChars)
    
    // Test special characters and newlines in description
    const multilineText = 'Line 1\nLine 2\nLine 3 with special: !@#$%^&*()'
    await descriptionTextarea.setValue(multilineText)
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe(multilineText)
    
    wrapper.unmount()
  })

  it('should properly clean up event listeners on unmount', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      },
      attachTo: document.body
    })

    // Wait for component to mount and set up event listeners
    vi.runAllTimers()
    await nextTick()

    // Spy on removeEventListener
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    // Unmount component
    wrapper.unmount()
    await nextTick()
    
    // Verify cleanup was called
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    
    removeEventListenerSpy.mockRestore()
  })
})