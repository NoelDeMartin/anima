<template>
  <Modal :title="model.name">
    <div v-if="installingModel">
      <ProgressBar :progress="installingModel.progress / 100" class="w-full" />
      <Button class="w-full mt-2" @click="($ai.cancelInstallation(model.provider, model.name), close())">Cancel</Button>
    </div>
    <Form v-else :form @submit="submit" class="flex flex-col gap-2">
      <Input label="Alias" name="alias" class="w-full" />
      <Input v-if="model.provider === 'google'" label="API Key" name="apiKey" type="password" class="w-full" />
      <div class="flex gap-2 mt-2">
        <Button variant="ghost" @click="deleteModel()" title="Delete">
          <i-heroicons-trash class="size-4" />
          <span class="sr-only">Delete</span>
        </Button>
        <div class="grow" />
        <Button variant="secondary" @click="close()">Cancel</Button>
        <Button submit>Update</Button>
      </div>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import { Form, UI, useModal } from '@aerogel/core';
import { stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import type { AIModel } from '@anima/core';
import { computed } from 'vue';

const { model } = defineProps<{ model: AIModel }>();
const { close } = useModal();
const form = useForm({
  alias: stringInput(model.alias ?? ''),
  apiKey: stringInput(('apiKey' in model && model.apiKey) || ''),
});
const installingModel = computed(() => {
  const updatedModel = AI.models[`${model.provider}-${model.name}`];

  if (!updatedModel || updatedModel.status !== 'installing') {
    return null;
  }

  return updatedModel;
});

async function deleteModel() {
  if (
    !(await UI.confirm('Delete `' + model.name + '`', 'Are you sure you want to delete this model?', {
      acceptText: 'Delete',
      acceptVariant: 'danger',
    }))
  ) {
    return;
  }

  await AI.deleteModel(model.provider, model.name);

  close();
}

async function submit() {
  await AI.updateModel(model.provider, model.name, {
    alias: form.alias?.trim() || null,
    apiKey: form.apiKey?.trim() || null,
  });

  close();
}
</script>
