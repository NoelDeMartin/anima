import { requireEnv } from '@aerogel/core';
import { type AuthenticatorLoginOptions, type AuthSession } from '@aerogel/plugin-solid';

import { setSessionId } from '@/auth/session';
import api from '@/lib/api';

import AnimaAuthenticator from './AnimaAuthenticator';

export interface AnimaManagedAuthenticatorLoginOptions extends AuthenticatorLoginOptions {
  email?: string;
  password?: string;
}

export default class AnimaManagedAuthenticator extends AnimaAuthenticator {
  async login(loginUrl: string, { email, password }: AnimaManagedAuthenticatorLoginOptions = {}): Promise<AuthSession> {
    if (!email || !password) {
      throw new Error('Email and password are required to log in with a managed POD');
    }

    if (new URL(loginUrl).host !== requireEnv('VITE_API_DOMAIN')) {
      throw new Error('Wrong login URL used to log in with a managed POD');
    }

    const { data, error } = await api.login.post({ email, password });

    if (error || !data?.sessionId) {
      const errorValue = error?.value as { message?: string } | string | undefined;
      const message =
        (typeof errorValue === 'object' && errorValue?.message) ||
        (typeof errorValue === 'string' && errorValue) ||
        'Login failed';

      throw new Error(message);
    }

    setSessionId(data.sessionId);

    const { data: sessionData } = await api.oidc.session.get({
      headers: { 'X-Anima-Session-Id': data.sessionId },
    });

    if (!sessionData?.user) {
      throw new Error('Failed to fetch user session');
    }

    return this.initSession(data.sessionId, sessionData.user);
  }
}
