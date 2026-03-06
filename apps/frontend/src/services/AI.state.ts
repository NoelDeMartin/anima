import { defineServiceState } from '@aerogel/core';
import type { Chat } from '@ai-sdk/vue';
import type { AIModel, AnimaChat, ModelName, ProviderName, AnimaUIMessage } from '@anima/core';
import { arraySorted } from '@noeldemartin/utils';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModelKey'],
  initialState: {
    chat: null as Chat<AnimaUIMessage> | null,
    providers: [] as ProviderName[],
    chats: {} as Record<AnimaChat['id'], AnimaChat>,
    models: {} as Record<`${ProviderName}-${ModelName}`, AIModel>,
    selectedChatId: null as AnimaChat['id'] | null,
    selectedModelKey: null as `${ProviderName}-${ModelName}` | null,
  },
  computed: {
    chatsList: ({ chats }) => arraySorted(Object.values(chats), 'updatedAt', 'desc'),
    modelsList: ({ models }) => Object.values(models),
    selectedChat: ({ chats, selectedChatId }) => (selectedChatId && chats[selectedChatId]) ?? null,
    selectedModel: ({ models, selectedModelKey }) => (selectedModelKey && models[selectedModelKey]) ?? null,
  },
});
