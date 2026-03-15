import { Authenticator, type AuthSession } from '@aerogel/plugin-solid';
import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import { sleep, urlRoot } from '@noeldemartin/utils';

import { getSessionId, removeSessionId, setSessionId } from '@/auth/session';
import { requireEnv } from '@/lib/env';

export default class AnimaAuthenticator extends Authenticator {
  async login(loginUrl: string, user?: SolidUserProfile | null): Promise<AuthSession> {
    const oidcIssuer = user?.oidcIssuerUrl ?? urlRoot(user?.webId ?? loginUrl);
    const { default: api } = await import('@/lib/api');
    const { data } = await api.oidc.login.post({ oidcIssuer });

    if (data?.sessionId) {
      setSessionId(data.sessionId);
    }

    if (!data?.redirectUrl) {
      throw new Error('Missing redirect URL');
    }

    window.location.href = data.redirectUrl;

    await sleep(5000);

    throw new Error('Failed redirecting to authentication server');
  }

  async logout(): Promise<void> {
    const { default: api } = await import('@/lib/api');

    removeSessionId();

    await api.oidc.logout.post();
    await this.endSession();
  }

  protected async restoreSession(): Promise<void> {
    const sessionId = getSessionId();

    if (!sessionId) {
      return;
    }

    const { default: api } = await import('@/lib/api');
    const { data } = await api.oidc.session.get({ headers: { 'X-Anima-Session-Id': sessionId } });

    if (data) {
      await this.initSession(sessionId, data.user);
    }
  }

  protected async initSession(sessionId: string, user: SolidUserProfile): Promise<void> {
    await this.initAuthenticatedFetch(async (input: RequestInfo | URL, init: RequestInit) =>
      fetch(`${location.protocol}//${requireEnv('VITE_API_DOMAIN')}/solid-proxy`, {
        method: 'POST',
        body: JSON.stringify({ input, init }),
        headers: {
          'X-Anima-Session-Id': sessionId,
          'Content-Type': 'application/json',
        },
      }),
    );

    try {
      await this.startSession({ user, loginUrl: user.webId });
    } catch (error) {
      await this.failSession(user.webId, error);
    }
  }
}
