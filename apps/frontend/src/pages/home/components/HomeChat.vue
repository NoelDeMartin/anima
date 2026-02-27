<template>
  <main class="flex flex-col grow items-center justify-center mx-auto max-w-6xl">
    <div ref="$scroll" class="flex flex-col grow self-stretch w-full overflow-auto p-8">
      <div class="grow" />
      <ul class="flex flex-col gap-4">
        <li>
          <Markdown>Hello {{ $auth.user?.name ?? $auth.user?.webId }}, how can I help you today?</Markdown>
        </li>
        <li
          v-for="message in chat.messages"
          :key="message.id"
          :class="{ 'self-end bg-gray-100 rounded-lg px-4 py-2': message.role === 'user' }"
        >
          <template v-for="part in message.parts">
            <Markdown v-if="part.type === 'text'" :text="part.text" />
            <HomeToolCall v-else-if="part.type === 'tool-getTypesIndex'" label="Read type index" :data="part.output" />
            <HomeToolCall
              v-else-if="part.type === 'tool-listContainerFiles'"
              :label="`Listed files from ${(part as UIToolInvocation<Tools['listContainerFiles']>).input?.url}`"
              :data="part.output"
            />
            <HomeToolCall
              v-else-if="part.type === 'tool-readFileContents'"
              :label="`Read ${(part as UIToolInvocation<Tools['readFileContents']>).input?.url}`"
              :data="part.output"
            />
            <pre v-else-if="part.type !== 'step-start'">({{ part.type }})</pre>
          </template>
        </li>
        <li v-if="chat.error" class="text-red-500">{{ chat.error.message }}</li>
      </ul>
      <i-svg-spinners-3-dots-bounce v-if="chat.status !== 'ready' && chat.status !== 'error'" class="size-6 shrink-0" />
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
            class="w-full [&>button]:mt-0"
            label-class="sr-only"
            v-model="$ai.selectedModel"
            :options="$ai.modelsList.filter((model) => model.enabled).map((model) => model.name)"
            :render-option="
              (model) => (model && (AI.models[model]?.alias || AI.models[model]?.name)) || model || 'Unknown'
            "
          />
          <Button submit :disabled="!form.message || form.message.trim().length === 0" class="h-9"> Send </Button>
        </div>
      </Form>
    </div>
  </main>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import Auth from '@/services/Auth';
import { env } from '@/lib/env';
import { stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import { nextTick, useTemplateRef, watchEffect } from 'vue';
import { Chat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIToolInvocation } from 'ai';
import { required } from '@noeldemartin/utils';
import type { Tools } from '@anima/backend';

const $scroll = useTemplateRef('$scroll');
const form = useForm({
  message: stringInput(''),
});

const chat = new Chat({
  transport: new DefaultChatTransport({
    api: `http://${env('VITE_API_DOMAIN')}/ai/chat`,
    headers: { 'X-Anima-Session-Id': required(Auth.sessionId) },
  }),
});

async function submit() {
  const message = form.message;

  form.reset();

  if (!message || message.trim().length === 0) {
    return;
  }

  await chat.sendMessage({ text: message }, { body: { model: AI.selectedModel } });
}

function deepRead(value: unknown): void {
  JSON.stringify(value);
}

watchEffect(async () => {
  deepRead(chat.lastMessage);

  await nextTick();

  $scroll.value?.scrollTo({ top: $scroll.value?.scrollHeight, behavior: 'smooth' });
});
</script>
