import './assets/css/main.css';
import { bootstrap } from '@aerogel/core';
import i18n from '@aerogel/plugin-i18n';
import routing from '@aerogel/plugin-routing';
import solid from '@aerogel/plugin-solid';
import soukai from '@aerogel/plugin-soukai';

import App from './App.vue';
import { authenticators, defaultAuthenticator } from './auth';
import { settings } from './components';
import { bindings, routes } from './pages';
import { services } from './services';

void bootstrap(App, {
  services,
  settings,
  plugins: [
    i18n({ messages: import.meta.glob('@/lang/*.yaml') }),
    routing({ routes, bindings }),
    solid({ authenticators, defaultAuthenticator }),
    soukai({ models: import.meta.glob(['@/models/*', '!**/*.test.ts'], { eager: true }) }),
  ],
});
