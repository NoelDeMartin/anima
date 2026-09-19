import { defineEnv } from '@aerogel/core';
import { parseBoolean } from '@noeldemartin/utils';
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_BACKEND_URL: z
    .string()
    .optional()
    .default(location.origin)
    .transform((value) => value.replace(/\/+$/, '')),
  VITE_SPA_MODE: z.string().optional().transform(parseBoolean),
  VITE_MANAGED_POD: z.string().optional().transform(parseBoolean),
});

export default defineEnv(import.meta.env, EnvSchema);

declare module '@aerogel/core' {
  interface Env extends z.infer<typeof EnvSchema> {}
}
