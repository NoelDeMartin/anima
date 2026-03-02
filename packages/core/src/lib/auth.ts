import type { Fetch, SolidUserProfile } from '@noeldemartin/solid-utils';
import { fail } from '@noeldemartin/utils';

let authProvider: AuthProvider | null = null;

export interface AuthProvider {
  getUser(): SolidUserProfile;
  fetch: Fetch;
}

export function setAuthProvider(provider: AuthProvider): void {
  authProvider = provider;
}

export function auth(): AuthProvider {
  return authProvider ?? fail('Auth provider missing');
}
