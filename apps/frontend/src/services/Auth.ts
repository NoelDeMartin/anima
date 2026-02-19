import { facade, sleep, urlRoot } from '@noeldemartin/utils';
import { fetchLoginUserProfile } from '@noeldemartin/solid-utils';

import api from '@/lib/api';

import Service from './Auth.state';

export class AuthService extends Service {
  protected async boot(): Promise<void> {
    await this.initializeSession();
  }

  public async login(loginUrl: string): Promise<void> {
    this.loading = true;

    try {
      const profile = await fetchLoginUserProfile(loginUrl);
      const oidcIssuer = profile?.oidcIssuerUrl ?? urlRoot(profile?.webId ?? loginUrl);
      const { data } = await api.oidc.login.post({ oidcIssuer });

      this.sessionId = data?.sessionId ?? null;

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;

        await sleep(5000);

        throw new Error('Failed redirecting to authentication server');
      }

      if (data?.user) {
        this.user = data.user;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Login failed';
    } finally {
      this.loading = false;
    }
  }

  public async logout(): Promise<void> {
    this.user = null;

    if (!this.sessionId) {
      return;
    }

    await api.oidc.logout.post({ sessionId: this.sessionId });

    this.sessionId = null;
  }

  private async initializeSession(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const { data } = await api.oidc.session({ id: this.sessionId }).get();

    if (data?.user) {
      this.user = data.user;
    }
  }
}

export default facade(AuthService);
