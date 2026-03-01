<template>
  <main class="flex flex-col grow items-center justify-center mx-auto max-w-6xl">
    <div ref="$scroll" class="flex flex-col grow self-stretch w-full overflow-auto p-8">
      <div class="grow" />
      <ul class="flex flex-col gap-4">
        <li>
          <Markdown>Hello {{ $auth.getUser()?.name ?? $auth.getUser()?.webId }}, how can I help you today?</Markdown>
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
            v-model="$ai.selectedModelKey"
            :options="models"
            :render-option="renderModel"
          />
          <Button submit :disabled="!form.message || form.message.trim().length === 0" class="h-9"> Send </Button>
        </div>
      </Form>
    </div>
  </main>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import { stringInput } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import type { Tools } from '@anima/backend';
import type { ModelName, ProviderName } from '@anima/core';
import type { UIToolInvocation } from 'ai';
import { computed, nextTick, useTemplateRef, watchEffect } from 'vue';

const chat = AI.newChat();
const $scroll = useTemplateRef('$scroll');
const form = useForm({ message: stringInput('') });
const models = computed(() =>
  AI.modelsList.filter((model) => model.enabled).map((model) => `${model.provider}-${model.name}` as const),
);

function renderModel(model: `${ProviderName}-${ModelName}` | null) {
  if (!model) {
    return 'Unknown';
  }

  return AI.models[model]?.alias || AI.models[model]?.name || model?.split('-')[1] || 'Unknown';
}

async function submit() {
  const message = form.message;

  form.reset();

  if (!message || message.trim().length === 0) {
    return;
  }

  await AI.sendMessage(chat, message);
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
