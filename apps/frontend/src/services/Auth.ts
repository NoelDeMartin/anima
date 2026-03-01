import { Solid } from '@aerogel/plugin-solid';
import { fetchLoginUserProfile, type SolidUserProfile } from '@noeldemartin/solid-utils';
import { facade, sleep, urlRoot } from '@noeldemartin/utils';

import api from '@/lib/api';
import { env } from '@/lib/env';

import Service from './Auth.state';

export class AuthService extends Service {
  public isLoggedIn(): boolean {
    if (env('VITE_SPA_MODE')) {
      return Solid.isLoggedIn();
    }

    return !!this.user;
  }

  getUser(): SolidUserProfile | null {
    if (env('VITE_SPA_MODE')) {
      return Solid.user;
    }

    return this.user;
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
    if (env('VITE_SPA_MODE')) {
      return Solid.logout();
    }

    this.user = null;

    if (!this.sessionId) {
      return;
    }

    await api.oidc.logout.post();

    this.sessionId = null;
  }

  protected async boot(): Promise<void> {
    if (env('VITE_SPA_MODE')) {
      return;
    }

    await this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const { data } = await api.oidc.session.get({ headers: { 'X-Anima-Session-Id': this.sessionId } });

    if (data) {
      this.user = data.user;
    }
  }
}

export default facade(AuthService);
