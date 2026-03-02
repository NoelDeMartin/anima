import AI from './AI';
import Browser from './Browser';

export const services = {
  $ai: AI,
  $browser: Browser,
};

export type AppServices = typeof services;

declare module '@aerogel/core' {
  interface Services extends AppServices {}
}
