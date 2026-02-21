<template>
  <Button @click="$ui.modal(SettingsModal)" variant="ghost" size="icon" title="Settings" class="fixed top-4 right-4">
    <i-heroicons-cog-6-tooth class="size-6" />
    <span class="sr-only">Settings</span>
  </Button>
</template>

<script setup lang="ts">
import SettingsModal from '@/components/modals/SettingsModal.vue';
</script>
