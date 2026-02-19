import { Elysia, redirect, t } from 'elysia';

import Auth from '../services/Auth';
import { FRONTEND_URL, PORT } from '../lib/constants';

export default new Elysia()
  .get('clientid.jsonld', () => ({
    '@context': ['https://www.w3.org/ns/solid/oidc-context.jsonld'],
    client_id: `http://localhost:${PORT}/clientid.jsonld`,
    client_name: 'Ànima',
    redirect_uris: [`http://localhost:${PORT}/oidc/redirect`],
    post_logout_redirect_uris: [`http://localhost:${PORT}/oidc/logout`],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid webid offline_access',
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    require_auth_time: false,
  }))
  .get('/oidc/session', ({ request }) => Auth.session(request), {
    response: t.Union([t.Object({ user: t.Any(), model: t.String() }), t.Null()]),
  })
  .post('/oidc/login', ({ body: { oidcIssuer } }) => Auth.login(oidcIssuer), {
    body: t.Object({ oidcIssuer: t.String() }),
    response: t.Object({ sessionId: t.String(), redirectUrl: t.String() }),
  })
  .post('/oidc/logout', ({ request }) => Auth.logout(request))
  .get('/oidc/redirect', async ({ request }) => {
    await Auth.handleRedirect(request);

    return redirect(FRONTEND_URL);
  });
