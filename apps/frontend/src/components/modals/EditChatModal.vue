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
import { Form, useModal, stringInput, useForm } from '@aerogel/core';
import type { AnimaChat } from '@anima/core';
import AI from '@/services/AI';

const { chat } = defineProps<{ chat: AnimaChat }>();
const { close } = useModal();
const form = useForm({
  title: stringInput(chat.title),
});

async function submit() {
  await AI.updateChat(chat.url, {
    title: form.title?.trim() || chat.title,
  });

  close();
}
</script>
