import { env } from '@/lib/env';

import AnimaAuthenticator from './AnimaAuthenticator';

export const authenticators = {
  anima: new AnimaAuthenticator(),
};

export const defaultAuthenticator = env('VITE_SPA_MODE') ? 'inrupt' : 'anima';

export type AppAuthenticators = typeof authenticators;

declare module '@aerogel/plugin-solid' {
  interface Authenticators extends AppAuthenticators {}
}
