import type { MessagePart } from '@anima/core';
import { auth, Chat, Message, type AnimaUIMessage } from '@anima/core';
import { facade, Semaphore, tap, uuid } from '@noeldemartin/utils';
import { isStaticToolUIPart } from 'ai';
import { Person, Container, TypeIndex, type GetModelAttributes } from 'soukai-bis';
import z from 'zod';

const CHATS_CONTAINER_MISSING = Symbol('ChatMissing');

export const AnimaChatSchema = z.object({
  url: z.url().brand('AnimaChatUrl'),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AnimaChatEditableFieldsSchema = AnimaChatSchema.pick({ title: true });

export type AnimaChat = z.infer<typeof AnimaChatSchema>;
export type AnimaChatEditableFields = z.infer<typeof AnimaChatEditableFieldsSchema>;

export class ChatsManagerService {
  private semaphore = new Semaphore();
  private chatsContainerUrl: string | typeof CHATS_CONTAINER_MISSING | null = null;

  async getChat(url: AnimaChat['url']): Promise<AnimaChat | null> {
    const chat = await Chat.find(url);

    return chat && this.toAnimaChat(chat);
  }

  async getChats(): Promise<AnimaChat[]> {
    const chatsContainerUrl = await this.getChatsContainerUrl();

    if (!chatsContainerUrl) {
      return [];
    }

    const chats = await Chat.all({ from: chatsContainerUrl, depth: 1 });

    return chats.map((chat) => this.toAnimaChat(chat));
  }

  async getChatMessages(chat: AnimaChat): Promise<AnimaUIMessage[]> {
    const chatModel = await Chat.find(chat.url);

    if (!chatModel) {
      return [];
    }

    const messages = await Message.all({ from: chatModel.requireContainerUrl(), deep: true });

    return messages.map((message) => this.toAnimaMessage(message));
  }

  async createChat(data: AnimaChatEditableFields): Promise<AnimaChat> {
    const chatsContainerUrl = (await this.getChatsContainerUrl()) ?? (await this.createChatsContainer());
    const chat = await Chat.create({
      url: `${chatsContainerUrl}${uuid()}/index#it`,
      ...data,
    });

    return this.toAnimaChat(chat);
  }

  async updateChat(url: AnimaChat['url'], updates: Partial<AnimaChatEditableFields>): Promise<void> {
    const chat = await Chat.findOrFail(url);

    await chat.update(updates);
  }

  async storeChatMessage(message: AnimaUIMessage): Promise<void> {
    await this.semaphore.run(async () => {
      const user = auth().getUser();
      const model = new Message({
        url: message.id,
        author: message.role === 'user' ? user.webId : auth().getClientId(),
        model: message.metadata?.model,
        provider: message.metadata?.provider,
        createdAt: message.metadata?.createdAt,
      });

      let count = 0;
      for (const part of message.parts) {
        const attributes = this.toMessagePartAttributes(part);

        if (!attributes) {
          continue;
        }

        model.relatedParts.attach({
          position: ++count,
          ...attributes,
        });
      }

      await model.save();
    });
  }

  private async getChatsContainerUrl(): Promise<string | null> {
    if (!this.chatsContainerUrl) {
      const user = auth().getUser();
      const person = Person.createFromProfile(user);
      const chatsContainer = await person.findRegisteredContainer(Chat);

      this.chatsContainerUrl = chatsContainer?.url ?? CHATS_CONTAINER_MISSING;
    }

    return this.chatsContainerUrl === CHATS_CONTAINER_MISSING ? null : this.chatsContainerUrl;
  }

  private async createChatsContainer(): Promise<string> {
    const user = auth().getUser();
    const typeIndex = user.privateTypeIndexUrl ? user.privateTypeIndexUrl : await TypeIndex.createPrivate(user);
    const container = await Container.createAt(user.storageUrls[0], { name: 'Chats' });

    await container.register(typeIndex, Chat);
    await auth().refreshProfile();

    return tap(container.url, () => {
      this.chatsContainerUrl = container.url;
    });
  }

  private toAnimaChat(chat: Chat): AnimaChat {
    return {
      url: chat.url as AnimaChat['url'],
      title: chat.title,
      createdAt: chat.createdAt ?? new Date(),
      updatedAt: chat.updatedAt ?? new Date(),
    };
  }

  private toAnimaMessage(message: Message): AnimaUIMessage {
    const user = auth().getUser();

    return {
      id: message.url as AnimaUIMessage['id'],
      role: message.author === user.webId ? 'user' : 'assistant',
      parts: message.parts?.map((part) => this.toAnimaMessagePart(part)) ?? [],
      metadata: {
        model: message.model,
        provider: message.provider,
        createdAt: message.createdAt,
      },
    };
  }

  private toAnimaMessagePart(part: MessagePart): AnimaUIMessage['parts'][number] {
    if (part.text) {
      return {
        type: 'text',
        text: part.text,
      };
    }

    if (part.toolCall) {
      return JSON.parse(part.toolCall);
    }

    throw new Error(`Unsupported message part: ${part.url}`);
  }

  private toMessagePartAttributes(
    part: AnimaUIMessage['parts'][number],
  ): Omit<GetModelAttributes<MessagePart>, 'position'> | null {
    if (isStaticToolUIPart(part)) {
      return { toolCall: JSON.stringify(part) };
    }

    switch (part.type) {
      case 'text':
        return part.text.trim().length === 0 ? null : { text: part.text };
      case 'step-start':
        return null;
    }

    throw new Error(`Unsupported message part: ${part.type}`);
  }
}

export default facade(ChatsManagerService);
