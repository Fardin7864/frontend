import { v4 as uuid } from 'uuid';

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'flashsale_userId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuid();
    localStorage.setItem(key, id);
  }
  return id;
}
