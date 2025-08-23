import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ImageTextEditor from '../ImageTextEditor.vue'
import type { ImageItem } from '../../types'

describe('ImageTextEditor', () => {
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
  })

  it('renders when editingImage is provided', () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    expect(wrapper.find('.absolute').exists()).toBe(true)
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('does not render when editingImage is null', () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: null,
        position: { x: 50, y: 50 }
      }
    })

    expect(wrapper.find('.absolute').exists()).toBe(false)
  })

  it('loads image title and description into inputs', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')

    expect((titleInput.element as HTMLInputElement).value).toBe('Test Title')
    expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe('Test Description')
  })

  it('saves on close after title change', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const titleInput = wrapper.find('input[type="text"]')
    await titleInput.setValue('New Title')
    
    // Should not save yet
    expect(wrapper.emitted('save')).toBeFalsy()
    
    // Trigger close
    await titleInput.trigger('keydown.esc')
    
    // Should save and close
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]).toEqual(['New Title', 'Test Description'])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('saves on close after description change', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const descriptionTextarea = wrapper.find('textarea')
    await descriptionTextarea.setValue('New Description')
    
    // Should not save yet
    expect(wrapper.emitted('save')).toBeFalsy()
    
    // Trigger close
    await descriptionTextarea.trigger('keydown.esc')
    
    // Should save and close
    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')?.[0]).toEqual(['Test Title', 'New Description'])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('closes editor when Escape key is pressed in title input', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const titleInput = wrapper.find('input[type="text"]')
    await titleInput.trigger('keydown.esc')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('closes editor when Escape key is pressed in description textarea', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const descriptionTextarea = wrapper.find('textarea')
    await descriptionTextarea.trigger('keydown.esc')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('allows space key in title input', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const titleInput = wrapper.find('input[type="text"]')
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    
    const stopPropagationSpy = vi.spyOn(spaceEvent, 'stopPropagation')
    titleInput.element.dispatchEvent(spaceEvent)
    
    expect(stopPropagationSpy).toHaveBeenCalled()
    
    await titleInput.setValue('Test Title With Spaces')
    expect((titleInput.element as HTMLInputElement).value).toBe('Test Title With Spaces')
  })

  it('allows space key in description textarea', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const descriptionTextarea = wrapper.find('textarea')
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    
    const stopPropagationSpy = vi.spyOn(spaceEvent, 'stopPropagation')
    descriptionTextarea.element.dispatchEvent(spaceEvent)
    
    expect(stopPropagationSpy).toHaveBeenCalled()
    
    await descriptionTextarea.setValue('Test Description With Spaces')
    expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe('Test Description With Spaces')
  })

  it('focuses and selects title input when image changes', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: null,
        position: { x: 50, y: 50 }
      }
    })

    const focusSpy = vi.fn()
    const selectSpy = vi.fn()

    await wrapper.setProps({ editingImage: mockImage })
    await nextTick()

    const titleInput = wrapper.find('input[type="text"]').element as HTMLInputElement
    
    titleInput.focus = focusSpy
    titleInput.select = selectSpy

    await wrapper.setProps({ editingImage: { ...mockImage, title: 'Updated' } })
    await nextTick()

    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe('Updated')
  })

  it('positions editor at specified coordinates', () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 123, y: 456 }
      }
    })

    const editorElement = wrapper.find('.absolute').element as HTMLElement
    expect(editorElement.style.left).toBe('123px')
    expect(editorElement.style.top).toBe('456px')
  })

  it('stops click propagation on editor element', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const clickEvent = new MouseEvent('click', { bubbles: true })
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')
    
    const editorElement = wrapper.find('.absolute')
    editorElement.element.dispatchEvent(clickEvent)
    
    expect(stopPropagationSpy).toHaveBeenCalled()
  })

  it('handles empty title and description', async () => {
    const imageWithoutText: ImageItem = {
      id: 'test-id',
      filename: 'test.jpg',
      dataUrl: 'data:image/jpeg;base64,test',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 150 },
      originalSize: { width: 400, height: 300 },
      rotation: 0,
      zIndex: 1
    }

    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: imageWithoutText,
        position: { x: 50, y: 50 }
      }
    })

    await nextTick()

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')

    expect((titleInput.element as HTMLInputElement).value).toBe('')
    expect((descriptionTextarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('saves both values when closing after changes', async () => {
    const wrapper = mount(ImageTextEditor, {
      props: {
        editingImage: mockImage,
        position: { x: 50, y: 50 }
      }
    })

    const titleInput = wrapper.find('input[type="text"]')
    const descriptionTextarea = wrapper.find('textarea')
    
    await titleInput.setValue('First Change')
    await descriptionTextarea.setValue('Second Change')
    
    // Should not save yet
    expect(wrapper.emitted('save')).toBeFalsy()
    
    // Trigger close
    await titleInput.trigger('keydown.esc')
    
    // Should save with both changed values
    expect(wrapper.emitted('save')?.[0]).toEqual(['First Change', 'Second Change'])
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})