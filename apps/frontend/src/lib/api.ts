import { treaty } from '@elysiajs/eden';
import type { Api } from '@anima/backend';

const api: ReturnType<typeof treaty<typeof Api>> = treaty<typeof Api>('localhost:3000');

export default api;
