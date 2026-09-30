<template>
  <Modal :title="$t('chats.edit')">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Input :label="$t('chats.title')" name="title" class="w-full" />
      <div class="flex gap-2 mt-4">
        <div class="grow" />
        <Button variant="secondary" @click="close()">{{ $t('chats.cancel') }}</Button>
        <Button submit>{{ $t('chats.update') }}</Button>
      </div>
    </Form>
  </Modal>
</template>

<script setup lang="ts">
import { Form, useModal, useForm } from '@aerogel/core';
import type { AnimaChatRecord } from '@anima/core';
import { z } from 'zod';

import AI from '@/services/AI';

const { chat } = defineProps<{ chat: AnimaChatRecord }>();
const { close } = useModal();
const form = useForm({
  title: z.string().nullable().default(chat.title),
});

async function submit() {
  await AI.updateChat(chat.url, {
    title: form.title?.trim() || chat.title,
  });

  close();
}
</script>
