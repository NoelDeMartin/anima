<template>
  <li
    :key="model.name"
    :class="{ 'opacity-50': !model.enabled }"
    class="flex items-center gap-2 border-b border-gray-200 px-4 py-2"
  >
    <i-simple-icons-ollama v-if="model.provider === 'ollama'" class="size-4" />
    <i-simple-icons-google v-else-if="model.provider === 'google'" class="size-4" />
    <i-simple-icons-anthropic v-else-if="model.provider === 'anthropic'" class="size-4" />
    <i-simple-icons-openai v-else-if="model.provider === 'openai'" class="size-4" />
    <i-simple-icons-googlechrome
      v-else-if="model.provider === 'browser' && $browser.name === 'chrome'"
      class="size-4"
    />
    <i-simple-icons-microsoftedge v-else-if="model.provider === 'browser' && $browser.name === 'edge'" class="size-4" />
    <span v-else class="uppercase">{{ model.provider[0] }}</span>

    <div class="flex items-center whitespace-nowrap overflow-hidden">
      <Button variant="link" @click="$ui.modal(EditModelModal, { model })" class="truncate">{{ model.name }}</Button>
      &nbsp;
      <span v-if="model.alias" class="text-gray-500 text-sm truncate">({{ model.alias }})</span>
    </div>

    <div class="grow" />

    <ProgressBar v-if="model.status === 'installing'" :progress="model.progress / 100" class="w-full" />
    <i-svg-spinners-180-ring v-else-if="loading" class="size-6 mr-2.5" />
    <Switch
      v-else
      :modelValue="model.enabled"
      @update:modelValue="run(AI.updateModel(model.provider, model.name, { enabled: $event }))"
    />
  </li>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import type { AIModel } from '@anima/core';
import { useLoading } from '@/utils/loading';
import EditModelModal from '@/components/modals/EditModelModal.vue';

const { model } = defineProps<{ model: AIModel }>();
const { loading, run } = useLoading();
</script>
