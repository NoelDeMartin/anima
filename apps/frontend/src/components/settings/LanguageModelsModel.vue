<template>
  <li
    :key="model.name"
    :class="{ 'opacity-50': model.status === 'installed' && !model.enabled }"
    class="flex items-center gap-2 border-b border-gray-200 px-4 py-2"
  >
    <ProviderTypeIcon v-if="providerType" :provider-type="providerType" />

    <div class="flex items-center whitespace-nowrap overflow-hidden">
      <Button variant="link" @click="$ui.modal(EditModelModal, { model })" class="truncate text-gray-900">
        {{ model.name }}
      </Button>
      &nbsp;
      <span v-if="model.status === 'installed' && model.alias" class="text-gray-500 text-sm truncate">
        ({{ model.alias }})
      </span>
    </div>

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
import AI from '@/services/AI';
import type { AIModel } from '@anima/core';
import { useLoading } from '@/utils/loading';
import EditModelModal from '@/components/modals/EditModelModal.vue';
import { computed } from 'vue';

const { model } = defineProps<{ model: AIModel }>();
const { loading, run } = useLoading();
const providerType = computed(() => AI.providers[model.providerId]?.type);
</script>
