import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function buildData(options: CreateCommunityServerConfigOptions): Record<string, unknown> {
  const userRoots = options.userRoots ?? {};
  const baseUrl = options.baseUrl;
  const internalPath = options.internalPath;
  const userRules: object[] = [];
  const userStores: object[] = [];

  for (const [username, podPath] of Object.entries(userRoots)) {
    const storeId = `urn:solid-server:anima:UserStore_${username}`;
    const userBaseUrl = `${baseUrl}/${username}/`;

    userRules.push({
      '@type': 'RegexRule',
      regex: `^/${username}/`,
      store: { '@id': storeId },
    });

    userStores.push({
      '@id': storeId,
      '@type': 'DataAccessorBasedStore',
      identifierStrategy: {
        '@type': 'SingleRootIdentifierStrategy',
        baseUrl: userBaseUrl,
      },
      auxiliaryStrategy: { '@id': 'urn:solid-server:default:AuxiliaryStrategy' },
      accessor: {
        '@type': 'FileDataAccessor',
        resourceMapper: {
          '@type': 'ExtensionBasedMapper',
          base: userBaseUrl,
          rootFilepath: podPath,
        },
      },
      metadataStrategy: { '@id': 'urn:solid-server:default:MetadataStrategy' },
    });
  }

  return {
    '@context':
      'https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^7.0.0/components/context.jsonld',
    import: [
      'css:config/app/init/static-root.json',
      'css:config/app/main/default.json',
      'css:config/app/variables/default.json',
      'css:config/http/handler/default.json',
      'css:config/http/middleware/default.json',
      'css:config/http/notifications/all.json',
      'css:config/http/server-factory/http.json',
      'css:config/http/static/default.json',
      'css:config/identity/access/public.json',
      'css:config/identity/email/default.json',
      'css:config/identity/handler/default.json',
      'css:config/identity/oidc/default.json',
      'css:config/identity/ownership/token.json',
      'css:config/identity/pod/static.json',
      'css:config/ldp/authentication/dpop-bearer.json',
      'css:config/ldp/authorization/webacl.json',
      'css:config/ldp/handler/default.json',
      'css:config/ldp/metadata-parser/default.json',
      'css:config/ldp/metadata-writer/default.json',
      'css:config/ldp/modes/default.json',
      'css:config/storage/backend/data-accessors/file.json',
      'css:config/storage/key-value/resource-store.json',
      'css:config/storage/location/pod.json',
      'css:config/storage/middleware/default.json',
      'css:config/util/auxiliary/acl.json',
      'css:config/util/identifiers/suffix.json',
      'css:config/util/index/default.json',
      'css:config/util/logging/winston.json',
      'css:config/util/representation-conversion/default.json',
      'css:config/util/resource-locker/file.json',
      'css:config/util/variables/default.json',
    ],
    '@graph': [
      {
        '@id': 'urn:solid-server:default:ResourceStore_Backend',
        '@type': 'RoutingResourceStore',
        rule: { '@id': 'urn:solid-server:default:RouterRule' },
      },
      {
        '@id': 'urn:solid-server:default:RouterRule',
        '@type': 'RegexRouterRule',
        base: { '@id': 'urn:solid-server:default:variable:baseUrl' },
        rules: [
          {
            '@type': 'RegexRule',
            regex: '^/\\.internal/',
            store: { '@id': 'urn:solid-server:anima:InternalStore' },
          },
          ...userRules,
          {
            '@type': 'RegexRule',
            regex: '.*',
            store: { '@id': 'urn:solid-server:anima:DefaultPodStore' },
          },
        ],
      },
      {
        '@id': 'urn:solid-server:anima:InternalStore',
        '@type': 'DataAccessorBasedStore',
        identifierStrategy: { '@id': 'urn:solid-server:default:IdentifierStrategy' },
        auxiliaryStrategy: { '@id': 'urn:solid-server:default:AuxiliaryStrategy' },
        accessor: {
          '@type': 'FileDataAccessor',
          resourceMapper: {
            '@type': 'ExtensionBasedMapper',
            base: { '@id': 'urn:solid-server:default:variable:baseUrl' },
            rootFilepath: internalPath,
          },
        },
        metadataStrategy: { '@id': 'urn:solid-server:default:MetadataStrategy' },
      },
      ...userStores,
      {
        '@id': 'urn:solid-server:anima:DefaultPodStore',
        '@type': 'DataAccessorBasedStore',
        identifierStrategy: { '@id': 'urn:solid-server:default:IdentifierStrategy' },
        auxiliaryStrategy: { '@id': 'urn:solid-server:default:AuxiliaryStrategy' },
        accessor: {
          '@type': 'FileDataAccessor',
          resourceMapper: {
            '@type': 'ExtensionBasedMapper',
            base: { '@id': 'urn:solid-server:default:variable:baseUrl' },
            rootFilepath: internalPath,
          },
        },
        metadataStrategy: { '@id': 'urn:solid-server:default:MetadataStrategy' },
      },
    ],
  };
}

