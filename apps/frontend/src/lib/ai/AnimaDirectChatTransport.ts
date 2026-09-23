import { prepareMessagesForModel, type AnimaUIMessage } from '@anima/core';
import { DirectChatTransport } from 'ai';

export default class AnimaDirectChatTransport extends DirectChatTransport<any, any, any, any, any> {
  override async sendMessages(options: any) {
    return super.sendMessages({
      ...options,
      messages: prepareMessagesForModel(options.messages as AnimaUIMessage[]) as never,
    });
  }
}
