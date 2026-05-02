import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (method: string, params?: Record<string, unknown>) =>
    ipcRenderer.invoke("bridge:invoke", method, params),
  on: (channel: string, cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  setTitle: (title: string) => ipcRenderer.invoke("window:setTitle", title),
  openDirectoryDialog: () => ipcRenderer.invoke("dialog:openDirectory"),
});
