import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://example.invalid');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');

installLocalStorage();

/** Node 25+ exposes a non-functional `localStorage` global that shadows happy-dom. */
function installLocalStorage(): void {
  const existing = globalThis.localStorage;
  if (
    existing &&
    typeof existing.getItem === 'function' &&
    typeof existing.setItem === 'function'
  ) {
    return;
  }

  const fromWindow =
    typeof window !== 'undefined' &&
    window.localStorage &&
    typeof window.localStorage.getItem === 'function'
      ? window.localStorage
      : null;
  const storage = fromWindow ?? createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    value: storage,
  });
}

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
  };
}
