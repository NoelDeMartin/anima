import type { AuthProvider } from '@anima/core';

import { CLIENT_ID } from '../lib/constants';
import Auth from '../services/Auth';

export default class SessionAuthProvider implements AuthProvider {
  getUser() {
    return Auth.requireContextSession().user;
  }

  refreshProfile(): Promise<void> {
    return Auth.requireContextSession().refreshProfile();
  }

  getClientId() {
    return CLIENT_ID;
  }

  fetch(input: string, init?: RequestInit) {
    return Auth.requireContextSession().fetch(input, init);
  }
}
