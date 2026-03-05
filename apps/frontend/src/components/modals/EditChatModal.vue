<template>
  <Modal title="Edit Chat">
    <Form :form @submit="submit" class="flex flex-col gap-2">
      <Input label="Title" name="title" class="w-full" />
      <div class="flex gap-2 mt-4">
        <div class="grow" />
        <Button variant="secondary" @click="close()">Cancel</Button>
        <Button submit>Update</Button>
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
  await AI.updateChat(chat.id, {
    title: form.title?.trim() || chat.title,
  });

  close();
}
</script>
