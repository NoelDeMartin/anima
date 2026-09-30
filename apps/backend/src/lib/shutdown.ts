import { constants } from 'node:os';

import type Elysia from 'elysia';

import SolidServer from '../services/SolidServer';

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;
const SHUTDOWN_TIMEOUT_MS = 10_000;

type ShutdownSignal = (typeof SHUTDOWN_SIGNALS)[number];

function signalExitCode(signal: ShutdownSignal): number {
  return 128 + constants.signals[signal];
}

function forceExitAfterTimeout(signal: ShutdownSignal): void {
  setTimeout(() => process.exit(signalExitCode(signal)), SHUTDOWN_TIMEOUT_MS).unref();
}

export function shutdownOnSignals(app: Elysia): void {
  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, async () => {
      forceExitAfterTimeout(signal);

      try {
        await app.stop().catch(() => undefined);
        await SolidServer.stop();
      } finally {
        process.exit(signalExitCode(signal));
      }
    });
  }
}
