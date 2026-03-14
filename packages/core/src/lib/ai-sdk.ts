import type { AnimaChat } from '@anima/core';
import { requireUrlParentDirectory, uuid } from '@noeldemartin/utils';
import type { IdGenerator } from 'ai';

export function messagesIdGenerator(chatUrl: AnimaChat['url']): IdGenerator {
  return () => {
    const now = new Date();

    return `${requireUrlParentDirectory(chatUrl)}${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/chat#${uuid()}`;
  };
}
