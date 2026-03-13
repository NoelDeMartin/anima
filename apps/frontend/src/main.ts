import './assets/css/main.css';
import { bootstrap } from '@aerogel/core';
import i18n from '@aerogel/plugin-i18n';
import solid from '@aerogel/plugin-solid';
import soukai from '@aerogel/plugin-soukai';

import App from './App.vue';
import { authenticators, defaultAuthenticator } from './auth';
import settings from './components/settings';
import { services } from './services';

bootstrap(App, {
  services,
  settings,
  plugins: [
    i18n({ messages: import.meta.glob('@/lang/*.yaml') }),
    solid({ authenticators, defaultAuthenticator }),
    soukai({ models: import.meta.glob(['@/models/*', '!**/*.test.ts'], { eager: true }) }),
  ],
});
