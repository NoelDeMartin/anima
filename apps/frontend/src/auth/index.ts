import { env } from '@aerogel/core';

import AnimaExternalAuthenticator from './AnimaExternalAuthenticator';
import AnimaManagedAuthenticator from './AnimaManagedAuthenticator';

export const authenticators = {
  'anima-external': new AnimaExternalAuthenticator(),
  'anima-managed': new AnimaManagedAuthenticator(),
};

export const defaultAuthenticator = () => (env('VITE_SPA_MODE') ? 'inrupt' : 'anima-external');

export type AppAuthenticators = typeof authenticators;

declare module '@aerogel/plugin-solid' {
  interface Authenticators extends AppAuthenticators {}
}
