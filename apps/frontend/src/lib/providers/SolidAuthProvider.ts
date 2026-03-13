import { Solid } from '@aerogel/plugin-solid';
import type { AuthProvider } from '@anima/core';
import { required } from '@noeldemartin/utils';
import AerogelSolid from 'virtual:aerogel-solid';

export default class SolidAuthProvider implements AuthProvider {
  getUser() {
    return Solid.requireUser();
  }

  refreshProfile(): Promise<void> {
    return Solid.refreshUserProfile();
  }

  getClientId() {
    return required(AerogelSolid.clientID?.client_id);
  }

  fetch(input: string, init?: RequestInit) {
    return Solid.fetch(input, init);
  }
}
