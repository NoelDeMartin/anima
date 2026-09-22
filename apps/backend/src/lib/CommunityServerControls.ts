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

const WebIdsResponseSchema = z.object({
  webIdLinks: z.record(z.string(), z.string()),
});

const ClientCredentialsResponseSchema = z.object({
  id: z.string(),
  secret: z.string(),
});

export type GuestControls = z.infer<typeof GuestControlsResponseSchema>['controls'];
export type AccountControls = z.infer<typeof AccountControlsResponseSchema>['controls'];

export default class CommunityServerControls {
  private baseUrl: string;
  private guestControls: GuestControls | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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

  private async getAccountControls(authorization: string): Promise<AccountControls> {
    const indexUrl = (await this.guestControlUrl('main.index')) ?? `${this.baseUrl}/.account/`;

    if (typeof indexUrl !== 'string') {
      throw new Error('Control URL not found for controls.main.index');
    }

    const { controls } = await this.request(indexUrl, {
      authorization,
      response: AccountControlsResponseSchema,
    });

    return controls;
  }

  private async guestControlUrl<T extends DeepKeyOf<GuestControls>>(key: T): Promise<DeepValue<GuestControls, T>> {
    this.guestControls ??= (await this.request(`${this.baseUrl}/.account/`, { response: GuestControlsResponseSchema }))[
      'controls'
    ];

    return deepGet(this.guestControls, key);
  }

  private async request<T extends z.ZodType = z.ZodVoid>(
    url: string,
    options: {
      authorization?: string;
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

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
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
