<template>
  <div class="absolute top-0 left-0 right-0 bg-white shadow-md z-50">
    <div class="flex items-center gap-4 p-2">
      <div class="flex items-center gap-2">
        <button
          @click="handleNew"
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="新規プロジェクト"
        >
          新規
        </button>
        
        <label class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm cursor-pointer">
          開く
          <input
            type="file"
            accept=".garden"
            @change="handleOpen"
            class="hidden"
          />
        </label>
        
        <button
          @click="handleSave"
          class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
          title="プロジェクトを保存"
        >
          保存
        </button>
      </div>
      
      <div class="border-l pl-4 flex items-center gap-2">
        <label class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm cursor-pointer">
          画像追加
          <input
            type="file"
            accept="image/*"
            multiple
            @change="handleAddImages"
            class="hidden"
          />
        </label>
        
        <button
          @click="handlePaste"
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="クリップボードから貼り付け (Ctrl+V)"
        >
          貼り付け
        </button>
      </div>
      
      <div class="border-l pl-4 flex items-center gap-2">
        <button
          @click="handleSelectAll"
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="すべて選択 (Ctrl+A)"
        >
          すべて選択
        </button>
        
        <button
          @click="handleDelete"
          class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
          title="選択を削除 (Delete)"
          :disabled="selectedCount === 0"
        >
          削除 ({{ selectedCount }})
        </button>
      </div>
      
      <div class="border-l pl-4 flex items-center gap-2">
        <button
          @click="handleZoomIn"
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="拡大"
        >
          ＋
        </button>
        
        <span class="text-sm">{{ Math.round(zoomLevel * 100) }}%</span>
        
        <button
          @click="handleZoomOut"
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="縮小"
        >
          －
        </button>
        
        <button
          @click="handleResetView"
          class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="表示をリセット"
        >
          リセット
        </button>
      </div>
      
      <div class="ml-auto text-sm text-gray-600">
        画像: {{ imageCount }}枚
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectIO } from '../composables/useProjectIO'
import type { ImageItem } from '../types'

const props = defineProps<{
  images: ImageItem[]
  selectedImageIds: Set<string>
  viewport: { x: number; y: number; zoom: number }
  canvasSize: { width: number; height: number }
}>()

const emit = defineEmits<{
  newProject: []
  loadProject: [images: ImageItem[], viewport: any]
  addImage: [file: File, position: { x: number; y: number }]
  removeSelected: []
  selectAll: []
  clearSelection: []
  zoom: [delta: number, centerX: number, centerY: number]
  resetViewport: []
}>()

const projectIO = useProjectIO()

const imageCount = computed(() => props.images.length)
const selectedCount = computed(() => props.selectedImageIds.size)
const zoomLevel = computed(() => props.viewport.zoom)

const handleNew = () => {
  if (confirm('現在のプロジェクトを破棄して新規作成しますか？')) {
    emit('newProject')
  }
}

const handleOpen = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  const result = await projectIO.loadProject(file)
  if (result) {
    emit('loadProject', result.images, result.projectData.canvas.viewport)
  }
  
  input.value = ''
}

const handleSave = () => {
  projectIO.downloadProject(props.images, props.viewport, props.canvasSize)
}

const handleAddImages = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const position = {
        x: Math.random() * 500 + 100,
        y: Math.random() * 500 + 100
      }
      emit('addImage', file, position)
    }
  }
  
  input.value = ''
}

const handlePaste = async () => {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          const file = new File([blob], 'pasted-image.png', { type })
          const position = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          }
          emit('addImage', file, position)
        }
      }
    }
  } catch (error) {
    console.error('Failed to paste from clipboard:', error)
  }
}

const handleSelectAll = () => {
  emit('selectAll')
}

const handleDelete = () => {
  emit('removeSelected')
}

const handleZoomIn = () => {
  emit('zoom', 1, window.innerWidth / 2, window.innerHeight / 2)
}

const handleZoomOut = () => {
  emit('zoom', -1, window.innerWidth / 2, window.innerHeight / 2)
}

const handleResetView = () => {
  emit('resetViewport')
}
</script>