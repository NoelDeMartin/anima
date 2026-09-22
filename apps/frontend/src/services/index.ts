import AI from './AI';
import Anima from './Anima';
import BrowserAPIs from './BrowserAPIs';

export const services = {
  $ai: AI,
  $anima: Anima,
  $browserAPIs: BrowserAPIs,
};

export type AppServices = typeof services;

declare module '@aerogel/core' {
  interface Services extends AppServices {}
}
