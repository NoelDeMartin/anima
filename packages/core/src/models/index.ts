import { bootModels } from 'soukai-bis';

import Chat from './Chat';
import Message from './Message';
import MessagePart from './MessagePart';

export { default as Chat } from './Chat';
export { default as Message } from './Message';
export { default as MessagePart } from './MessagePart';
export * from './Chat';
export * from './Chat.schema';
export * from './Message';
export * from './Message.schema';
export * from './MessagePart';
export * from './MessagePart.schema';

export function bootAnimaModels(): void {
  bootModels({ Chat, Message, MessagePart });
}
