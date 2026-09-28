<template>
  <Modal :title="$t('models.create')">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Select
        :label="$t('models.provider')"
        name="provider"
        class="w-full"
        :options="providerIds"
        :render-option="(id) => AI.providers[id]?.name ?? id"
      />
      <Combobox
        v-if="selectedProviderFactory?.availableModels?.length"
        name="name"
        class="w-full"
        :label="$t('models.name')"
        :options="selectedProviderFactory.availableModels"
      />
      <Input v-else :label="$t('models.name')" name="name" class="w-full" />
      <Input :label="$t('models.alias')" name="alias" class="w-full" />
      <div class="flex gap-2 mt-2">
        <div class="grow" />
        <Button variant="secondary" @click="close()">{{ $t('models.cancel') }}</Button>
        <Button submit>{{ $t('models.add') }}</Button>
      </div>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import { useModal, useForm } from '@aerogel/core';
import type { ProviderId } from '@anima/core';
import { computed } from 'vue';
import { z } from 'zod';

import AI from '@/services/AI';

const { close } = useModal();
const providerIds = AI.providersList.map((provider) => provider.id);
const defaultProviderId = providerIds[0];
const form = useForm({
  provider: defaultProviderId ? z.enum(providerIds).default(defaultProviderId) : z.enum(providerIds),
  name: z.string(),
  alias: z.string().nullable(),
});
const selectedProvider = computed(() => AI.providers[form.provider]);
const selectedProviderFactory = computed(
  () => selectedProvider.value?.type && AI.providerFactories[selectedProvider.value.type],
);

async function submit() {
  await AI.installModel(form.provider as ProviderId, form.name, {
    enabled: true,
    alias: form.alias?.trim() || null,
  });

  close();
}
</script>
