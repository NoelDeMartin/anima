import { defineServiceState } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { computedModel } from '@aerogel/plugin-soukai';
import type { Chat } from '@ai-sdk/vue';
import type { AIModel, AnimaChat, AnimaUIMessage, ModelName, ProviderName } from '@anima/core';
import { arraySorted, objectFromEntries, requireUrlDirectoryName } from '@noeldemartin/utils';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModelKey'],
  initialState: () => ({
    providers: [] as ProviderName[],
    chats: {} as Record<
      AnimaChat['url'],
      {
        anima: AnimaChat;
        ai?: Chat<AnimaUIMessage>;
      }
    >,
    models: {} as Record<`${ProviderName}-${ModelName}`, AIModel>,
    selectedModelKey: null as `${ProviderName}-${ModelName}` | null,
    selectedChatUrl: computedModel(() => {
      const routeParams: { chat?: AnimaChat } = Router.currentRoute.value?.params ?? {};

      return routeParams.chat?.url;
    }),
  }),
  computed: {
    chatsList: ({ chats }) =>
      arraySorted(
        Object.values(chats).map((chat) => chat.anima),
        'updatedAt',
        'desc',
      ),
    chatsBySlug: ({ chats }) =>
      objectFromEntries(Object.values(chats).map((chat) => [requireUrlDirectoryName(chat.anima.url), chat])),
    modelsList: ({ models }) => Object.values(models),
    selectedModel: ({ models, selectedModelKey }) => (selectedModelKey && models[selectedModelKey]) ?? null,
  },
});
