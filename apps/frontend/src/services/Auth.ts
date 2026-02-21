import { fetchLoginUserProfile } from '@noeldemartin/solid-utils';
import { facade, sleep, urlRoot } from '@noeldemartin/utils';

import api from '@/lib/api';

import Service from './Auth.state';

export class AuthService extends Service {
  public get loggedIn(): boolean {
    return !!this.user;
  }

  public async login(loginUrl: string): Promise<void> {
    this.loading = true;

    try {
      const profile = await fetchLoginUserProfile(loginUrl);
      const oidcIssuer = profile?.oidcIssuerUrl ?? urlRoot(profile?.webId ?? loginUrl);
      const { data } = await api.oidc.login.post({ oidcIssuer });

      this.sessionId = data?.sessionId ?? null;

      if (!data?.redirectUrl) {
        throw new Error('Missing redirect URL');
      }

      window.location.href = data.redirectUrl;

      await sleep(5000);

      throw new Error('Failed redirecting to authentication server');
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Login failed';
    } finally {
      this.loading = false;
    }
  }

  public async logout(): Promise<void> {
    this.user = null;
    this.model = null;

    if (!this.sessionId) {
      return;
    }

    await api.oidc.logout.post();

    this.sessionId = null;
  }

  public async selectModel(model: string): Promise<void> {
    await api.ai.models({ name: model }).patch({ selected: true });

    this.model = { name: model, default: false };
  }

  protected async boot(): Promise<void> {
    super.boot;
    await this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const { data } = await api.oidc.session.get({ headers: { 'X-Anima-Session-Id': this.sessionId } });

    if (data) {
      this.user = data.user;
      this.model = data.model;
    }
  }
}

export default facade(AuthService);
