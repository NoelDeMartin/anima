import type { UIMessage, UITools } from 'ai';
import z from 'zod';

export const MessageMetadataSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  createdAt: z.date().optional(),
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export type AnimaDataParts = { error: string };
export type AnimaUIMessage = UIMessage<MessageMetadata, AnimaDataParts, UITools>;
export type AnimaUIMessagePart = AnimaUIMessage['parts'][number];

export function isDataErrorPart(part: AnimaUIMessagePart): part is { type: 'data-error'; data: string; id?: string } {
  return part.type === 'data-error';
}

export function prepareMessagesForModel(messages: AnimaUIMessage[]): AnimaUIMessage[] {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => !isDataErrorPart(part)),
    }))
    .filter((message) => message.role === 'user' || message.parts.some((part) => part.type !== 'step-start'));
}
