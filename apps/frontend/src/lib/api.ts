import { treaty } from '@elysiajs/eden';
import type { Api } from '@anima/backend';

import { env } from '@/lib/env';

export const api: ReturnType<typeof treaty<typeof Api>> = treaty<typeof Api>(env('VITE_API_DOMAIN'));

export default api;
