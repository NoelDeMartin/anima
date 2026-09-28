import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function buildData(options: CreateCommunityServerInteractionConfigOptions): Record<string, unknown> {
  return {
    '@context':
      'https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^7.0.0/components/context.jsonld',
    '@graph': [
      {
        '@id': 'urn:solid-server:anima:InteractionRouteOverride',
        '@type': 'Override',
        overrideInstance: { '@id': 'urn:solid-server:default:IdentityProviderFactory' },
        overrideParameters: {
          '@type': 'IdentityProviderFactory',
          interactionRoute: { '@type': 'AbsolutePathInteractionRoute', path: options.interactionUrl },
        },
      },
    ],
  };
}

export interface CreateCommunityServerInteractionConfigOptions {
  interactionUrl: string;
}

export default class CommunityServerInteractionConfig {
  public static create(
    path: string,
    options: CreateCommunityServerInteractionConfigOptions,
  ): CommunityServerInteractionConfig {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(buildData(options), null, 2), 'utf8');

    return new CommunityServerInteractionConfig(path);
  }

  public readonly path: string;

  constructor(path: string) {
    if (!existsSync(path)) {
      throw new Error(`CommunityServerInteractionConfig file not found at: ${path}`);
    }

    this.path = path;
  }
}
