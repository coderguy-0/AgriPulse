/**
 * Minimal browser stubs for the render smoke test (`npm run test:render`).
 *
 * The AGRIPULSE workspace deliberately persists non-sensitive UI state in localStorage during
 * development. Node has no localStorage, so the smoke test installs an in-memory implementation
 * before any application module is imported. No application code is changed by this stub.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const globalScope = globalThis as unknown as {
  window?: Record<string, unknown>;
  localStorage?: Storage;
  sessionStorage?: Storage;
};

const storage = new MemoryStorage();

globalScope.window = globalScope.window || {};
globalScope.window.localStorage = storage;
globalScope.window.sessionStorage = new MemoryStorage();
globalScope.localStorage = storage;
globalScope.sessionStorage = new MemoryStorage();

// matchMedia is used by prefers-reduced-motion aware components.
if (!(globalScope.window as { matchMedia?: unknown }).matchMedia) {
  (globalScope.window as { matchMedia: unknown }).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

export {};
