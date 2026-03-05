import type { AuthProvider } from '@anima/core';

import Auth from '../services/Auth';

export default class SessionAuthProvider implements AuthProvider {
  getUser() {
    return Auth.requireContextSession().user;
  }

  fetch(input: string, init?: RequestInit) {
    return Auth.requireContextSession().fetch(input, init);
  }
}
