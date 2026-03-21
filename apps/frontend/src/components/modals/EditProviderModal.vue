<template>
  <Modal :title="provider.name">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Input :label="$t('providers.name')" name="name" class="w-full" />
      <Input
        v-if="$ai.providerFactories[provider.type]?.requiresUrl"
        :label="$t('providers.url')"
        name="url"
        class="w-full"
      />
      <Input
        v-if="$ai.providerFactories[provider.type]?.requiresAPIKey"
        :label="$t('providers.apiKey')"
        name="apiKey"
        type="password"
        class="w-full"
      />
      <div class="flex gap-2 mt-2">
        <Button variant="ghost" @click="deleteProvider()" :title="$t('providers.delete')">
          <i-heroicons-trash class="size-4" />
          <span class="sr-only">{{ $t('providers.delete') }}</span>
        </Button>
        <div class="grow" />
        <Button variant="secondary" @click="close()">{{ $t('providers.cancel') }}</Button>
        <Button submit>{{ $t('providers.update') }}</Button>
      </div>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import { stringInput, useForm, requiredStringInput, translate, UI, useModal } from '@aerogel/core';
import type { AIProvider } from '@anima/core';

import AI from '@/services/AI';

const { provider } = defineProps<{ provider: AIProvider }>();
const { close } = useModal();
const form = useForm({
  name: requiredStringInput(provider.name),
  apiKey: stringInput(provider.apiKey ?? ''),
  url: stringInput(provider.url ?? ''),
});

async function deleteProvider() {
  if (
    !(await UI.confirm(
      translate('providers.deleteConfirm.title', { name: provider.name }),
      translate('providers.deleteConfirm.message'),
      { acceptText: translate('providers.delete'), acceptVariant: 'danger' },
    ))
  ) {
    return;
  }

  await AI.deleteProvider(provider.id);

  close();
}

async function submit() {
  await AI.updateProvider(provider.id, {
    name: form.name.trim(),
    apiKey: form.apiKey?.trim() || null,
    url: form.url?.trim() || null,
  });

  close();
}
</script>
