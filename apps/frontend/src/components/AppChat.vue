<template>
  <h2>Current model: {{ $auth.model?.name }} <span v-if="$auth.model?.default">(Auto)</span></h2>
  <div v-if="models?.length">
    <h3 class="text-lg font-bold">Installed Models:</h3>
    <ul class="flex flex-col gap-2 list-disc list-inside">
      <li v-for="model in models" :key="model.name" class="flex items-center gap-2">
        {{ model.name }}
        <span v-if="model.name === $auth.model?.name" class="text-green-600 font-bold">(Active)</span>
        <template v-else-if="model.status === 'installing'">
          <span class="text-yellow-600 font-bold">({{ model.progress }}%)</span>
          <Button variant="danger" @click="services.$ai.cancelInstallation(model.name)">Cancel</Button>
        </template>
        <Button v-else @click="services.$auth.selectModel(model.name)">Make Active</Button>
      </li>
    </ul>
  </div>
  <Form :form="installModelForm" @submit="submitInstall()">
    <div class="flex flex-row gap-2 items-center">
      <Input label="Install Model" name="name" />
      <Button submit>Install</Button>
    </div>
  </Form>
  <ul>
    <li v-for="(message, index) in $ai.messages" :key="index" class="flex flex-row gap-2">
      [{{ message.author }}]: <Markdown>{{ message.content }}</Markdown>
    </li>
  </ul>
  <Form :form="messageForm" @submit="($ai.sendMessage(messageForm.message), messageForm.reset())">
    <TextArea label="Message" name="message" @keydown.ctrl.enter="messageForm.submit()" />
    <Button submit>Send</Button>
  </Form>
</template>

<script setup lang="ts">
import { requiredStringInput, useForm } from '@aerogel/core';
import { onMounted, ref, watch } from 'vue';

import api from '@/lib/api';
import { services } from '@/services';
import type { Model } from '@anima/backend';

let pollingIntervalId: NodeJS.Timeout | null = null;
const models = ref<Model[] | null>(null);
const messageForm = useForm({ message: requiredStringInput() });
const installModelForm = useForm({ name: requiredStringInput() });

async function submitInstall() {
  const name = installModelForm.name;

  installModelForm.reset();

  await services.$ai.install(name);

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
</script>
