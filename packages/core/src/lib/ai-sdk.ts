import type { AnimaChat } from '@anima/core';
import { isObject, requireUrlParentDirectory, uuid } from '@noeldemartin/utils';
import type { IdGenerator } from 'ai';

export function messagesIdGenerator(chatUrl: AnimaChat['url']): IdGenerator {
  return () => {
    const now = new Date();

    return `${requireUrlParentDirectory(chatUrl)}${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/chat#${uuid()}`;
  };
}

export function getAIErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (isObject(error) && 'lastError' in error && error.lastError) {
    return getAIErrorMessage(error.lastError);
  }

  if (isObject(error) && 'message' in error && error.message) {
    return getAIErrorMessage(error.message);
  }

  return 'An error occurred.';
}
