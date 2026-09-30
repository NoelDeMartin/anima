import { translate } from '@aerogel/core';
import {
  type AnimaChatRecord,
  type AnimaUIMessage,
  getAIErrorMessage,
  isDataErrorPart,
  messagesIdGenerator,
} from '@anima/core';
import { AbstractChat, type ChatInit, type ChatOnFinishCallback, type ChatState, type ChatStatus } from 'ai';
import { shallowRef } from 'vue';

import AI from '@/services/AI';

export interface AnimaChatOptions {
  messages: AnimaUIMessage[];
  transport: ChatInit<AnimaUIMessage>['transport'];
  onFinish?: (...args: Parameters<ChatOnFinishCallback<AnimaUIMessage>>) => void | Promise<void>;
}

function copyWithParts(message: AnimaUIMessage): AnimaUIMessage {
  return { ...message, parts: message.parts.map((part) => ({ ...part })) };
}

function withErrorPart(message: AnimaUIMessage, error: Error | undefined): AnimaUIMessage {
  return {
    ...message,
    metadata: message.metadata ?? AI.createMessageMetadata(),
    parts: [...message.parts, { type: 'data-error', data: getAIErrorMessage(error) }],
  };
}

class AnimaChatState implements ChatState<AnimaUIMessage> {
  private messagesRef = shallowRef<AnimaUIMessage[]>([]);
  private statusRef = shallowRef<ChatStatus>('ready');
  private errorRef = shallowRef<Error | undefined>();
  private pendingSavesRef = shallowRef(0);
  private saveErrorRef = shallowRef<Error | undefined>();

  constructor(messages: AnimaUIMessage[]) {
    this.messagesRef.value = messages;
  }

  get messages(): AnimaUIMessage[] {
    return this.messagesRef.value;
  }

  set messages(messages: AnimaUIMessage[]) {
    this.messagesRef.value = messages;
  }

  get status(): ChatStatus {
    return this.statusRef.value;
  }

  set status(status: ChatStatus) {
    if (status === 'submitted') {
      this.saveErrorRef.value = undefined;
    }

    this.statusRef.value = status;
  }

  get error(): Error | undefined {
    return this.errorRef.value;
  }

  set error(error: Error | undefined) {
    this.errorRef.value = error;
  }

  get saving(): boolean {
    return this.pendingSavesRef.value > 0;
  }

  get saveError(): Error | undefined {
    return this.saveErrorRef.value;
  }

  snapshot<T>(value: T): T {
    return structuredClone(value);
  }

  pushMessage(message: AnimaUIMessage): void {
    this.messages = [...this.messages, copyWithParts(message)];
  }

  popMessage(): void {
    this.messages = this.messages.slice(0, -1);
  }

  replaceMessage(index: number, message: AnimaUIMessage): void {
    this.messages = this.messages.map((existingMessage, existingIndex) =>
      existingIndex === index ? copyWithParts(message) : existingMessage,
    );
  }

  async trackSaving(operation: void | Promise<void>): Promise<void> {
    this.pendingSavesRef.value++;

    try {
      await operation;
    } catch (error) {
      this.saveErrorRef.value = new Error(translate('chat.saveFailed', { error: getAIErrorMessage(error) }), {
        cause: error,
      });
    } finally {
      this.pendingSavesRef.value--;
    }
  }

  upsertMessage(message: AnimaUIMessage): void {
    const index = this.messages.findIndex(({ id }) => id === message.id);

    if (index === -1) {
      this.pushMessage(message);

      return;
    }

    this.replaceMessage(index, message);
  }
}

export default class AnimaChat extends AbstractChat<AnimaUIMessage> {
  declare protected state: AnimaChatState;

  constructor(chat: AnimaChatRecord, options: AnimaChatOptions) {
    const state = new AnimaChatState(options.messages);

    super({
      state,
      id: chat.url,
      transport: options.transport,
      generateId: messagesIdGenerator(chat.url),
      async onFinish(event) {
        if (!event.isError || event.message.parts.some(isDataErrorPart)) {
          await state.trackSaving(options.onFinish?.(event));

          return;
        }

        const message = withErrorPart(event.message, state.error);

        state.upsertMessage(message);
        await state.trackSaving(options.onFinish?.({ ...event, message, messages: state.messages }));
      },
    });
  }

  get saving(): boolean {
    return this.state.saving;
  }

  get saveError(): Error | undefined {
    return this.state.saveError;
  }
}
