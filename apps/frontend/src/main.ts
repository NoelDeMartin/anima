import './assets/css/main.css';
import { bootstrap } from '@aerogel/core';

import App from './App.vue';
import { services } from './services';

bootstrap(App, { services });
