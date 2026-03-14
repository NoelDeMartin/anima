<template>
  <Modal :title="$t('models.create')">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Select
        :label="$t('models.provider')"
        name="provider"
        class="w-full"
        :options="providers"
        :render-option="(option) => $td(`models.names.${option}`, stringToStudlyCase(option))"
      />
      <template v-if="selectedProvider?.supported">
        <Select
          v-if="selectedProvider?.availableNames"
          :label="$t('models.name')"
          name="name"
          class="w-full"
          :options="selectedProvider?.availableNames"
        />
        <Input v-else :label="$t('models.name')" name="name" class="w-full" />
        <Input :label="$t('models.alias')" name="alias" class="w-full" />
        <Input
          v-if="selectedProvider?.requiresAPIKey"
          :label="$t('models.apiKey')"
          name="apiKey"
          type="password"
          class="w-full"
          required
        />
        <div
          v-if="selectedProvider?.requiresAPIKey && env('VITE_SPA_MODE')"
          class="flex items-start gap-3 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg"
          role="alert"
        >
          <i-heroicons-exclamation-triangle class="size-5 text-yellow-600 shrink-0 mt-0.5" />
          <Markdown class="text-sm font-medium text-yellow-800">
            {{ $t('models.unsafeStorageWarning') }}
          </Markdown>
        </div>
        <div class="flex gap-2 mt-2">
          <div class="grow" />
          <Button variant="secondary" @click="close()">{{ $t('models.cancel') }}</Button>
          <Button submit>{{ $t('models.add') }}</Button>
        </div>
      </template>
      <div v-else class="flex items-start gap-3 bg-red-50 text-red-800 px-4 py-3 rounded-lg" role="alert">
        <i-heroicons-exclamation-circle class="size-5 text-red-600 shrink-0 mt-0.5" />
        <Markdown class="text-sm font-medium text-red-800">
          {{ $t(`models.unsupported.${form.provider}`) }}
        </Markdown>
      </div>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import { env } from '@/lib/env';
import AI from '@/services/AI';
import { Form, requiredEnumInput, requiredStringInput, useModal } from '@aerogel/core';
import { stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import type { ModelName, ProviderName } from '@anima/core';
import { objectKeys, Storage, stringToStudlyCase } from '@noeldemartin/utils';
import { computed } from 'vue';

const { close } = useModal();
const providers = AI.providersList.map((provider) => provider.name);
const form = useForm({
  provider: requiredEnumInput(providers, providers[0]),
  name: requiredStringInput(''),
  alias: stringInput(''),
  apiKey: stringInput(''),
});
const selectedProvider = computed(() => AI.providers[form.provider]);

async function submit() {
  await AI.installModel(form.provider as ProviderName, form.name as ModelName, {
    enabled: true,
    alias: form.alias?.trim() || null,
    apiKey: form.apiKey?.trim() || null,
  });

  close();
}
</script>
