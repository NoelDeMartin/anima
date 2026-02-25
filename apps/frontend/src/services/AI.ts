import type { CreateModelPayload, UpdateModelPayload, Model } from '@anima/backend';
import { facade } from '@noeldemartin/utils';

import api from '@/lib/api';
import Auth from '@/services/Auth';

import Service from './AI.state';

export class AIService extends Service {
  async createModel(model: CreateModelPayload): Promise<void> {
    const { data } = await api['ai'].models.post(model);

    data && this.models.push(data);
  }

  async refreshModels(): Promise<void> {
    const { data } = await api['ai'].models.get();

    this.models = data ?? [];
  }

  async updateModel(name: string, updates: UpdateModelPayload): Promise<void> {
    const index = this.models.findIndex((model) => model.name === name);

    if (index === -1) {
      return;
    }

    const originalModel = this.models[index] as Model;

    try {
      this.models[index] = { ...this.models[index], ...updates } as Model;

      await api['ai'].models({ name }).patch(updates);
    } catch (error) {
      this.models[index] = originalModel;

      throw error;
    }
  }

  async deleteModel(name: string): Promise<void> {
    const index = this.models.findIndex((model) => model.name === name);

    if (index === -1) {
      return;
    }

    const originalModel = this.models[index] as Model;

    try {
      this.models.splice(index, 1);

      await api['ai'].models({ name }).delete();
    } catch (error) {
      this.models.splice(index, 0, originalModel);

      throw error;
    }
  }

  async cancelInstallation(name: string): Promise<void> {
    await api.ai.models({ name })['cancel-installation'].post();
  }

  async sendMessage(model: string, message: string): Promise<void> {
    this.messages.push({ author: 'user', content: message });

    const { data } = await api.ai.chat.post({ model, message });

    if (data) {
      this.messages.push({ author: 'model', content: data });
    }
  }

  protected async boot(): Promise<void> {
    await Auth.booted;

    const { data } = await api.ai.models.get({ headers: { 'X-Anima-Session-Id': Auth.sessionId } });

    this.models = data ?? [];
  }
}

export default facade(AIService);
