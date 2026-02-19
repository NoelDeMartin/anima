import { bootstrap } from '@aerogel/core';

import './assets/css/main.css';
import App from './App.vue';
import { services } from './services';

bootstrap(App, { services });
