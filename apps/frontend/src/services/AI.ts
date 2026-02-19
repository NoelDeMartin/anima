import { facade } from '@noeldemartin/utils';

import api from '@/lib/api';

import Service from './AI.state';

export class AIService extends Service {
  async sendMessage(message: string): Promise<void> {
    this.messages.push({ author: 'You', content: message });

    const { data } = await api.ai.message.post({ message });

    if (data?.message) {
      this.messages.push({ author: 'AI', content: data.message });
    }
  }
}

export default facade(AIService);
