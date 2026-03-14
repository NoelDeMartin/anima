import { requireUrlDirectoryName } from '@noeldemartin/utils';

export function chatRoute(chatUrl: string) {
  return {
    name: 'chats.show',
    params: { chat: requireUrlDirectoryName(chatUrl) },
    query: { url: chatUrl },
  };
}
