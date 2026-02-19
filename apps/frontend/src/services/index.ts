import AI from './AI';
import Auth from './Auth';

export const services = {
  $ai: AI,
  $auth: Auth,
};

export type AppServices = typeof services;

declare module '@aerogel/core' {
  interface Services extends AppServices {}
}
