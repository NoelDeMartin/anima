import { facade } from '@noeldemartin/utils';
import { status } from 'elysia';
import z from 'zod';

import { env } from '../lib/env';

export const PickFolderResponseSchema = z.object({
  path: z.string().nullable(),
});

export type PickFolderResponse = z.infer<typeof PickFolderResponseSchema>;

export class NativeService {
  public isAvailable(): boolean {
    return Boolean(env('ANIMA_NATIVE'));
  }

  public async pickFolder(): Promise<PickFolderResponse> {
    return this.request('pick-folder', { response: PickFolderResponseSchema });
  }

  private async request<T extends z.ZodType = z.ZodVoid>(
    path: string,
    options: {
      response: T;
    },
  ): Promise<z.infer<T>> {
    if (!this.isAvailable()) {
      throw status(400, 'Native IPC is not available');
    }

    const response = await fetch(`http://127.0.0.1:${env('ANIMA_NATIVE_IPC_PORT')}/${path}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Native IPC request failed with status ${response.status}`);
    }

    return options.response.parse(await response.json());
  }
}

export default facade(NativeService);
