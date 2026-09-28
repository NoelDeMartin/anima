import { deepGet, type DeepKeyOf, type DeepValue } from '@noeldemartin/utils';
import z from 'zod';

import type { CreateAccountOptions, LoginOptions, SolidCredentials } from '../services/SolidServer';
import { SolidServerError } from './errors/SolidServerError';

const GuestControlsResponseSchema = z.object({
  controls: z.object({
    account: z.object({
      create: z.string(),
    }),
    password: z.object({
      login: z.string(),
    }),
    main: z
      .object({
        index: z.string().optional(),
      })
      .optional(),
  }),
});

const AccountControlsResponseSchema = z.object({
  controls: z.object({
    password: z
      .object({
        create: z.string().optional(),
      })
      .optional(),
    account: z.object({
      pod: z.string().optional(),
      webId: z.string().optional(),
      clientCredentials: z.string().optional(),
    }),
  }),
});

const CreateAccountResponseSchema = z.object({
  authorization: z.string(),
});

const LoginResponseSchema = z.object({
  authorization: z.string(),
});

const InteractionControlsResponseSchema = z.object({
  controls: z.object({
    oidc: z
      .object({
        prompt: z.string(),
        webId: z.string(),
        consent: z.string(),
        cancel: z.string(),
      })
      .optional(),
  }),
});

const PromptResponseSchema = z.object({
  prompt: z.string(),
});

const ClientResponseSchema = z.object({
  client: z
    .object({
      client_id: z.string().optional(),
      client_name: z.string().optional(),
      client_uri: z.string().optional(),
      logo_uri: z.string().optional(),
    })
    .loose(),
});

const PickWebIdResponseSchema = z.object({
  webIds: z.array(z.string()),
});

const LocationResponseSchema = z.object({
  location: z.string(),
});

const LogoutControlsResponseSchema = z.object({
  controls: z.object({
    account: z.object({
      logout: z.string().optional(),
    }),
  }),
});

const WebIdsResponseSchema = z.object({
  webIdLinks: z.record(z.string(), z.string()),
});

const ClientCredentialsResponseSchema = z.object({
  id: z.string(),
  secret: z.string(),
});

export interface Interaction {
  prompt: InteractionPrompt;
  client: InteractionClient;
}

export interface InteractionOptions {
  cookies: string;
  authorization?: string;
}

export type InteractionPrompt = 'login' | 'consent';
export type InteractionClient = z.infer<typeof ClientResponseSchema>['client'];
export type GuestControls = z.infer<typeof GuestControlsResponseSchema>['controls'];
export type AccountControls = z.infer<typeof AccountControlsResponseSchema>['controls'];
export type InteractionControls = NonNullable<z.infer<typeof InteractionControlsResponseSchema>['controls']['oidc']>;

export default class CommunityServerControls {
  private baseUrl: string;
  private fetch: typeof globalThis.fetch;
  private guestControls: GuestControls | null = null;

  constructor(baseUrl: string, fetch: typeof globalThis.fetch) {
    this.baseUrl = baseUrl;
    this.fetch = fetch;
  }

  public async createAccount({ email, username, password }: CreateAccountOptions): Promise<void> {
    const createAccountUrl = await this.guestControlUrl('account.create');
    const { authorization } = await this.request(createAccountUrl, {
      method: 'POST',
      response: CreateAccountResponseSchema,
    });

    const accountControls = await this.getAccountControls(authorization);

    if (!accountControls.password?.create || !accountControls.account.pod) {
      throw new Error('Account controls missing required password.create or account.pod URLs');
    }

    await this.request(accountControls.password.create, {
      method: 'POST',
      authorization,
      body: { email, password },
    });

    await this.request(accountControls.account.pod, {
      method: 'POST',
      authorization,
      body: {
        name: username,
        settings: {
          linkStorage: true,
        },
      },
    });
  }

  public async login({ email, password }: LoginOptions): Promise<SolidCredentials> {
    const loginUrl = await this.guestControlUrl('password.login');
    const { authorization } = await this.request(loginUrl, {
      method: 'POST',
      body: { email, password },
      response: LoginResponseSchema,
    });

    const accountControls = await this.getAccountControls(authorization);

    if (!accountControls.account.webId || !accountControls.account.clientCredentials) {
      throw new Error('Account controls missing required webId or clientCredentials URLs');
    }

    const { webIdLinks } = await this.request(accountControls.account.webId, {
      authorization,
      response: WebIdsResponseSchema,
    });

    const webId = Object.keys(webIdLinks)[0];

    if (!webId) {
      throw new Error('No WebID found for account');
    }

    const credentials = await this.request(accountControls.account.clientCredentials, {
      method: 'POST',
      authorization,
      body: {
        name: 'anima',
        webId,
      },
      response: ClientCredentialsResponseSchema,
    });

    return {
      authorization,
      webId,
      clientId: credentials.id,
      clientSecret: credentials.secret,
      oidcIssuer: this.baseUrl,
    };
  }

