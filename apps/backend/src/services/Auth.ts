import { facade, PromisedValue } from '@noeldemartin/utils';
import { EVENTS, Session } from '@inrupt/solid-client-authn-node';
import { fetchLoginUserProfile, type SolidUserProfile } from '@noeldemartin/solid-utils';
import type { AuthorizationRequestState, SessionTokenSet } from '@inrupt/solid-client-authn-node';

import { PORT } from '../lib/constants';
import { MODEL_AUTO, type AIModelName } from './AI';

function isActiveSession(value: unknown): value is ActiveSession {
  return typeof value === 'object' && value !== null && 'tokenSet' in value;
}

function isAuthorizationRequestState(value: unknown): value is AuthorizationRequestState {
  return typeof value === 'object' && value !== null && 'state' in value;
}

type ActiveSession = { tokenSet: SessionTokenSet; model: AIModelName };

export interface AuthSession {
  sessionId: string;
  model: AIModelName;
  user: SolidUserProfile | null;
}

export class AuthService {
  private profiles: Record<string, SolidUserProfile | null> = {};
  private sessions: Record<string, AuthorizationRequestState | ActiveSession> = {};

  public async session(request: Request): Promise<AuthSession | null> {
    const sessionId = request.headers.get('X-Anima-Session-Id');
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

    return { sessionId, user: profile, model: activeSession.model };
  }

  public update(session: AuthSession, data: Partial<Pick<AuthSession, 'model'>>): void {
    const activeSession = this.sessions[session.sessionId];

    if (!isActiveSession(activeSession)) {
      throw new Error('Session not found');
    }

    this.sessions[session.sessionId] = { ...activeSession, ...data };
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
      return;
    }

    session.events.on(EVENTS.NEW_TOKENS, (tokenSet) => {
      this.sessions[sessionId] = { tokenSet, model: MODEL_AUTO };
    });

    await session.handleIncomingRedirect(request.url);
  }

  public async logout(request: Request): Promise<void> {
    const sessionId = request.headers.get('X-Anima-Session-Id');

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
