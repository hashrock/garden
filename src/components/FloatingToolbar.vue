<template>
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
    <div class="bg-white border border-gray-200 rounded-2xl shadow-lg px-2 py-1.5 flex items-center gap-1">
      <!-- Add Image Button (Primary) -->
      <button
        @click="handleAddImage"
        class="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5"
        title="Add Image"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-sm font-medium">Add Image</span>
      </button>

      <!-- Add Artboard -->
      <button
        @click="handleCreateArtboard"
        class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        title="Add Artboard"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </button>

      <!-- Zoom Controls -->
      <div class="flex items-center bg-gray-50 rounded-lg ml-1">
        <button
          @click="handleZoomOut"
          class="px-1.5 py-1 hover:bg-gray-200 rounded-l-lg transition-colors"
          title="Zoom Out"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
        <button
          @click="handleResetViewport"
          class="px-2 py-1 hover:bg-gray-200 transition-colors text-xs font-medium min-w-[2.5rem] text-center"
          title="Reset Zoom"
        >
          {{ zoomPercentage }}%
        </button>
        <button
          @click="handleZoomIn"
          class="px-1.5 py-1 hover:bg-gray-200 rounded-r-lg transition-colors"
          title="Zoom In"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Hamburger Menu -->
      <div class="relative ml-1">
        <button
          @click="showMenu = !showMenu"
          class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Menu"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <!-- Dropdown Menu -->
        <div v-if="showMenu" class="absolute bottom-full right-0 mb-2">
          <div class="bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[200px]">
            <button
              @click="handleNewProject"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-sm"
            >
              New Project
            </button>
            <button
              @click="openFileInput"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-sm"
            >
              Load Project
            </button>
            <button
              @click="handleSaveProject"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-sm"
            >
              Save Project
            </button>
            <hr class="my-2 border-gray-200">
            <button
              @click="showSettings = true; showMenu = false"
              class="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-sm"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      <!-- Hidden file inputs -->
      <input
        ref="fileInput"
        type="file"
        accept=".garden"
        style="display: none"
        @change="handleFileSelect"
      />
      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        multiple
        style="display: none"
        @change="handleImageSelect"
      />
    </div>
  </div>

  <!-- Settings Dialog -->
  <SettingsDialog
    v-if="showSettings"
    :imageCount="images.length"
    :artboardCount="artboards.length"
    @close="showSettings = false"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ImageItem, Artboard, Viewport } from '../types'
import { useProjectIO } from '../composables/useProjectIO'
import SettingsDialog from './SettingsDialog.vue'

const props = defineProps<{
  images: ImageItem[]
  artboards: Artboard[]
  selectedImageIds: Set<string>
  selectedArtboardIds: Set<string>
  viewport: Viewport
  canvasSize: { width: number; height: number }
}>()

const emit = defineEmits<{
  newProject: []
  loadProject: [images: ImageItem[], viewport: Viewport]
  addImage: [file: File, position: { x: number; y: number }]
  removeSelected: []
  clearSelection: []
  zoom: [delta: number, centerX: number, centerY: number]
  resetViewport: []
  createArtboard: []
  deleteArtboard: []
}>()

const projectIO = useProjectIO()
const fileInput = ref<HTMLInputElement>()
const imageInput = ref<HTMLInputElement>()
const showMenu = ref(false)
const showSettings = ref(false)

const hasSelection = computed(() => 
  props.selectedImageIds.size > 0 || props.selectedArtboardIds.size > 0
)

const zoomPercentage = computed(() => 
  Math.round(props.viewport.zoom * 100)
)

const handleNewProject = () => {
  showMenu.value = false
  if (confirm('Create a new project? All unsaved changes will be lost.')) {
    emit('newProject')
  }
}

const openFileInput = () => {
  showMenu.value = false
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const result = await projectIO.loadProject(file)
    if (result) {
      emit('loadProject', result.images, result.projectData.canvas.viewport)
    }
    input.value = ''
  }
}

const handleSaveProject = async () => {
  showMenu.value = false
  await projectIO.downloadProject(props.images, props.viewport, props.canvasSize)
}

const handleAddImage = () => {
  showMenu.value = false
  imageInput.value?.click()
}

const handleImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  
  for (const file of files) {
    emit('addImage', file, { x: centerX, y: centerY })
  }
  input.value = ''
}

const handleZoomIn = () => {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  emit('zoom', 1, centerX, centerY)
}

const handleZoomOut = () => {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  emit('zoom', -1, centerX, centerY)
}

const handleResetViewport = () => {
  emit('resetViewport')
}

const handleCreateArtboard = () => {
  emit('createArtboard')
}

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showMenu.value = false
  }
}

// Add click outside listener
if (typeof window !== 'undefined') {
  window.addEventListener('click', handleClickOutside)
}
</script>