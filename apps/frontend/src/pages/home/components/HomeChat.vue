<template>
  <main class="flex flex-col grow items-center justify-center mx-auto max-w-6xl">
    <div ref="$scroll" class="flex flex-col grow self-stretch w-full overflow-auto p-8">
      <div class="grow" />
      <ul class="flex flex-col gap-4">
        <li>
          <Markdown>Hello {{ $auth.user?.name ?? $auth.user?.webId }}, how can I help you today?</Markdown>
        </li>
        <li
          v-for="(message, index) in $ai.messages"
          :key="index"
          :class="{ 'self-end bg-gray-100 rounded-lg px-4 py-2': message.author === 'user' }"
        >
          <Markdown>{{ message.content }}</Markdown>
        </li>
      </ul>
    </div>

    <div class="px-8 w-full">
      <Form :form @submit="submit()" class="relative mb-16 w-full">
        <TextArea
          label="Message"
          label-class="sr-only"
          name="message"
          @keydown.enter.prevent="form.submit()"
          input-class="resize-none w-full h-[150px]"
        />
        <div class="absolute bottom-2.5 right-2 flex gap-2 items-center">
          <Select
            label="Model"
            name="model"
            class="w-full [&>button]:mt-0"
            label-class="sr-only"
            v-model="form.model"
            :options="$ai.models.filter((model) => model.enabled)"
            :render-option="(model) => model.alias || model.name"
          />
          <Button submit :disabled="!form.message || form.message.trim().length === 0" class="h-9"> Send </Button>
        </div>
      </Form>
    </div>
  </main>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import { requiredObjectInput, stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import { nextTick, useTemplateRef, watch } from 'vue';

const $scroll = useTemplateRef('$scroll');
const form = useForm({
  model: requiredObjectInput(AI.models.find((model) => model.enabled)),
  message: stringInput(''),
});

async function submit() {
  const message = form.message;

  form.reset();

  if (!message || message.trim().length === 0) {
    return;
  }

  await AI.sendMessage(form.model.name, message);
}

watch(AI.messages, async () => {
  await nextTick();

  $scroll.value?.scrollTo({ top: $scroll.value?.scrollHeight, behavior: 'smooth' });
});
</script>
