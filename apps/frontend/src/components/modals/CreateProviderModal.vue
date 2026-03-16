<template>
  <Modal :title="$t('providers.create')">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Select
        :label="$t('providers.type')"
        name="type"
        class="w-full"
        :options="providerTypes"
        :render-option="(option) => $td(`providers.names.${option}`, stringToStudlyCase(option))"
      />
      <Markdown v-if="!selectedFactory?.isSupported" class="text-red-500 text-sm p-2 bg-red-100 rounded-lg">
        {{ $t(`providers.unsupported.${form.type}`) }}
      </Markdown>
      <template v-else>
        <Input :label="$t('providers.name')" name="name" class="w-full" />
        <Input v-if="selectedFactory?.requiresUrl" :label="$t('providers.url')" name="url" class="w-full" />
        <Input
          v-if="selectedFactory?.requiresAPIKey"
          :label="$t('providers.apiKey')"
          name="apiKey"
          type="password"
          class="w-full"
          required
        />
        <div
          v-if="selectedFactory?.requiresAPIKey && env('VITE_SPA_MODE')"
          class="flex items-start gap-3 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg"
          role="alert"
        >
          <i-heroicons-exclamation-triangle class="size-5 text-yellow-600 shrink-0 mt-0.5" />
          <Markdown class="text-sm font-medium text-yellow-800">
            {{ $t('providers.unsafeStorageWarning') }}
          </Markdown>
        </div>
        <div class="flex gap-2 mt-2">
          <div class="grow" />
          <Button variant="secondary" @click="close()">{{ $t('providers.cancel') }}</Button>
          <Button submit>{{ $t('providers.add') }}</Button>
        </div>
      </template>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import { env } from '@/lib/env';
import AI from '@/services/AI';
import {
  stringInput,
  useForm,
  requiredEnumInput,
  requiredStringInput,
  translateWithDefault,
  useModal,
} from '@aerogel/core';
import { stringToStudlyCase } from '@noeldemartin/utils';
import { computed, watch } from 'vue';

const { close } = useModal();
const providerTypes = AI.providerFactoriesList.map((factory) => factory.type);
const form = useForm({
  type: requiredEnumInput(providerTypes, providerTypes[0]),
  name: requiredStringInput(''),
  apiKey: stringInput(''),
  url: stringInput(''),
});
const selectedFactory = computed(() => AI.providerFactories[form.type]);

async function submit() {
  await AI.createProvider({
    type: form.type,
    name: form.name,
    apiKey: form.apiKey?.trim() || null,
    url: form.url?.trim() || null,
  });

  close();
}

watch(
  () => form.type,
  () => {
    form.name = translateWithDefault(`providers.names.${form.type}`, stringToStudlyCase(form.type));
  },
  { immediate: true },
);
</script>
