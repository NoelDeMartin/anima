import { type AuthenticatorLoginOptions, type AuthSession } from '@aerogel/plugin-solid';
import { sleep, urlRoot } from '@noeldemartin/utils';

import { setSessionId } from '@/auth/session';
import api from '@/lib/api';

import AnimaAuthenticator from './AnimaAuthenticator';

export default class AnimaExternalAuthenticator extends AnimaAuthenticator {
  async login(loginUrl: string, { user }: AuthenticatorLoginOptions = {}): Promise<AuthSession> {
    const oidcIssuer = user?.oidcIssuerUrl ?? urlRoot(user?.webId ?? loginUrl);
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
}
