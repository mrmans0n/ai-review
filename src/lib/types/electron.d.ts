declare global {
  interface Window {
    electronAPI: {
      invoke<T>(method: string, params?: Record<string, unknown>): Promise<T>;
      on(channel: string, cb: (payload: unknown) => void): () => void;
      setTitle(title: string): Promise<void>;
      openDirectoryDialog(): Promise<string | null>;
    };
  }
}

export {};
