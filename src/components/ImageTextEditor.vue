<template>
  <div
    v-if="editingImage"
    ref="editorRef"
    class="absolute z-[70] bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[250px] image-text-editor"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
    }"
    @click.stop
    @keydown.stop
  >
    <div class="space-y-2">
      <div>
        <label class="text-xs text-gray-500 font-medium">Title</label>
        <input
          v-model="title"
          ref="titleInput"
          type="text"
          placeholder="Enter title..."
          class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
          @keydown.esc="handleClose"
          @keydown.stop
        />
      </div>
      <div>
        <label class="text-xs text-gray-500 font-medium">Description</label>
        <textarea
          v-model="description"
          placeholder="Enter description..."
          rows="3"
          class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 resize-none"
          @keydown.esc="handleClose"
          @keydown.stop
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from "vue";
import type { ImageItem } from "../types";

const props = defineProps<{
  editingImage: ImageItem | null;
  position: { x: number; y: number };
}>();

const emit = defineEmits<{
  save: [title: string, description: string];
  close: [];
}>();

const title = ref("");
const description = ref("");
const titleInput = ref<HTMLInputElement>();
const editorRef = ref<HTMLDivElement>();

// Initialize values immediately if editingImage is provided
if (props.editingImage) {
  title.value = props.editingImage.title || "";
  description.value = props.editingImage.description || "";
}

watch(
  () => props.editingImage,
  (newImage) => {
    if (newImage) {
      title.value = newImage.title || "";
      description.value = newImage.description || "";
      nextTick(() => {
        titleInput.value?.focus();
        titleInput.value?.select();
      });
    }
  },
  { immediate: true }
);

const handleClose = () => {
  // Save before closing
  if (props.editingImage) {
    emit("save", title.value, description.value);
  }
  emit("close");
};

// Close on click outside
const handleClickOutside = (event: MouseEvent) => {
  if (editorRef.value && !editorRef.value.contains(event.target as Node)) {
    handleClose();
  }
};

// Add click outside listener (only in browser environment)
let timeoutId: ReturnType<typeof setTimeout> | null = null;
if (typeof window !== "undefined") {
  timeoutId = setTimeout(() => {
    window.addEventListener("click", handleClickOutside);
  }, 10);
}

// Cleanup
const cleanup = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("click", handleClickOutside);
  }
};

onUnmounted(cleanup);

defineExpose({ cleanup });
</script>
