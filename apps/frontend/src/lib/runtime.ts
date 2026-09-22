import { env } from '@aerogel/core';
import { Solid } from '@aerogel/plugin-solid';
import { fail, PromisedValue } from '@noeldemartin/utils';

import type Runtime from '@/lib/runtimes/Runtime';

let promisedRuntime: PromisedValue<Runtime> | null = null;

async function createRuntime(): Promise<void> {
  if (!promisedRuntime) {
    throw new Error('Runtime promise missing');
  }

  await Solid.booted;

  const { default: RuntimeClass } = env('VITE_SPA_MODE')
    ? await import('@/lib/runtimes/LocalRuntime')
    : await import('@/lib/runtimes/RemoteRuntime');

  promisedRuntime.resolve(new RuntimeClass());
}

function resolveRuntime(): Promise<Runtime> {
  if (promisedRuntime) {
    return promisedRuntime;
  }

  promisedRuntime = new PromisedValue();

  void createRuntime();

  return promisedRuntime;
}

export async function getRuntime(options: { skipInitialization?: boolean } = {}): Promise<Runtime> {
  const runtime = await resolveRuntime();

  if (!options.skipInitialization) {
    await runtime.initialized;
  }

  return runtime;
}

export function requireRuntime(): Runtime {
  return promisedRuntime?.value ?? fail('Runtime not initialized');
}
