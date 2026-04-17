import "@testing-library/jest-dom";

// Node 22+ exposes a built-in `localStorage` global that shadows jsdom's
// `window.localStorage`. Without `--localstorage-file`, the built-in has no
// methods, so `localStorage.getItem`/`setItem`/`clear` throw. Install a
// Map-backed Storage polyfill on both `globalThis` and `window` so tests and
// app code can use the Web Storage API normally.
function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

const descriptor: PropertyDescriptor = {
  value: createStorage(),
  configurable: true,
  writable: true,
};
Object.defineProperty(globalThis, "localStorage", descriptor);
Object.defineProperty(window, "localStorage", descriptor);
