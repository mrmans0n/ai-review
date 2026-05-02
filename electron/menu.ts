import { Menu, MenuItemConstructorOptions, BrowserWindow } from "electron";

export function buildMenu(getWindow: () => BrowserWindow | null): Menu {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: "ai-review",
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Install CLI…",
          click: () => {
            const win = getWindow();
            win?.webContents.send("menu-install-cli");
          },
        },
        { type: "separator" },
        { role: isMac ? "close" : "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}
