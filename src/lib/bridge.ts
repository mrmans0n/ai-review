export async function invoke<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  return window.electronAPI.invoke<T>(method, args);
}

interface BridgeEvent<T> {
  payload: T;
}

export async function listen<T = unknown>(
  event: string,
  cb: (e: BridgeEvent<T>) => void,
): Promise<() => void> {
  return window.electronAPI.on(event, (payload) => cb({ payload: payload as T }));
}

export interface BridgeWindow {
  setTitle: (title: string) => void;
}

export function getCurrentWindow(): BridgeWindow {
  return {
    setTitle: (title: string) => {
      void window.electronAPI.setTitle(title);
    },
  };
}

export async function openDirectoryDialog(): Promise<string | null> {
  return window.electronAPI.openDirectoryDialog();
}
