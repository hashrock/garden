<script setup lang="ts">
import { ref, onMounted } from 'vue'
import InfiniteCanvas from './components/InfiniteCanvas.vue'
import InitialSetupModal from './components/InitialSetupModal.vue'

const showSetupModal = ref(false)

onMounted(() => {
  // Check if user has completed initial setup
  const setupComplete = localStorage.getItem('garden-setup-complete')
  if (!setupComplete) {
    showSetupModal.value = true
  }
})

const handleSetupComplete = () => {
  showSetupModal.value = false
}
</script>

<template>
  <div class="w-screen h-screen">
    <InfiniteCanvas />
    <InitialSetupModal v-if="showSetupModal" @complete="handleSetupComplete" />
  </div>
</template>
