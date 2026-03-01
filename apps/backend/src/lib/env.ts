import { parseBoolean } from '@noeldemartin/utils';
import z from 'zod';

const EnvSchema = z.object({
  E2E: z.string().optional().transform(parseBoolean),
});

type Env = z.infer<typeof EnvSchema>;

const parsedEnv = EnvSchema.parse(process.env);

export function env<T extends keyof Env>(key: T): Env[T] {
  return parsedEnv[key];
}
