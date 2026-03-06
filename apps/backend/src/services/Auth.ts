import { AsyncLocalStorage } from 'node:async_hooks';

import { EVENTS, Session } from '@inrupt/solid-client-authn-node';
import type { AuthorizationRequestState, SessionTokenSet } from '@inrupt/solid-client-authn-node';
import { fetchLoginUserProfile, type SolidUserProfile } from '@noeldemartin/solid-utils';
import { facade, isDevelopment, PromisedValue } from '@noeldemartin/utils';
import { status } from 'elysia';

import { PORT } from '../lib/constants';

const SESSION_HEADER = 'X-Anima-Session-Id';

function isActiveSession(value: unknown): value is ActiveSession {
  return typeof value === 'object' && value !== null && 'tokenSet' in value;
}

function isAuthorizationRequestState(value: unknown): value is AuthorizationRequestState {
  return typeof value === 'object' && value !== null && 'state' in value;
}

type ActiveSession = { tokenSet: SessionTokenSet };

export interface AuthSession {
  sessionId: string;
  user: SolidUserProfile;
  fetch: Session['fetch'];
}

export class AuthService {
  private context = new AsyncLocalStorage<AuthSession>();
  private profiles: Record<string, SolidUserProfile | null> = {};
  private sessions: Record<string, AuthorizationRequestState | ActiveSession> = {};

  public async assertLoggedIn(request: Request): Promise<void> {
    const sessionId = request.headers.get(SESSION_HEADER);
    const activeSession = sessionId && this.sessions[sessionId];

    if (!sessionId || !isActiveSession(activeSession)) {
      throw status(401, 'Unauthorized');
    }
  }

  public async runForRequest<T>(request: Request, callback: () => T | Promise<T>): Promise<T> {
    const session = await this.requireSession(request);

    return this.context.run(session, callback);
  }

  public requireContextSession(): AuthSession {
    const session = this.context.getStore();

    if (!session) {
      throw status(401, 'Unauthorized');
    }

    return session;
  }

  public async session(request: Request): Promise<AuthSession | null> {
    const sessionId = request.headers.get(SESSION_HEADER);
    const activeSession = sessionId && this.sessions[sessionId];

    if (!sessionId || !isActiveSession(activeSession)) {
      return null;
    }

    const session = await Session.fromTokens(activeSession.tokenSet);
    const webId = session?.info.webId;
    const profile = webId && (await this.profile(webId, session));

    if (!profile) {
      return null;
    }

    return { sessionId, user: profile, fetch: session.fetch.bind(session) };
  }

  public async requireSession(request: Request): Promise<AuthSession> {
    const session = await this.session(request);

    if (!session) {
      throw status(401, 'Unauthorized');
    }

    return session;
  }

  public async login(oidcIssuer: string): Promise<{ sessionId: string; redirectUrl: string }> {
    const session = new Session({ keepAlive: false });
    const promisedResult = new PromisedValue<{ redirectUrl: string } | { error: string }>();

    session.events.on(EVENTS.AUTHORIZATION_REQUEST, (authorizationRequestState) => {
      this.sessions[session.info.sessionId] = authorizationRequestState;
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

        promisedResult.resolve({ error: 'Log in failed' });
      });

    const result = await promisedResult;

    if ('redirectUrl' in result) {
      return { sessionId: session.info.sessionId, redirectUrl: result.redirectUrl };
    }

    throw new Error(result.error);
  }

  public async handleRedirect(request: Request): Promise<void> {
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const [sessionId, authorizationRequestState] = (() => {
      for (const [sessionId, authorizationRequestState] of Object.entries(this.sessions)) {
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
      if (isDevelopment()) {
        console.error('Failed to handle redirect', { sessionId, authorizationRequestState });
      }

      return;
    }

    session.events.on(EVENTS.NEW_TOKENS, (tokenSet) => {
      this.sessions[sessionId] = { tokenSet };
    });

    await session.handleIncomingRedirect(request.url);
  }

  public async logout(request: Request): Promise<void> {
    const sessionId = request.headers.get(SESSION_HEADER);

    if (!sessionId) {
      return;
    }

    const activeSession = this.sessions[sessionId];

    if (isActiveSession(activeSession)) {
      const session = await Session.fromTokens(activeSession.tokenSet);
      const webId = session.info.webId;

      webId && delete this.profiles[webId];
    }

    delete this.sessions[sessionId];
  }

  private async profile(webId: string, session: Session): Promise<SolidUserProfile | null> {
    return (this.profiles[webId] ??= await fetchLoginUserProfile(webId, { fetch: session.fetch.bind(session) }));
  }
}

export default facade(AuthService);
