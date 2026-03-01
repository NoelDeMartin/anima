<template>
  <Modal title="Create model">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Select
        label="Provider"
        name="provider"
        class="w-full"
        :options="AI.providers"
        :render-option="(option) => stringToStudlyCase(option)"
      />
      <Input label="Name" name="name" class="w-full" />
      <Input label="Alias" name="alias" class="w-full" />
      <Input v-if="form.provider === 'google'" label="API Key" name="apiKey" type="password" class="w-full" required />
      <div class="flex gap-2 mt-2">
        <div class="grow" />
        <Button variant="secondary" @click="close()">Cancel</Button>
        <Button submit>Install</Button>
      </div>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import { Form, requiredEnumInput, requiredStringInput, useModal } from '@aerogel/core';
import { stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import type { ModelName, ProviderName } from '@anima/core';
import { stringToStudlyCase } from '@noeldemartin/utils';

const { close } = useModal();
const form = useForm({
  provider: requiredEnumInput(AI.providers, AI.providers[0]),
  name: requiredStringInput(''),
  alias: stringInput(''),
  apiKey: stringInput(''),
});

async function submit() {
  await AI.installModel(form.provider as ProviderName, form.name as ModelName, {
    enabled: true,
    alias: form.alias?.trim() || null,
    apiKey: form.apiKey?.trim() || null,
  });

  close();
}
</script>
