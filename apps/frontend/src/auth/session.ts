import { Storage } from '@noeldemartin/utils';

let session: { id: string | null } | null = null;
const STORAGE_KEY = 'anima:sessionId';

export function getSessionId(): string | null {
  session ??= { id: Storage.get<string>(STORAGE_KEY) };

  return session.id;
}

export function setSessionId(id: string) {
  session = { id };
  Storage.set<string>(STORAGE_KEY, id);
}

export function removeSessionId() {
  session = { id: null };
  Storage.remove(STORAGE_KEY);
}
