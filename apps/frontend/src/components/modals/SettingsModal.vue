<template>
  <Modal title="Available models" class="p-0">
    <ul v-if="models?.length" class="border-t border-gray-200">
      <li v-for="model in models" :key="model.name" class="flex items-center gap-2 border-b border-gray-200 p-2">
        {{ model.name }}
        <span v-if="model.name === $auth.model?.name" class="text-green-600 font-bold">(Active)</span>
        <template v-else-if="model.status === 'installing'">
          <span class="text-yellow-600 font-bold">({{ model.progress }}%)</span>
          <Button variant="danger" @click="$ai.cancelInstallation(model.name)">Cancel</Button>
        </template>
        <Button v-else @click="$auth.selectModel(model.name)">Make Active</Button>
      </li>
    </ul>
    <Form :form @submit="submit" class="flex flex-row items-center gap-2 p-3">
      <Input label="Model name" label-class="sr-only" name="name" class="w-full" />
      <Button submit :disabled="form.name.trim().length === 0">Install</Button>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { Model } from '@anima/backend';
import { requiredStringInput, useForm } from '@aerogel/core';
import AI from '@/services/AI';
import api from '@/lib/api';

let pollingIntervalId: NodeJS.Timeout | null = null;
const models = ref<Model[] | null>(null);
const form = useForm({ name: requiredStringInput('') });

async function submit() {
  const name = form.name;

  form.reset();

  await AI.install(name);

  const { data } = await api.ai.models.get();

  models.value = data ?? null;
}

watch(models, () => {
  const hasModelsInstalling = !!models.value?.some((model) => model.status === 'installing');

  if (pollingIntervalId) {
    if (hasModelsInstalling) {
      return;
    }

    clearInterval(pollingIntervalId);

    pollingIntervalId = null;

    return;
  }

  pollingIntervalId = setInterval(async () => {
    const { data } = await api.ai.models.get();

    models.value = data ?? null;
  }, 1000);
});

onMounted(async () => {
  const { data } = await api.ai.models.get();

  models.value = data ?? null;
});

onUnmounted(() => pollingIntervalId && clearInterval(pollingIntervalId));
</script>
