import { Authenticator, type AuthSession } from '@aerogel/plugin-solid';
import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import { sleep, Storage, urlRoot } from '@noeldemartin/utils';

import api from '@/lib/api';
import { env } from '@/lib/env';

const STORAGE_KEY = 'anima:sessionId';

export default class AnimaAuthenticator extends Authenticator {
  async login(loginUrl: string, user?: SolidUserProfile | null): Promise<AuthSession> {
    const oidcIssuer = user?.oidcIssuerUrl ?? urlRoot(user?.webId ?? loginUrl);
    const { data } = await api.oidc.login.post({ oidcIssuer });

    if (data?.sessionId) {
      Storage.set<string>(STORAGE_KEY, data.sessionId);
    }

    if (!data?.redirectUrl) {
      throw new Error('Missing redirect URL');
    }

    window.location.href = data.redirectUrl;

    await sleep(5000);

    throw new Error('Failed redirecting to authentication server');
  }

  async logout(): Promise<void> {
    Storage.remove(STORAGE_KEY);

    await api.oidc.logout.post();
    await this.endSession();
  }

  protected async restoreSession(): Promise<void> {
    const sessionId = Storage.get<string>(STORAGE_KEY);

    if (!sessionId) {
      return;
    }

    const { data } = await api.oidc.session.get({ headers: { 'X-Anima-Session-Id': sessionId } });

    if (data) {
      await this.initSession(sessionId, data.user);
    }
  }

  protected async initSession(sessionId: string, user: SolidUserProfile): Promise<void> {
    await this.initAuthenticatedFetch(async (input: RequestInfo | URL, init: RequestInit) =>
      fetch(`${location.protocol}//${env('VITE_API_DOMAIN')}/solid-proxy`, {
        method: 'POST',
        body: JSON.stringify({ input, init }),
        headers: {
          'X-Anima-Session-Id': sessionId,
          'Content-Type': 'application/json',
        },
      }),
    );

    try {
      await this.startSession({ user: { ...user, animaSessionId: sessionId }, loginUrl: user.webId });
    } catch (error) {
      await this.failSession(user.webId, error);
    }
  }
}
