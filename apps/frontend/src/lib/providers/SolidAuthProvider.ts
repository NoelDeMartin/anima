import { Solid } from '@aerogel/plugin-solid';
import type { AuthProvider } from '@anima/core';

export default class SolidAuthProvider implements AuthProvider {
  getUser() {
    return Solid.requireUser();
  }

  fetch(input: string, init?: RequestInit) {
    return Solid.fetch(input, init);
  }
}
