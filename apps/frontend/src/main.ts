import './assets/css/main.css';
import { bootstrap } from '@aerogel/core';
import solid from '@aerogel/plugin-solid';

import App from './App.vue';
import { services } from './services';

bootstrap(App, { services, plugins: [solid()] });
