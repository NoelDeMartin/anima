import type { UIMessage, UITools } from 'ai';
import z from 'zod';

export const MessageMetadataSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  createdAt: z.date().optional(),
});

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

export type AnimaUIMessage = UIMessage<MessageMetadata, {}, UITools>;
