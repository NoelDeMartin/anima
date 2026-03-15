import { fail, parseBoolean } from '@noeldemartin/utils';
import z from 'zod';

const EnvSchema = z.object({
  VITE_API_DOMAIN: z.string().optional(),
  VITE_SPA_MODE: z.string().optional().transform(parseBoolean),
});

type Env = z.infer<typeof EnvSchema>;

const parsedEnv = EnvSchema.parse(import.meta.env);

export function env<T extends keyof Env>(key: T): Env[T] {
  return parsedEnv[key];
}

export function requireEnv<T extends keyof Env>(key: T): NonNullable<Env[T]> {
  return env(key) ?? fail(`Environment variable ${key} is required`);
}
