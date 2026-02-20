import { facade } from '@noeldemartin/utils';

import api from '@/lib/api';

import Service from './AI.state';

export class AIService extends Service {
  async cancelInstallation(name: string): Promise<void> {
    await api.ai.models({ name })['cancel-installation'].post();
  }

  async install(name: string): Promise<void> {
    await api.ai.models.post({ name });
  }

  async sendMessage(message: string): Promise<void> {
    this.messages.push({ author: 'You', content: message });

    const { data } = await api.ai.prompt.post({ message });

    if (data) {
      this.messages.push({ author: 'AI', content: data });
    }
  }
}

export default facade(AIService);
