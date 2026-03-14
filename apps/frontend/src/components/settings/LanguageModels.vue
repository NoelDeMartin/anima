<template>
  <Setting :title="$t('settings.models.title')" :description="$t('settings.models.description')" layout="vertical">
    <ul v-if="$ai.modelsList?.length" class="border-t border-gray-200 -mx-4 mt-4">
      <LanguageModelsModel v-for="model in $ai.modelsList" :key="model.name" :model="model" />
    </ul>
    <div class="flex flex-col gap-2 mt-2">
      <Button
        v-if="showBrowserInstall"
        variant="secondary"
        class="w-full"
        @click="$ai.installModel('browser' as ProviderName, $browser.getModelName())"
      >
        {{ $t('settings.models.installBuiltIn') }}
      </Button>
      <Button variant="secondary" class="w-full" @click="$ui.modal(CreateModelModal)">
        {{ $t('settings.models.add') }}
      </Button>
    </div>
  </Setting>
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
