import { facade } from '@noeldemartin/utils';

import { getRuntime } from '@/lib/runtime';

import Service from './Anima.state';

export class AnimaService extends Service {
  protected async boot(): Promise<void> {
    const runtime = await getRuntime();

    this.native = await runtime.isNative();
  }
}

export default facade(AnimaService);