export interface CreateCommunityServerConfigOptions {
  baseUrl: string;
  internalPath: string;
  userRoots?: Record<string, string>;
}

export default class CommunityServerConfig {
  public static create(path: string, options: CreateCommunityServerConfigOptions): CommunityServerConfig {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(buildData(options), null, 2), 'utf8');

    return new CommunityServerConfig(path);
  }

  public readonly path: string;
  private data: Record<string, unknown>;

  constructor(path: string) {
    if (!existsSync(path)) {
      throw new Error(`CommunityServerConfig file not found at: ${path}`);
    }

    this.path = path;
    this.data = JSON.parse(readFileSync(path, 'utf8'));
  }

  public getUserPodStorageRoots(): Record<string, string> {
    const roots: Record<string, string> = {};
    const graph = (this.data['@graph'] as Array<Record<string, unknown>>) ?? [];

    for (const node of graph) {
      const id = typeof node['@id'] === 'string' ? node['@id'] : '';

      if (id.startsWith('urn:solid-server:anima:UserStore_')) {
        const username = id.replace('urn:solid-server:anima:UserStore_', '');
        const accessor = node.accessor as { resourceMapper?: { rootFilepath?: string } } | undefined;
        const rootFilepath = accessor?.resourceMapper?.rootFilepath;

        if (rootFilepath) {
          roots[username] = rootFilepath;
        }
      }
    }

    return roots;
  }

  public getUserPodStorageRoot(username: string): string | null {
    return this.getUserPodStorageRoots()[username] ?? null;
  }

  public setUserPodStorageRoot(username: string, storageRoot: string, options: { baseUrl: string }): void {
    const userRoots = this.getUserPodStorageRoots();

    userRoots[username] = storageRoot;

    const internalPath = this.getInternalPath();
    const baseUrl = this.getBaseUrl() ?? options.baseUrl;

    this.data = buildData({
      internalPath,
      userRoots,
      baseUrl,
    });

    this.save();
  }

  private getInternalPath(): string {
    const graph = (this.data['@graph'] as Array<Record<string, unknown>>) ?? [];
    const internalStore = graph.find((node) => node['@id'] === 'urn:solid-server:anima:InternalStore');
    const accessor = internalStore?.accessor as { resourceMapper?: { rootFilepath?: string } } | undefined;

    return accessor?.resourceMapper?.rootFilepath ?? '';
  }

  private getBaseUrl(): string | null {
    const graph = (this.data['@graph'] as Array<Record<string, unknown>>) ?? [];

    for (const node of graph) {
      const id = typeof node['@id'] === 'string' ? node['@id'] : '';

      if (id.startsWith('urn:solid-server:anima:UserStore_')) {
        const identifierStrategy = node.identifierStrategy as { baseUrl?: string } | undefined;

        if (identifierStrategy?.baseUrl) {
          return identifierStrategy.baseUrl.replace(/\/?[^/]+\/?$/, '');
        }
      }
    }

    return null;
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf8');
  }
}
