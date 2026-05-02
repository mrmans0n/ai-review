import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, type EventCallback } from "@tauri-apps/api/event";
import { getCurrentWindow as tauriGetCurrentWindow } from "@tauri-apps/api/window";
import { open as tauriOpenDialog } from "@tauri-apps/plugin-dialog";

export async function invoke<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(method, args);
}

export async function listen<T = unknown>(
  event: string,
  cb: EventCallback<T>,
): Promise<() => void> {
  return tauriListen<T>(event, cb);
}

export interface BridgeWindow {
  setTitle: (title: string) => void;
}

export function getCurrentWindow(): BridgeWindow {
  const w = tauriGetCurrentWindow();
  return {
    setTitle: w.setTitle as unknown as (title: string) => void,
  };
}

export async function openDirectoryDialog(): Promise<string | null> {
  const result = await tauriOpenDialog({ directory: true, multiple: false });
  if (typeof result === "string") return result;
  return null;
}
