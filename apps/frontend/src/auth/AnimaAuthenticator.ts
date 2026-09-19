import { env } from '@aerogel/core';
import { Authenticator, type AuthSession } from '@aerogel/plugin-solid';
import type { SolidUserProfile } from '@noeldemartin/solid-utils';
import { objectWithoutEmpty } from '@noeldemartin/utils';

import { getSessionId, removeSessionId } from '@/auth/session';
import api, { initialize as initializeAPI } from '@/lib/api';

export default abstract class AnimaAuthenticator extends Authenticator {
  async logout(): Promise<void> {
    const sessionId = getSessionId();

    removeSessionId();

    await api.auth.logout.post({ headers: objectWithoutEmpty({ 'X-Anima-Session-Id': sessionId }) });
    await this.endSession();
  }

  protected async restoreSession(): Promise<void> {
    await initializeAPI();

    const sessionId = getSessionId();

    if (!sessionId) {
      return;
    }

    const { data } = await api.auth.session.get({ headers: { 'X-Anima-Session-Id': sessionId } });

    if (data) {
      await this.initSession(sessionId, data.user);
    }
  }

  protected async initSession(sessionId: string, user: SolidUserProfile): Promise<AuthSession> {
    await this.initAuthenticatedFetch(async (input: RequestInfo | URL, init: RequestInit) =>
      fetch(`${env('VITE_BACKEND_URL')}/api/auth/proxy`, {
        method: 'POST',
        body: JSON.stringify({ input, init }),
        headers: {
          'X-Anima-Session-Id': sessionId,
          'Content-Type': 'application/json',
        },
      }),
    );

    try {
      const session = await this.startSession({ user, loginUrl: user.webId });

      return session;
    } catch (error) {
      await this.failSession(user.webId, error);

      throw error;
    }
  }
}
