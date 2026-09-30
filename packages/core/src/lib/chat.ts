import type { Nullable } from '@noeldemartin/utils';
import type { UIMessage, UITools } from 'ai';
import z from 'zod';

import type { AIProvider, InstalledModel } from './storage';

export const MessageMetadataSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  createdAt: z.date().optional(),
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export type AnimaDataParts = { error: string };
export type AnimaUIMessage = UIMessage<MessageMetadata, AnimaDataParts, UITools>;
export type AnimaUIMessagePart = AnimaUIMessage['parts'][number];
export type AnimaDataErrorPart = Extract<AnimaUIMessagePart, { type: 'data-error' }>;

export function createMessageMetadata(
  model: Nullable<InstalledModel>,
  provider: Nullable<AIProvider>,
): MessageMetadata {
  return {
    model: model ? model.alias || model.name : undefined,
    provider: provider?.name,
    createdAt: new Date(),
  };
}

export function isDataErrorPart(part: AnimaUIMessagePart): part is AnimaDataErrorPart {
  return part.type === 'data-error';
}

export function prepareMessagesForModel(messages: AnimaUIMessage[]): AnimaUIMessage[] {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => !isDataErrorPart(part) && part.type !== 'reasoning'),
    }))
    .filter((message) => message.role === 'user' || message.parts.some((part) => part.type !== 'step-start'));
}
