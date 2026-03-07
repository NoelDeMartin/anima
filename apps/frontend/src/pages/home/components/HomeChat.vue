<template>
  <main class="flex flex-col grow items-center justify-center mx-auto max-w-6xl">
    <div ref="$scroll" class="flex flex-col grow self-stretch w-full overflow-auto p-8">
      <div class="grow" />
      <ul class="flex flex-col gap-4">
        <li>
          <Markdown>{{ $t('chat.greeting', { name: $solid.user?.name ?? $solid.user?.webId }) }}</Markdown>
        </li>
        <li
          v-for="message in messages"
          :key="message.id"
          :class="{ 'self-end bg-gray-100 rounded-lg px-4 py-2': message.role === 'user' }"
        >
          <div class="text-xs text-gray-400 mb-1" :class="{ 'text-right': message.role === 'user' }">
            <span v-if="message.metadata?.createdAt">{{ new Date(message.metadata.createdAt).toLocaleString() }}</span>
            <span v-if="message.metadata?.model && message.metadata?.provider">
              &middot; {{ message.metadata.provider }} / {{ message.metadata.model }}
            </span>
          </div>
          <template v-for="part in message.parts">
            <Markdown v-if="part.type === 'text'" :text="part.text" />
            <HomeToolCall
              v-else-if="part.type === 'tool-readTypesIndex'"
              :label="$t('chat.tools.readTypeIndex')"
              :data="part.output"
            />
            <HomeToolCall
              v-else-if="part.type === 'tool-listContainerFiles'"
              :label="
                $t('chat.tools.listContainerFiles', {
                  url: (part as UIToolInvocation<AnimaTools['listContainerFiles']>).input?.url,
                })
              "
              :data="part.output"
            />
            <HomeToolCall
              v-else-if="part.type === 'tool-readFileContents'"
              :label="
                $t('chat.tools.readFileContents', {
                  url: (part as UIToolInvocation<AnimaTools['readFileContents']>).input?.url,
                })
              "
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
          :label="$t('chat.message')"
          label-class="sr-only"
          name="message"
          @keydown.enter.prevent="form.submit()"
          input-class="resize-none w-full h-[150px]"
        />
        <div class="absolute bottom-2.5 right-2 flex gap-2 items-center">
          <Select
            :label="$t('chat.model')"
            class="w-full [&>button]:mt-0"
            label-class="sr-only"
            v-model="$ai.selectedModelKey"
            :options="models"
            :render-option="renderModel"
          />
          <Button submit :disabled="!form.message || form.message.trim().length === 0" class="h-9">
            {{ $t('chat.send') }}
          </Button>
        </div>
      </Form>
    </div>
  </main>
</template>

<script setup lang="ts">
import AI from '@/services/AI';
import { stringInput, translate } from '@aerogel/core';
import { useForm } from '@aerogel/core';
import type { Chat } from '@ai-sdk/vue';
import type { AnimaTools, ModelName, ProviderName, AnimaUIMessage } from '@anima/core';
import { arraySorted } from '@noeldemartin/utils';
import type { UIToolInvocation } from 'ai';
import { computed, nextTick, useTemplateRef, watchEffect } from 'vue';

const { chat } = defineProps<{ chat: Chat<AnimaUIMessage> }>();
const $scroll = useTemplateRef('$scroll');
const form = useForm({ message: stringInput('') });
const models = computed(() =>
  AI.modelsList.filter((model) => model.enabled).map((model) => `${model.provider}-${model.name}` as const),
);
const messages = computed(() => arraySorted(chat.messages, 'metadata.createdAt'));

function renderModel(model: `${ProviderName}-${ModelName}` | null) {
  if (!model) {
    return translate('chat.unknownModel');
  }

  const instance = AI.models[model];

  if (!instance) {
    return model?.split('-')[1] || translate('chat.unknownModel');
  }

  return instance.alias || `${instance.provider} / ${instance.name}`;
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