  public async logout(authorization: string): Promise<void> {
    const { controls } = await this.request(this.accountUrl(), {
      authorization,
      response: LogoutControlsResponseSchema,
    });

    if (!controls.account.logout) {
      return;
    }

    await this.request(controls.account.logout, { method: 'POST', authorization });
  }

  public async getInteraction(options: InteractionOptions): Promise<Interaction> {
    const controls = await this.getInteractionControls(options);
    const [{ prompt }, { client }] = await Promise.all([
      this.request(controls.prompt, { ...options, response: PromptResponseSchema }),
      this.request(controls.consent, { ...options, response: ClientResponseSchema }),
    ]);

    return { prompt: prompt === 'consent' ? 'consent' : 'login', client };
  }

  public async pickInteractionWebId(webId: string, options: Required<InteractionOptions>): Promise<string> {
    const controls = await this.getInteractionControls(options);
    const { webIds } = await this.request(controls.webId, { ...options, response: PickWebIdResponseSchema });

    if (!webIds.includes(webId)) {
      throw new SolidServerError(403, 'The WebID does not belong to this account.');
    }

    const { location } = await this.request(controls.webId, {
      ...options,
      method: 'POST',
      body: { webId, remember: true },
      response: LocationResponseSchema,
    });

    return location;
  }

  public async consentInteraction(options: InteractionOptions): Promise<string> {
    const controls = await this.getInteractionControls(options);
    const { location } = await this.request(controls.consent, {
      ...options,
      method: 'POST',
      body: { remember: true },
      response: LocationResponseSchema,
    });

    return location;
  }

  public async cancelInteraction(options: InteractionOptions): Promise<string> {
    const controls = await this.getInteractionControls(options);
    const { location } = await this.request(controls.cancel, {
      ...options,
      method: 'POST',
      response: LocationResponseSchema,
    });

    return location;
  }

  private async getInteractionControls(options: InteractionOptions): Promise<InteractionControls> {
    const { controls } = await this.request(this.accountUrl(), {
      ...options,
      response: InteractionControlsResponseSchema,
    });

    if (!controls.oidc) {
      throw new SolidServerError(410, 'The authorization request has expired.');
    }

    return controls.oidc;
  }

  private async getAccountControls(authorization: string): Promise<AccountControls> {
    const indexUrl = (await this.guestControlUrl('main.index')) ?? this.accountUrl();

    if (typeof indexUrl !== 'string') {
      throw new Error('Control URL not found for controls.main.index');
    }

    const { controls } = await this.request(indexUrl, {
      authorization,
      response: AccountControlsResponseSchema,
    });

    return controls;
  }

  private accountUrl(): string {
    return new URL('.account/', this.baseUrl).href;
  }

  private async guestControlUrl<T extends DeepKeyOf<GuestControls>>(key: T): Promise<DeepValue<GuestControls, T>> {
    this.guestControls ??= (await this.request(this.accountUrl(), { response: GuestControlsResponseSchema }))[
      'controls'
    ];

    return deepGet(this.guestControls, key);
  }

  private async request<T extends z.ZodType = z.ZodVoid>(
    url: string,
    options: {
      authorization?: string;
      cookies?: string;
      method?: 'POST' | 'GET';
      body?: object;
      response?: T;
    },
  ): Promise<z.infer<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.authorization) {
      headers['Authorization'] = `CSS-Account-Token ${options.authorization}`;
    }

    if (options.cookies) {
      headers['Cookie'] = options.cookies;
    }

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetch(url, {
      headers,
      method: options.method ?? 'GET',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let message: string;

      try {
        const errorJson = (await response.json()) as { message?: string; error?: string };

        message = errorJson.message ?? errorJson.error ?? JSON.stringify(errorJson);
      } catch {
        message = await response.text();
      }

      throw new SolidServerError(response.status, message);
    }

    if (!options.response) {
      return undefined as z.infer<T>;
    }

    const json = await response.json();

    return options.response.parse(json);
  }
}
