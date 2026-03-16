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
      <Input :label="$t('models.name')" name="name" class="w-full" />
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
import AI from '@/services/AI';
import { Form, requiredEnumInput, requiredStringInput, useModal } from '@aerogel/core';
import { stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import type { ProviderId } from '@anima/core';

const { close } = useModal();
const providerIds = AI.providersList.map((provider) => provider.id);
const form = useForm({
  provider: requiredEnumInput(providerIds, providerIds[0]),
  name: requiredStringInput(''),
  alias: stringInput(''),
});

async function submit() {
  await AI.installModel(form.provider as ProviderId, form.name, {
    enabled: true,
    alias: form.alias?.trim() || null,
  });

  close();
}
</script>
