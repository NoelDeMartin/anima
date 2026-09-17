import AI from './AI';
import BrowserAPIs from './BrowserAPIs';

export const services = {
  $ai: AI,
  $browserAPIs: BrowserAPIs,
};

export type AppServices = typeof services;

declare module '@aerogel/core' {
  interface Services extends AppServices {}
}
