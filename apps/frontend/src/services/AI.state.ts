import { defineServiceState } from '@aerogel/core';
import type { Chat } from '@ai-sdk/vue';
import type { AIModel, AnimaChat, ModelName, ProviderName, UIMessage } from '@anima/core';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModelKey'],
  initialState: {
    chat: null as Chat<UIMessage> | null,
    providers: [] as ProviderName[],
    chats: {} as Record<AnimaChat['id'], AnimaChat>,
    models: {} as Record<`${ProviderName}-${ModelName}`, AIModel>,
    selectedChatId: null as AnimaChat['id'] | null,
    selectedModelKey: null as `${ProviderName}-${ModelName}` | null,
  },
  computed: {
    chatsList: ({ chats }) => Object.values(chats),
    modelsList: ({ models }) => Object.values(models),
    selectedChat: ({ chats, selectedChatId }) => (selectedChatId && chats[selectedChatId]) ?? null,
    selectedModel: ({ models, selectedModelKey }) => (selectedModelKey && models[selectedModelKey]) ?? null,
  },
});
