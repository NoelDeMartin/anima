import { env } from '@aerogel/core';
import type { AuthenticatorLoginOptions, AuthSession } from '@aerogel/plugin-solid';
import { urlRoot } from '@noeldemartin/utils';

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

    if (urlRoot(loginUrl) !== urlRoot(env('VITE_BACKEND_URL'))) {
      throw new Error(
        `AnimaManagedAuthenticator can only be used against the managed POD (expected ${urlRoot(env('VITE_BACKEND_URL'))}, got ${urlRoot(loginUrl)})`,
      );
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

    const { data: sessionData } = await api.auth.session.get({
      headers: { 'X-Anima-Session-Id': data.sessionId },
    });

    if (!sessionData?.user) {
      throw new Error('Failed to fetch user session');
    }

    return this.initSession(data.sessionId, sessionData.user);
  }
}
