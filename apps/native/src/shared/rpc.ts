import type { RPCSchema } from 'electrobun';

type RequestSchema<T> = {
  [K in keyof T]: T[K] extends (params: infer P) => Promise<infer R> ? { params: P; response: R } : never;
};

export interface RPCRequests {
  getServerStatus(params: {}): Promise<boolean>;
  toggleServerStatus(params: {}): Promise<boolean>;
}

export type RPC = {
  bun: RPCSchema<{ requests: RequestSchema<RPCRequests> }>;
  webview: RPCSchema<{}>;
};
