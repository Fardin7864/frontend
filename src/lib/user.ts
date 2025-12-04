
const STORAGE_KEY = 'flashSaleUserId';
const COOKIE_NAME = 'flash_sale_user_id';
const COOKIE_MAX_AGE_DAYS = 365; // 1 year

function isBrowser() {
  return typeof window !== 'undefined';
}

function safeGetLocalStorage(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function safeGetSessionStorage(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSetSessionStorage(value: string) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  try {
    const match = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + '='));
    if (!match) return null;
    return decodeURIComponent(match.split('=')[1] ?? '');
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days: number) {
  if (!isBrowser()) return;
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    document.cookie = [
      `${name}=${encodeURIComponent(value)}`,
      `expires=${expires.toUTCString()}`,
      'path=/',
      'SameSite=Lax',
    ].join('; ');
  } catch {
    // ignore
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return (
    'anon_' +
    Math.random().toString(16).slice(2) +
    Date.now().toString(16)
  );
}

/**
 * Get or create an anonymous user id.
 *
 * Priority:
 *  1. localStorage
 *  2. sessionStorage
 *  3. cookie
 *  4. generate new
 *
 * Whatever we end up with is then synced back into:
 *  - localStorage
 *  - sessionStorage
 *  - cookie
 *
 * So if the user clears *only* localStorage, we can restore it
 * from cookie/sessionStorage on the next page load.
 */
export function getOrCreateUserId(): string {
  if (!isBrowser()) return '';

  const fromLocal = safeGetLocalStorage();
  const fromSession = safeGetSessionStorage();
  const fromCookie = getCookie(COOKIE_NAME);

  const existing =
    fromLocal || fromSession || fromCookie || undefined;

  const id = existing ?? generateId();

  // Sync into all three stores
  safeSetLocalStorage(id);
  safeSetSessionStorage(id);
  setCookie(COOKIE_NAME, id, COOKIE_MAX_AGE_DAYS);

  return id;
}

/**
 * Optional helper you can use in dev tools if you ever want
 * to manually wipe the id from all places.
 */
export function clearUserIdEverywhere() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    // expire cookie
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
  } catch {
    // ignore
  }
}
