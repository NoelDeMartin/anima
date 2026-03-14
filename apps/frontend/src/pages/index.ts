import { BindingNotFound, defineRouteBindings, defineRoutes, Router } from '@aerogel/plugin-routing';
import { Solid } from '@aerogel/plugin-solid';
import { type AnimaChat } from '@anima/core';

import AI from '@/services/AI';
import { chatRoute } from '@/utils/chats';

import Chat from './chat/Chat.vue';
import Home from './home/Home.vue';

export const bindings = defineRouteBindings({
  chat(slug) {
    const route = Router.currentRoute.value;
    const chat = AI.chats[route?.query?.url as AnimaChat['url']]?.anima ?? AI.chatsBySlug[slug]?.anima;

    return chat ?? new BindingNotFound(slug);
  },
});

export const routes = defineRoutes([
  {
    name: 'home',
    path: '/',
    component: Home,
    beforeEnter: () =>
      void (
        Solid.isLoggedIn() && Router.push(AI.chatsList[0] ? chatRoute(AI.chatsList[0].url) : { name: 'chats.index' })
      ),
  },
  {
    name: 'chats.index',
    path: '/chats',
    component: Chat,
    beforeEnter: () => void (Solid.isLoggedIn() || Router.push({ name: 'home' })),
  },
  {
    name: 'chats.show',
    path: '/chats/:chat',
    component: Chat,
    beforeEnter: () => void (Solid.isLoggedIn() || Router.push({ name: 'home' })),
  },
]);
