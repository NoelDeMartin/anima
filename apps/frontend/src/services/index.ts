import Auth from './Auth';

export const services = {
  $auth: Auth,
};

export type AppServices = typeof services;

declare module '@aerogel/core' {
  interface Services extends AppServices {}
}
