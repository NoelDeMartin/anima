import z from 'zod';

const EnvSchema = z.object({
  VITE_API_DOMAIN: z.string(),
});

type Env = z.infer<typeof EnvSchema>;

const parsedEnv = EnvSchema.parse(import.meta.env);

export function env<T extends keyof Env>(key: T): Env[T] {
  return parsedEnv[key];
}
