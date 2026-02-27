import type { CreateModelPayload, UpdateModelPayload, Model } from '@anima/backend';
import { facade, objectFromEntries } from '@noeldemartin/utils';

import api from '@/lib/api';
import Auth from '@/services/Auth';

import Service from './AI.state';

export class AIService extends Service {
  async createModel(model: CreateModelPayload): Promise<void> {
    const { data } = await api['ai'].models.post(model);

    if (data) {
      this.models[data.name] = data;
    }
  }

  async refreshModels(): Promise<void> {
    const { data } = await api['ai'].models.get();

    this.models = objectFromEntries(data?.map((model) => [model.name, model]) ?? []);
  }

  async updateModel(name: string, updates: UpdateModelPayload): Promise<void> {
    if (!(name in this.models)) {
      return;
    }

    const originalModel = this.models[name] as Model;

    try {
      this.models[name] = { ...this.models[name], ...updates } as Model;

      await api['ai'].models({ name }).patch(updates);
    } catch (error) {
      this.models[name] = originalModel;

      throw error;
    }
  }

  async deleteModel(name: string): Promise<void> {
    if (!(name in this.models)) {
      return;
    }

    const originalModel = this.models[name] as Model;

    try {
      delete this.models[name];

      await api['ai'].models({ name }).delete();
    } catch (error) {
      this.models[name] = originalModel;

      throw error;
    }
  }

  async cancelInstallation(name: string): Promise<void> {
    await api.ai.models({ name })['cancel-installation'].post();
  }

  protected async boot(): Promise<void> {
    await Auth.booted;

    const { data } = await api.ai.models.get({ headers: { 'X-Anima-Session-Id': Auth.sessionId } });

    this.models = objectFromEntries(data?.map((model) => [model.name, model]) ?? []);

    if (!this.selectedModel || !(this.selectedModel in this.models)) {
      this.selectedModel = Object.keys(this.models)[0] ?? this.selectedModel;
    }
  }
}

export default facade(AIService);
