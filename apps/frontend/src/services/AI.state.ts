import { defineServiceState } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { computedModel } from '@aerogel/plugin-soukai';
import type { Chat } from '@ai-sdk/vue';
import type { AIModel, AIProvider, AIProviderFactory, AnimaChat, AnimaUIMessage, ModelId } from '@anima/core';
import { arraySorted, objectFromEntries, requireUrlDirectoryName } from '@noeldemartin/utils';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModelKey'],
  initialState: () => ({
    providerFactoriesList: [] as AIProviderFactory[],
    providersList: [] as AIProvider[],
    sidebar: false,
    chats: {} as Record<
      AnimaChat['url'],
      {
        anima: AnimaChat;
        ai?: Chat<AnimaUIMessage>;
      }
    >,
    models: {} as Record<ModelId, AIModel>,
    selectedModelKey: null as ModelId | null,
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
    providers: ({ providersList }) => objectFromEntries(providersList.map((provider) => [provider.id, provider])),
    providerFactories: ({ providerFactoriesList }) =>
      objectFromEntries(providerFactoriesList.map((factory) => [factory.type, factory])),
    selectedModel: ({ models, selectedModelKey }) => {
      const model = selectedModelKey && models[selectedModelKey];

      if (!model || model.status === 'installing') {
        return null;
      }

      return model;
    },
  },
});
