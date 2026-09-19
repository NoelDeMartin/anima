import { Elysia, redirect } from 'elysia';

import { BACKEND_URL, CLIENT_ID, FRONTEND_URL } from '../../lib/constants';
import { env } from '../../lib/env';
import Auth from '../../services/Auth';

export function getClientIdDocument() {
  return {
    '@context': ['https://www.w3.org/ns/solid/oidc-context.jsonld'],
    client_id: CLIENT_ID,
    client_name: 'Ànima',
    redirect_uris: [`${BACKEND_URL}/oidc/redirect`],
    post_logout_redirect_uris: [`${BACKEND_URL}/oidc/logout`],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid webid offline_access',
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    require_auth_time: false,
  };
}

export default new Elysia()
  .get('/redirect', async ({ request }) => {
    await Auth.handleRedirect(request);

    return redirect(env('SERVE_FRONTEND') ? BACKEND_URL : FRONTEND_URL);
  })
  .post('/logout', ({ request }) => Auth.logout(request));
