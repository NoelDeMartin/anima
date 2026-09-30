import { defineServiceState } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { computedModel } from '@aerogel/plugin-soukai';
import type { AIModel, AIProvider, AIProviderFactory, AnimaChatRecord, ModelId } from '@anima/core';
import { arraySorted, objectFromEntries, requireUrlDirectoryName } from '@noeldemartin/utils';

import type AnimaChat from '@/lib/ai/AnimaChat';

export default defineServiceState({
  name: 'ai',
  persist: ['selectedModelKey'],
  initialState: () => ({
    providerFactoriesList: [] as AIProviderFactory[],
    providersList: [] as AIProvider[],
    sidebar: false,
    chats: {} as Record<
      AnimaChatRecord['url'],
      {
        record: AnimaChatRecord;
        chat?: AnimaChat;
      }
    >,
    models: {} as Record<ModelId, AIModel>,
    selectedModelKey: null as ModelId | null,
    selectedChatUrl: computedModel(() => {
      const routeParams: { chat?: AnimaChatRecord } = Router.currentRoute.value?.params ?? {};

      return routeParams.chat?.url;
    }),
  }),
  computed: {
    chatsList: ({ chats }) =>
      arraySorted(
        Object.values(chats).map((chat) => chat.record),
        'updatedAt',
        'desc',
      ),
    chatsBySlug: ({ chats }) =>
      objectFromEntries(Object.values(chats).map((chat) => [requireUrlDirectoryName(chat.record.url), chat])),
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
