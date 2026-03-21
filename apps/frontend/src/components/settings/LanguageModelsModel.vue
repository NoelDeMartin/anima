<template>
  <li
    :key="model.name"
    :class="{ 'opacity-50': model.status === 'installed' && !model.enabled }"
    class="relative flex items-center gap-2 border-b border-gray-200 px-4 py-2 isolate"
  >
    <div v-if="provider" :title="provider.name" class="z-10">
      <ProviderTypeIcon :provider-type="provider.type" />
      <span class="sr-only">({{ provider.name }})</span>
    </div>

    <Button
      variant="link"
      @click="$ui.modal(EditModelModal, { model })"
      class="text-gray-900 flex items-center overflow-hidden"
    >
      <div class="truncate">
        <span class="absolute inset-0" />
        {{ model.name }}
        <span v-if="model.status === 'installed' && model.alias" class="text-gray-500 text-sm truncate">
          ({{ model.alias }})
        </span>
      </div>
    </Button>

    <div class="grow" />

    <ProgressBar v-if="model.status === 'installing'" :progress="model.progress / 100" class="w-full" />
    <i-svg-spinners-180-ring v-else-if="loading" class="size-6 mr-2.5" />
    <Switch
      v-else
      :modelValue="model.status === 'installed' && model.enabled"
      @update:modelValue="run(AI.updateModel(model.id, { enabled: $event }))"
    />
  </li>
</template>

<script setup lang="ts">
import type { AIModel } from '@anima/core';
import { computed } from 'vue';

import EditModelModal from '@/components/modals/EditModelModal.vue';
import AI from '@/services/AI';
import { useLoading } from '@/utils/loading';

const { model } = defineProps<{ model: AIModel }>();
const { loading, run } = useLoading();
const provider = computed(() => AI.providers[model.providerId]);
</script>
