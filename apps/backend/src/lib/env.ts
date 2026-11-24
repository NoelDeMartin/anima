import { parseBoolean } from '@noeldemartin/utils';
import z from 'zod';

const EnvSchema = z.object({
  E2E: z.string().optional().transform(parseBoolean),
  MANAGED_POD: z.string().optional().transform(parseBoolean),
  SERVE_FRONTEND: z.string().optional().transform(parseBoolean),
  ANIMA_NATIVE: z.string().optional().transform(parseBoolean),
  ANIMA_NATIVE_IPC_PORT: z.string().optional(),
  BACKEND_URL: z
    .string()
    .optional()
    .transform((value) => value?.trim().replace(/\/+$/, '') || undefined)
    .pipe(z.url({ protocol: /^https?$/ }).optional()),
});

type Env = z.infer<typeof EnvSchema>;

const parsedEnv = EnvSchema.parse(process.env);

export function env<T extends keyof Env>(key: T): Env[T] {
  return parsedEnv[key];
}
