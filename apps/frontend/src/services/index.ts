import AI from './AI';
import Auth from './Auth';
import Browser from './Browser';

export const services = {
  $ai: AI,
  $auth: Auth,
  $browser: Browser,
};

export type AppServices = typeof services;

declare module '@aerogel/core' {
  interface Services extends AppServices {}
}
