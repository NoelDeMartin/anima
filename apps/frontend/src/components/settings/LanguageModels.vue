<template>
  <Setting :title="$t('settings.models.title')" :description="$t('settings.models.description')" layout="vertical">
    <div class="mt-4">
      <h3 class="text-sm font-semibold text-gray-700 mb-1">{{ $t('settings.providers.title') }}</h3>
      <ul v-if="$ai.providersList?.length" class="border-t border-gray-200 -mx-4">
        <li
          v-for="provider in $ai.providersList"
          :key="provider.id"
          class="flex items-center gap-2 border-b border-gray-200 px-4 py-2"
        >
          <ProviderTypeIcon :provider-type="provider.type" />

          <span class="text-sm">
            {{ provider.name || $td(`providers.names.${provider.type}`, stringToStudlyCase(provider.type)) }}
          </span>
          <div class="grow" />
          <Button variant="ghost" @click="$ui.modal(EditProviderModal, { provider })">
            <i-heroicons-pencil class="size-4" />
          </Button>
        </li>
      </ul>
      <div class="mt-2">
        <Button variant="secondary" class="w-full" @click="$ui.modal(CreateProviderModal)">
          {{ $t('settings.providers.add') }}
        </Button>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="text-sm font-semibold text-gray-700 mb-1">{{ $t('settings.models.modelsTitle') }}</h3>
      <ul v-if="$ai.modelsList?.length" class="border-t border-gray-200 -mx-4">
        <LanguageModelsModel v-for="model in $ai.modelsList" :key="model.id" :model="model" />
      </ul>
      <div class="flex flex-col gap-2 mt-2">
        <Button
          v-if="showBrowserInstall"
          variant="secondary"
          class="w-full"
          @click="browserProviderId && $ai.installModel(browserProviderId, $browser.getModelName())"
        >
          {{ $t('settings.models.installBuiltIn') }}
        </Button>
        <Button variant="secondary" class="w-full" @click="$ui.modal(CreateModelModal)">
          {{ $t('settings.models.add') }}
        </Button>
      </div>
    </div>
  </Setting>
</template>

<script setup lang="ts">
import CreateModelModal from '@/components/modals/CreateModelModal.vue';
import CreateProviderModal from '@/components/modals/CreateProviderModal.vue';
import EditProviderModal from '@/components/modals/EditProviderModal.vue';
import AI from '@/services/AI';
import Browser from '@/services/Browser';
import { stringToStudlyCase } from '@noeldemartin/utils';
import { computed, onUnmounted, watchEffect } from 'vue';

let pollingIntervalId: NodeJS.Timeout | null = null;
const browserProviderId = computed(() => AI.providersList.find((p) => p.type === 'browser')?.id);
const showBrowserInstall = computed(
  () =>
    Browser.promptAPIAvailable &&
    browserProviderId.value &&
    !AI.modelsList.some((model) => model.providerId === browserProviderId.value),
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
