import { Elysia, redirect, t } from 'elysia';
import { EVENTS, Session } from '@inrupt/solid-client-authn-node';
import { PromisedValue } from '@noeldemartin/utils';
import { fetchLoginUserProfile, type SolidUserProfile } from '@noeldemartin/solid-utils';
import type { AuthorizationRequestState, SessionTokenSet } from '@inrupt/solid-client-authn-node';

import { FRONTEND_URL, PORT } from '../constants';

const profiles: Record<string, SolidUserProfile | null> = {};
const sessions: Record<string, AuthorizationRequestState | SessionTokenSet> = {};

function isSessionTokenSet(value: unknown): value is SessionTokenSet {
  return typeof value === 'object' && value !== null && 'accessToken' in value;
}

function isAuthorizationRequestState(value: unknown): value is AuthorizationRequestState {
  return typeof value === 'object' && value !== null && 'state' in value;
}

async function getProfile(webId: string, session: Session): Promise<SolidUserProfile | null> {
  return (profiles[webId] ??= await fetchLoginUserProfile(webId, { fetch: session.fetch.bind(session) }));
}

export const auth = new Elysia()
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
  .get(
    '/oidc/session/:id',
    async ({ params: { id } }) => {
      const sessionTokenSet = sessions[id];
      const session = isSessionTokenSet(sessionTokenSet) ? await Session.fromTokens(sessionTokenSet) : undefined;
      const webId = session?.info.webId;
      const profile = webId && (await getProfile(webId, session));

      return profile ? { user: profile } : {};
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Object({ user: t.Optional(t.Any()) }),
    },
  )
  .post(
    '/oidc/login',
    async ({ body: { oidcIssuer } }) => {
      const session = new Session({ keepAlive: false });
      const promisedResult = new PromisedValue<{ redirectUrl: string } | { webId: string } | { error: string }>();

      session.events.on(EVENTS.AUTHORIZATION_REQUEST, (authorizationRequestState) => {
        sessions[session.info.sessionId] = authorizationRequestState;
      });

      session.events.on(EVENTS.ERROR, (error) => {
        promisedResult.resolve({ error: error ?? 'Unknown error' });
      });

      await session
        .login({
          oidcIssuer,
          clientId: `http://localhost:${PORT}/clientid.jsonld`,
          redirectUrl: `http://localhost:${PORT}/oidc/redirect`,
          handleRedirect: (redirectUrl) => promisedResult.resolve({ redirectUrl }),
        })
        .then(() => {
          if (promisedResult.isResolved()) {
            return;
          }

          promisedResult.resolve(session.info.webId ? { webId: session.info.webId } : { error: 'Log in failed' });
        });

      const result = await promisedResult;

      if ('redirectUrl' in result) {
        return { sessionId: session.info.sessionId, redirectUrl: result.redirectUrl };
      }

      if ('error' in result) {
        throw new Error(result.error);
      }

      const profile = result.webId && (await getProfile(result.webId, session));

      return profile ? { sessionId: session.info.sessionId, user: profile } : { sessionId: session.info.sessionId };
    },
    {
      body: t.Object({ oidcIssuer: t.String() }),
      response: t.Object({ sessionId: t.String(), redirectUrl: t.Optional(t.String()), user: t.Optional(t.Any()) }),
    },
  )
  .post(
    '/oidc/logout',
    async ({ body: { sessionId } }) => {
      const sessionTokenSet = sessions[sessionId];

      if (isSessionTokenSet(sessionTokenSet)) {
        const session = await Session.fromTokens(sessionTokenSet);
        const webId = session.info.webId;

        webId && delete profiles[webId];
      }

      delete sessions[sessionId];
    },
    {
      body: t.Object({ sessionId: t.String() }),
    },
  )
  .get(
    '/oidc/redirect',
    async ({ request, query: { state } }) => {
      const [sessionId, authorizationRequestState] = (() => {
        for (const [sessionId, authorizationRequestState] of Object.entries(sessions)) {
          if (!isAuthorizationRequestState(authorizationRequestState) || authorizationRequestState.state !== state) {
            continue;
          }

          return [sessionId, authorizationRequestState];
        }

        return [];
      })();

      const session =
        sessionId &&
        authorizationRequestState &&
        (await Session.fromAuthorizationRequestState(authorizationRequestState, sessionId));

      if (!session) {
        return redirect(FRONTEND_URL);
      }

      session.events.on(EVENTS.NEW_TOKENS, (tokenSet) => {
        sessions[sessionId] = tokenSet;
      });

      await session.handleIncomingRedirect(request.url);

      return redirect(FRONTEND_URL);
    },
    {
      query: t.Object({ state: t.String() }),
    },
  );
