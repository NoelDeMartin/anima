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
      <template v-if="selectedFactory?.availability === 'available'">
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
      </template>
      <MessageAlert type="info" v-if="$te(`providers.instructions.${form.type}`)">
        {{ $t(`providers.instructions.${form.type}`) }}
      </MessageAlert>
      <MessageAlert type="warning" v-if="selectedFactory?.requiresAPIKey && env('VITE_SPA_MODE')">
        {{ $t('providers.unsafeStorageWarning') }}
      </MessageAlert>
      <MessageAlert
        type="error"
        v-if="selectedFactory?.availability !== 'available' && !$te(`providers.instructions.${form.type}`)"
      >
        {{ $t(`providers.${selectedFactory?.availability}.${form.type}`) }}
      </MessageAlert>
      <template v-if="selectedFactory?.availability === 'available'">
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
    form.url = selectedFactory.value?.defaultConfig?.url ?? form.url;
    form.apiKey = selectedFactory.value?.defaultConfig?.apiKey ?? form.apiKey;
  },
  { immediate: true },
);
</script>
