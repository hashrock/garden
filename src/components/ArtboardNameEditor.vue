<template>
  <div
    v-if="editingArtboard"
    ref="editorRef"
    class="absolute z-[70] bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px] artboard-name-editor"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
    }"
    @click.stop
    @keydown.stop
  >
    <div>
      <label class="text-xs text-gray-500 font-medium">Artboard Name</label>
      <input
        v-model="name"
        ref="nameInput"
        type="text"
        placeholder="Enter name..."
        class="w-full mt-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        @keydown.enter="handleSave"
        @keydown.esc="handleClose"
        @keydown.stop
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from "vue";
import type { Artboard } from "../types";

const props = defineProps<{
  editingArtboard: Artboard | null;
  position: { x: number; y: number };
}>();

const emit = defineEmits<{
  save: [name: string];
  close: [];
}>();

const name = ref("");
const nameInput = ref<HTMLInputElement>();
const editorRef = ref<HTMLDivElement>();

// Initialize values immediately if editingArtboard is provided
if (props.editingArtboard) {
  name.value = props.editingArtboard.name || "";
}

watch(
  () => props.editingArtboard,
  (newArtboard) => {
    if (newArtboard) {
      name.value = newArtboard.name || "";
      nextTick(() => {
        nameInput.value?.focus();
        nameInput.value?.select();
      });
    }
  },
  { immediate: true }
);

const handleSave = () => {
  if (props.editingArtboard && name.value.trim()) {
    emit("save", name.value.trim());
  }
  emit("close");
};

const handleClose = () => {
  emit("close");
};

// Close on click outside
const handleClickOutside = (event: MouseEvent) => {
  if (editorRef.value && !editorRef.value.contains(event.target as Node)) {
    handleSave();
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