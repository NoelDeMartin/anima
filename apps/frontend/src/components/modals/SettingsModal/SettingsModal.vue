<template>
  <Modal title="Available models" class="p-0">
    <ul v-if="$ai.modelsList?.length" class="border-t border-gray-200">
      <SettingsModalModel v-for="model in $ai.modelsList" :key="model.name" :model="model" />
    </ul>
    <div class="p-4 flex flex-col gap-2">
      <Button
        v-if="showBrowserInstall"
        variant="secondary"
        class="w-full"
        @click="$ai.installModel('browser' as ProviderName, $browser.getModelName())"
      >
        Install built-in model
      </Button>
      <Button variant="secondary" class="w-full" @click="$ui.modal(CreateModelModal)">Install model</Button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import CreateModelModal from '@/components/modals/CreateModelModal.vue';
import AI from '@/services/AI';
import Browser from '@/services/Browser';
import type { ProviderName } from '@anima/core';
import { computed, onUnmounted, watchEffect } from 'vue';

let pollingIntervalId: NodeJS.Timeout | null = null;
const showBrowserInstall = computed(
  () => Browser.promptAPIAvailable && !AI.modelsList.some((model) => model.provider === 'browser'),
);

watchEffect(() => {
  const hasModelsInstalling = !!AI.modelsList.some((model) => model.status === 'installing');

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
