<template>
  <Modal title="Available models" class="p-0">
    <ul v-if="$ai.models?.length" class="border-t border-gray-200">
      <SettingsModalModel v-for="model in $ai.models" :key="model.name" :model="model" />
    </ul>
    <div class="p-4">
      <Button variant="secondary" class="w-full" @click="$ui.modal(CreateModelModal)">Install model</Button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import CreateModelModal from '@/components/modals/CreateModelModal.vue';
import AI from '@/services/AI';
import { onUnmounted, watchEffect } from 'vue';

let pollingIntervalId: NodeJS.Timeout | null = null;

watchEffect(() => {
  const hasModelsInstalling = !!AI.models.some((model) => model.status === 'installing');

  if (pollingIntervalId) {
    if (hasModelsInstalling) {
      return;
    }

    clearInterval(pollingIntervalId);

    pollingIntervalId = null;

    return;
  }

  if (hasModelsInstalling) {
    pollingIntervalId = setInterval(() => AI.refreshModels(), 1000);
  }
});

onUnmounted(() => pollingIntervalId && clearInterval(pollingIntervalId));
</script>
