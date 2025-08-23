<template>
  <div 
    class="fixed z-[60]"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @click.stop
  >
    <div class="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
      <button
        @click="$emit('addImage')"
        class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Add Image
      </button>
      
      <button
        @click="$emit('paste')"
        class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Paste
      </button>
      
      <hr class="my-1 border-gray-200">
      
      <button
        @click="$emit('createArtboard')"
        class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        {{ hasImageSelection ? 'Create Artboard from Selection' : 'Create Artboard' }}
      </button>
      
      <template v-if="hasSelection">
        <hr class="my-1 border-gray-200">
        
        <button
          v-if="hasImageSelection && imageCount === 1"
          @click="$emit('editDescription')"
          class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Description
        </button>
        
        <button
          v-if="hasImageSelection && imageCount && imageCount > 1"
          @click="$emit('tidyImages')"
          class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Tidy Selection
        </button>
        
        <button
          v-if="hasArtboardSelection"
          @click="$emit('renameArtboard')"
          class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Rename Artboard
        </button>
        
        <button
          v-if="hasArtboardSelection"
          @click="$emit('exportAsHtml')"
          class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Export as HTML
        </button>
        
        <button
          @click="$emit('delete')"
          class="w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors text-sm flex items-center gap-2 text-red-600"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  x: number
  y: number
  hasSelection: boolean
  hasImageSelection?: boolean
  hasArtboardSelection?: boolean
  imageCount?: number
}>()

defineEmits<{
  close: []
  addImage: []
  paste: []
  delete: []
  createArtboard: []
  editDescription: []
  tidyImages: []
  renameArtboard: []
  exportAsHtml: []
}>()

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.fixed')) {
    const emitClose = () => {
      window.removeEventListener('click', handleClickOutside)
    }
    emitClose()
  }
}

// Add click outside listener after a small delay to avoid immediate close
setTimeout(() => {
  window.addEventListener('click', handleClickOutside)
}, 10)
</script>